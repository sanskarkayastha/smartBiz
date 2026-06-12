'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthShell from '@/src/components/AuthShell'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState(searchParams.get('email') ?? '')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (newPassword.length < 6) {
      setError('Your new password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Could not reset your password.')
        return
      }
      router.push('/login?message=Password%20updated.%20Please%20sign%20in%20with%20your%20new%20password.')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Enter your OTP."
      subtitle="Confirm the 6-digit code from your email, then set a new password for SmartBiz."
      footerLabel="Need another code?"
      footerHref={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ''}`}
      footerLinkText="Send it again"
      submitLabel={loading ? 'Resetting password...' : 'Reset password'}
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
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">Reset code</label>
          <input
            type="text"
            required
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            className="w-full rounded-2xl border border-paper-3 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-3 focus:border-brand"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">New password</label>
          <input
            type="password"
            required
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="w-full rounded-2xl border border-paper-3 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-3 focus:border-brand"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">Confirm new password</label>
          <input
            type="password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your new password"
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
