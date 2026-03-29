// /api/moodle/quiz-start/route.ts
// Fungsi gabungan (1+2) - optimal dengan gambar dan password
// + deteksi attempt yang sedang berjalan → kembalikan error ATTEMPT_IN_PROGRESS

import { NextResponse } from 'next/server'
import { moodleCall, proxifyMoodleImages } from '@/lib/moodle'

function parseQuestion(q: any) {
  const html = q.html || ''
  const base = process.env.NEXT_PUBLIC_MOODLE_URL || ''

  // Extract qtext HTML mentah dulu
  const qtextMatch = html.match(/<div class="qtext">([\s\S]*?)<\/div>/)
  const qtextRaw = qtextMatch ? qtextMatch[1] : ''

  // Proxify gambar
  const qtextProxified = proxifyMoodleImages(qtextRaw, base)

  // Cek apakah ada gambar
  const hasImage = qtextProxified.includes('<img')

  // Kalau ada gambar, pakai HTML. Kalau tidak, strip tag
  const qtext = hasImage
    ? qtextProxified
    : qtextRaw.replace(/<[^>]+>/g, '').trim()

  // Extract choices
  const choices: { value: string; label: string; hasImage: boolean }[] = []
  const answerRegex = /<input type="radio"[^>]*value="(\d+)"[^>]*>[\s\S]*?data-region="answer-label">([\s\S]*?)<\/div>\s*<\/div>/g
  let match
  while ((match = answerRegex.exec(html)) !== null) {
    const labelHtml = proxifyMoodleImages(match[2], base)
    const hasImgInChoice = labelHtml.includes('<img')
    choices.push({
      value: match[1],
      label: hasImgInChoice ? labelHtml : match[2].replace(/<[^>]+>/g, '').trim(),
      hasImage: hasImgInChoice
    })
  }

  const nameMatch = html.match(/name="(q\d+:\d+_answer)"/)
  const inputName = nameMatch ? nameMatch[1] : `q${q.slot}_answer`
  const seqMatch = html.match(/name="(q\d+:\d+_:sequencecheck)"\s+value="(\d+)"/)

  return {
    slot: q.slot,
    type: q.type,
    number: q.number,
    qtext,
    qtextIsHtml: hasImage,
    choices,
    inputName,
    seqName: seqMatch ? seqMatch[1] : null,
    seqValue: seqMatch ? seqMatch[2] : '1',
    maxmark: q.maxmark
  }
}

export async function POST(req: Request) {
  const { token, password } = await req.json()
  const { searchParams } = new URL(req.url)
  const quizId = searchParams.get('quizId')
  const base = process.env.NEXT_PUBLIC_MOODLE_URL

  try {
    // ── Cek attempt inprogress sebelum membuat yang baru ──
    const checkParams = new URLSearchParams({
      wstoken: token,
      wsfunction: 'mod_quiz_get_user_quiz_attempts', // WS yang benar untuk token siswa
      moodlewsrestformat: 'json',
      quizid: quizId!,
      userid: '0', // 0 = current user
      status: 'inprogress',
      includepreviews: '0',
    })
    const checkRes = await fetch(`${base}/webservice/rest/server.php`, {
      method: 'POST',
      body: checkParams,
    })
    const checkData = await checkRes.json()

    const hasActive = !checkData.exception &&
      checkData.attempts?.some((a: any) => a.state === 'inprogress')

    if (hasActive) {
      return NextResponse.json({ error: 'ATTEMPT_IN_PROGRESS' }, { status: 409 })
    }
    // ── END CHECK ──

    // Start attempt dengan password
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
      method: 'POST',
      body: startParams,
    })
    const attemptData = await attemptRes.json()
    if (attemptData.exception) throw new Error(attemptData.message)
    const attemptId = attemptData.attempt.id
    const totalPages = attemptData.attempt.layout.split('0,').length - 1

    // Fetch semua halaman soal dengan password
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
        method: 'POST',
        body: qParams,
      })
      const qData = await qRes.json()
      if (qData.questions) {
        allQuestions.push(...qData.questions.map(parseQuestion))
      }
    }

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
      quiz: { name: quiz?.name || 'Ujian', timelimit: quiz?.timelimit || 0 },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}