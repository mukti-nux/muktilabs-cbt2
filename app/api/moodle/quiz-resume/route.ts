// /api/moodle/quiz-resume/route.ts
import { NextResponse } from 'next/server'
import { proxifyMoodleImages } from '@/lib/moodle'

// ✅ FIX: parseQuestion konsisten dengan quiz-start — terima base & userToken
function parseQuestion(q: any, base: string, userToken: string) {
  const html = q.html || ''

  const qtextMatch = html.match(/<div class="qtext">([\s\S]*?)<\/div>/)
  const qtextRaw = qtextMatch ? qtextMatch[1] : ''
  // ✅ FIX: pass userToken agar gambar di-proxify dengan benar
  const qtextProxified = proxifyMoodleImages(qtextRaw, base, userToken)
  const hasImage = qtextProxified.includes('<img')
  const qtext = hasImage
    ? qtextProxified
    : qtextRaw.replace(/<[^>]+>/g, '').trim()

  const choices: { value: string; label: string; hasImage: boolean }[] = []
  // Pakai regex yang sama dengan quiz-start (data-region="answer-label")
  const answerRegex =
    /<input type="radio"[^>]*value="(\d+)"[^>]*>[\s\S]*?data-region="answer-label">([\s\S]*?)<\/div>\s*<\/div>/g
  let match
  while ((match = answerRegex.exec(html)) !== null) {
    // ✅ FIX: pass userToken
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

  const seqMatch = html.match(/name="(q\d+:\d+_:sequencecheck)"\s+value="(\d+)"/)

  console.log(`[resume/parseQuestion] slot=${q.slot} inputName=${inputName} seqName=${seqMatch?.[1] ?? 'NOT FOUND'}`)

  // Restore jawaban lama siswa jika ada
  const checkedMatch = html.match(/<input type="radio"[^>]*checked[^>]*value="(\d+)"/)
  const selectedMatch = html.match(/class="[^"]*selected[^"]*"[\s\S]*?value="(\d+)"/)
  const previousAnswer = checkedMatch?.[1] ?? selectedMatch?.[1] ?? null

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
    previousAnswer,
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
    // 1. Cari attempt inprogress
    const attemptsParams = new URLSearchParams({
      wstoken: token,
      wsfunction: 'mod_quiz_get_user_quiz_attempts',
      moodlewsrestformat: 'json',
      quizid: quizId!,
      userid: '0',
      status: 'inprogress',
      includepreviews: '0',
    })
    const attemptsRes = await fetch(`${base}/webservice/rest/server.php`, {
      method: 'POST',
      body: attemptsParams,
    })
    const attemptsData = await attemptsRes.json()

    let inprogressAttempt: any = null
    if (!attemptsData.exception && attemptsData.attempts?.length > 0) {
      inprogressAttempt = attemptsData.attempts
        .filter((a: any) => a.state === 'inprogress')
        .sort((a: any, b: any) => b.timestart - a.timestart)[0] || null
    }

    if (!inprogressAttempt) {
      return NextResponse.json(
        { error: 'Tidak ada ujian yang sedang berjalan.' },
        { status: 404 }
      )
    }

    const attemptId = inprogressAttempt.id
    // ✅ Ambil courseId dari attempt — dipakai untuk fetch quiz info
    const courseId = inprogressAttempt.courseid

    const layoutStr = inprogressAttempt.layout || ''
    const totalPages = layoutStr ? layoutStr.split(',0').filter(Boolean).length || 1 : 1

    console.log('[quiz-resume] attemptId:', attemptId, 'courseId:', courseId, 'totalPages:', totalPages)

    // 2. Fetch semua halaman soal
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
        // ✅ FIX: pass base dan token (bukan parseQuestion tanpa args)
        allQuestions.push(...qData.questions.map((q: any) => parseQuestion(q, base, token)))
      }
    }

    allQuestions.sort((a, b) => a.number - b.number)

    // 3. ✅ FIX: Ambil quiz info pakai courseId dari attempt, bukan hardcode 4
    const adminToken = process.env.MOODLE_TOKEN
    const quizRes = await fetch(
      `${base}/webservice/rest/server.php?wstoken=${adminToken}&wsfunction=mod_quiz_get_quizzes_by_courses&moodlewsrestformat=json&courseids[0]=${courseId}`
    )
    const quizData = await quizRes.json()
    const quiz = quizData.quizzes?.find((q: any) => q.id === Number(quizId))

    console.log('[quiz-resume] quiz found:', quiz ? `id=${quiz.id} timelimit=${quiz.timelimit}` : 'NOT FOUND')

    // 4. Hitung sisa waktu
    const timelimit = quiz?.timelimit ?? inprogressAttempt.timelimit ?? 0
    let timeLeft = 0
    if (timelimit > 0 && inprogressAttempt.timestart) {
      const nowSec = Math.floor(Date.now() / 1000)
      timeLeft = Math.max(0, timelimit - (nowSec - inprogressAttempt.timestart))
      console.log('[quiz-resume] timelimit:', timelimit, 'timeLeft:', timeLeft)
    }

    return NextResponse.json({
      attemptId,
      questions: allQuestions,
      quiz: { name: quiz?.name || 'Ujian', timelimit },
      timeLeft,
      resumed: true,
    })
  } catch (err: any) {
    console.error('[quiz-resume] ERROR:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}