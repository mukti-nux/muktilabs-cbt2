import { NextResponse } from 'next/server'

const violationStore: any[] = []

export async function POST(req: Request) {
  const { userId, userName, attemptId, type, time } = await req.json()
  violationStore.push({
    id: Date.now(),
    userId, userName, attemptId, type, time,
    createdAt: new Date().toISOString()
  })
  // Simpan max 200 entri
  if (violationStore.length > 200) violationStore.shift()
  return NextResponse.json({ success: true })
}

export async function GET() {
  return NextResponse.json({
    violations: violationStore.slice(-50).reverse()
  })
}