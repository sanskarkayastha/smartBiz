'use client'

import { useState } from 'react'
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

  function openModal() {
    setForm(isEdit ? productToForm(product) : EMPTY)
    setError('')
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.price || !form.quantity) {
      setError('Name, price, and quantity are required.')
      return
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
        quantity: parseInt(form.quantity),
        reorderLevel: form.reorderLevel ? parseInt(form.reorderLevel) : null,
        supplier: form.supplier.trim() || null,
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
        setError(d.message ?? `Failed to ${isEdit ? 'update' : 'create'} product.`)
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
            ? 'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#135BEC] border border-[#135BEC]/30 rounded-lg hover:bg-[#135BEC]/5 transition-colors'
            : 'flex items-center gap-2 px-4 py-2 bg-[#135BEC] text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors'
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
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
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
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
                  {categories.length > 0 ? (
                    <>
                      <select
                        value={form.category}
                        onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#135BEC] focus:border-transparent bg-white"
                      >
                        <option value="">— Select category —</option>
                        {categories.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                        {form.category && !categories.includes(form.category) && (
                          <option value={form.category}>{form.category} (legacy)</option>
                        )}
                      </select>
                    </>
                  ) : (
                    <input
                      type="text"
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                      placeholder="e.g. Grains"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#135BEC] focus:border-transparent"
                    />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cost Price (NPR)" value={form.costPrice} onChange={set('costPrice')} placeholder="0.00" type="number" min="0" step="0.01" />
                <Field label="Selling Price (NPR) *" value={form.price} onChange={set('price')} placeholder="0.00" type="number" min="0" step="0.01" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Quantity *" value={form.quantity} onChange={set('quantity')} placeholder="0" type="number" min="0" />
                <Field label="Reorder Level" value={form.reorderLevel} onChange={set('reorderLevel')} placeholder="e.g. 10" type="number" min="0" />
              </div>
              <Field label="Supplier" value={form.supplier} onChange={set('supplier')} placeholder="e.g. ABC Store" />

              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeModal} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-[#135BEC] text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors">
                  {loading ? 'Saving…' : isEdit ? 'Update Product' : 'Save Product'}
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
