// @/app/api/moodle/quiz-start/route.ts
import { NextResponse } from 'next/server'
import { proxifyMoodleImages } from '@/lib/moodle'

function calculateTimeLeft(attempt: any, timelimit: number): number {
  // ✅ FIX: timelimit dari Moodle dalam satuan DETIK
  // Kalau 0 atau tidak ada → quiz tanpa batas waktu
  if (!timelimit || timelimit <= 0) return 0

  const now = Math.floor(Date.now() / 1000)
  const startTime = attempt?.timestart || now
  const endTime = startTime + timelimit
  const remaining = endTime - now

  console.log('[calculateTimeLeft]', {
    timelimit,
    startTime,
    endTime,
    now,
    remaining: Math.max(0, remaining),
  })

  return Math.max(0, remaining)
}

function parseQuestion(q: any, base: string, userToken: string) {
  const html = q.html || ''

  const qtextMatch = html.match(/<div class="qtext">([\s\S]*?)<\/div>/)
  const qtextRaw = qtextMatch ? qtextMatch[1] : ''
  const qtextProxified = proxifyMoodleImages(qtextRaw, base, userToken)
  const hasImage = qtextProxified.includes('<img')
  const qtext = hasImage
    ? qtextProxified
    : qtextRaw.replace(/<[^>]+>/g, '').trim()

  const choices: { value: string; label: string; hasImage: boolean }[] = []
  const answerRegex = /<input type="radio"[^>]*value="(\d+)"[^>]*>[\s\S]*?data-region="answer-label">([\s\S]*?)<\/div>\s*<\/div>/g
  let match
  while ((match = answerRegex.exec(html)) !== null) {
    const labelHtml = proxifyMoodleImages(match[2], base, userToken)
    const hasImgInChoice = labelHtml.includes('<img')
    choices.push({
      value: match[1],
      label: hasImgInChoice ? labelHtml : match[2].replace(/<[^>]+>/g, '').trim(),
      hasImage: hasImgInChoice,
    })
  }

  const nameMatch = html.match(/name="(q\d+:\d+_answer)"/)
  const inputName = nameMatch ? nameMatch[1] : `q${q.slot}_answer`

  // ✅ FIX: Perluas regex sequencecheck — Moodle kadang pakai format berbeda
  // Format 1: q1:1_:sequencecheck
  // Format 2: q1:2_:sequencecheck  
  const seqMatch = html.match(/name="(q\d+:\d+_:sequencecheck)"\s+value="(\d+)"/)

  console.log(`[parseQuestion] slot=${q.slot} inputName=${inputName} seqName=${seqMatch?.[1] ?? 'NOT FOUND'} seqValue=${seqMatch?.[2] ?? '-'}`)

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
    maxmark: q.maxmark,
  }
}

export async function POST(req: Request) {
  const { token, password } = await req.json()
  const { searchParams } = new URL(req.url)
  const quizId = searchParams.get('quizId')
  const base = process.env.NEXT_PUBLIC_MOODLE_URL

  if (!base) {
    return NextResponse.json({ error: 'MOODLE_URL not configured' }, { status: 500 })
  }
  if (!token) {
    return NextResponse.json({ error: 'User token required' }, { status: 401 })
  }

  try {
    // ── Cek attempt inprogress ──
    const checkParams = new URLSearchParams({
      wstoken: token,
      wsfunction: 'mod_quiz_get_user_quiz_attempts',
      moodlewsrestformat: 'json',
      quizid: quizId!,
      userid: '0',
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

    // ── Start attempt ──
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
    const courseId = attemptData.attempt.courseid  // ✅ FIX: ambil courseId dari attempt, bukan hardcode
    const totalPages = attemptData.attempt.layout.split('0,').length - 1

    console.log('[quiz-start] attemptId:', attemptId, 'courseId:', courseId, 'totalPages:', totalPages)

    // ── Fetch soal semua halaman ──
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
        allQuestions.push(...qData.questions.map((q: any) => parseQuestion(q, base, token)))
      }
    }

    allQuestions.sort((a, b) => a.number - b.number)

    // ── ✅ FIX: Ambil quiz info pakai courseId dari attempt, bukan hardcode 4 ──
    const adminToken = process.env.MOODLE_TOKEN
    const quizRes = await fetch(
      `${base}/webservice/rest/server.php?wstoken=${adminToken}&wsfunction=mod_quiz_get_quizzes_by_courses&moodlewsrestformat=json&courseids[0]=${courseId}`
    )
    const quizData = await quizRes.json()
    const quiz = quizData.quizzes?.find((q: any) => q.id === Number(quizId))

    console.log('[quiz-start] quiz found:', quiz ? `id=${quiz.id} name=${quiz.name} timelimit=${quiz.timelimit}` : 'NOT FOUND')
    console.log('[quiz-start] attempt timestart:', attemptData.attempt.timestart)

    // ✅ FIX: timelimit Moodle sudah dalam detik, langsung pakai
    const timelimit = quiz?.timelimit ?? 0
    const timeLeft = calculateTimeLeft(attemptData.attempt, timelimit)

    return NextResponse.json({
      attemptId,
      questions: allQuestions,
      quiz: {
        name: quiz?.name || 'Ujian',
        timelimit,
      },
      timeLeft,
    })
  } catch (error: any) {
    console.error('[quiz-start] error:', error)
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}