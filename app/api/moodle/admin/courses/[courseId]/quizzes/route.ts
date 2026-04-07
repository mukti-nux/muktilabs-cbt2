// /api/moodle/admin/courses/[courseId]/quizzes/route.ts
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

const base = process.env.NEXT_PUBLIC_MOODLE_URL
const adminToken = process.env.MOODLE_TOKEN

async function moodleAdmin(wsfunction: string, params: Record<string, string> = {}) {
  const p = new URLSearchParams({
    wstoken: adminToken!,
    wsfunction,
    moodlewsrestformat: 'json',
    ...params,
  })
  const res = await fetch(`${base}/webservice/rest/server.php`, {
    method: 'POST',
    body: p,
  })
  const data = await res.json()
  if (data?.exception) throw new Error(`[${wsfunction}] ${data.message}`)
  return data
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params
    const quizzes = await moodleAdmin('mod_quiz_get_quizzes_by_courses', {
      'courseids[0]': courseId,
    })
    return NextResponse.json({ quizzes: quizzes.quizzes || [] })
  } catch (err: any) {
    console.error('[admin/courses/quizzes]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params
    const body = await request.json()
    const { name, intro, timeopen, timeclose, timelimit, attempts, password, shufflequestions } = body

    if (!name) {
      return NextResponse.json({ error: 'Name required' }, { status: 400 })
    }

    // Create quiz using core_course_module_create
    const quiz = await moodleAdmin('core_course_create_modules', {
      'courses[0][id]': courseId,
      'modules[0][modulename]': 'quiz',
      'modules[0][name]': name,
      'modules[0][intro]': intro || '',
      'modules[0][introformat]': '1',
      'modules[0][timeopen]': String(timeopen || 0),
      'modules[0][timeclose]': String(timeclose || 0),
      'modules[0][timelimit]': String(timelimit || 0),
      'modules[0][attempts]': String(attempts || 0),
      'modules[0][password]': password || '',
      'modules[0][shufflequestions]': String(shufflequestions ? 1 : 0),
    })

    return NextResponse.json({ quiz: quiz[0] })
  } catch (err: any) {
    console.error('[admin/courses/quizzes/create]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}