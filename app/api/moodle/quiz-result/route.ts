// @/app/api/moodle/quiz-result/route.ts
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { token } = await req.json()
  const { searchParams } = new URL(req.url)
  const attemptId = searchParams.get('attemptId')
  const base = process.env.NEXT_PUBLIC_MOODLE_URL

  if (!token || !attemptId) {
    return NextResponse.json({ error: 'Missing token or attemptId' }, { status: 400 })
  }

  try {
    // ✅ Retry sampai attempt state = 'finished'
    // Kadang Moodle butuh waktu setelah process_attempt selesai
    let data: any = null
    const maxAttempts = 8
    const delayMs = 1500

    for (let i = 0; i < maxAttempts; i++) {
      const res = await fetch(
        `${base}/webservice/rest/server.php?wstoken=${token}&wsfunction=mod_quiz_get_attempt_review&moodlewsrestformat=json&attemptid=${attemptId}`
      )
      data = await res.json()

      console.log(`[quiz-result] attempt #${i + 1} state:`, data.attempt?.state, 'exception:', data.exception)

      if (data.exception) {
        // "Attempt has not closed yet" → retry
        if (data.errorcode === 'noreview' || data.message?.includes('not closed')) {
          if (i < maxAttempts - 1) {
            await new Promise(r => setTimeout(r, delayMs))
            continue
          }
        }
        throw new Error(data.message)
      }

      if (data.attempt?.state === 'finished') break

      if (i < maxAttempts - 1) {
        await new Promise(r => setTimeout(r, delayMs))
      }
    }

    if (!data || data.exception) {
      throw new Error(data?.message || 'Attempt belum selesai, coba refresh halaman.')
    }

    console.log('[quiz-result] final state:', data.attempt?.state)
    console.log('[quiz-result] grade:', data.grade, 'sumgrades:', data.attempt?.sumgrades)

    // ── Ambil maxgrade dari quiz ──
    const adminToken = process.env.MOODLE_TOKEN
    const courseId = data.attempt?.courseid

    // ✅ Coba ambil dari courseId attempt dulu, fallback ke courseid=4
    let quiz: any = null
    const tryCoursIds = courseId ? [courseId, 4] : [4]

    for (const cid of tryCoursIds) {
      const quizRes = await fetch(
        `${base}/webservice/rest/server.php?wstoken=${adminToken}&wsfunction=mod_quiz_get_quizzes_by_courses&moodlewsrestformat=json&courseids[0]=${cid}`
      )
      const quizData = await quizRes.json()
      quiz = quizData.quizzes?.find((q: any) => q.id === data.attempt?.quiz)
      if (quiz) break
    }

    console.log('[quiz-result] quiz found:', quiz ? `id=${quiz.id} grade=${quiz.grade}` : 'NOT FOUND, using default')

    const maxgrade = parseFloat(String(quiz?.grade ?? 100))
    // data.grade = nilai sudah diskala ke maxgrade (reliable)
    const finalGrade = parseFloat(String(data.grade ?? 0))
    const rawSumgrades = parseFloat(String(data.attempt?.sumgrades ?? 0))
    const rawMaxSumgrades = parseFloat(String(quiz?.sumgrades ?? maxgrade))

    console.log('[quiz-result] finalGrade:', finalGrade, 'maxgrade:', maxgrade)

    return NextResponse.json({
      grade: finalGrade,
      maxgrade,
      sumgrades: finalGrade,   // sama dengan grade agar kalkulasi pct di frontend konsisten
      rawSumgrades,
      rawMaxSumgrades,
      timestart: data.attempt?.timestart ?? 0,
      timefinish: data.attempt?.timefinish ?? 0,
    })
  } catch (err: any) {
    console.error('[quiz-result] ERROR:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}