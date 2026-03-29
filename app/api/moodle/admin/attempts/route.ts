// /api/moodle/admin/attempts/route.ts
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
    // 1. Semua course
    const coursesData = await moodleAdmin('core_course_get_courses')
    const courses = (coursesData || []).filter((c: any) => c.id !== 1)

    // 2. Semua quiz
    const allQuizzes: any[] = []
    const quizCourseMap = new Map<number, string>() // quizId → courseName
    for (const course of courses) {
      try {
        const qRes = await moodleAdmin('mod_quiz_get_quizzes_by_courses', {
          'courseids[0]': String(course.id),
        })
        for (const quiz of qRes.quizzes || []) {
          allQuizzes.push(quiz)
          quizCourseMap.set(quiz.id, course.fullname)
        }
      } catch {}
    }

    // 3. Semua enrolled users (deduplicated)
    const userMap = new Map<number, any>()
    for (const course of courses) {
      try {
        const enrolled = await moodleAdmin('core_enrol_get_enrolled_users', {
          courseid: String(course.id),
        })
        for (const u of enrolled || []) {
          if (u.id !== 1 && !userMap.has(u.id)) userMap.set(u.id, u)
        }
      } catch {}
    }
    const users = [...userMap.values()]

    // 4. Kumpulkan semua attempt dari semua user × semua quiz
    const allAttempts: any[] = []
    for (const quiz of allQuizzes) {
      for (const user of users) {
        try {
          const attRes = await moodleAdmin('mod_quiz_get_user_quiz_attempts', {
            quizid: String(quiz.id),
            userid: String(user.id),  // ← explicit userid, bukan 0
            status: 'all',
            includepreviews: '0',
          })
          for (const att of attRes.attempts || []) {
            allAttempts.push({
              id: att.id,
              state: att.state,
              timestart: att.timestart,
              timefinish: att.timefinish,
              sumgrades: att.sumgrades,
              quiz: quiz.name,
              quizId: quiz.id,
              courseName: quizCourseMap.get(quiz.id) || '',
              userfullname: user.fullname,
              userid: user.id,
            })
          }
        } catch {}
      }
    }

    // Sort terbaru dulu
    allAttempts.sort((a, b) => b.timestart - a.timestart)

    return NextResponse.json({ attempts: allAttempts })
  } catch (err: any) {
    console.error('[admin/attempts]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}