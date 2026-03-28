import { NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'

export async function POST(req: Request) {
  const { roomName, participantName, isTeacher } = await req.json()

  const apiKey = process.env.LIVEKIT_API_KEY!
  const apiSecret = process.env.LIVEKIT_API_SECRET!

  const token = new AccessToken(apiKey, apiSecret, {
    identity: participantName,
    ttl: '4h',
  })

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: !isTeacher,      // siswa publish video
    canSubscribe: true,           // guru bisa subscribe semua
    canPublishData: true,
  })

  return NextResponse.json({ token: await token.toJwt() })
}