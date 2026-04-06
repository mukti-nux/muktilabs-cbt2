// @/app/api/moodle/admin/users/create/route.ts
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { username, firstname, lastname, email, password } = await req.json()
  const base = process.env.NEXT_PUBLIC_MOODLE_URL
  const adminToken = process.env.MOODLE_TOKEN

  if (!base || !adminToken) {
    return NextResponse.json({ error: 'MOODLE_URL or MOODLE_TOKEN not configured' }, { status: 500 })
  }

  if (!username || !email) {
    return NextResponse.json({ error: 'Username and email are required' }, { status: 400 })
  }

  try {
    // Jika password tidak diberikan, generate random password
    const userPassword = password || Math.random().toString(36).slice(-8) + 'A1!'

    const params = new URLSearchParams({
      wstoken: adminToken,
      wsfunction: 'core_user_create_users',
      moodlewsrestformat: 'json',
      'users[0][username]': username,
      'users[0][password]': userPassword,
      'users[0][firstname]': firstname || '',
      'users[0][lastname]': lastname || '',
      'users[0][email]': email,
      'users[0][auth]': 'manual'
    })

    const res = await fetch(`${base}/webservice/rest/server.php?${params}`)
    const data = await res.json()

    if (data.exception) {
      console.error('[admin/users/create] Moodle error:', data.message)
      return NextResponse.json({ error: data.message }, { status: 400 })
    }

    if (data && data[0] && data[0].id) {
      return NextResponse.json({ success: true, userId: data[0].id })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[admin/users/create] Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}