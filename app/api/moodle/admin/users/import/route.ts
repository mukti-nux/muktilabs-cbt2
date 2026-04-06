// @/app/api/moodle/admin/users/import/route.ts
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function POST(req: Request) {
  const base = process.env.NEXT_PUBLIC_MOODLE_URL
  const adminToken = process.env.MOODLE_TOKEN

  if (!base || !adminToken) {
    return NextResponse.json({ error: 'MOODLE_URL or MOODLE_TOKEN not configured' }, { status: 500 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Read file as ArrayBuffer
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    
    // Get first sheet
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // Parse to JSON
    const data = XLSX.utils.sheet_to_json(worksheet) as any[]

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'No data found in file' }, { status: 400 })
    }

    // Validasi dan proses data
    const errors: string[] = []
    let success = 0
    let failed = 0

    for (const row of data) {
      // Validasi wajib: username dan email
      if (!row.username || !row.email) {
        errors.push(`Missing username or email: ${JSON.stringify(row)}`)
        failed++
        continue
      }

      try {
        // Generate password jika tidak ada
        const password = row.password || Math.random().toString(36).slice(-8) + 'A1!'

        const params = new URLSearchParams({
          wstoken: adminToken,
          wsfunction: 'core_user_create_users',
          moodlewsrestformat: 'json',
          users: JSON.stringify([
            {
              username: String(row.username),
              password,
              firstname: String(row.firstname || ''),
              lastname: String(row.lastname || ''),
              email: String(row.email),
              preferences: [
                { name: 'auth', value: 'manual' }
              ]
            }
          ])
        })

        const res = await fetch(`${base}/webservice/rest/server.php?${params}`)
        const result = await res.json()

        if (result.exception) {
          errors.push(`Failed to create ${row.username}: ${result.message}`)
          failed++
        } else {
          success++
        }
      } catch (e: any) {
        errors.push(`Error creating ${row.username}: ${e.message}`)
        failed++
      }
    }

    return NextResponse.json({
      success,
      failed,
      errors: errors.slice(0, 10) // Batasi error yang dikembalikan
    })
  } catch (err: any) {
    console.error('[admin/users/import] Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}