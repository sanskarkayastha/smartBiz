'use client'

import { useState, useEffect } from 'react'

type Lead = {
  id: number
  name: string
  phone: string | null
  email: string | null
  stage: string
  source: string | null
  estimatedValue: number | null
  notes: string | null
  followUpDate: string | null
}

const STAGES = ['NEW', 'CONTACTED', 'INTERESTED', 'PROPOSAL', 'WON', 'LOST']
const SOURCES = ['WALK_IN', 'REFERRAL', 'SOCIAL_MEDIA', 'PHONE_CALL', 'ONLINE', 'OTHER']
const SOURCE_LABELS: Record<string, string> = {
  WALK_IN: 'Walk-in', REFERRAL: 'Referral', SOCIAL_MEDIA: 'Social Media',
  PHONE_CALL: 'Phone Call', ONLINE: 'Online', OTHER: 'Other',
}

type Form = {
  name: string; phone: string; email: string; stage: string
  source: string; estimatedValue: string; notes: string; followUpDate: string
}
const EMPTY: Form = { name: '', phone: '', email: '', stage: 'NEW', source: '', estimatedValue: '', notes: '', followUpDate: '' }

type Props = { lead?: Lead; onSaved?: () => void; trigger?: React.ReactNode }

export default function AddLeadModal({ lead, onSaved, trigger }: Props) {
  const isEdit = Boolean(lead)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Form>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open && lead) {
      setForm({
        name: lead.name,
        phone: lead.phone ?? '',
        email: lead.email ?? '',
        stage: lead.stage,
        source: lead.source ?? '',
        estimatedValue: lead.estimatedValue != null ? String(lead.estimatedValue) : '',
        notes: lead.notes ?? '',
        followUpDate: lead.followUpDate ?? '',
      })
    } else if (open && !lead) {
      setForm(EMPTY)
    }
  }, [open, lead])

  function setField(field: keyof Form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Lead name is required.'); return }
    setError('')
    setLoading(true)
    try {
      const url = isEdit ? `/api/leads/${lead!.id}` : '/api/leads'
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          stage: form.stage,
          source: form.source || null,
          estimatedValue: form.estimatedValue ? parseFloat(form.estimatedValue) : null,
          notes: form.notes.trim() || null,
          followUpDate: form.followUpDate || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.message ?? `Failed to ${isEdit ? 'update' : 'create'} lead.`)
        return
      }
      setOpen(false)
      onSaved?.()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const defaultTrigger = isEdit ? (
    <button
      onClick={() => { setOpen(true); setError('') }}
      className="rounded px-2 py-1 text-xs font-medium text-ink-2 transition-colors hover:bg-paper hover:text-ink"
    >
      Edit
    </button>
  ) : (
    <button
      onClick={() => { setOpen(true); setError('') }}
      className="flex items-center gap-2 rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-snow transition-colors hover:bg-night-2"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Add Lead
    </button>
  )

  return (
    <>
      <span onClick={() => { setOpen(true); setError('') }}>{trigger ?? defaultTrigger}</span>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit Lead' : 'Add Lead'}</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Name *</label>
                <input type="text" value={form.name} onChange={setField('name')} placeholder="Full name"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-night/20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
                  <input type="tel" value={form.phone} onChange={setField('phone')} placeholder="98XXXXXXXX"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-night/20" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={setField('email')} placeholder="lead@email.com"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-night/20" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Stage</label>
                <div className="flex flex-wrap gap-1.5">
                  {STAGES.map((s) => (
                    <button key={s} type="button"
                      onClick={() => setForm((f) => ({ ...f, stage: s }))}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                        form.stage === s ? 'border-night bg-night text-snow' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Source</label>
                <div className="flex flex-wrap gap-1.5">
                  {SOURCES.map((s) => (
                    <button key={s} type="button"
                      onClick={() => setForm((f) => ({ ...f, source: f.source === s ? '' : s }))}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                        form.source === s ? 'border-night bg-night text-snow' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}>
                      {SOURCE_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Estimated Value (NPR)</label>
                  <input type="number" value={form.estimatedValue} onChange={setField('estimatedValue')} placeholder="0"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-night/20" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Follow-up Date</label>
                  <input type="date" value={form.followUpDate} onChange={setField('followUpDate')}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-night/20" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                <textarea value={form.notes} onChange={setField('notes')} rows={3} placeholder="Any additional notes…"
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-night/20" />
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            </form>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={loading} className="flex-1 rounded-lg bg-night py-2.5 text-sm font-semibold text-snow transition-colors hover:bg-night-2 disabled:opacity-60">
                {loading ? 'Saving…' : isEdit ? 'Update Lead' : 'Save Lead'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
