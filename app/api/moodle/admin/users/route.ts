// @/app/api/moodle/admin/users/route.ts
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const base = process.env.NEXT_PUBLIC_MOODLE_URL
  const adminToken = process.env.MOODLE_TOKEN

  if (!base) {
    return NextResponse.json({ error: 'MOODLE_URL not configured' }, { status: 500 })
  }

  if (!adminToken) {
    return NextResponse.json({ error: 'MOODLE_TOKEN not configured' }, { status: 500 })
  }

  try {
    // Ambil semua user dari Moodle
    // Tanpa criteria agar dapat semua user (lebih sederhana)
    const params = new URLSearchParams({
      wstoken: adminToken,
      wsfunction: 'core_user_get_users',
      moodlewsrestformat: 'json'
    })

    console.log('[admin/users] Requesting to:', `${base}/webservice/rest/server.php?${params}`)

    const res = await fetch(`${base}/webservice/rest/server.php?${params}`, {
      method: 'GET'
    })
    
    const data = await res.json()

    console.log('[admin/users] Response:', JSON.stringify(data).substring(0, 500))

    if (data.exception) {
      console.error('[admin/users] Moodle exception:', data.message, data.errorcode)
      return NextResponse.json({ 
        error: data.message, 
        errorcode: data.errorcode,
        users: [] 
      }, { status: 200 }) // Return 200 dengan empty array agar UI tidak crash
    }

    const users = data.users || []
    console.log('[admin/users] Found users:', users.length)

    // Untuk setiap user, ambil informasi tambahan (enrolled courses)
    // Tapi kita limit dulu hanya 50 user pertama untuk performance
    const limitedUsers = users.slice(0, 50)
    
    const usersWithDetails = await Promise.all(
      limitedUsers.map(async (user: any) => {
        let enrolledCourses = 0

        try {
          const enrollRes = await fetch(
            `${base}/webservice/rest/server.php?wstoken=${adminToken}&wsfunction=core_enrol_get_users_courses&moodlewsrestformat=json&userid=${user.id}`
          )
          const enrollData = await enrollRes.json()
          if (enrollData && !enrollData.exception) {
            enrolledCourses = Array.isArray(enrollData) ? enrollData.length : 0
          }
        } catch (e) {
          console.warn('[admin/users] Failed to get enrolled courses for user', user.id)
        }

        return {
          id: user.id,
          username: user.username,
          firstname: user.firstname,
          lastname: user.lastname,
          email: user.email,
          lastaccess: user.lastaccess || 0,
          suspended: user.suspended || 0,
          enrolledCourses,
          activeAttempts: 0
        }
      })
    )

    return NextResponse.json({ users: usersWithDetails, total: users.length })
  } catch (err: any) {
    console.error('[admin/users] Error:', err.message)
    return NextResponse.json({ 
      error: err.message,
      users: [] 
    }, { status: 200 }) // Return 200 dengan empty array agar UI tidak crash
  }
}
