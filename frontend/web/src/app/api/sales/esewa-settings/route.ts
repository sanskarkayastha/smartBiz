import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/session'

async function proxy(method: string, body?: unknown) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const res = await fetch(`${process.env.API_GATEWAY_URL}/sales/payment-settings/esewa`, {
    method, headers: { Authorization: `Bearer ${session.token}`, 'X-User-Id': String(session.userId), 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store',
  })
  if (res.status === 204) return new NextResponse(null, { status: 204 })
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status })
}

export async function GET() { return proxy('GET') }
export async function PUT(req: NextRequest) { return proxy('PUT', await req.json()) }
export async function DELETE() { return proxy('DELETE') }
