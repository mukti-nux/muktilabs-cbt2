// /api/moodle/admin/stats/route.ts
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
    // 1. Ambil semua course (kecuali site course id=1)
    const coursesData = await moodleAdmin('core_course_get_courses')
    const courses = (coursesData || []).filter((c: any) => c.id !== 1)

    // 2. Ambil semua quiz dari semua course
    const allQuizzes: any[] = []
    for (const course of courses) {
      try {
        const qRes = await moodleAdmin('mod_quiz_get_quizzes_by_courses', {
          'courseids[0]': String(course.id),
        })
        allQuizzes.push(...(qRes.quizzes || []))
      } catch {}
    }

    // 3. Ambil enrolled users di semua course → deduplicate by userid
    const userMap = new Map<number, any>()
    for (const course of courses) {
      try {
        const enrolled = await moodleAdmin('core_enrol_get_enrolled_users', {
          courseid: String(course.id),
        })
        for (const u of enrolled || []) {
          if (!userMap.has(u.id)) userMap.set(u.id, u)
        }
      } catch {}
    }
    const users = [...userMap.values()].filter(u => u.id !== 1) // hapus admin guest

    // 4. Hitung total attempt + yang sedang aktif
    let totalAttempts = 0
    let activeNow = 0

    for (const quiz of allQuizzes) {
      for (const user of users) {
        try {
          const attRes = await moodleAdmin('mod_quiz_get_user_quiz_attempts', {
            quizid: String(quiz.id),
            userid: String(user.id),
            status: 'all',
            includepreviews: '0',
          })
          const attempts: any[] = attRes.attempts || []
          totalAttempts += attempts.length
          activeNow += attempts.filter((a: any) => a.state === 'inprogress').length
        } catch {}
      }
    }

    return NextResponse.json({
      totalUsers: users.length,
      totalQuizzes: allQuizzes.length,
      totalAttempts,
      activeNow,
    })
  } catch (err: any) {
    console.error('[admin/stats]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}