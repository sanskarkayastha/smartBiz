'use client'

import { useState, useEffect } from 'react'

type PlanStatus = {
  effectivePlan: 'FREE' | 'PRO'
  source: 'FREE' | 'TRIAL' | 'PURCHASED'
  validUntil: string | null
  limits: Record<string, number>
  usage: Record<string, number>
  usageAvailable: boolean
}

const usageLabels: Record<string, string> = {
  products: 'Products', sales: 'Sales this month', customers: 'Customers', leads: 'Leads', aiRequests: 'AI requests this month',
}

type EsewaSettings = {
  configured: boolean
  environment: string
  maskedProductCode: string | null
}

export default function SettingsPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [billingSuccess, setBillingSuccess] = useState(false)
  const [error, setError] = useState('')
  const [plan, setPlan] = useState<PlanStatus | null>(null)
  const [billingTerm, setBillingTerm] = useState<'MONTHLY' | 'YEARLY'>('YEARLY')
  const [checkoutProvider, setCheckoutProvider] = useState<string | null>(null)
  const [esewaSettings, setEsewaSettings] = useState<EsewaSettings | null>(null)
  const [merchantCode, setMerchantCode] = useState('')
  const [merchantKey, setMerchantKey] = useState('')
  const [savingEsewa, setSavingEsewa] = useState(false)

  useEffect(() => {
    // Fetch session info from a lightweight endpoint
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        setFullName(d.fullName ?? '')
        setEmail(d.email ?? '')
        setPhone(d.phone ?? '')
      })
      .catch(() => {})

    fetch('/api/billing/status').then((r) => r.json()).then(setPlan).catch(() => {})
    fetch('/api/sales/esewa-settings').then((r) => r.json()).then(setEsewaSettings).catch(() => {})

    const paymentId = new URLSearchParams(window.location.search).get('paymentId')
    if (paymentId) {
      let checks = 0
      const timer = window.setInterval(async () => {
        checks += 1
        const response = await fetch(`/api/billing/payments/${encodeURIComponent(paymentId)}`)
        const payment = await response.json().catch(() => ({}))
        if (payment.status === 'SUCCEEDED' || checks >= 12) {
          window.clearInterval(timer)
          if (payment.status === 'SUCCEEDED') {
            setBillingSuccess(true)
            fetch('/api/billing/status').then((r) => r.json()).then(setPlan).catch(() => {})
          }
        }
      }, 2500)
      return () => window.clearInterval(timer)
    }
  }, [])

  async function startCheckout(provider: 'ESEWA' | 'STRIPE') {
    setCheckoutProvider(provider)
    setError('')
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider, term: billingTerm }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) { setError(data.error ?? 'Could not start checkout.'); return }
      window.location.assign(data.action.url)
    } catch { setError('Could not start checkout. Please try again.') }
    finally { setCheckoutProvider(null) }
  }

  async function saveEsewaMerchant(event: React.FormEvent) {
    event.preventDefault()
    if (!merchantCode.trim() || !merchantKey.trim()) { setError('Enter both eSewa merchant fields.'); return }
    setSavingEsewa(true); setError('')
    try {
      const response = await fetch('/api/sales/esewa-settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productCode: merchantCode.trim(), accessKey: merchantKey.trim() }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) { setError(data.error ?? 'Could not connect eSewa.'); return }
      setEsewaSettings(data); setMerchantCode(''); setMerchantKey('')
    } finally { setSavingEsewa(false) }
  }

  const initials = fullName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) { setError('Full name is required.'); return }
    setError('')
    setLoading(true)
    setSuccess(false)
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: fullName.trim(), phone: phone.trim() || null }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.message ?? 'Failed to update profile.')
        return
      }
      setEditing(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your profile and account</p>
      </div>

      {billingSuccess ? (
        <div role="status" className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
          Payment verified. Your Pro access is active.
        </div>
      ) : null}
      {error && !editing ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
      ) : null}

      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-paper-2">
            <span className="text-lg font-bold text-ink">{initials || '?'}</span>
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-base">{fullName || '—'}</p>
            <p className="text-sm text-gray-500">{email}</p>
          </div>
        </div>

        {success && (
          <div className="mb-4 flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            Profile updated successfully.
          </div>
        )}

        {!editing ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Full Name</span>
              <span className="text-sm text-gray-800">{fullName || '—'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</span>
              <span className="text-sm text-gray-800">{email || '—'}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</span>
              <span className="text-sm text-gray-800">{phone || '—'}</span>
            </div>
            <button
              onClick={() => { setEditing(true); setError('') }}
              className="mt-2 w-full rounded-lg bg-night py-2.5 text-sm font-semibold text-snow transition-colors hover:bg-night-2"
            >
              Edit Profile
            </button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name *</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-night/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-3 py-2 border border-gray-100 rounded-lg text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="98XXXXXXXX"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-night/20"
              />
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setEditing(false); setError('') }}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-lg bg-night py-2.5 text-sm font-semibold text-snow transition-colors hover:bg-night-2 disabled:opacity-60"
              >
                {loading ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Account Info section */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Account</h2>
        <div className="space-y-1">
          <div className="flex justify-between items-center py-2 border-b border-gray-50">
            <span className="text-sm text-gray-600">Change Password</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Coming soon</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-gray-600">Notifications</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Coming soon</span>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-[22px] border border-paper-3 bg-white">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-paper-3 bg-paper/55 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-3">Plan & billing</p>
            <h2 className="mt-1 text-xl font-extrabold text-ink">{plan?.effectivePlan === 'PRO' ? 'SmartBiz Pro' : 'SmartBiz Free'}</h2>
            <p className="mt-1 text-sm text-ink-2">
              {plan?.source === 'TRIAL' && plan.validUntil ? `Trial until ${new Date(plan.validUntil).toLocaleDateString()}` : plan?.source === 'PURCHASED' && plan.validUntil ? `Paid access until ${new Date(plan.validUntil).toLocaleDateString()}` : 'Core tools with monthly limits'}
            </p>
          </div>
          <span className="rounded-full bg-mint/18 px-3 py-2 text-xs font-bold text-ink">{plan?.source === 'TRIAL' ? 'PRO TRIAL' : plan?.effectivePlan ?? 'LOADING'}</span>
        </div>
        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <div className="mb-6 rounded-2xl border border-paper-3 bg-paper/45 px-4 py-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-3">Free plan usage</p>
                {plan && !plan.usageAvailable ? <span className="rounded-md bg-amber/25 px-2 py-1 text-[10px] font-bold text-ink">PARTIAL</span> : null}
              </div>
              {Object.entries(plan?.limits ?? {}).map(([key, limit]) => (
                <div key={key} className="flex min-h-9 items-center justify-between gap-4 border-t border-paper-3 text-xs">
                  <span className="text-ink-2">{usageLabels[key] ?? key}</span>
                  <span className="font-bold tabular-nums text-ink">{plan?.usage?.[key] ?? 'Unavailable'}{plan?.usage?.[key] !== undefined ? ` / ${limit}` : ''}</span>
                </div>
              ))}
            </div>
            <p className="text-sm font-bold text-ink">Choose a fixed term</p>
            <p className="mt-1 text-xs leading-5 text-ink-3">One payment, no automatic renewal. Remaining trial or paid time is preserved.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {([['MONTHLY', 'NPR 499', '30 days'], ['YEARLY', 'NPR 4,999', '365 days']] as const).map(([value, price, days]) => (
                <button key={value} type="button" onClick={() => setBillingTerm(value)} className={`min-h-28 rounded-2xl border p-4 text-left transition-colors ${billingTerm === value ? 'border-night bg-night text-snow' : 'border-paper-3 bg-white text-ink hover:border-ink-3'}`}>
                  <span className="block text-xs font-semibold">{value === 'MONTHLY' ? 'Monthly' : 'Yearly'}</span>
                  <span className="mt-2 block text-lg font-extrabold">{price}</span>
                  <span className={`mt-1 block text-xs ${billingTerm === value ? 'text-snow/70' : 'text-ink-3'}`}>{days}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-end gap-3">
            <button type="button" disabled={checkoutProvider !== null} onClick={() => startCheckout('ESEWA')} className="min-h-12 rounded-2xl bg-brand px-4 text-sm font-bold text-snow hover:bg-night-2 disabled:opacity-60">
              {checkoutProvider === 'ESEWA' ? 'Opening eSewa…' : `Continue with eSewa · ${billingTerm === 'YEARLY' ? 'NPR 4,999' : 'NPR 499'}`}
            </button>
            <button type="button" disabled={checkoutProvider !== null} onClick={() => startCheckout('STRIPE')} className="min-h-12 rounded-2xl border border-paper-3 bg-white px-4 text-sm font-bold text-ink hover:border-night disabled:opacity-60">
              {checkoutProvider === 'STRIPE' ? 'Opening Stripe…' : 'Pay by card with Stripe · TEST'}
            </button>
            <p className="text-xs leading-5 text-ink-3">Access changes only after SmartBiz verifies the provider. Stripe remains test-only.</p>
          </div>
        </div>
      </section>

      <section className="rounded-[22px] border border-paper-3 bg-white px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-extrabold text-ink">Receive counter payments with eSewa</h2><p className="mt-1 text-sm text-ink-2">{esewaSettings?.environment === 'UAT' ? 'Shared test credentials are active. No real money is transferred.' : 'Money goes directly to your shop&apos;s merchant account.'}</p></div>
          <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${esewaSettings?.configured ? 'bg-mint/18 text-ink' : 'bg-paper text-ink-2'}`}>{esewaSettings?.configured ? `${esewaSettings.maskedProductCode} · ${esewaSettings.environment}` : 'Not connected'}</span>
        </div>
        <form onSubmit={saveEsewaMerchant} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-bold text-ink">Merchant product code<input value={merchantCode} onChange={(e) => setMerchantCode(e.target.value)} placeholder="e.g. INTENT" className="mt-2 h-12 w-full rounded-2xl border border-paper-3 px-4 text-sm font-medium text-ink outline-none focus:border-night focus:ring-2 focus:ring-brand-soft" /></label>
          <label className="text-xs font-bold text-ink">Access key<input type="password" value={merchantKey} onChange={(e) => setMerchantKey(e.target.value)} placeholder={esewaSettings?.configured ? 'Enter a new key to replace it' : 'Paste the eSewa access key'} className="mt-2 h-12 w-full rounded-2xl border border-paper-3 px-4 text-sm font-medium text-ink outline-none focus:border-night focus:ring-2 focus:ring-brand-soft" /></label>
          <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-xl text-xs leading-5 text-ink-3">The access key is encrypted before storage and is never returned to this page. UAT remains active until production credentials and HTTPS callbacks are ready.</p>
            <button disabled={savingEsewa} className="min-h-11 rounded-2xl bg-night px-5 text-sm font-bold text-snow disabled:opacity-60">{savingEsewa ? 'Saving…' : esewaSettings?.configured ? 'Replace credentials' : 'Connect eSewa'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}
