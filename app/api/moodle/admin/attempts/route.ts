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
    console.log('[admin/attempts] Courses:', courses.length)

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
    console.log('[admin/attempts] Quizzes:', allQuizzes.length)

    // 3. Semua user (bukan enrolled users - itu yang bermasalah)
    const usersData = await moodleAdmin('core_user_get_users', {
      'criteria[0][key]': 'deleted',
      'criteria[0][value]': '0'
    })
    const allMoodleUsers = (usersData.users || []).filter((u: any) => u.id !== 1)
    console.log('[admin/attempts] Users:', allMoodleUsers.length)

    // 4. Kumpulkan semua attempt dari semua user × semua quiz
    const allAttempts: any[] = []
    
    for (const user of allMoodleUsers) {
      try {
        // Ambil enrolled courses user ini dulu
        const userCoursesRes = await moodleAdmin('core_enrol_get_users_courses', {
          userid: String(user.id),
        })
        const userCourses = userCoursesRes || []
        
        // Kalau user tidak enroll di course manapun, skip
        if (userCourses.length === 0) continue

        for (const quiz of allQuizzes) {
          try {
            const attRes = await moodleAdmin('mod_quiz_get_user_quiz_attempts', {
              quizid: String(quiz.id),
              userid: String(user.id),
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
      } catch {}
    }

    console.log('[admin/attempts] Total attempts:', allAttempts.length)

    // Sort terbaru dulu
    allAttempts.sort((a, b) => b.timestart - a.timestart)

    return NextResponse.json({ attempts: allAttempts })
  } catch (err: any) {
    console.error('[admin/attempts]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
