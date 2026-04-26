'use server'

import { redirect } from 'next/navigation'
import { saveSession, deleteSession } from '@/app/lib/session'
import { AUTH_URL } from '@/app/lib/api'
import { LoginResponse } from '@/types'

export async function login(prevState: string | null, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const res = await fetch(`${AUTH_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) {
    return res.status === 401 ? 'Invalid email or password.' : 'Login failed. Try again.'
  }

  const data: LoginResponse = await res.json()
  await saveSession({
    token: data.access_token,
    userId: data.userId,
    email: data.email,
    fullName: data.fullName,
  })

  redirect('/dashboard')
}

export async function signup(prevState: string | null, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string

  const res = await fetch(`${AUTH_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, fullName }),
  })

  if (!res.ok) {
    return res.status === 409 ? 'Email already registered.' : 'Signup failed. Try again.'
  }

  const data: LoginResponse = await res.json()
  await saveSession({
    token: data.access_token,
    userId: data.userId,
    email: data.email,
    fullName: data.fullName,
  })

  redirect('/dashboard')
}

export async function logout() {
  await deleteSession()
  redirect('/login')
}
