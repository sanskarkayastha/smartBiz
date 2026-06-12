import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { email, code, newPassword } = await req.json()
  const authBaseUrl = process.env.AUTH_SERVICE_URL ?? process.env.API_GATEWAY_URL

  const authRes = await fetch(`${authBaseUrl}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, newPassword }),
  })

  const body = await authRes.json().catch(() => ({}))
  if (!authRes.ok) {
    return NextResponse.json(
      { error: body.error ?? 'Could not reset your password.', code: body.code ?? 'PASSWORD_RESET_FAILED' },
      { status: authRes.status }
    )
  }

  return NextResponse.json(body, { status: authRes.status })
}
