import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/session'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const res = await fetch(`${process.env.API_GATEWAY_URL}/sales/payments/esewa`, {
    method: 'POST', headers: { Authorization: `Bearer ${session.token}`, 'X-User-Id': String(session.userId), 'Content-Type': 'application/json' }, body: JSON.stringify(await req.json()),
  })
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status })
}
