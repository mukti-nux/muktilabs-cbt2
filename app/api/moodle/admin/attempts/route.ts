import { NextResponse } from 'next/server'
import { moodleCall } from '@/lib/moodle'

export async function GET() {
  try {
    const coursesRes = await moodleCall('core_course_get_courses')
    const courses = (coursesRes || []).filter((c: any) => c.id !== 1)

    const allQuizzes: any[] = []
    for (const course of courses) {
      try {
        const q = await moodleCall('mod_quiz_get_quizzes_by_courses', {
          'courseids[0]': String(course.id)
        })
        allQuizzes.push(...(q.quizzes || []))
      } catch {}
    }

    // Ambil semua user dulu
    const usersRes = await moodleCall('core_user_get_users', {
      'criteria[0][key]': 'email',
      'criteria[0][value]': '%'
    })
    const users = usersRes.users || []

    const allAttempts: any[] = []
    for (const quiz of allQuizzes) {
      for (const user of users) {
        try {
          const res = await moodleCall('mod_quiz_get_user_quiz_attempts', {
            quizid: String(quiz.id),
            userid: String(user.id),
            status: 'all',
            includepreviews: '0'
          })
          const attempts = (res.attempts || []).map((a: any) => ({
            ...a,
            userfullname: user.fullname,
            quiz: quiz.name,
          }))
          allAttempts.push(...attempts)
        } catch {}
      }
    }

    allAttempts.sort((a, b) => b.timestart - a.timestart)
    return NextResponse.json({ attempts: allAttempts })
  } catch (err: any) {
    console.error('ATTEMPTS ERROR:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}