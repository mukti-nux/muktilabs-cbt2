// @/app/api/moodle/quiz-result/route.ts
import { NextResponse } from 'next/server'

async function findQuiz(
  base: string,
  adminToken: string,
  quizId: number,
  courseId: number | undefined
): Promise<any | null> {
  if (courseId) {
    const res = await fetch(
      `${base}/webservice/rest/server.php?wstoken=${adminToken}&wsfunction=mod_quiz_get_quizzes_by_courses&moodlewsrestformat=json&courseids[0]=${courseId}`
    )
    const data = await res.json()
    const quiz = data.quizzes?.find((q: any) => q.id === quizId)
    if (quiz) {
      console.log(`[findQuiz] S1 found: courseId=${courseId} quizId=${quizId} grade=${quiz.grade}`)
      return quiz
    }
    console.log(`[findQuiz] S1 miss courseId=${courseId}, trying batch scan`)
  }

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
    const quiz = data.quizzes?.find((q: any) => q.id === quizId)
    if (quiz) {
      console.log(`[findQuiz] S2 found in range ${start}-${start + batchSize - 1}: grade=${quiz.grade}`)
      return quiz
    }
  }

  console.warn(`[findQuiz] Quiz ${quizId} not found in any course`)
  return null
}

export async function POST(req: Request) {
  const { token } = await req.json()
  const { searchParams } = new URL(req.url)
  const attemptId = searchParams.get('attemptId')
  const base = process.env.NEXT_PUBLIC_MOODLE_URL
  const adminToken = process.env.MOODLE_TOKEN

  if (!token || !attemptId) {
    return NextResponse.json({ error: 'Missing token or attemptId' }, { status: 400 })
  }
  if (!base) {
    return NextResponse.json({ error: 'MOODLE_URL not configured' }, { status: 500 })
  }
  if (!adminToken) {
    return NextResponse.json({ error: 'MOODLE_TOKEN not configured' }, { status: 500 })
  }

  try {
    let data: any = null
    const maxAttempts = 8
    const delayMs = 1500

    for (let i = 0; i < maxAttempts; i++) {
      const res = await fetch(
        `${base}/webservice/rest/server.php?wstoken=${token}&wsfunction=mod_quiz_get_attempt_review&moodlewsrestformat=json&attemptid=${attemptId}`
      )
      data = await res.json()

      console.log(`[quiz-result] attempt #${i + 1} state:`, data.attempt?.state, 'exception:', data.exception)

      if (data.exception) {
        if (data.errorcode === 'noreview' || data.message?.includes('not closed')) {
          if (i < maxAttempts - 1) {
            await new Promise(r => setTimeout(r, delayMs))
            continue
          }
        }
        throw new Error(data.message)
      }

      if (data.attempt?.state === 'finished') break

      if (i < maxAttempts - 1) {
        await new Promise(r => setTimeout(r, delayMs))
      }
    }

    if (!data || data.exception) {
      throw new Error(data?.message || 'Attempt belum selesai, coba refresh halaman.')
    }

    console.log('[quiz-result] final state:', data.attempt?.state)
    console.log('[quiz-result] data.grade:', data.grade, 'attempt.sumgrades:', data.attempt?.sumgrades)

    const courseId: number | undefined = data.attempt?.courseid ?? undefined
    const quizId: number = data.attempt?.quiz

    console.log('[quiz-result] courseId from attempt:', courseId, 'quizId:', quizId)

    const quiz = await findQuiz(base, adminToken, quizId, courseId)

    const rawSumgrades = parseFloat(String(data.attempt?.sumgrades ?? 0))
    const rawMaxSumgrades: number = data.questions
      ? data.questions.reduce((acc: number, q: any) => acc + parseFloat(String(q.maxmark ?? 0)), 0)
      : 0

    let finalGrade: number
    let maxgrade: number

    if (quiz) {
      maxgrade = parseFloat(String(quiz.grade))
      finalGrade = parseFloat(String(data.grade ?? 0))
    } else {
      console.warn('[quiz-result] quiz not found, computing grade from raw scores')
      maxgrade = 100
      finalGrade = rawMaxSumgrades > 0
        ? Math.round((rawSumgrades / rawMaxSumgrades) * 100 * 100) / 100
        : parseFloat(String(data.grade ?? 0))
    }

    console.log('[quiz-result] finalGrade:', finalGrade, 'maxgrade:', maxgrade, 'rawSumgrades:', rawSumgrades, 'rawMaxSumgrades:', rawMaxSumgrades)

    return NextResponse.json({
      grade: finalGrade,
      maxgrade,
      rawSumgrades,
      rawMaxSumgrades,
      timestart: data.attempt?.timestart ?? 0,
      timefinish: data.attempt?.timefinish ?? 0,
    })
  } catch (err: any) {
    console.error('[quiz-result] ERROR:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}