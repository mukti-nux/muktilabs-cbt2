import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')

  if (!url) {
    return new NextResponse('Missing url', { status: 400 })
  }

  // validasi hanya boleh ambil dari Moodle
  const base = process.env.MOODLE_URL || process.env.NEXT_PUBLIC_MOODLE_URL
  if (base && !url.startsWith(base)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const token = process.env.MOODLE_TOKEN
  const imageUrl = `${url}${url.includes('?') ? '&' : '?'}token=${token}`

  try {
    const res = await fetch(imageUrl, {
      headers: {
        Accept: 'image/*',
      },
      // cache bawaan Next.js
      next: {
        revalidate: 3600, // cache 1 jam
      },
    })

    if (!res.ok) {
      return new NextResponse('Failed to fetch image', { status: res.status })
    }

    const contentType = res.headers.get('content-type') || 'image/png'

    // streaming (lebih hemat memory daripada arrayBuffer)
    return new NextResponse(res.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    })
  } catch (err) {
    console.error('[moodle image proxy error]', err)
    return new NextResponse('Failed', { status: 500 })
  }
}