// @/app/api/moodle/my-quizzes/route.ts
import { NextResponse } from 'next/server'

const base = process.env.NEXT_PUBLIC_MOODLE_URL

async function moodleGet(wsfunction: string, params: Record<string, string>, token: string) {
  const p = new URLSearchParams({
    wstoken: token,
    wsfunction,
    moodlewsrestformat: 'json',
    ...params,
  })
  const res = await fetch(`${base}/webservice/rest/server.php?${p.toString()}`)
  const data = await res.json()
  if (data?.exception) throw new Error(`[${wsfunction}] ${data.message}`)
  return data
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const token = req.headers.get('x-token')

  if (!userId || !token) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  try {
    // ✅ Pakai core_enrol_get_users_courses — benar untuk token siswa
    // Mengembalikan course yang diikuti oleh userId
    const courses = await moodleGet('core_enrol_get_users_courses', {
      userid: userId,
    }, token)

    const result: any[] = []

    for (const course of (courses || [])) {
      if (course.id === 1) continue // skip site-level course

      // Ambil quiz di course ini
      let quizzes: any[] = []
      try {
        const quizRes = await moodleGet('mod_quiz_get_quizzes_by_courses', {
          'courseids[0]': String(course.id),
        }, token)
        quizzes = quizRes.quizzes || []
      } catch {
        continue // skip course ini jika tidak bisa ambil quiz
      }

      for (const quiz of quizzes) {
        // Ambil attempt siswa untuk quiz ini
        let latestAttempt: any = null
        try {
          const attRes = await moodleGet('mod_quiz_get_user_quiz_attempts', {
            quizid: String(quiz.id),
            userid: userId,
            status: 'all',
            includepreviews: '0',
          }, token)

          const attempts: any[] = attRes.attempts || []
          latestAttempt = attempts.sort((a, b) => b.timestart - a.timestart)[0] || null
        } catch {
          // tidak ada attempt → latestAttempt tetap null, tidak apa-apa
        }

        result.push({
          quizId: quiz.id,
          quizName: quiz.name,
          courseId: course.id,
          courseName: course.fullname,
          timelimit: quiz.timelimit,
          timeopen: quiz.timeopen,
          timeclose: quiz.timeclose,
          maxgrade: quiz.grade,
          hasquestions: quiz.hasquestions,
          attempt: latestAttempt ? {
            id: latestAttempt.id,
            state: latestAttempt.state,
            timestart: latestAttempt.timestart,
            timefinish: latestAttempt.timefinish,
            sumgrades: latestAttempt.sumgrades,
          } : null,
        })
      }
    }

    return NextResponse.json({ quizzes: result })
  } catch (err: any) {
    console.error('[my-quizzes]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}