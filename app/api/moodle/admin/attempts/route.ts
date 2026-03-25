import { NextResponse } from 'next/server'
import { moodleCall } from '@/lib/moodle'

export async function GET() {
  try {
    const quizzesRes = await moodleCall('mod_quiz_get_quizzes_by_courses', { 'courseids[0]': '4' })
    const quizzes = quizzesRes.quizzes || []

    const allAttempts: any[] = []
    for (const quiz of quizzes) {
      try {
        const attRes = await moodleCall('mod_quiz_get_user_quiz_attempts', {
          quizid: String(quiz.id),
          userid: '0',
          status: 'all',
          includepreviews: '0'
        })
        const attempts = (attRes.attempts || []).map((a: any) => ({
          ...a,
          quiz: quiz.name
        }))
        allAttempts.push(...attempts)
      } catch {}
    }

    allAttempts.sort((a, b) => b.timestart - a.timestart)
    return NextResponse.json({ attempts: allAttempts })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
