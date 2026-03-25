import { NextResponse } from 'next/server'
import { moodleCall } from '@/lib/moodle'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const courseId = searchParams.get('courseId')
  if (!courseId) return NextResponse.json({ error: 'courseId required' }, { status: 400 })

  try {
    const [quizData, courseData] = await Promise.all([
      moodleCall('mod_quiz_get_quizzes_by_courses', { 'courseids[0]': courseId }),
      moodleCall('core_course_get_courses', { 'options[ids][0]': courseId })
    ])

    return NextResponse.json({
      quizzes: quizData.quizzes || [],
      courseName: courseData[0]?.fullname || ''
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}