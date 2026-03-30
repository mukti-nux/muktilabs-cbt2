// @/app/api/moodle/quiz-submit/route.ts
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { token, attemptId, answers, password, sequencechecks } = await req.json()
  const base = process.env.NEXT_PUBLIC_MOODLE_URL

  console.log('[quiz-submit] attemptId:', attemptId)
  console.log('[quiz-submit] answers count:', Object.keys(answers || {}).length)
  console.log('[quiz-submit] sequencechecks count:', Object.keys(sequencechecks || {}).length)
  console.log('[quiz-submit] sequencechecks:', JSON.stringify(sequencechecks))

  if (!token || !attemptId) {
    return NextResponse.json({ error: 'Missing token or attemptId' }, { status: 400 })
  }

  try {
    function buildDataParams(
      params: URLSearchParams,
      answers: Record<string, string>,
      sequencechecks: Record<string, string>
    ) {
      let i = 0
      Object.entries(answers || {}).forEach(([name, value]) => {
        params.set(`data[${i}][name]`, name)
        params.set(`data[${i}][value]`, String(value))
        i++
      })
      Object.entries(sequencechecks || {}).forEach(([name, value]) => {
        params.set(`data[${i}][name]`, name)
        params.set(`data[${i}][value]`, String(value))
        i++
      })
      return i
    }

    // ── LANGKAH 1: SAVE (finishattempt=0) ──
    const saveParams = new URLSearchParams({
      wstoken: token,
      wsfunction: 'mod_quiz_process_attempt',
      moodlewsrestformat: 'json',
      attemptid: String(attemptId),
      finishattempt: '0',
    })
    if (password) {
      saveParams.set('preflightdata[0][name]', 'quizpassword')
      saveParams.set('preflightdata[0][value]', password)
    }
    const saveCount = buildDataParams(saveParams, answers, sequencechecks)
    console.log('[quiz-submit] SAVE sending', saveCount, 'data fields')

    const saveRes = await fetch(`${base}/webservice/rest/server.php`, {
      method: 'POST',
      body: saveParams,
    })
    const saveData = await saveRes.json()
    console.log('[quiz-submit] SAVE response:', JSON.stringify(saveData))

    if (saveData.exception) {
      if (saveData.errorcode === 'attemptalreadyclosed') {
        console.log('[quiz-submit] attempt already closed during save')
        return NextResponse.json({ success: true, alreadyClosed: true })
      }
      throw new Error(`Save gagal: ${saveData.message} (code: ${saveData.errorcode})`)
    }

    // ── LANGKAH 2: FINISH (finishattempt=1) ──
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
    const finishCount = buildDataParams(finishParams, answers, sequencechecks)
    console.log('[quiz-submit] FINISH sending', finishCount, 'data fields')

    const finishRes = await fetch(`${base}/webservice/rest/server.php`, {
      method: 'POST',
      body: finishParams,
    })
    const finishData = await finishRes.json()
    console.log('[quiz-submit] FINISH response:', JSON.stringify(finishData))

    if (finishData.exception) {
      if (finishData.errorcode === 'attemptalreadyclosed') {
        return NextResponse.json({ success: true, alreadyClosed: true })
      }
      throw new Error(`Finish gagal: ${finishData.message} (code: ${finishData.errorcode})`)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[quiz-submit] ERROR:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}