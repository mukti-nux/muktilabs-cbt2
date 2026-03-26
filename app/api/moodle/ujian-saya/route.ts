import { NextResponse } from 'next/server'
import { moodleCall } from '@/lib/moodle'

export async function GET(req: Request) {
  try {

    const { searchParams } = new URL(req.url)
    const userid = searchParams.get('userid')

    // ambil courses
    const coursesRes = await moodleCall('core_course_get_courses')
    const courses = (coursesRes || []).filter((c: any) => c.id !== 1)

    // ambil quizzes
    const allQuizzes: any[] = []
    for (const course of courses) {
      const q = await moodleCall('mod_quiz_get_quizzes_by_courses', {
        'courseids[0]': String(course.id)
      })
      allQuizzes.push(...(q.quizzes || []))
    }

    // ambil attempts (route kamu)
    const attemptsRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/moodle/admin/attempts`)
    const attemptsData = await attemptsRes.json()

    const userAttempts = attemptsData.attempts.filter(
      (a: any) => String(a.userid) === String(userid)
    )

    const exams = allQuizzes.map((quiz: any) => {
      const attempt = userAttempts.find(
        (a: any) => a.quizid === quiz.id
      )

      return {
        id: quiz.id,
        fullname: quiz.name,
        shortname: quiz.course,
        status: !attempt
          ? 'belum'
          : attempt.state === 'finished'
          ? 'selesai'
          : 'sedang',
        score: attempt?.sumgrades ?? null
      }
    })

    return NextResponse.json(exams)

  } catch (err: any) {
    console.error('UJIAN SAYA ERROR:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}