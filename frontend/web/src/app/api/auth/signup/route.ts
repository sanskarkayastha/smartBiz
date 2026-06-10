import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { fullName, email, password } = await req.json()
  const authBaseUrl = process.env.AUTH_SERVICE_URL ?? process.env.API_GATEWAY_URL

  const authRes = await fetch(`${authBaseUrl}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName, email, password }),
  })

  if (!authRes.ok) {
    const body = await authRes.json().catch(() => ({}))
    return NextResponse.json(
      { error: body.error ?? 'Could not create account.', code: body.code ?? 'SIGNUP_FAILED' },
      { status: authRes.status }
    )
  }

  const data = await authRes.json()
  return NextResponse.json(data, { status: authRes.status })
}
