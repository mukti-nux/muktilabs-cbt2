import { NextResponse } from 'next/server'
import { moodleCall } from '@/lib/moodle'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const token = req.headers.get('x-token')

  if (!userId || !token) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  try {
    // Tambahkan token ke panggilan ini jika diperlukan autentikasi
    const coursesRes = await moodleCall('core_course_get_courses', {}, token)
    const courses = (coursesRes || []).filter((c: any) => c.id !== 1)

    const result: any[] = []

    for (const course of courses) {
      try {
        // Tambahkan token ke panggilan ini jika diperlukan autentikasi
        const quizRes = await moodleCall('mod_quiz_get_quizzes_by_courses', {
          'courseids[0]': String(course.id)
        }, token)

        for (const quiz of (quizRes.quizzes || [])) {
          try {
            const attRes = await moodleCall('mod_quiz_get_user_quiz_attempts', {
              quizid: String(quiz.id),
              userid: userId,
              status: 'all',
              includepreviews: '0'
            }, token)

            const attempts = attRes.attempts || []
            const latest = attempts.sort((a: any, b: any) => b.timestart - a.timestart)[0] || null

            result.push({
              quizId: quiz.id,
              quizName: quiz.name,
              courseId: course.id,
              courseName: course.fullname,
              timelimit: quiz.timelimit,
              timeopen: quiz.timeopen,
              timeclose: quiz.timeclose,
              maxgrade: quiz.grade,
              hasquestions: quiz.hasquestions,
              attempt: latest ? {
                id: latest.id,
                state: latest.state,
                timestart: latest.timestart,
                timefinish: latest.timefinish,
                sumgrades: latest.sumgrades,
              } : null
            })
          } catch {}
        }
      } catch {}
    }

    return NextResponse.json({ quizzes: result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}