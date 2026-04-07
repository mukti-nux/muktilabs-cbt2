import { NextResponse } from 'next/server'
import { moodleCall } from '@/lib/moodle'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const courseId = searchParams.get('courseId')
  if (!courseId) return NextResponse.json({ error: 'courseId required' }, { status: 400 })

  try {
    // Get quizzes for this specific course
    const quizData = await moodleCall('mod_quiz_get_quizzes_by_courses', { 
      'courseids[0]': courseId 
    })
    console.log('[quizzes route] quizData:', quizData)

    // Get course info - simpler API without complex options
    let courseName = ''
    try {
      const courses = await moodleCall('core_course_get_courses')
      const course = (courses || []).find((c: any) => c.id === Number(courseId))
      courseName = course?.fullname || ''
    } catch (e) {
      console.log('[quizzes route] course lookup error:', e)
    }

    return NextResponse.json({
      quizzes: quizData.quizzes || [],
      courseName
    })
  } catch (err: any) {
    console.error('[quizzes route] error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
