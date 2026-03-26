import { NextResponse } from 'next/server'

const snapshotStore: Map<string, any> = new Map()

export async function POST(req: Request) {
  const { userId, userName, attemptId, image, time } = await req.json()
  const key = `${userId}_${attemptId}`
  snapshotStore.set(key, { userId, userName, attemptId, image, time })
  return NextResponse.json({ success: true })
}

export async function GET() {
  const snapshots = Array.from(snapshotStore.values())
  return NextResponse.json({ snapshots })
}