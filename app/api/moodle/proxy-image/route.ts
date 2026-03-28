import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const fileUrl = searchParams.get('url')
  const token = searchParams.get('token')

  if (!fileUrl) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 })
  }

  try {
    const moodleBaseUrl = process.env.NEXT_PUBLIC_MOODLE_URL || ''
    
    // Handle relative URL
    let fullUrl = fileUrl
    if (fileUrl.startsWith('/')) {
      fullUrl = `${moodleBaseUrl}${fileUrl}`
    }
    
    // Build URL dengan token Moodle
    const urlWithToken = new URL(fullUrl)
    if (token) {
      urlWithToken.searchParams.set('token', token)
    }
    
    // Fetch gambar dari Moodle
    const response = await fetch(urlWithToken.toString(), {
      method: 'GET',
      cache: 'force-cache',
      headers: {
        'User-Agent': 'MuktiLabs-CBT/1.0',
      }
    })

    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status} ${response.statusText}`)
      
      // Return placeholder SVG jika gambar gagal
      const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
        <rect fill="#f1f5f9" width="400" height="300"/>
        <text fill="#94a3b8" font-family="sans-serif" font-size="14" x="50%" y="50%" text-anchor="middle" dy=".3em">
          Gambar tidak dapat dimuat
        </text>
      </svg>`
      
      return new NextResponse(placeholderSvg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=60'
        }
      })
    }

    const contentType = response.headers.get('content-type') || 'image/png'
    const imageBuffer = await response.arrayBuffer()
    
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, immutable', // Cache 1 hari
        'Access-Control-Allow-Origin': '*',
        'Content-Length': imageBuffer.byteLength.toString()
      },
    })
  } catch (error) {
    console.error('Proxy image error:', error)
    
    // Return placeholder SVG jika error
    const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
      <rect fill="#fee2e2" width="400" height="300"/>
      <text fill="#ef4444" font-family="sans-serif" font-size="14" x="50%" y="50%" text-anchor="middle" dy=".3em">
        Error loading image
      </text>
    </svg>`
    
    return new NextResponse(placeholderSvg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=60'
      }
    })
  }
}