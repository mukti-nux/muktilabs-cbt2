import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { token, attemptId, answers, password, sequencechecks } = await req.json()
  const base = process.env.NEXT_PUBLIC_MOODLE_URL

  try {
    const params = new URLSearchParams({
      wstoken: token,
      wsfunction: 'mod_quiz_process_attempt',
      moodlewsrestformat: 'json',
      attemptid: String(attemptId),
      finishattempt: '1',
    })

    if (password) {
      params.set('preflightdata[0][name]', 'quizpassword')
      params.set('preflightdata[0][value]', password)
    }

    let i = 0
    // Kirim jawaban
    Object.entries(answers).forEach(([name, value]) => {
      params.set(`data[${i}][name]`, name)
      params.set(`data[${i}][value]`, String(value))
      i++
    })

    // Kirim sequencecheck — ini yang bikin jawaban tersimpan
    if (sequencechecks) {
      Object.entries(sequencechecks).forEach(([name, value]) => {
        params.set(`data[${i}][name]`, name)
        params.set(`data[${i}][value]`, String(value))
        i++
      })
    }

    const res = await fetch(`${base}/webservice/rest/server.php`, {
      method: 'POST',
      body: params
    })
    const data = await res.json()
    console.log('SUBMIT:', JSON.stringify(data))
    if (data.exception) throw new Error(data.message)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}