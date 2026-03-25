import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { token } = await req.json()
  const { searchParams } = new URL(req.url)
  const attemptId = searchParams.get('attemptId')
  const base = process.env.NEXT_PUBLIC_MOODLE_URL

  try {
    await new Promise(r => setTimeout(r, 2000))

    const res = await fetch(
      `${base}/webservice/rest/server.php?wstoken=${token}&wsfunction=mod_quiz_get_attempt_review&moodlewsrestformat=json&attemptid=${attemptId}`
    )
    const data = await res.json()
    if (data.exception) throw new Error(data.message)

    console.log('FULL REVIEW:', JSON.stringify({
      grade: data.grade,
      attempt_sumgrades: data.attempt?.sumgrades,
      attempt_state: data.attempt?.state
    }))

    // data.grade = angka langsung (nilai akhir yang sudah diskala)
    // data.attempt.sumgrades = raw score soal
    // Cari maxgrade dari quiz
    const adminToken = process.env.MOODLE_TOKEN
    const quizRes = await fetch(
      `${base}/webservice/rest/server.php?wstoken=${adminToken}&wsfunction=mod_quiz_get_quizzes_by_courses&moodlewsrestformat=json&courseids[0]=4`
    )
    const quizData = await quizRes.json()
    const quiz = quizData.quizzes?.find((q: any) => q.id === data.attempt?.quiz)
    const maxgrade = quiz?.grade ?? 10

    const finalGrade = parseFloat(String(data.grade ?? 0))

    return NextResponse.json({
      sumgrades: finalGrade,
      maxgrade: maxgrade,
      grade: finalGrade,
      timestart: data.attempt?.timestart ?? 0,
      timefinish: data.attempt?.timefinish ?? 0,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}