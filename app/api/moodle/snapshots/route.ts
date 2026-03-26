import { NextResponse } from 'next/server'

const snapshotStore: Map<string, any> = new Map()
const historyStore: Map<string, any[]> = new Map()

export async function POST(req: Request) {
  const { userId, userName, attemptId, image, time } = await req.json()
  const key = `${userId}_${attemptId}`
  
  snapshotStore.set(key, { userId, userName, attemptId, image, time, key })
  
  const history = historyStore.get(key) || []
  history.push({ image, time })
  if (history.length > 20) history.shift()
  historyStore.set(key, history)
  
  return NextResponse.json({ success: true })
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')
  
  if (key) {
    const snapshot = snapshotStore.get(key)
    const history = historyStore.get(key) || []
    return NextResponse.json({ snapshot, history })
  }
  
  const snapshots = Array.from(snapshotStore.values())
  return NextResponse.json({ snapshots })
}