import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { username, password } = await req.json()
  const base = process.env.NEXT_PUBLIC_MOODLE_URL

  const res = await fetch(
    `${base}/login/token.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&service=moodle_mobile_app`
  )
  const data = await res.json()

  if (data.error || !data.token) {
    return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 })
  }

  const userRes = await fetch(
    `${base}/webservice/rest/server.php?wstoken=${data.token}&wsfunction=core_webservice_get_site_info&moodlewsrestformat=json`
  )
  const user = await userRes.json()

  return NextResponse.json({ token: data.token, user: { id: user.userid, name: user.fullname } })
}