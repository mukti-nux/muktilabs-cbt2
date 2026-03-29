import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')

  if (!url) return new NextResponse('Missing url', { status: 400 })

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.MOODLE_TOKEN}`,
      },
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      return new NextResponse('Failed', { status: res.status })
    }

    const contentType = res.headers.get('content-type') || 'image/png'

    return new NextResponse(res.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    })
  } catch (err) {
    console.error(err)
    return new NextResponse('Error', { status: 500 })
  }
}