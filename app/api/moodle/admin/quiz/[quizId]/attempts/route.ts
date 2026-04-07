// /api/moodle/admin/quiz/[quizId]/attempts/route.ts - Quiz reports & export
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
    const url = new URL(request.url)
    const format = url.searchParams.get('format') || 'json'

    // Get all attempts for this quiz
    const attempts = await moodleAdmin('mod_quiz_get_all_quiz_attempts', {
      quizid: quizId,
      'statuses[0]': 'finished',
    })

    const attemptsList = attempts?.attempts || []
    
    // Get user details for each attempt
    const enrichedAttempts = await Promise.all(
      attemptsList.map(async (a: any) => {
        try {
          const userRes = await moodleAdmin('core_user_get_users_by_field', {
            'values[0]': String(a.userid),
            field: 'id',
          })
          const user = userRes?.users?.[0]
          return {
            ...a,
            userfullname: user?.fullname || 'Unknown',
            email: user?.email || '',
          }
        } catch {
          return { ...a, userfullname: 'Unknown', email: '' }
        }
      })
    )

    // If CSV format requested
    if (format === 'csv') {
      const headers = ['Nama', 'Email', 'Nilai', 'Durasi (menit)', 'Selesai']
      const rows = enrichedAttempts.map((a: any) => [
        a.userfullname,
        a.email,
        a.sumgrades || 0,
        a.duration ? Math.floor(a.duration / 60) : 0,
        a.timefinish ? new Date(a.timefinish * 1000).toLocaleString('id-ID') : '-',
      ])
      
      const csv = [
        headers.join(','),
        ...rows.map(r => r.map(v => `"${v}"`).join(',')),
      ].join('\n')

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="quiz-${quizId}-results.csv"`,
        },
      })
    }

    // Calculate stats
    const totalAttempts = enrichedAttempts.length
    const avgGrade = totalAttempts > 0
      ? enrichedAttempts.reduce((sum: number, a: any) => sum + (a.sumgrades || 0), 0) / totalAttempts
      : 0
    const maxGrade = Math.max(...enrichedAttempts.map((a: any) => a.sumgrades || 0), 0)
    const minGrade = Math.min(...enrichedAttempts.map((a: any) => a.sumgrades || 0), 0)

    // Question analysis (simple)
    const questionStats = enrichedAttempts.map((a: any) => ({
      attemptid: a.attempt,
      correct: a.sumgrades || 0,
      questions: a?.gradingsummary || {},
    }))

    return NextResponse.json({
      attempts: enrichedAttempts,
      stats: {
        totalAttempts,
        avgGrade: avgGrade.toFixed(1),
        maxGrade,
        minGrade,
      },
      questionStats,
    })
  } catch (err: any) {
    console.error('[admin/quiz/attempts]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}