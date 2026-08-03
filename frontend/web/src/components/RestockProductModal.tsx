'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type PaymentStatus = 'PAID' | 'DUE' | 'PARTIAL'

type Product = {
  id: number
  name: string
  supplier: string | null
  costPrice: number | null
}

export default function RestockProductModal({ product }: { product: Product }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [quantityAdded, setQuantityAdded] = useState('1')
  const [unitCost, setUnitCost] = useState(product.costPrice != null ? String(product.costPrice) : '')
  const [supplier, setSupplier] = useState(product.supplier ?? '')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('DUE')
  const [amountPaidNow, setAmountPaidNow] = useState('')
  const [note, setNote] = useState('')
  const [supplierSuggestions, setSupplierSuggestions] = useState<string[]>([])
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false)
  const supplierTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const quantityValue = parseInt(quantityAdded, 10)
  const unitCostValue = parseFloat(unitCost)
  const validQuantity = Number.isFinite(quantityValue) ? quantityValue : 0
  const validUnitCost = Number.isFinite(unitCostValue) ? unitCostValue : 0
  const canTrackPayment = !!supplier.trim() && validQuantity > 0 && validUnitCost > 0
  const purchaseTotal = canTrackPayment ? validQuantity * validUnitCost : 0
  const partialPaid = amountPaidNow ? parseFloat(amountPaidNow) : 0
  const unpaidTotal = canTrackPayment
    ? paymentStatus === 'PAID'
      ? 0
      : paymentStatus === 'DUE'
        ? purchaseTotal
        : Math.max(0, purchaseTotal - (Number.isFinite(partialPaid) ? partialPaid : 0))
    : 0

  function reset() {
    setQuantityAdded('1')
    setUnitCost(product.costPrice != null ? String(product.costPrice) : '')
    setSupplier(product.supplier ?? '')
    setPaymentStatus('DUE')
    setAmountPaidNow('')
    setNote('')
    setSupplierSuggestions([])
    setShowSupplierSuggestions(false)
    setError('')
  }

  function handleOpen() {
    reset()
    setOpen(true)
  }

  function handleSupplierChange(value: string) {
    setSupplier(value)
    if (supplierTimerRef.current) clearTimeout(supplierTimerRef.current)

    if (!value.trim()) {
      setSupplierSuggestions([])
      setShowSupplierSuggestions(false)
      return
    }

    supplierTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suppliers?search=${encodeURIComponent(value)}&page=0&size=5`)
        const data = await res.json()
        setSupplierSuggestions((data.content ?? []).map((item: { name: string }) => item.name))
        setShowSupplierSuggestions(true)
      } catch {
        setSupplierSuggestions([])
        setShowSupplierSuggestions(false)
      }
    }, 250)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
      setError('Quantity added must be at least 1.')
      return
    }
    if (!Number.isFinite(unitCostValue) || unitCostValue <= 0) {
      setError('Unit cost must be greater than 0.')
      return
    }
    if (canTrackPayment && paymentStatus === 'PARTIAL') {
      const paid = parseFloat(amountPaidNow)
      if (Number.isNaN(paid) || paid <= 0) {
        setError('Enter how much was paid now for a partial payment.')
        return
      }
      if (paid >= purchaseTotal) {
        setError('Partial payment must be less than the full purchase total.')
        return
      }
    }

    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/products/${product.id}/restock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantityAdded: quantityValue,
          unitCost: unitCostValue,
          supplier: supplier.trim() || null,
          paymentStatus,
          amountPaidNow: canTrackPayment && paymentStatus === 'PARTIAL' ? parseFloat(amountPaidNow) : null,
          note: note.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? data.message ?? 'Failed to restock product.')
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
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 rounded-[10px] border border-mint/35 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-mint/14"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
        Restock
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="relative mb-5 flex min-h-11 items-center justify-center px-12 text-center">
              <div className="max-w-md">
                <h2 className="text-lg font-bold text-gray-900">Restock {product.name}</h2>
                <p className="mt-1 text-sm text-slate-500">Add incoming stock and update this supplier if any amount is still due.</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close restock form" className="absolute right-0 inline-flex h-11 w-11 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-paper hover:text-gray-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Quantity Added *" value={quantityAdded} onChange={setQuantityAdded} placeholder="1" type="number" min="1" />
                <Field label="Unit Cost (NPR) *" value={unitCost} onChange={setUnitCost} placeholder="0.00" type="number" min="0" step="0.01" />
              </div>

              <div className="relative">
                <label className="mb-1 block text-xs font-semibold text-gray-600">Supplier</label>
                <input
                  type="text"
                  value={supplier}
                  onChange={(e) => handleSupplierChange(e.target.value)}
                  onBlur={() => setShowSupplierSuggestions(false)}
                  placeholder="Leave blank if this restock should not affect supplier dues"
                  className="w-full rounded-lg border border-paper-3 px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand/24"
                />
                {showSupplierSuggestions && supplierSuggestions.length > 0 && (
                  <ul className="absolute left-0 top-full z-10 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg">
                    {supplierSuggestions.map((supplierName) => (
                      <li
                        key={supplierName}
                        onMouseDown={() => {
                          setSupplier(supplierName)
                          setSupplierSuggestions([])
                          setShowSupplierSuggestions(false)
                        }}
                        className="cursor-pointer px-3 py-2 text-sm text-gray-800 hover:bg-gray-100"
                      >
                        {supplierName}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Field label="Note" value={note} onChange={setNote} placeholder="e.g. Weekly refill" />

              {canTrackPayment && (
                <div className="rounded-2xl border border-paper-3 bg-brand-soft/70 p-4">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="max-w-md">
                      <p className="text-sm font-semibold text-slate-900">Supplier payment</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Track whether this restock was paid, fully due, or only partly paid.
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Purchase total</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">NPR {purchaseTotal.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {(['PAID', 'DUE', 'PARTIAL'] as PaymentStatus[]).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setPaymentStatus(status)}
                        className={`rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                          paymentStatus === status
                            ? 'bg-brand text-snow'
                            : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {status === 'PAID' ? 'Paid now' : status === 'DUE' ? 'Due in full' : 'Partial payment'}
                      </button>
                    ))}
                  </div>

                  {paymentStatus === 'PARTIAL' && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Field label="Amount Paid Now (NPR)" value={amountPaidNow} onChange={setAmountPaidNow} placeholder="0.00" type="number" min="0" step="0.01" />
                      <div className="rounded-2xl bg-white px-4 py-4 text-center">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Unpaid amount</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">NPR {unpaidTotal.toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  {paymentStatus !== 'PARTIAL' && (
                    <div className="mt-4 rounded-2xl bg-white px-4 py-4 text-center">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Unpaid amount</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">NPR {unpaidTotal.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              )}

              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-600">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="flex-1 rounded-lg bg-brand py-2.5 text-sm font-semibold text-snow transition-colors hover:opacity-90 disabled:opacity-60">
                  {loading ? 'Saving...' : 'Save Restock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  min,
  step,
}: {
  label: string
  value: string
  onChange: (value: string) => void
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
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        step={step}
        className="w-full rounded-lg border border-paper-3 px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand/24"
      />
    </div>
  )
}
