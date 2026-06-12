import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  const authBaseUrl = process.env.AUTH_SERVICE_URL ?? process.env.API_GATEWAY_URL

  const authRes = await fetch(`${authBaseUrl}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })

  const body = await authRes.json().catch(() => ({}))
  if (!authRes.ok) {
    return NextResponse.json(
      { error: body.error ?? 'Could not send the reset code.', code: body.code ?? 'PASSWORD_RESET_REQUEST_FAILED' },
      { status: authRes.status }
    )
  }

  return NextResponse.json(body, { status: authRes.status })
}
