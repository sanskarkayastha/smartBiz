'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  attachProductImage,
  discardProductImage,
  removeProductImage,
  requestProductImageSignature,
  uploadProductImageToCloudinary,
  validateProductImage,
} from '@/src/lib/productImages'

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
  imageUrl: string | null
}

type PaymentStatus = 'PAID' | 'DUE' | 'PARTIAL'

type Category = {
  id: number
  name: string
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
  onCategoryCreated?: (category: Category) => void
}

export default function AddProductModal({ product, onClose, triggerLabel, categories = [], onCategoryCreated }: Props) {
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
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const [categoryError, setCategoryError] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')
  const [removeExistingImage, setRemoveExistingImage] = useState(false)
  const [savedProductId, setSavedProductId] = useState<number | null>(null)
  const [partialMessage, setPartialMessage] = useState('')
  const [imageStage, setImageStage] = useState<'idle' | 'saving' | 'uploading' | 'attaching'>('idle')
  const supplierTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    }
  }, [imagePreviewUrl])

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
    setShowNewCategory(false)
    setNewCategoryName('')
    setCategoryError('')
    setImageFile(null)
    setImagePreviewUrl('')
    setRemoveExistingImage(false)
    setSavedProductId(null)
    setPartialMessage('')
    setImageStage('idle')
    setOpen(true)
  }

  function closeModal() {
    setOpen(false)
    setImageFile(null)
    setImagePreviewUrl('')
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

  function closeNewCategory() {
    setShowNewCategory(false)
    setNewCategoryName('')
    setCategoryError('')
  }

  async function handleCreateCategory() {
    const name = newCategoryName.trim()
    if (!name || addingCategory) return

    const existingCategory = categories.find((category) => category.toLocaleLowerCase() === name.toLocaleLowerCase())
    if (existingCategory) {
      setForm((current) => ({ ...current, category: existingCategory }))
      closeNewCategory()
      return
    }

    setAddingCategory(true)
    setCategoryError('')
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setCategoryError(data.error ?? 'Failed to add category.')
        return
      }

      const createdCategory = data as Category
      onCategoryCreated?.(createdCategory)
      setForm((current) => ({ ...current, category: createdCategory.name }))
      closeNewCategory()
    } catch {
      setCategoryError('Network error. Please try again.')
    } finally {
      setAddingCategory(false)
    }
  }

  function handleImageSelected(file?: File) {
    if (!file) return
    const validationError = validateProductImage(file)
    if (validationError) {
      setError(validationError)
      if (imageInputRef.current) imageInputRef.current.value = ''
      return
    }
    setError('')
    setImageFile(file)
    setImagePreviewUrl(URL.createObjectURL(file))
    setRemoveExistingImage(false)
  }

  function clearSelectedImage() {
    setImageFile(null)
    setImagePreviewUrl('')
    if (imageInputRef.current) imageInputRef.current.value = ''
    if (product?.imageUrl) setRemoveExistingImage(true)
  }

  async function applyPendingImage(productId: number) {
    if (imageFile) {
      let confirmation: Awaited<ReturnType<typeof uploadProductImageToCloudinary>> | null = null
      try {
        setImageStage('uploading')
        const uploadSignature = await requestProductImageSignature(productId)
        confirmation = await uploadProductImageToCloudinary(imageFile, uploadSignature)
        setImageStage('attaching')
        await attachProductImage(productId, confirmation)
      } catch (uploadError) {
        if (confirmation) await discardProductImage(productId, confirmation)
        throw uploadError
      }
      return
    }

    if (removeExistingImage && product?.imageUrl) {
      setImageStage('attaching')
      await removeProductImage(productId)
    }
  }

  async function handleRetryImage() {
    if (!savedProductId) return
    setLoading(true)
    setPartialMessage('')
    try {
      await applyPendingImage(savedProductId)
      setLoading(false)
      closeModal()
      router.refresh()
    } catch (retryError) {
      setPartialMessage(retryError instanceof Error ? retryError.message : 'The image could not be saved. Please try again.')
      setLoading(false)
      setImageStage('idle')
    }
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
    setImageStage('saving')
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
      const savedProduct = await res.json() as Product
      if (imageFile || (removeExistingImage && !!product?.imageUrl)) {
        try {
          await applyPendingImage(savedProduct.id)
        } catch (imageError) {
          setSavedProductId(savedProduct.id)
          setPartialMessage(imageError instanceof Error ? imageError.message : 'The image could not be saved.')
          setImageStage('idle')
          router.refresh()
          return
        }
      }
      setLoading(false)
      closeModal()
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
      setImageStage('idle')
    }
  }

  const displayedImage = imagePreviewUrl || (!removeExistingImage ? product?.imageUrl ?? '' : '')
  const progressLabel = imageStage === 'saving'
    ? isEdit ? 'Saving changes...' : 'Saving product...'
    : imageStage === 'uploading'
      ? 'Uploading image...'
      : imageStage === 'attaching'
        ? removeExistingImage && !imageFile ? 'Removing image...' : 'Attaching image...'
        : isEdit ? 'Update Product' : 'Save Product'

  return (
    <>
      <button
        onClick={openModal}
        className={
          isEdit
            ? 'inline-flex items-center gap-1.5 rounded-[10px] border border-brand/30 px-3 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand-soft'
            : 'inline-flex h-12 items-center gap-2 rounded-[14px] bg-brand px-4 text-sm font-bold text-snow transition-colors hover:opacity-90'
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
          <div className="absolute inset-0 bg-black/40" onClick={() => { if (!loading) closeModal() }} />
          <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="relative mb-5 flex min-h-11 items-center justify-center px-12 text-center">
              <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={closeModal} disabled={loading} aria-label="Close product form" className="absolute right-0 inline-flex h-11 w-11 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-paper hover:text-gray-600 disabled:opacity-40">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {savedProductId ? (
              <div className="space-y-5">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
                  <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </span>
                  <h3 className="mt-3 text-base font-bold text-ink">Product saved</h3>
                  <p className="mt-1 text-sm leading-5 text-amber-800">{partialMessage}</p>
                  <p className="mt-1 text-xs text-amber-700">Your inventory details are safe. Only the image still needs attention.</p>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={closeModal} disabled={loading} className="flex-1 rounded-lg border border-paper-3 py-2.5 text-sm font-semibold text-ink-2 transition-colors hover:bg-paper disabled:opacity-50">
                    Done
                  </button>
                  <button type="button" onClick={handleRetryImage} disabled={loading} className="flex-1 rounded-lg bg-brand py-2.5 text-sm font-semibold text-snow transition-colors hover:opacity-90 disabled:opacity-60">
                    {loading ? progressLabel : 'Retry Image'}
                  </button>
                </div>
              </div>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="mb-2 flex flex-col items-center gap-1 text-center">
                  <label className="block text-xs font-semibold text-gray-600">Product Image</label>
                  <span className="text-[11px] text-ink-3">Optional, up to 5 MB</span>
                </div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  onChange={(event) => handleImageSelected(event.target.files?.[0])}
                  className="sr-only"
                />
                <div className="flex flex-col items-center gap-3 rounded-xl border border-paper-3 bg-paper/45 p-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-paper-3 bg-white text-ink-3 transition-colors hover:border-brand/50 hover:text-brand"
                    aria-label={displayedImage ? 'Change product image' : 'Choose product image'}
                  >
                    {displayedImage ? (
                      <Image src={displayedImage} alt="Product preview" fill unoptimized className="object-cover" />
                    ) : (
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="M21 15l-5-5L5 19"/></svg>
                    )}
                  </button>
                  <div className="min-w-0 flex-1 text-center sm:text-left">
                    <p className="truncate text-sm font-semibold text-ink">
                      {imageFile?.name ?? (displayedImage ? 'Current product image' : 'Add a clear product photo')}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-ink-3">JPEG, PNG, WebP, or HEIC. The image is uploaded after the product is saved.</p>
                    <div className="mt-2 flex justify-center gap-2 sm:justify-start">
                      <button type="button" onClick={() => imageInputRef.current?.click()} className="text-xs font-semibold text-brand hover:opacity-75">
                        {displayedImage ? 'Change' : 'Choose image'}
                      </button>
                      {displayedImage && (
                        <button type="button" onClick={clearSelectedImage} className="text-xs font-semibold text-rose hover:opacity-75">Remove</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <Field label="Product Name *" value={form.name} onChange={set('name')} placeholder="e.g. Rice 5kg" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="SKU" value={form.sku} onChange={set('sku')} placeholder="e.g. RICE-5KG" />
                <div>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <label htmlFor="product-category" className="block text-xs font-semibold text-gray-600">Category</label>
                    {!isEdit && !showNewCategory && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewCategory(true)
                          setCategoryError('')
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand transition-colors hover:opacity-75"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        New category
                      </button>
                    )}
                  </div>
                  {showNewCategory ? (
                    <div className="space-y-1.5">
                      <div className="flex gap-2">
                        <input
                          autoFocus
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => {
                            setNewCategoryName(e.target.value)
                            if (categoryError) setCategoryError('')
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleCreateCategory()
                            }
                            if (e.key === 'Escape') closeNewCategory()
                          }}
                          placeholder="Category name"
                          maxLength={100}
                          aria-label="New category name"
                          aria-invalid={!!categoryError}
                          className="min-w-0 flex-1 rounded-lg border border-brand px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-brand/24"
                        />
                        <button
                          type="button"
                          onClick={handleCreateCategory}
                          disabled={addingCategory || !newCategoryName.trim()}
                          className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-snow transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {addingCategory ? 'Adding...' : 'Add'}
                        </button>
                        <button
                          type="button"
                          onClick={closeNewCategory}
                          disabled={addingCategory}
                          aria-label="Cancel new category"
                          className="rounded-lg border border-paper-3 px-2.5 py-2 text-ink-3 transition-colors hover:bg-paper hover:text-ink disabled:opacity-50"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </div>
                      {categoryError && <p className="text-xs text-red-600" role="alert">{categoryError}</p>}
                    </div>
                  ) : (
                    <select
                      id="product-category"
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                      className="w-full rounded-lg border border-paper-3 bg-white px-3 py-2 text-sm text-ink focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand/24"
                    >
                      <option value="">Select category</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      {form.category && !categories.includes(form.category) && (
                        <option value={form.category}>{form.category} (legacy)</option>
                      )}
                    </select>
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
                  className="w-full rounded-lg border border-paper-3 px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand/24"
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
                <div className="rounded-2xl border border-paper-3 bg-brand-soft/70 p-4">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="max-w-md">
                      <p className="text-sm font-semibold text-slate-900">Supplier payment</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Purchase total is calculated from quantity and cost price so the unpaid amount can update this supplier automatically.
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
                      <Field
                        label="Amount Paid Now (NPR)"
                        value={amountPaidNow}
                        onChange={(e) => setAmountPaidNow(e.target.value)}
                        placeholder="0.00"
                        type="number"
                        min="0"
                        step="0.01"
                      />
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

              {isEdit && (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-center text-xs leading-5 text-amber-700">
                  Quantity edits here are treated as manual corrections. Use the restock action from inventory when new stock arrives and you want supplier balances to update automatically.
                </p>
              )}

              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-600">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeModal} disabled={loading} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="flex-1 rounded-lg bg-brand py-2.5 text-sm font-semibold text-snow transition-colors hover:opacity-90 disabled:opacity-60">
                  {loading ? progressLabel : isEdit ? 'Update Product' : 'Save Product'}
                </button>
              </div>
            </form>
            )}
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
        className="w-full rounded-lg border border-paper-3 px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand/24"
      />
    </div>
  )
}
