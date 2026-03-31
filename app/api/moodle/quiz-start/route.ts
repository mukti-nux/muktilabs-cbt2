// @/app/api/moodle/quiz-start/route.ts
import { NextResponse } from 'next/server'
import { proxifyMoodleImages } from '@/lib/moodle'

// ── HELPER: hitung total halaman dari layout string Moodle ──
// Layout Moodle bisa berupa:
//   "1,2,3,0,4,5,0"  → tiap "0" = pemisah halaman
//   "1,2,3,0"        → 1 halaman
//   undefined / null → fallback fetch page 0 saja
function parseTotalPages(layout: string | undefined | null): number {
  if (!layout) return 1

  // Format standar: slot-slot dipisah koma, "0" = akhir halaman
  // Contoh: "3,1,2,0,5,6,7,0,..." → split by ",0" lalu buang entry kosong
  const pages = layout.split(',0').filter(p => p.length > 0)
  return pages.length > 0 ? pages.length : 1
}

function calculateTimeLeft(attempt: any, timelimit: number): number {
  if (!timelimit || timelimit <= 0) return 0

  const now = Math.floor(Date.now() / 1000)
  const startTime = attempt?.timestart || now
  const endTime = startTime + timelimit
  const remaining = endTime - now

  console.log('[calculateTimeLeft]', { timelimit, startTime, endTime, now, remaining: Math.max(0, remaining) })

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
  const answerRegex =
    /<input type="radio"[^>]*value="(\d+)"[^>]*>[\s\S]*?data-region="answer-label">([\s\S]*?)<\/div>\s*<\/div>/g
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

  const seqMatch = html.match(/name="(q\d+:\d+_:sequencecheck)"\s+value="(\d+)"/)

  console.log(
    `[parseQuestion] slot=${q.slot} inputName=${inputName} seqName=${seqMatch?.[1] ?? 'NOT FOUND'} seqValue=${seqMatch?.[2] ?? '-'}`
  )

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

// ── HELPER: ambil timelimit quiz via beberapa strategi ──
// Strategi 1: mod_quiz_get_quizzes_by_courses dengan courseId dari attempt
// Strategi 2: mod_quiz_get_quiz_access_information (hanya butuh quizId, token user)
// Strategi 3: cari di semua course yang di-enrol user
async function fetchTimelimit(
  base: string,
  adminToken: string,
  userToken: string,
  quizId: string,
  courseId: number | undefined
): Promise<{ timelimit: number; quizName: string; courseIdUsed: number | null }> {
  // Strategi 1 — pakai courseId dari attempt
  if (courseId) {
    const res = await fetch(
      `${base}/webservice/rest/server.php?wstoken=${adminToken}&wsfunction=mod_quiz_get_quizzes_by_courses&moodlewsrestformat=json&courseids[0]=${courseId}`
    )
    const data = await res.json()
    const quiz = data.quizzes?.find((q: any) => q.id === Number(quizId))
    if (quiz) {
      console.log(`[fetchTimelimit] S1 found: courseId=${courseId} timelimit=${quiz.timelimit}`)
      return { timelimit: quiz.timelimit ?? 0, quizName: quiz.name ?? 'Ujian', courseIdUsed: courseId }
    }
    console.log(`[fetchTimelimit] S1 miss: courseId=${courseId} → trying S2`)
  }

  // Strategi 2 — mod_quiz_get_quiz_required_qtypes tidak punya timelimit,
  // tapi mod_quiz_get_quiz_access_information punya field timeclosed & timelimit
  // Moodle 3.9+: core_course_get_contents tidak butuh admin token
  // Fallback paling reliable: gunakan admin token + quizId langsung via mod_quiz_get_quizzes_by_courses
  // dengan semua courseId yang relevan
  //
  // Strategi 2: coba course 1..20 secara batch (jarang diperlukan, tapi jamin ketemu)
  const batchSize = 5
  for (let start = 1; start <= 30; start += batchSize) {
    const params = new URLSearchParams({
      wstoken: adminToken,
      wsfunction: 'mod_quiz_get_quizzes_by_courses',
      moodlewsrestformat: 'json',
    })
    for (let i = 0; i < batchSize; i++) {
      params.set(`courseids[${i}]`, String(start + i))
    }
    const res = await fetch(`${base}/webservice/rest/server.php?${params}`)
    const data = await res.json()
    const quiz = data.quizzes?.find((q: any) => q.id === Number(quizId))
    if (quiz) {
      console.log(`[fetchTimelimit] S2 found in courseId range ${start}-${start + batchSize - 1}: timelimit=${quiz.timelimit}`)
      return { timelimit: quiz.timelimit ?? 0, quizName: quiz.name ?? 'Ujian', courseIdUsed: null }
    }
  }

  console.warn(`[fetchTimelimit] Quiz ${quizId} not found in any course, timelimit=0`)
  return { timelimit: 0, quizName: 'Ujian', courseIdUsed: null }
}

export async function POST(req: Request) {
  const { token, password } = await req.json()
  const { searchParams } = new URL(req.url)
  const quizId = searchParams.get('quizId')
  const base = process.env.NEXT_PUBLIC_MOODLE_URL

  if (!base) return NextResponse.json({ error: 'MOODLE_URL not configured' }, { status: 500 })
  if (!token) return NextResponse.json({ error: 'User token required' }, { status: 401 })

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
    const checkRes = await fetch(`${base}/webservice/rest/server.php`, { method: 'POST', body: checkParams })
    const checkData = await checkRes.json()
    const hasActive =
      !checkData.exception && checkData.attempts?.some((a: any) => a.state === 'inprogress')
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
    const attemptRes = await fetch(`${base}/webservice/rest/server.php`, { method: 'POST', body: startParams })
    const attemptData = await attemptRes.json()

    if (attemptData.exception) throw new Error(attemptData.message)

    // ── Debug: log seluruh attempt object agar bisa lihat field apa saja tersedia ──
    console.log('[quiz-start] attempt object keys:', Object.keys(attemptData.attempt || {}))
    console.log('[quiz-start] attempt.layout:', attemptData.attempt?.layout)
    console.log('[quiz-start] attempt.courseid:', attemptData.attempt?.courseid)

    const attemptId = attemptData.attempt.id
    // courseid bisa undefined di beberapa versi Moodle — fallback ke null
    const courseId: number | undefined = attemptData.attempt.courseid ?? undefined

    // ── FIX: layout bisa undefined, null, atau string kosong ──
    const layoutRaw: string | undefined = attemptData.attempt?.layout
    const totalPages = parseTotalPages(layoutRaw)

    console.log('[quiz-start] attemptId:', attemptId, 'courseId:', courseId, 'layout:', layoutRaw, 'totalPages:', totalPages)

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
      const qRes = await fetch(`${base}/webservice/rest/server.php`, { method: 'POST', body: qParams })
      const qData = await qRes.json()

      // ── Jika totalPages=1 tapi ternyata ada nextpage, lanjut fetch ──
      if (qData.questions) {
        allQuestions.push(...qData.questions.map((q: any) => parseQuestion(q, base, token)))
      }

      // Kalau tidak ada soal di halaman ini dan bukan halaman pertama, stop
      if (!qData.questions?.length && page > 0) break
    }

    allQuestions.sort((a, b) => a.number - b.number)

    // ── FIX: Ambil timelimit via multi-strategi ──
    const adminToken = process.env.MOODLE_TOKEN!
    const { timelimit, quizName } = await fetchTimelimit(base, adminToken, token, quizId!, courseId)

    console.log('[quiz-start] timelimit:', timelimit, 'quizName:', quizName)

    const timeLeft = calculateTimeLeft(attemptData.attempt, timelimit)

    return NextResponse.json({
      attemptId,
      questions: allQuestions,
      quiz: { name: quizName, timelimit },
      timeLeft,
    })
  } catch (error: any) {
    console.error('[quiz-start] error:', error)
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}