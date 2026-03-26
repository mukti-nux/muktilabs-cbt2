import { NextResponse } from 'next/server'
import { moodleCall } from '@/lib/moodle'

export async function GET() {
  try {
    const [users, courses] = await Promise.all([
      moodleCall('core_user_get_users', { 'criteria[0][key]': 'email', 'criteria[0][value]': '%' }),
      moodleCall('core_course_get_courses'),
    ])

    const quizzesRes = await moodleCall('mod_quiz_get_quizzes_by_courses', { 'courseids[0]': '4' })

    return NextResponse.json({
      totalUsers: users.users?.length || 0,
      totalQuizzes: quizzesRes.quizzes?.length || 0,
      totalAttempts: 0,
      activeNow: 0,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}