'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Product = {
  id: number
  name: string
  sku: string | null
  category: string | null
  price: number
  costPrice: number | null
  quantity: number
  reorderLevel: number | null
  supplier: string | null
}

type PaymentStatus = 'PAID' | 'DUE' | 'PARTIAL'

type Form = {
  name: string
  sku: string
  category: string
  costPrice: string
  price: string
  quantity: string
  reorderLevel: string
  supplier: string
}

const EMPTY: Form = { name: '', sku: '', category: '', costPrice: '', price: '', quantity: '', reorderLevel: '', supplier: '' }

function productToForm(p: Product): Form {
  return {
    name: p.name,
    sku: p.sku ?? '',
    category: p.category ?? '',
    costPrice: p.costPrice != null ? String(p.costPrice) : '',
    price: String(p.price),
    quantity: String(p.quantity),
    reorderLevel: p.reorderLevel != null ? String(p.reorderLevel) : '',
    supplier: p.supplier ?? '',
  }
}

type Props = {
  product?: Product
  onClose?: () => void
  triggerLabel?: string
  categories?: string[]
}

export default function AddProductModal({ product, onClose, triggerLabel, categories = [] }: Props) {
  const router = useRouter()
  const isEdit = !!product
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Form>(isEdit ? productToForm(product) : EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('DUE')
  const [amountPaidNow, setAmountPaidNow] = useState('')
  const [supplierSuggestions, setSupplierSuggestions] = useState<string[]>([])
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false)
  const supplierTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const quantityValue = parseInt(form.quantity, 10)
  const costValue = parseFloat(form.costPrice)
  const validQuantity = Number.isFinite(quantityValue) ? quantityValue : 0
  const validCost = Number.isFinite(costValue) ? costValue : 0
  const canTrackSupplierPayment = !isEdit && !!form.supplier.trim() && validQuantity > 0 && validCost > 0
  const purchaseTotal = canTrackSupplierPayment ? validQuantity * validCost : 0
  const paidNowValue = amountPaidNow ? parseFloat(amountPaidNow) : 0
  const unpaidTotal = canTrackSupplierPayment
    ? paymentStatus === 'PAID'
      ? 0
      : paymentStatus === 'DUE'
        ? purchaseTotal
        : Math.max(0, purchaseTotal - (Number.isFinite(paidNowValue) ? paidNowValue : 0))
    : 0

  function openModal() {
    setForm(isEdit ? productToForm(product) : EMPTY)
    setError('')
    setPaymentStatus('DUE')
    setAmountPaidNow('')
    setSupplierSuggestions([])
    setShowSupplierSuggestions(false)
    setOpen(true)
  }

  function closeModal() {
    setOpen(false)
    onClose?.()
  }

  function set(field: keyof Form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  function handleSupplierChange(value: string) {
    setForm((f) => ({ ...f, supplier: value }))
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
        setSupplierSuggestions((data.content ?? []).map((supplier: { name: string }) => supplier.name))
        setShowSupplierSuggestions(true)
      } catch {
        setSupplierSuggestions([])
        setShowSupplierSuggestions(false)
      }
    }, 250)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.price || !form.quantity) {
      setError('Name, price, and quantity are required.')
      return
    }

    if (canTrackSupplierPayment && paymentStatus === 'PARTIAL') {
      const partialPaid = parseFloat(amountPaidNow)
      if (Number.isNaN(partialPaid) || partialPaid <= 0) {
        setError('Enter how much you paid now for a partial supplier payment.')
        return
      }
      if (partialPaid >= purchaseTotal) {
        setError('Partial payment must be less than the full purchase total.')
        return
      }
    }

    setError('')
    setLoading(true)
    try {
      const body = {
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        category: form.category.trim() || null,
        costPrice: form.costPrice ? parseFloat(form.costPrice) : null,
        price: parseFloat(form.price),
        quantity: parseInt(form.quantity, 10),
        reorderLevel: form.reorderLevel ? parseInt(form.reorderLevel, 10) : null,
        supplier: form.supplier.trim() || null,
        ...(canTrackSupplierPayment ? {
          paymentStatus,
          amountPaidNow: paymentStatus === 'PARTIAL' ? parseFloat(amountPaidNow) : null,
        } : {}),
      }

      const url = isEdit ? `/api/products/${product.id}` : '/api/products'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? d.message ?? `Failed to ${isEdit ? 'update' : 'create'} product.`)
        return
      }
      closeModal()
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
        className={
          isEdit
            ? 'flex items-center gap-1.5 rounded-lg border border-[#135BEC]/30 px-3 py-1.5 text-xs font-medium text-[#135BEC] transition-colors hover:bg-[#135BEC]/5'
            : 'flex items-center gap-2 rounded-lg bg-[#135BEC] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700'
        }
      >
        {isEdit ? (
          <>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            {triggerLabel ?? 'Edit'}
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {triggerLabel ?? 'Add Product'}
          </>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Product Name *" value={form.name} onChange={set('name')} placeholder="e.g. Rice 5kg" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="SKU" value={form.sku} onChange={set('sku')} placeholder="e.g. RICE-5KG" />
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Category</label>
                  {categories.length > 0 ? (
                    <select
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#135BEC]"
                    >
                      <option value="">Select category</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      {form.category && !categories.includes(form.category) && (
                        <option value={form.category}>{form.category} (legacy)</option>
                      )}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                      placeholder="e.g. Grains"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#135BEC]"
                    />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cost Price (NPR)" value={form.costPrice} onChange={set('costPrice')} placeholder="0.00" type="number" min="0" step="0.01" />
                <Field label="Selling Price (NPR) *" value={form.price} onChange={set('price')} placeholder="0.00" type="number" min="0" step="0.01" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label={isEdit ? 'Quantity (manual correction) *' : 'Quantity *'}
                  value={form.quantity}
                  onChange={set('quantity')}
                  placeholder="0"
                  type="number"
                  min="0"
                />
                <Field label="Reorder Level" value={form.reorderLevel} onChange={set('reorderLevel')} placeholder="e.g. 10" type="number" min="0" />
              </div>

              <div className="relative">
                <label className="mb-1 block text-xs font-semibold text-gray-600">Supplier</label>
                <input
                  type="text"
                  value={form.supplier}
                  onChange={(e) => handleSupplierChange(e.target.value)}
                  onBlur={() => setShowSupplierSuggestions(false)}
                  placeholder="e.g. ABC Traders"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#135BEC]"
                />
                {showSupplierSuggestions && supplierSuggestions.length > 0 && (
                  <ul className="absolute left-0 top-full z-10 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg">
                    {supplierSuggestions.map((supplierName) => (
                      <li
                        key={supplierName}
                        onMouseDown={() => {
                          setForm((f) => ({ ...f, supplier: supplierName }))
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

              {canTrackSupplierPayment && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Supplier payment</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Purchase total is calculated from quantity and cost price so the unpaid amount can update this supplier automatically.
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-sm">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Purchase total</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">NPR {purchaseTotal.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(['PAID', 'DUE', 'PARTIAL'] as PaymentStatus[]).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setPaymentStatus(status)}
                        className={`rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                          paymentStatus === status
                            ? 'bg-[#135BEC] text-white'
                            : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {status === 'PAID' ? 'Paid now' : status === 'DUE' ? 'Due in full' : 'Partial payment'}
                      </button>
                    ))}
                  </div>

                  {paymentStatus === 'PARTIAL' && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Field
                        label="Amount Paid Now (NPR)"
                        value={amountPaidNow}
                        onChange={(e) => setAmountPaidNow(e.target.value)}
                        placeholder="0.00"
                        type="number"
                        min="0"
                        step="0.01"
                      />
                      <div className="rounded-2xl bg-white px-4 py-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Unpaid amount</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">NPR {unpaidTotal.toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  {paymentStatus !== 'PARTIAL' && (
                    <div className="mt-4 rounded-2xl bg-white px-4 py-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Unpaid amount</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">NPR {unpaidTotal.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              )}

              {isEdit && (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700">
                  Quantity edits here are treated as manual corrections. Use the restock action from inventory when new stock arrives and you want supplier balances to update automatically.
                </p>
              )}

              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeModal} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="flex-1 rounded-lg bg-[#135BEC] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60">
                  {loading ? 'Saving...' : isEdit ? 'Update Product' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', min, step }: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
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
