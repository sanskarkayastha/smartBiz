'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Supplier = {
  id: number
  name: string
  phone: string | null
  email: string | null
  balanceOwed: number
  notes: string | null
}

type Form = {
  phone: string
  email: string
  balanceOwed: string
  notes: string
}

function toForm(s: Supplier): Form {
  return {
    phone: s.phone ?? '',
    email: s.email ?? '',
    balanceOwed: String(s.balanceOwed),
    notes: s.notes ?? '',
  }
}

export default function EditSupplierModal({ supplier }: { supplier: Supplier }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Form>(toForm(supplier))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function openModal() {
    setForm(toForm(supplier))
    setError('')
    setOpen(true)
  }

  function set(field: keyof Form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const balance = parseFloat(form.balanceOwed)
    if (isNaN(balance) || balance < 0) {
      setError('Balance must be a valid non-negative number.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          balanceOwed: balance,
          notes: form.notes.trim() || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.message ?? 'Failed to update supplier.')
        return
      }
      setOpen(false)
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={openModal}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#135BEC] border border-[#135BEC]/30 rounded-lg hover:bg-[#135BEC]/5 transition-colors"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">{supplier.name}</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
                <input type="tel" value={form.phone} onChange={set('phone')} placeholder="e.g. 9800000000"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#135BEC] focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                <input type="email" value={form.email} onChange={set('email')} placeholder="supplier@example.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#135BEC] focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Balance Owed (NPR)</label>
                <input type="number" min="0" step="0.01" value={form.balanceOwed} onChange={set('balanceOwed')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#135BEC] focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                <textarea value={form.notes} onChange={set('notes')} rows={3} placeholder="Any notes about this supplier..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#135BEC] focus:border-transparent resize-none" />
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-[#135BEC] text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors">
                  {loading ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
