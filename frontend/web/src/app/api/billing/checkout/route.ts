import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/session'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const res = await fetch(`${process.env.API_GATEWAY_URL}/billing/checkouts`, {
    method: 'POST', headers: { Authorization: `Bearer ${session.token}`, 'X-User-Id': String(session.userId), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, surface: 'WEB' }),
  })
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status })
}
