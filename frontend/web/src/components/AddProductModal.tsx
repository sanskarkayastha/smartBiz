'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Form = {
  name: string
  sku: string
  category: string
  price: string
  quantity: string
  reorderLevel: string
  supplier: string
}

const EMPTY: Form = { name: '', sku: '', category: '', price: '', quantity: '', reorderLevel: '', supplier: '' }

export default function AddProductModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Form>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field: keyof Form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.price || !form.quantity) {
      setError('Name, price, and quantity are required.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          sku: form.sku.trim() || null,
          category: form.category.trim() || null,
          price: parseFloat(form.price),
          quantity: parseInt(form.quantity),
          reorderLevel: form.reorderLevel ? parseInt(form.reorderLevel) : null,
          supplier: form.supplier.trim() || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.message ?? 'Failed to create product.')
        return
      }
      setForm(EMPTY)
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
        onClick={() => { setOpen(true); setError('') }}
        className="flex items-center gap-2 px-4 py-2 bg-[#135BEC] text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Product
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Add Product</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Product Name *" value={form.name} onChange={set('name')} placeholder="e.g. Rice 5kg" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="SKU" value={form.sku} onChange={set('sku')} placeholder="e.g. RICE-5KG" />
                <Field label="Category" value={form.category} onChange={set('category')} placeholder="e.g. Grains" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Price (NPR) *" value={form.price} onChange={set('price')} placeholder="0.00" type="number" min="0" step="0.01" />
                <Field label="Quantity *" value={form.quantity} onChange={set('quantity')} placeholder="0" type="number" min="0" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Reorder Level" value={form.reorderLevel} onChange={set('reorderLevel')} placeholder="e.g. 10" type="number" min="0" />
                <Field label="Supplier" value={form.supplier} onChange={set('supplier')} placeholder="e.g. ABC Store" />
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-[#135BEC] text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors">
                  {loading ? 'Saving…' : 'Save Product'}
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
  label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string; type?: string; min?: string; step?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        step={step}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#135BEC] focus:border-transparent"
      />
    </div>
  )
}
