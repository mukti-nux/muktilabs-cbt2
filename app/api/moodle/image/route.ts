import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')

  if (!url) return new NextResponse('Missing url', { status: 400 })

  const token = process.env.MOODLE_TOKEN

  // gunakan webservice pluginfile
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