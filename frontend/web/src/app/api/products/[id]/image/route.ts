import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/session'

function headers(session: { token: string; userId: number }, includeJson = false) {
  return {
    Authorization: `Bearer ${session.token}`,
    'X-User-Id': String(session.userId),
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const res = await fetch(`${process.env.API_GATEWAY_URL}/inventory/products/${id}/image`, {
    method: 'PUT',
    headers: headers(session, true),
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const res = await fetch(`${process.env.API_GATEWAY_URL}/inventory/products/${id}/image`, {
    method: 'DELETE',
    headers: headers(session),
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
