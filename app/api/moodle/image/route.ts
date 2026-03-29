import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')
  const token = searchParams.get('token')

  if (!url || !token) {
    return new NextResponse('Missing params', { status: 400 })
  }

  // convert ke webservice pluginfile
  const imageUrl = url.replace(
    '/pluginfile.php/',
    `/webservice/pluginfile.php/${token}/`
  )

  try {
    const res = await fetch(imageUrl, {
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      return new NextResponse('Failed', { status: res.status })
    }

    return new NextResponse(res.body, {
      headers: {
        'Content-Type': res.headers.get('content-type') || 'image/png',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    })
  } catch {
    return new NextResponse('Error', { status: 500 })
  }
}