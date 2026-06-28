'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateSupplierModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', phone: '', email: '', openingBalance: '', notes: '' })

  function reset() {
    setForm({ name: '', phone: '', email: '', openingBalance: '', notes: '' })
    setError('')
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError('Supplier name is required.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          openingBalance: form.openingBalance ? parseFloat(form.openingBalance) : 0,
          notes: form.notes.trim() || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? data.message ?? 'Failed to create supplier.')
        return
      }

      setOpen(false)
      reset()
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-[#135BEC] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0f4bc7]"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add Supplier
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Add Supplier</h3>
                <p className="mt-1 text-sm text-slate-500">Track contact details, stock relationships, and any balance you already owed before SmartBiz.</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600">Supplier Name *</label>
                <input
                  type="text"
                  placeholder="e.g. ABC Traders"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#135BEC]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">Phone</label>
                  <input
                    type="tel"
                    placeholder="e.g. 9800000000"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#135BEC]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">Email</label>
                  <input
                    type="email"
                    placeholder="supplier@email.com"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#135BEC]"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600">Opening Balance (NPR)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={form.openingBalance}
                  onChange={(e) => setForm((f) => ({ ...f, openingBalance: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#135BEC]"
                />
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Use this for money you already owed before tracking it in SmartBiz.
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600">Notes</label>
                <textarea
                  placeholder="Any notes about this supplier..."
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#135BEC]"
                />
              </div>
            </div>

            {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="flex-1 rounded-xl bg-[#135BEC] py-2.5 text-sm font-semibold text-white hover:bg-[#0f4bc7] disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Add Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
