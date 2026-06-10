import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const error = url.searchParams.get('error')

  if (error) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('error', error)
    return NextResponse.redirect(loginUrl)
  }

  const accessToken = url.searchParams.get('access_token')
  const refreshToken = url.searchParams.get('refresh_token')
  const userId = url.searchParams.get('userId')
  const email = url.searchParams.get('email')
  const fullName = url.searchParams.get('fullName')

  if (!accessToken || !refreshToken || !userId || !email || !fullName) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('error', 'Google sign-in did not complete correctly.')
    return NextResponse.redirect(loginUrl)
  }

  const cookieStore = await cookies()
  cookieStore.set('smartbiz_session', JSON.stringify({
    token: accessToken,
    userId: Number(userId),
    email,
    fullName,
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 86400,
    path: '/',
  })

  return NextResponse.redirect(new URL('/dashboard', req.url))
}
