import { NextResponse } from 'next/server'
import { moodleCall } from '@/lib/moodle'

export async function GET() {
  try {
    const data = await moodleCall('core_user_get_users', {
      'criteria[0][key]': 'email',
      'criteria[0][value]': '%'
    })
    return NextResponse.json({ users: data.users || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { firstname, lastname, email, username, password } = await req.json()
    const data = await moodleCall('core_user_create_users', {
      'users[0][firstname]': firstname,
      'users[0][lastname]': lastname,
      'users[0][email]': email,
      'users[0][username]': username,
      'users[0][password]': password,
    })
    return NextResponse.json({ user: data[0] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}