import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { token } = await req.json()
  const { searchParams } = new URL(req.url)
  const attemptId = searchParams.get('attemptId')
  const base = process.env.NEXT_PUBLIC_MOODLE_URL

  try {
    // ✅ FIX: Ganti hardcoded delay 2000ms dengan retry logic
    // Moodle kadang butuh waktu untuk menghitung nilai setelah attempt selesai
    let data: any = null
    let attempts = 0
    const maxAttempts = 5

    while (attempts < maxAttempts) {
      const res = await fetch(
        `${base}/webservice/rest/server.php?wstoken=${token}&wsfunction=mod_quiz_get_attempt_review&moodlewsrestformat=json&attemptid=${attemptId}`
      )
      data = await res.json()

      if (data.exception) throw new Error(data.message)

      // Kalau state sudah 'finished', langsung lanjut
      if (data.attempt?.state === 'finished') break

      // Kalau belum, tunggu sebentar lalu retry
      attempts++
      if (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 1000))
      }
    }

    console.log('FULL REVIEW:', JSON.stringify({
      grade: data.grade,
      attempt_sumgrades: data.attempt?.sumgrades,
      attempt_state: data.attempt?.state,
      attempt_quiz: data.attempt?.quiz,
    }))

    // ── Ambil info quiz untuk maxgrade ──
    const adminToken = process.env.MOODLE_TOKEN
    const quizRes = await fetch(
      `${base}/webservice/rest/server.php?wstoken=${adminToken}&wsfunction=mod_quiz_get_quizzes_by_courses&moodlewsrestformat=json&courseids[0]=4`
    )
    const quizData = await quizRes.json()
    const quiz = quizData.quizzes?.find((q: any) => q.id === data.attempt?.quiz)

    // ✅ FIX kalkulasi nilai:
    // - data.grade     = nilai FINAL yang sudah diskala ke maxgrade (misal: 8.5 dari 10)
    // - data.attempt.sumgrades = raw score soal (misal: 17 dari 20 soal)
    // - quiz.grade     = maxgrade yang dikonfigurasi guru (misal: 10 atau 100)
    // - quiz.sumgrades = total raw score maksimal semua soal
    //
    // Yang paling reliable untuk tampilan: pakai data.grade (sudah diskala)
    // dan quiz.grade sebagai maxgrade-nya

    const maxgrade = parseFloat(String(quiz?.grade ?? 10))
    const finalGrade = parseFloat(String(data.grade ?? 0)) // sudah dalam skala maxgrade

    // sumgrades untuk referensi (raw)
    const rawSumgrades = parseFloat(String(data.attempt?.sumgrades ?? 0))
    const rawMaxSumgrades = parseFloat(String(quiz?.sumgrades ?? maxgrade))

    console.log('NILAI:', { finalGrade, maxgrade, rawSumgrades, rawMaxSumgrades })

    return NextResponse.json({
      // ✅ grade dan maxgrade konsisten: finalGrade sudah dalam skala maxgrade
      grade: finalGrade,
      maxgrade: maxgrade,
      // sumgrades kita set sama dengan grade agar kalkulasi pct di frontend tidak salah
      // (sebelumnya sumgrades=grade yg sudah diskala, tapi maxgrade=10 → 85/10*100=850%)
      sumgrades: finalGrade,
      // raw score kalau dibutuhkan
      rawSumgrades,
      rawMaxSumgrades,
      timestart: data.attempt?.timestart ?? 0,
      timefinish: data.attempt?.timefinish ?? 0,
    })
  } catch (err: any) {
    console.error('quiz-result error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}