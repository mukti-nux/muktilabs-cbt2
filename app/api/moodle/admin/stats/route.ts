import { NextResponse } from 'next/server'
import { moodleCall } from '@/lib/moodle'

export async function GET() {
  try {
    const [users, coursesRes] = await Promise.all([
      moodleCall('core_user_get_users', {
        'criteria[0][key]': 'email',
        'criteria[0][value]': '%'
      }),
      moodleCall('core_course_get_courses')
    ])

    const courses = (coursesRes || []).filter((c: any) => c.id !== 1)

    let totalQuizzes = 0
    let totalAttempts = 0
    let activeNow = 0

    for (const course of courses) {
      try {
        const q = await moodleCall('mod_quiz_get_quizzes_by_courses', {
          'courseids[0]': String(course.id)
        })
        const quizzes = q.quizzes || []
        totalQuizzes += quizzes.length

        for (const quiz of quizzes) {
          try {
            const a = await moodleCall('mod_quiz_get_user_quiz_attempts', {
              quizid: String(quiz.id),
              userid: '0',
              status: 'all',
              includepreviews: '0'
            })
            totalAttempts += a.attempts?.length || 0
            activeNow += (a.attempts || []).filter((x: any) => x.state === 'inprogress').length
          } catch {}
        }
      } catch {}
    }

    return NextResponse.json({
      totalUsers: users.users?.length || 0,
      totalQuizzes,
      totalAttempts,
      activeNow,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}