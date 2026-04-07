// /api/moodle/admin/courses/route.ts - Courses CRUD
import { NextResponse } from 'next/server'

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

export async function GET() {
  try {
    const courses = await moodleAdmin('core_course_get_courses')
    // Filter out site course (id=1)
    const filtered = (courses || []).filter((c: any) => c.id !== 1)
    return NextResponse.json({ courses: filtered })
  } catch (err: any) {
    console.error('[admin/courses]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, shortname, categoryid, summary } = body

    if (!name || !shortname) {
      return NextResponse.json({ error: 'Name and shortname required' }, { status: 400 })
    }

    // Create course
    const course = await moodleAdmin('core_course_create_courses', {
      'courses[0][fullname]': name,
      'courses[0][shortname]': shortname,
      'courses[0][categoryid]': String(categoryid || 1),
      'courses[0][summary]': summary || '',
      'courses[0][summaryformat]': '1', // HTML
      'courses[0][visible]': '1',
    })

    return NextResponse.json({ course: course[0] })
  } catch (err: any) {
    console.error('[admin/courses/create]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}