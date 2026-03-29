// /api/moodle/image/route.ts

import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')
  const token = searchParams.get('token')

  if (!url || !token) {
    return new NextResponse('Missing url or token parameter', { status: 400 })
  }

  let decodedUrl: string
  try {
    decodedUrl = decodeURIComponent(url)
  } catch {
    return new NextResponse('Invalid URL encoding', { status: 400 })
  }

  try {
    // ✅ EXTRACT file path dari URL pluginfile.php
    // Format: https://domain/pluginfile.php/contextid/component/filearea/itemid/path/file.jpg
    // Atau: https://domain/pluginfile.php/44/question/questiontext/102/1/158/file.png
    
    const pluginfileMatch = decodedUrl.match(/pluginfile\.php\/(.+)$/)
    if (!pluginfileMatch) {
      return new NextResponse('Invalid pluginfile URL', { status: 400 })
    }
    
    const filePath = pluginfileMatch[1] // 44/question/questiontext/102/1/158/file.png
    
    // ✅ BUILD URL yang benar untuk webservice/pluginfile.php
    // Format: ?token=xxx&file=/filepath
    const moodleBase = process.env.NEXT_PUBLIC_MOODLE_URL || process.env.MOODLE_URL
    if (!moodleBase) {
      return new NextResponse('Moodle URL not configured', { status: 500 })
    }
    
    const imageUrl = `${moodleBase}/webservice/pluginfile.php?token=${encodeURIComponent(token)}&file=/${encodeURIComponent(filePath)}`

    console.log('[moodle/image] Fetching:', imageUrl) // Debug log

    const res = await fetch(imageUrl, {
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error(`[moodle/image] Moodle error: ${res.status}`, errorText)
      return new NextResponse(`Moodle error: ${res.status}`, { status: res.status })
    }

    const contentType = res.headers.get('content-type') || 'image/png'
    
    return new NextResponse(res.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    console.error('[moodle/image] Error:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}