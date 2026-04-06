// @/app/api/moodle/admin/users/enroll/route.ts
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { userIds, courseId } = await req.json()
  const base = process.env.NEXT_PUBLIC_MOODLE_URL
  const adminToken = process.env.MOODLE_TOKEN

  if (!base || !adminToken) {
    return NextResponse.json({ error: 'MOODLE_URL or MOODLE_TOKEN not configured' }, { status: 500 })
  }

  if (!userIds || !courseId || !Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json({ error: 'userIds (array) and courseId are required' }, { status: 400 })
  }

  try {
    // Ambil role student (biasanya roleid = 5 di Moodle)
    // Pertama, kita perlu cari role student dari Moodle
    let studentRoleId = '5' // default role student di Moodle

    try {
      const rolesRes = await fetch(
        `${base}/webservice/rest/server.php?wstoken=${adminToken}&wsfunction=core_role_get_roles&moodlewsrestformat=json`
      )
      const rolesData = await rolesRes.json()

      // Cari role dengan shortname 'student'
      const studentRole = rolesData.find((r: any) => r.shortname === 'student')
      if (studentRole) {
        studentRoleId = String(studentRole.id)
      }
    } catch (e) {
      console.warn('[admin/users/enroll] Could not fetch roles, using default:', e)
    }

    // Untuk setiap user, enroll ke course
    const enrolled: number[] = []
    const errors: string[] = []

    for (const userId of userIds) {
      try {
        // Cara 1: Gunakan manual enrol
        const params = new URLSearchParams({
          wstoken: adminToken,
          wsfunction: 'enrol_manual_enrol_users',
          moodlewsrestformat: 'json',
          'enrolments[0][roleid]': studentRoleId,
          'enrolments[0][userid]': String(userId),
          'enrolments[0][courseid]': String(courseId)
        })

        const res = await fetch(`${base}/webservice/rest/server.php?${params}`)
        const data = await res.json()

        if (data.exception) {
          // Jika gagal karena sudah enrolled, tetap anggap berhasil
          if (data.errorcode === 'enrol_invaliduser' || data.message?.includes('already enrolled')) {
            enrolled.push(userId)
          } else {
            errors.push(`User ${userId}: ${data.message}`)
          }
        } else {
          enrolled.push(userId)
        }
      } catch (e: any) {
        errors.push(`User ${userId}: ${e.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      enrolled: enrolled.length,
      total: userIds.length,
      errors: errors.slice(0, 5)
    })
  } catch (err: any) {
    console.error('[admin/users/enroll] Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}