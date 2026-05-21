import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/src/lib/session'
import { cookies } from 'next/headers'

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const res = await fetch(`${process.env.API_GATEWAY_URL}/auth/profile`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${session.token}`,
      'X-User-Id': String(session.userId),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  }

  // Update the session cookie with new fullName
  const updated = await res.json().catch(() => ({}))
  const newFullName = updated.fullName ?? body.fullName ?? session.fullName
  const newSession = { ...session, fullName: newFullName }
  const cookieStore = await cookies()
  cookieStore.set('smartbiz_session', JSON.stringify(newSession), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 86400,
    path: '/',
  })

  return NextResponse.json(updated, { status: 200 })
}
