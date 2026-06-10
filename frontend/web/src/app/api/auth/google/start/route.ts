import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const callbackUrl = new URL('/api/auth/google/callback', req.url).toString()
  const authBaseUrl = process.env.AUTH_SERVICE_URL ?? process.env.API_GATEWAY_URL
  const startUrl = new URL(`${authBaseUrl}/auth/google/start`)
  startUrl.searchParams.set('redirect_uri', callbackUrl)

  const authRes = await fetch(startUrl.toString(), {
    method: 'GET',
    redirect: 'manual',
  })

  const location = authRes.headers.get('location')
  if (location) {
    return NextResponse.redirect(location)
  }

  const body = await authRes.json().catch(() => ({}))
  const loginUrl = new URL('/login', req.url)
  loginUrl.searchParams.set('error', body.error ?? 'Google sign-in is unavailable right now.')
  return NextResponse.redirect(loginUrl)
}
