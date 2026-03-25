import { getCourses } from '@/lib/moodle'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const courses = await getCourses()
    return NextResponse.json(courses)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}