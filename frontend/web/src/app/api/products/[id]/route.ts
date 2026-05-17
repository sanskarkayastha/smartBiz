import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/session'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const res = await fetch(`${process.env.API_GATEWAY_URL}/inventory/products/${id}`, {
    method: 'PUT',
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

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const res = await fetch(`${process.env.API_GATEWAY_URL}/inventory/products/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${session.token}`,
      'X-User-Id': String(session.userId),
    },
  })

  if (res.status === 204) return new NextResponse(null, { status: 204 })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
