// /api/moodle/admin/quiz/[quizId]/settings/route.ts
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
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params
    
    // Get quiz info
    const quizRes = await moodleAdmin('mod_quiz_get_quizzes_by_courses', {
      'courseids[0]': '0',
    })
    const quiz = (quizRes.quizzes || []).find((q: any) => q.id === Number(quizId))
    
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }
    
    return NextResponse.json({ quiz })
  } catch (err: any) {
    console.error('[admin/quiz/settings GET]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params
    const body = await request.json()
    const { 
      name, intro, timeopen, timeclose, timelimit, 
      attempts, password, shufflequestions, shuffleanswers,
      gradingsmethod, preferredbehaviour, showblocks,
      customfeedback, feedbacktexts
    } = body

    // Convert datetime to timestamp
    const toTimestamp = (dt: string) => {
      if (!dt) return 0
      return Math.floor(new Date(dt).getTime() / 1000)
    }

    // Build update params - mod_quiz_update_quiz
    const updateParams: Record<string, string> = {
      quizid: quizId,
      'quiz[name]': name || '',
      'quiz[intro]': intro || '',
      'quiz[timeopen]': String(toTimestamp(timeopen)),
      'quiz[timeclose]': String(toTimestamp(timeclose)),
      'quiz[timelimit]': timelimit ? String(Math.floor(Number(timelimit) * 60)) : '0',
      'quiz[attempts]': String(attempts || 0),
      'quiz[password]': password || '',
      'quiz[shufflequestions]': shufflequestions ? '1' : '0',
      'quiz[shuffleanswers]': shuffleanswers ? '1' : '0',
      'quiz[gradingsmethod]': gradingsmethod || 'highest',
      'quiz[preferredbehaviour]': preferredbehaviour || 'deferredfeedback',
      'quiz[showblocks]': showblocks ? '1' : '0',
    }

    const result = await moodleAdmin('mod_quiz_update_quiz', updateParams)

    return NextResponse.json({ 
      success: true, 
      result,
      message: 'Quiz settings updated successfully' 
    })
  } catch (err: any) {
    console.error('[admin/quiz/settings PUT]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
