import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/session'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const query = req.nextUrl.searchParams.toString()
  const path = query ? `/sales?${query}` : '/sales'
  const res = await fetch(`${process.env.API_GATEWAY_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${session.token}`,
      'X-User-Id': String(session.userId),
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })

  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const res = await fetch(`${process.env.API_GATEWAY_URL}/sales`, {
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
