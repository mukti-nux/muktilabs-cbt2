import { NextResponse } from 'next/server'

function parseQuestion(q: any) {
  const html = q.html || ''

  // Extract teks soal
  const qtextMatch = html.match(/<div class="qtext">([\s\S]*?)<\/div>/)
  const qtext = qtextMatch
    ? qtextMatch[1].replace(/<[^>]+>/g, '').trim()
    : 'Soal tidak dapat ditampilkan'

  // Extract pilihan jawaban
  const choices: { value: string; label: string }[] = []
  const answerRegex = /<input type="radio"[^>]*value="(\d+)"[^>]*>[\s\S]*?<div[^>]*>\s*<span[^>]*>[^<]*<\/span>\s*<div[^>]*>([\s\S]*?)<\/div>/g
  let match
  while ((match = answerRegex.exec(html)) !== null) {
    choices.push({ value: match[1], label: match[2].replace(/<[^>]+>/g, '').trim() })
  }

  // Extract input name untuk submit
  const nameMatch = html.match(/name="(q\d+:\d+_answer)"/)
  const inputName = nameMatch ? nameMatch[1] : `q${q.slot}_answer`

  // Ambil sequencecheck — wajib untuk submit
  const seqMatch = html.match(/name="(q\d+:\d+_:sequencecheck)"\s+value="(\d+)"/)
  const seqName = seqMatch ? seqMatch[1] : null
  const seqValue = seqMatch ? seqMatch[2] : '1'

  return {
    slot: q.slot,
    type: q.type,
    number: q.number,
    qtext,
    choices,
    inputName,
    seqName,
    seqValue,
    maxmark: q.maxmark
  }
}

export async function POST(req: Request) {
  const { token, password } = await req.json()
  const { searchParams } = new URL(req.url)
  const quizId = searchParams.get('quizId')
  const base = process.env.NEXT_PUBLIC_MOODLE_URL

  try {
    // Start attempt
    const startParams = new URLSearchParams({
      wstoken: token,
      wsfunction: 'mod_quiz_start_attempt',
      moodlewsrestformat: 'json',
      quizid: quizId!,
    })
    if (password) {
      startParams.set('preflightdata[0][name]', 'quizpassword')
      startParams.set('preflightdata[0][value]', password)
    }
    const attemptRes = await fetch(`${base}/webservice/rest/server.php`, {
      method: 'POST', body: startParams
    })
    const attemptData = await attemptRes.json()
    if (attemptData.exception) throw new Error(attemptData.message)
    const attemptId = attemptData.attempt.id
    const totalPages = attemptData.attempt.layout.split('0,').length - 1

    // Fetch semua halaman soal
    const allQuestions: any[] = []
    for (let page = 0; page < totalPages; page++) {
      const qParams = new URLSearchParams({
        wstoken: token,
        wsfunction: 'mod_quiz_get_attempt_data',
        moodlewsrestformat: 'json',
        attemptid: String(attemptId),
        page: String(page),
      })
      if (password) {
        qParams.set('preflightdata[0][name]', 'quizpassword')
        qParams.set('preflightdata[0][value]', password)
      }
      const qRes = await fetch(`${base}/webservice/rest/server.php`, {
        method: 'POST', body: qParams
      })
      const qData = await qRes.json()
      if (qData.questions) {
        allQuestions.push(...qData.questions.map(parseQuestion))
      }
    }

    // Sort by number
    allQuestions.sort((a, b) => a.number - b.number)

    // Get quiz info
    const adminToken = process.env.MOODLE_TOKEN
    const quizRes = await fetch(
      `${base}/webservice/rest/server.php?wstoken=${adminToken}&wsfunction=mod_quiz_get_quizzes_by_courses&moodlewsrestformat=json&courseids[0]=4`
    )
    const quizData = await quizRes.json()
    const quiz = quizData.quizzes?.find((q: any) => q.id === Number(quizId))

    return NextResponse.json({
      attemptId,
      questions: allQuestions,
      quiz: { name: quiz?.name || 'Ujian', timelimit: quiz?.timelimit || 0 }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

