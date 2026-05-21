import { NextResponse } from 'next/server'
import { getSession } from '@/src/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch the full profile from the backend to get phone number too
  const res = await fetch(`${process.env.API_GATEWAY_URL}/auth/profile`, {
    headers: {
      Authorization: `Bearer ${session.token}`,
      'X-User-Id': String(session.userId),
    },
  })

  if (res.ok) {
    const data = await res.json()
    return NextResponse.json({
      fullName: data.fullName ?? session.fullName,
      email: data.email ?? session.email,
      phone: data.phone ?? null,
    })
  }

  return NextResponse.json({
    fullName: session.fullName,
    email: session.email,
    phone: null,
  })
}
