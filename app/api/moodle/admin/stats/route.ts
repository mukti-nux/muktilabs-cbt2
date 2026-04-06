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
    console.log('[admin/stats] Courses:', courses.length)

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
    console.log('[admin/stats] Quizzes:', allQuizzes.length)

    // 3. Ambil semua user (bukan enrolled users per course - itu yang bermasalah)
    const usersData = await moodleAdmin('core_user_get_users', {
      'criteria[0][key]': 'deleted',
      'criteria[0][value]': '0'
    })
    const allMoodleUsers = (usersData.users || []).filter((u: any) => u.id !== 1) // hapus admin guest
    console.log('[admin/stats] Users from core_user_get_users:', allMoodleUsers.length)

    // 4. Untuk setiap user, hitung enrolled courses dan attempt
    let totalUsers = 0
    let totalAttempts = 0
    let activeNow = 0

    for (const user of allMoodleUsers) {
      try {
        // Ambil enrolled courses user ini
        const userCoursesRes = await moodleAdmin('core_enrol_get_users_courses', {
          userid: String(user.id),
        })
        const userCourses = userCoursesRes || []
        
        if (userCourses.length > 0) {
          totalUsers++ // hanya hitung user yang enroll di minimal 1 course
          
          // Ambil attempt untuk setiap quiz di course user ini
          for (const course of userCourses) {
            for (const quiz of allQuizzes) {
              // Hanya ambil quiz yang belong ke course ini
              // Quiz di Moodle tidak memiliki courseid langsung di response, 
              // tapi kita bisa cek apakah course.id match dengan course yang user enroll
              //简便方式:直接对每个quiz检查attempts
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
        }
      } catch {}
    }

    console.log('[admin/stats] Final - Users:', totalUsers, 'Quizzes:', allQuizzes.length, 'Attempts:', totalAttempts, 'Active:', activeNow)

    return NextResponse.json({
      totalUsers,
      totalQuizzes: allQuizzes.length,
      totalAttempts,
      activeNow,
    })
  } catch (err: any) {
    console.error('[admin/stats]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
