// /api/moodle/image/route.ts
// Proxy gambar dari Moodle dengan autentikasi token

import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')
  const token = searchParams.get('token')

  // ✅ Validasi parameter wajib
  if (!url || !token) {
    return new NextResponse('Missing url or token parameter', { status: 400 })
  }

  // ✅ Decode URL yang di-encode
  let decodedUrl: string
  try {
    decodedUrl = decodeURIComponent(url)
  } catch {
    return new NextResponse('Invalid URL encoding', { status: 400 })
  }

  // ✅ Convert ke webservice pluginfile dengan token
  // Format: /webservice/pluginfile.php/{token}/filepath
  const imageUrl = decodedUrl.replace(
    '/pluginfile.php/',
    `/webservice/pluginfile.php/${token}/`
  )

  try {
    const res = await fetch(imageUrl, {
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      console.error(`[moodle/image] Failed to fetch: ${imageUrl}, status: ${res.status}`)
      return new NextResponse('Failed to fetch image from Moodle', { status: res.status })
    }

    // ✅ Forward content-type dan cache headers
    const contentType = res.headers.get('content-type') || 'image/png'
    
    return new NextResponse(res.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    console.error('[moodle/image] Error fetching image:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}