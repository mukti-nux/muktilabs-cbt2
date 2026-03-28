import { NextResponse } from 'next/server'


export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')
  if (!url) return new NextResponse('Missing url', { status: 400 })

  const token = process.env.MOODLE_TOKEN
  const imageUrl = `${url}${url.includes('?') ? '&' : '?'}token=${token}`

  try {
    const res = await fetch(imageUrl)
    const buffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') || 'image/png'
    return new NextResponse(buffer, {
      headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=3600' }
    })
  } catch {
    return new NextResponse('Failed', { status: 500 })
  }
}