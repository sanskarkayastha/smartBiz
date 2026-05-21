import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/session'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const res = await fetch(`${process.env.API_GATEWAY_URL}/leads/${id}/convert`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.token}`,
      'X-User-Id': String(session.userId),
      'Content-Type': 'application/json',
    },
  })

  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
