'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthShell from '@/src/components/AuthShell'

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Could not create account.')
        return
      }
      router.push(`/verify-email?email=${encodeURIComponent(data.email ?? email)}`)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Open your SmartBiz workspace."
      subtitle="Set up the account, add products, and start tracking the shop in one clean system."
      footerLabel="Already using SmartBiz?"
      footerHref="/login"
      footerLinkText="Sign in"
      submitLabel={loading ? 'Creating account...' : 'Create account'}
    >
      <Link
        href="/api/auth/google/start"
        className="inline-flex w-full items-center justify-center rounded-2xl border border-paper-3 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand"
      >
        Continue with Google
      </Link>

      <div className="my-4 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-3">
        <span className="h-px flex-1 bg-paper-3" />
        <span>Email signup</span>
        <span className="h-px flex-1 bg-paper-3" />
      </div>

      <form id="auth-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">Full name</label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-2xl border border-paper-3 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-3 focus:border-brand"
          />
        </div>
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
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="w-full rounded-2xl border border-paper-3 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-3 focus:border-brand"
          />
        </div>

        {error ? (
          <p className="rounded-2xl bg-rose/16 px-4 py-3 text-sm font-medium text-ink">
            {error}
          </p>
        ) : null}
      </form>
    </AuthShell>
  )
}
