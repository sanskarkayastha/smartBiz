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

type LedgerEntry = {
  id: number
  type: 'OPENING_BALANCE' | 'PURCHASE' | 'PAYMENT' | 'MANUAL_ADJUSTMENT'
  amount: number
  quantity: number | null
  unitCost: number | null
  note: string | null
  createdAt: string
}

type Form = {
  phone: string
  email: string
  notes: string
}

type ActionMode = 'payment' | 'debt' | 'setBalance'
type TriggerTone = 'default' | 'payment'

type EditSupplierModalProps = {
  supplier: Supplier
  initialAction?: ActionMode
  triggerLabel?: string
  triggerTone?: TriggerTone
}

function toForm(s: Supplier): Form {
  return {
    phone: s.phone ?? '',
    email: s.email ?? '',
    notes: s.notes ?? '',
  }
}

function formatCurrency(value: number) {
  return `NPR ${Number(value || 0).toLocaleString()}`
}

function entryLabel(entry: LedgerEntry) {
  if (entry.type === 'OPENING_BALANCE') return 'Opening balance'
  if (entry.type === 'PURCHASE') return 'Purchase due'
  if (entry.type === 'PAYMENT') return 'Payment recorded'
  return 'Manual adjustment'
}

export default function EditSupplierModal({
  supplier,
  initialAction = 'payment',
  triggerLabel = 'Manage',
  triggerTone = 'default',
}: EditSupplierModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Form>(toForm(supplier))
  const [currentBalance, setCurrentBalance] = useState(supplier.balanceOwed)
  const [loading, setLoading] = useState(false)
  const [savingContact, setSavingContact] = useState(false)
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [actionMode, setActionMode] = useState<ActionMode>('payment')
  const [actionAmount, setActionAmount] = useState('')
  const [targetBalance, setTargetBalance] = useState('')
  const [actionNote, setActionNote] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionSaving, setActionSaving] = useState(false)

  async function openModal() {
    setForm(toForm(supplier))
    setCurrentBalance(supplier.balanceOwed)
    setActionAmount('')
    setTargetBalance(String(supplier.balanceOwed))
    setActionNote('')
    setActionError('')
    setActionMode(initialAction)
    setOpen(true)
    setLoading(true)

    try {
      const res = await fetch(`/api/suppliers/${supplier.id}/ledger`)
      const data = await res.json().catch(() => [])
      setLedger(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  function set(field: keyof Form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleContactSave(e: React.FormEvent) {
    e.preventDefault()
    setSavingContact(true)
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          notes: form.notes.trim() || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setActionError(data.error ?? data.message ?? 'Failed to update supplier details.')
        return
      }
      const data = await res.json().catch(() => ({}))
      if (typeof data.balanceOwed === 'number') setCurrentBalance(data.balanceOwed)
      router.refresh()
    } finally {
      setSavingContact(false)
    }
  }

  async function submitAction() {
    setActionError('')
    setActionSaving(true)
    try {
      let url = ''
      let body: Record<string, unknown> = {}

      if (actionMode === 'payment') {
        const amount = parseFloat(actionAmount)
        if (Number.isNaN(amount) || amount <= 0) {
          setActionError('Enter a payment amount greater than 0.')
          return
        }
        url = `/api/suppliers/${supplier.id}/payments`
        body = { amount, note: actionNote.trim() || null }
      } else if (actionMode === 'debt') {
        const amount = parseFloat(actionAmount)
        if (Number.isNaN(amount) || amount <= 0) {
          setActionError('Enter the extra amount owed.')
          return
        }
        url = `/api/suppliers/${supplier.id}/adjustments`
        body = { mode: 'ADD_DEBT', amount, note: actionNote.trim() || null }
      } else {
        const balance = parseFloat(targetBalance)
        if (Number.isNaN(balance) || balance < 0) {
          setActionError('Enter the target balance you want to keep.')
          return
        }
        url = `/api/suppliers/${supplier.id}/adjustments`
        body = { mode: 'SET_BALANCE', targetBalance: balance, note: actionNote.trim() || null }
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setActionError(data.error ?? data.message ?? 'Failed to update supplier balance.')
        return
      }
      const updatedSupplier = await res.json().catch(() => ({}))
      if (typeof updatedSupplier.balanceOwed === 'number') setCurrentBalance(updatedSupplier.balanceOwed)

      const ledgerRes = await fetch(`/api/suppliers/${supplier.id}/ledger`)
      const ledgerData = await ledgerRes.json().catch(() => [])
      setLedger(Array.isArray(ledgerData) ? ledgerData : [])
      setActionAmount('')
      setActionNote('')
      router.refresh()
    } finally {
      setActionSaving(false)
    }
  }

  const triggerClassName = triggerTone === 'payment'
    ? 'flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100'
    : 'flex items-center gap-1.5 rounded-lg border border-[#135BEC]/30 px-3 py-1.5 text-xs font-medium text-[#135BEC] transition-colors hover:bg-[#135BEC]/5'

  return (
    <>
      <button
        onClick={openModal}
        className={triggerClassName}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        {triggerLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{supplier.name}</h2>
                <p className="mt-1 text-sm text-slate-500">Update supplier details, record payments, and review how the current balance was built.</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
              <div className="space-y-5">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#135BEC]">Current balance</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{formatCurrency(currentBalance)}</p>
                  <p className="mt-2 text-sm text-slate-500">Payments reduce this amount, purchases and manual debt increase it, and “set current balance” writes a delta adjustment behind the scenes.</p>
                </div>

                <form onSubmit={handleContactSave} className="rounded-2xl border border-slate-100 p-4">
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-slate-900">Supplier details</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Contact and notes update without touching the balance.</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Phone" value={form.phone} onChange={set('phone')} placeholder="e.g. 9800000000" type="tel" />
                    <Field label="Email" value={form.email} onChange={set('email')} placeholder="supplier@example.com" type="email" />
                  </div>
                  <div className="mt-4">
                    <label className="mb-1 block text-xs font-semibold text-gray-600">Notes</label>
                    <textarea
                      value={form.notes}
                      onChange={set('notes')}
                      rows={3}
                      placeholder="Any notes about this supplier..."
                      className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#135BEC]"
                    />
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button type="submit" disabled={savingContact} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60">
                      {savingContact ? 'Saving...' : 'Save Details'}
                    </button>
                  </div>
                </form>

                <div className="rounded-2xl border border-slate-100 p-4">
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-slate-900">Balance actions</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Choose the exact action instead of overwriting the balance manually.</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setActionMode('payment')} className={`rounded-full px-3 py-2 text-xs font-semibold ${actionMode === 'payment' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      Record payment
                    </button>
                    <button type="button" onClick={() => setActionMode('debt')} className={`rounded-full px-3 py-2 text-xs font-semibold ${actionMode === 'debt' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      Add manual debt
                    </button>
                    <button type="button" onClick={() => setActionMode('setBalance')} className={`rounded-full px-3 py-2 text-xs font-semibold ${actionMode === 'setBalance' ? 'bg-[#135BEC] text-white' : 'bg-slate-100 text-slate-600'}`}>
                      Set current balance
                    </button>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {(actionMode === 'payment' || actionMode === 'debt') && (
                      <Field
                        label={actionMode === 'payment' ? 'Amount (NPR)' : 'Extra debt (NPR)'}
                        value={actionAmount}
                        onChange={(e) => setActionAmount(e.target.value)}
                        placeholder="0.00"
                        type="number"
                        min="0"
                        step="0.01"
                      />
                    )}
                    {actionMode === 'setBalance' && (
                      <Field
                        label="Target balance (NPR)"
                        value={targetBalance}
                        onChange={(e) => setTargetBalance(e.target.value)}
                        placeholder="0.00"
                        type="number"
                        min="0"
                        step="0.01"
                      />
                    )}
                    <Field
                      label="Note"
                      value={actionNote}
                      onChange={(e) => setActionNote(e.target.value)}
                      placeholder={actionMode === 'payment' ? 'e.g. Cash paid today' : actionMode === 'debt' ? 'Why more is owed' : 'Why the balance was reset'}
                    />
                  </div>

                  {actionError && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{actionError}</p>}

                  <div className="mt-4 flex justify-end">
                    <button type="button" onClick={submitAction} disabled={actionSaving} className="rounded-lg bg-[#135BEC] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60">
                      {actionSaving ? 'Saving...' : actionMode === 'payment' ? 'Record Payment' : actionMode === 'debt' ? 'Add Debt' : 'Set Balance'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 p-4">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-slate-900">Recent balance activity</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Newest entries appear first so you can see what changed this balance last.</p>
                </div>

                {loading ? (
                  <div className="py-16 text-center text-sm text-slate-400">Loading history...</div>
                ) : ledger.length === 0 ? (
                  <div className="py-16 text-center text-sm text-slate-400">No balance history yet.</div>
                ) : (
                  <div className="space-y-3">
                    {ledger.map((entry) => {
                      const positive = Number(entry.amount) > 0
                      return (
                        <div key={entry.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900">{entryLabel(entry)}</p>
                              <p className="mt-1 text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString()}</p>
                              {(entry.note || entry.quantity || entry.unitCost) && (
                                <p className="mt-2 text-xs leading-5 text-slate-500">
                                  {entry.note ?? ''}
                                  {entry.quantity ? `${entry.note ? ' • ' : ''}${entry.quantity} units` : ''}
                                  {entry.unitCost ? `${entry.note || entry.quantity ? ' • ' : ''}Unit cost ${formatCurrency(entry.unitCost)}` : ''}
                                </p>
                              )}
                            </div>
                            <p className={`text-sm font-semibold ${positive ? 'text-amber-700' : 'text-emerald-700'}`}>
                              {positive ? '+' : ''}
                              {formatCurrency(entry.amount)}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', min, step }: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  placeholder?: string
  type?: string
  min?: string
  step?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-gray-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        step={step}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#135BEC]"
      />
    </div>
  )
}
