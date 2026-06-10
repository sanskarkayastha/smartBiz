import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  const authBaseUrl = process.env.AUTH_SERVICE_URL ?? process.env.API_GATEWAY_URL

  const authRes = await fetch(`${authBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!authRes.ok) {
    const body = await authRes.json().catch(() => ({}))
    return NextResponse.json(
      { error: body.error ?? 'Invalid credentials', code: body.code ?? 'INVALID_CREDENTIALS' },
      { status: authRes.status }
    )
  }

  const data = await authRes.json()
  const session = {
    token: data.access_token,
    userId: data.userId,
    email: data.email,
    fullName: data.fullName,
  }

  const cookieStore = await cookies()
  cookieStore.set('smartbiz_session', JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 86400,
    path: '/',
  })

  return NextResponse.json({ ok: true })
}
