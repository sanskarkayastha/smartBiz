import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/session'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const qs = searchParams.toString()

  const res = await fetch(`${process.env.API_GATEWAY_URL}/leads${qs ? `?${qs}` : ''}`, {
    headers: {
      Authorization: `Bearer ${session.token}`,
      'X-User-Id': String(session.userId),
    },
  })

  const data = await res.json().catch(() => [])
  return NextResponse.json(data, { status: res.status })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const res = await fetch(`${process.env.API_GATEWAY_URL}/leads`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.token}`,
      'X-User-Id': String(session.userId),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
