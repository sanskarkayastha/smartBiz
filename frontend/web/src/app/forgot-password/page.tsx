'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthShell from '@/src/components/AuthShell'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState(searchParams.get('email') ?? '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Could not send the reset code.')
        return
      }
      router.push(`/reset-password?email=${encodeURIComponent(data.email ?? email)}`)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Reset your password."
      subtitle="We&apos;ll send a 6-digit OTP to your email so you can safely choose a new password."
      footerLabel="Remembered it after all?"
      footerHref="/login"
      footerLinkText="Back to sign in"
      submitLabel={loading ? 'Sending code...' : 'Send reset code'}
    >
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

        {error ? (
          <p className="rounded-2xl bg-rose/16 px-4 py-3 text-sm font-medium text-ink">
            {error}
          </p>
        ) : null}
      </form>
    </AuthShell>
  )
}
