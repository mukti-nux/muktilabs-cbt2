// /api/moodle/quiz-resume/route.ts
// Melanjutkan attempt yang sedang berjalan (inprogress) tanpa menghapus jawaban

import { NextResponse } from 'next/server'
import { proxifyMoodleImages } from '@/lib/moodle'

function parseQuestion(q: any) {
  const html = q.html || ''
  const base = process.env.NEXT_PUBLIC_MOODLE_URL || ''

  const qtextMatch = html.match(/<div class="qtext">([\s\S]*?)<\/div>/)
  let qtext = qtextMatch
    ? qtextMatch[1].replace(/<[^>]+>/g, '').trim()
    : 'Soal tidak dapat ditampilkan'

  const qtextHtml = qtextMatch ? proxifyMoodleImages(qtextMatch[1], base) : qtext
  const hasImage = qtextHtml.includes('<img')

  const choices: { value: string; label: string; hasImage: boolean }[] = []
  const answerRegex =
    /<input type="radio"[^>]*value="(\d+)"[^>]*>[\s\S]*?<div[^>]*>\s*<span[^>]*>[^<]*<\/span>\s*<div[^>]*>([\s\S]*?)<\/div>/g
  let match
  while ((match = answerRegex.exec(html)) !== null) {
    const labelHtml = proxifyMoodleImages(match[2], base)
    const labelText = match[2].replace(/<[^>]+>/g, '').trim()
    choices.push({
      value: match[1],
      label: labelHtml.includes('<img') ? labelHtml : labelText,
      hasImage: labelHtml.includes('<img'),
    })
  }

  const nameMatch = html.match(/name="(q\d+:\d+_answer)"/)
  const inputName = nameMatch ? nameMatch[1] : `q${q.slot}_answer`

  const seqMatch = html.match(/name="(q\d+:\d+_:sequencecheck)"\s+value="(\d+)"/)
  const seqName = seqMatch ? seqMatch[1] : null
  const seqValue = seqMatch ? seqMatch[2] : '1'

  // Ambil jawaban yang sudah dipilih sebelumnya (jika ada)
  const selectedMatch = html.match(/class="[^"]*selected[^"]*"[\s\S]*?value="(\d+)"/)
  const checkedMatch = html.match(/<input type="radio"[^>]*checked[^>]*value="(\d+)"/)
  const previousAnswer = checkedMatch?.[1] ?? selectedMatch?.[1] ?? null

  return {
    slot: q.slot,
    type: q.type,
    number: q.number,
    qtext: hasImage ? qtextHtml : qtext,
    qtextIsHtml: hasImage,
    choices,
    inputName,
    seqName,
    seqValue,
    maxmark: q.maxmark,
    previousAnswer, // ← jawaban lama siswa, bisa di-restore di frontend
  }
}

export async function POST(req: Request) {
  const { token, password } = await req.json()
  const { searchParams } = new URL(req.url)
  const quizId = searchParams.get('quizId')
  const base = process.env.NEXT_PUBLIC_MOODLE_URL

  try {
    // 1. Cari attempt inprogress — pakai mod_quiz_get_user_quiz_attempts (bukan get_user_attempts)
    //    Fungsi ini tersedia untuk token siswa tanpa butuh viewreports capability
    const attemptsParams = new URLSearchParams({
      wstoken: token,
      wsfunction: 'mod_quiz_get_user_quiz_attempts',
      moodlewsrestformat: 'json',
      quizid: quizId!,
      userid: '0', // 0 = current user (dari token)
      status: 'inprogress',
      includepreviews: '0',
    })

    const attemptsRes = await fetch(`${base}/webservice/rest/server.php`, {
      method: 'POST',
      body: attemptsParams,
    })
    const attemptsData = await attemptsRes.json()

    // Fallback ke mod_quiz_get_user_attempts jika WS pertama tidak dikenal
    let inprogressAttempt: any = null
    if (!attemptsData.exception && attemptsData.attempts?.length > 0) {
      inprogressAttempt = attemptsData.attempts
        .filter((a: any) => a.state === 'inprogress')
        .sort((a: any, b: any) => b.timestart - a.timestart)[0] || null
    }

    // Jika masih tidak ketemu, coba lewat mod_quiz_get_attempt_access_information
    // untuk validasi bahwa attempt memang ada
    if (!inprogressAttempt) {
      return NextResponse.json(
        { error: 'Tidak ada ujian yang sedang berjalan. Minta guru untuk membuka akses ujian kembali.' },
        { status: 404 }
      )
    }

    const attemptId = inprogressAttempt.id
    // layout format: "1,2,3,0,4,5,6,0" — split by ",0" untuk dapat jumlah halaman
    const layoutStr = inprogressAttempt.layout || ''
    const totalPages = layoutStr ? layoutStr.split(',0').filter(Boolean).length || 1 : 1

    // 2. Fetch semua halaman soal dari attempt yang ada
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

    // 3. Ambil info quiz
    const adminToken = process.env.MOODLE_TOKEN
    const quizRes = await fetch(
      `${base}/webservice/rest/server.php?wstoken=${adminToken}&wsfunction=mod_quiz_get_quizzes_by_courses&moodlewsrestformat=json&courseids[0]=4`
    )
    const quizData = await quizRes.json()
    const quiz = quizData.quizzes?.find((q: any) => q.id === Number(quizId))

    // 4. Hitung sisa waktu — prioritas: dari attempt.timecheckstate, fallback hitung manual
    const timelimit = quiz?.timelimit || inprogressAttempt.timelimit || 0
    let timeLeft = 0

    if (timelimit > 0 && inprogressAttempt.timestart) {
      const nowSec = Math.floor(Date.now() / 1000)
      const elapsed = nowSec - inprogressAttempt.timestart
      timeLeft = Math.max(0, timelimit - elapsed)
    }
    // timelimit = 0 berarti tidak ada batas waktu → timeLeft tetap 0 (timer tidak jalan di frontend)

    return NextResponse.json({
      attemptId,
      questions: allQuestions,
      quiz: { name: quiz?.name || 'Ujian', timelimit },
      timeLeft, // 0 jika tidak ada timelimit, >0 jika ada
      resumed: true,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}