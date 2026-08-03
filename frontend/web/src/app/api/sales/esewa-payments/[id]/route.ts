import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/session'

async function proxy(id: string, suffix = '', method = 'GET') {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const res = await fetch(`${process.env.API_GATEWAY_URL}/sales/payments/esewa/${encodeURIComponent(id)}${suffix}`, {
    method, headers: { Authorization: `Bearer ${session.token}`, 'X-User-Id': String(session.userId), 'Content-Type': 'application/json' }, cache: 'no-store',
  })
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) { return proxy((await params).id) }
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) { return proxy((await params).id, '/cancel', 'POST') }
