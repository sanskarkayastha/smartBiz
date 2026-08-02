'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthShell from '@/src/components/AuthShell'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const urlError = searchParams.get('error') ?? ''
  const urlMessage = searchParams.get('message') ?? ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      console.log("here")
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        console.log("here1")
        if (data.code === 'EMAIL_NOT_VERIFIED') {
          router.push(`/verify-email?email=${encodeURIComponent(email)}`)
          return
        }
        setError(data.error ?? 'Invalid credentials')
        return
      }
      router.push('/dashboard')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Welcome back."
      subtitle="Sign in and get straight to today&apos;s stock, sales, and customer picture."
      footerLabel="Need a SmartBiz account?"
      footerHref="/signup"
      footerLinkText="Create one"
      submitLabel={loading ? 'Signing in...' : 'Sign in'}
    >
      <Link
        href="/api/auth/google/start"
        className="inline-flex w-full items-center justify-center rounded-2xl border border-paper-3 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand"
      >
        Continue with Google
      </Link>

      <div className="my-4 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-3">
        <span className="h-px flex-1 bg-paper-3" />
        <span>Email login</span>
        <span className="h-px flex-1 bg-paper-3" />
      </div>

      <form id="auth-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@business.com"
            className="w-full rounded-2xl border border-paper-3 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-3 focus:border-brand"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full rounded-2xl border border-paper-3 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-3 focus:border-brand"
          />
          <div className="mt-3 flex justify-end">
            <Link href={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ''}`} className="text-sm font-semibold text-brand hover:text-night">
              Forgot password?
            </Link>
          </div>
        </div>

        {error ? (
          <p className="rounded-2xl bg-rose/16 px-4 py-3 text-sm font-medium text-ink">
            {error}
          </p>
        ) : urlMessage ? (
          <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {urlMessage}
          </p>
        ) : urlError ? (
          <p className="rounded-2xl bg-rose/16 px-4 py-3 text-sm font-medium text-ink">
            {urlError}
          </p>
        ) : null}
      </form>
    </AuthShell>
  )
}
