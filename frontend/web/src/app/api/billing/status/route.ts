import { NextResponse } from 'next/server'
import { getSession } from '@/src/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const res = await fetch(`${process.env.API_GATEWAY_URL}/billing/me`, {
    headers: { Authorization: `Bearer ${session.token}`, 'X-User-Id': String(session.userId) }, cache: 'no-store',
  })
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status })
}
