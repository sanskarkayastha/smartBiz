import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const res = await fetch(`${process.env.API_GATEWAY_URL}/inventory/suppliers`, {
    headers: {
      Authorization: `Bearer ${session.token}`,
      'X-User-Id': String(session.userId),
    },
    cache: 'no-store',
  })

  const data = await res.json().catch(() => [])
  return NextResponse.json(data, { status: res.status })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const res = await fetch(`${process.env.API_GATEWAY_URL}/inventory/suppliers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.token}`,
      'X-User-Id': String(session.userId),
    },
    body: JSON.stringify(body),
  })

  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
