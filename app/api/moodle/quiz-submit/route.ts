import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { token, attemptId, answers, password, sequencechecks } = await req.json()
  const base = process.env.NEXT_PUBLIC_MOODLE_URL

  try {
    // ✅ FIX: Moodle butuh 2 langkah — SAVE dulu, baru FINISH
    // Kalau langsung finishattempt=1 tanpa save, jawaban tidak tersimpan di DB Moodle

    // ── LANGKAH 1: Save jawaban (finishattempt=0) ──
    const saveParams = new URLSearchParams({
      wstoken: token,
      wsfunction: 'mod_quiz_process_attempt',
      moodlewsrestformat: 'json',
      attemptid: String(attemptId),
      finishattempt: '0', // ← hanya save, belum finish
    })

    if (password) {
      saveParams.set('preflightdata[0][name]', 'quizpassword')
      saveParams.set('preflightdata[0][value]', password)
    }

    let i = 0
    // Kirim jawaban
    Object.entries(answers).forEach(([name, value]) => {
      saveParams.set(`data[${i}][name]`, name)
      saveParams.set(`data[${i}][value]`, String(value))
      i++
    })
    // Kirim sequencecheck — wajib ada agar jawaban divalidasi Moodle
    if (sequencechecks) {
      Object.entries(sequencechecks).forEach(([name, value]) => {
        saveParams.set(`data[${i}][name]`, name)
        saveParams.set(`data[${i}][value]`, String(value))
        i++
      })
    }

    const saveRes = await fetch(`${base}/webservice/rest/server.php`, {
      method: 'POST',
      body: saveParams,
    })
    const saveData = await saveRes.json()
    console.log('SAVE:', JSON.stringify(saveData))
    if (saveData.exception) throw new Error(`Save gagal: ${saveData.message}`)

    // ── LANGKAH 2: Finish attempt (finishattempt=1) ──
    const finishParams = new URLSearchParams({
      wstoken: token,
      wsfunction: 'mod_quiz_process_attempt',
      moodlewsrestformat: 'json',
      attemptid: String(attemptId),
      finishattempt: '1',
    })

    if (password) {
      finishParams.set('preflightdata[0][name]', 'quizpassword')
      finishParams.set('preflightdata[0][value]', password)
    }

    // Kirim ulang jawaban + sequencecheck saat finish juga
    let j = 0
    Object.entries(answers).forEach(([name, value]) => {
      finishParams.set(`data[${j}][name]`, name)
      finishParams.set(`data[${j}][value]`, String(value))
      j++
    })
    if (sequencechecks) {
      Object.entries(sequencechecks).forEach(([name, value]) => {
        finishParams.set(`data[${j}][name]`, name)
        finishParams.set(`data[${j}][value]`, String(value))
        j++
      })
    }

    const finishRes = await fetch(`${base}/webservice/rest/server.php`, {
      method: 'POST',
      body: finishParams,
    })
    const finishData = await finishRes.json()
    console.log('FINISH:', JSON.stringify(finishData))
    if (finishData.exception) throw new Error(`Finish gagal: ${finishData.message}`)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('quiz-submit error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}