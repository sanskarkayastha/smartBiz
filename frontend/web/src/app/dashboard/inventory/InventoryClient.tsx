'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import AddProductModal from '@/src/components/AddProductModal'
import RestockProductModal from '@/src/components/RestockProductModal'
import Pagination from '@/src/components/Pagination'
import ManageCategoriesModal, { type Category } from '@/src/components/ManageCategoriesModal'

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

function statusLabel(quantity: number, reorderLevel: number | null) {
  if (quantity === 0) return { text: 'Out of Stock', cls: 'bg-rose/14 text-rose' }
  if (reorderLevel !== null && quantity <= reorderLevel) return { text: 'Low Stock', cls: 'bg-amber/20 text-ink' }
  return { text: 'In Stock', cls: 'bg-mint/18 text-ink' }
}

const STOCK_OPTIONS = [
  { value: '', label: 'All Stock' },
  { value: 'LOW_STOCK', label: 'Low Stock' },
  { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
]

export default function InventoryClient({
  initialProducts,
  currentPage,
  totalPages,
  totalElements,
  pageSize,
  initialSearch = '',
  initialCategory = '',
  initialStockStatus = '',
}: {
  initialProducts: Product[]
  currentPage: number
  totalPages: number
  totalElements: number
  pageSize: number
  initialSearch?: string
  initialCategory?: string
  initialStockStatus?: string
}) {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [search, setSearch] = useState(initialSearch)
  const [category, setCategory] = useState(initialCategory)
  const [stockStatus, setStockStatus] = useState(initialStockStatus)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showManageCategories, setShowManageCategories] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setCategories(data) })
      .catch(() => {})
  }, [])

  function buildParams(s: string, cat: string, ss: string, page = 0) {
    const sp = new URLSearchParams()
    if (s) sp.set('search', s)
    if (cat) sp.set('category', cat)
    if (ss) sp.set('stockStatus', ss)
    if (page > 0) sp.set('page', String(page))
    return sp.toString()
  }

  function handleSearchChange(val: string) {
    setSearch(val)
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current)
    if (!val.trim()) {
      setSuggestions([])
      setShowSuggestions(false)
      const qs = buildParams('', category, stockStatus)
      router.push(`/dashboard/inventory${qs ? `?${qs}` : ''}`)
      return
    }
    suggestTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(val)}&page=0&size=5`)
        const data = await res.json()
        setSuggestions((data.content ?? []).map((p: { name: string }) => p.name))
        setShowSuggestions(true)
      } catch {
        // Suggestion failures should not block product search.
      }
    }, 300)
  }

  function commitSearch(val: string) {
    setSearch(val)
    setSuggestions([])
    setShowSuggestions(false)
    const qs = buildParams(val, category, stockStatus)
    router.push(`/dashboard/inventory${qs ? `?${qs}` : ''}`)
  }

  function handleCategoryChange(val: string) {
    setCategory(val)
    const qs = buildParams(search, val, stockStatus)
    router.push(`/dashboard/inventory${qs ? `?${qs}` : ''}`)
  }

  function handleStockStatusChange(val: string) {
    setStockStatus(val)
    const qs = buildParams(search, category, val)
    router.push(`/dashboard/inventory${qs ? `?${qs}` : ''}`)
  }

  function syncInventoryAfterDelete(successfulDeletes: number) {
    if (successfulDeletes <= 0) return

    const nextTotal = Math.max(0, totalElements - successfulDeletes)
    const nextTotalPages = Math.max(1, Math.ceil(nextTotal / pageSize))
    const targetPage = Math.min(currentPage, nextTotalPages - 1)
    const qs = buildParams(search, category, stockStatus, targetPage)
    const url = `/dashboard/inventory${qs ? `?${qs}` : ''}`

    if (targetPage !== currentPage) {
      router.push(url)
      return
    }

    router.refresh()
  }

  async function handleDelete(product: Product) {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return
    setDeleting(product.id)
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' })
      if (res.ok || res.status === 204) {
        setProducts((prev) => prev.filter((p) => p.id !== product.id))
        setSelectedIds((prev) => prev.filter((id) => id !== product.id))
        syncInventoryAfterDelete(1)
      }
    } finally {
      setDeleting(null)
    }
  }

  function toggleSelection(productId: number) {
    setSelectedIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    )
  }

  function toggleSelectAll() {
    if (selectedIds.length === products.length) {
      setSelectedIds([])
      return
    }
    setSelectedIds(products.map((product) => product.id))
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return

    const selectedProducts = products.filter((product) => selectedIds.includes(product.id))
    const visibleNames = selectedProducts.slice(0, 3).map((product) => product.name)
    const extraCount = selectedProducts.length - visibleNames.length
    const detail = visibleNames.length
      ? ` (${visibleNames.join(', ')}${extraCount > 0 ? `, +${extraCount} more` : ''})`
      : ''

    if (!confirm(`Delete ${selectedIds.length} products${detail}? This cannot be undone.`)) return

    setBulkDeleting(true)
    try {
      const results = await Promise.all(
        selectedIds.map(async (id) => {
          const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
          return { id, ok: res.ok || res.status === 204 }
        })
      )

      const deletedIds = results.filter((result) => result.ok).map((result) => result.id)
      if (deletedIds.length > 0) {
        setProducts((prev) => prev.filter((product) => !deletedIds.includes(product.id)))
      }
      setSelectedIds((prev) => prev.filter((id) => !deletedIds.includes(id)))
      syncInventoryAfterDelete(deletedIds.length)

      if (deletedIds.length !== results.length) {
        alert('Some selected products could not be deleted. Please try again for the remaining items.')
      }
    } finally {
      setBulkDeleting(false)
    }
  }

  const activeFilterCount = [search, category, stockStatus].filter(Boolean).length
  const extraParams: Record<string, string> = {}
  if (search) extraParams.search = search
  if (category) extraParams.category = category
  if (stockStatus) extraParams.stockStatus = stockStatus
  const allSelected = products.length > 0 && selectedIds.length === products.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Inventory</h1>
          <p className="mt-1 text-sm text-ink-2">{totalElements} products</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowManageCategories(true)}
            className="flex items-center gap-1.5 rounded-[14px] border border-paper-3 bg-white px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-paper"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h7"/></svg>
            Categories
          </button>
          <AddProductModal onClose={() => router.refresh()} categories={categories.map((c) => c.name)} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search name, SKU, supplier..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitSearch(search) }}
            onBlur={() => setShowSuggestions(false)}
            className="w-full rounded-xl border border-paper-3 bg-white py-2.5 pl-9 pr-4 text-sm text-ink placeholder:text-ink-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand/24"
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute left-0 top-full z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-paper-3 bg-white shadow-lg">
              {suggestions.map((name) => (
                <li key={name} onMouseDown={() => commitSearch(name)} className="cursor-pointer px-3 py-2 text-sm text-ink hover:bg-paper">
                  {name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <select
          value={category}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className={`rounded-xl border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/24 ${
            category ? 'border-brand text-brand font-semibold' : 'border-paper-3 text-ink-2'
          }`}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>

        <select
          value={stockStatus}
          onChange={(e) => handleStockStatusChange(e.target.value)}
          className={`rounded-xl border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/24 ${
            stockStatus ? 'border-brand text-brand font-semibold' : 'border-paper-3 text-ink-2'
          }`}
        >
          {STOCK_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setSearch('')
              setCategory('')
              setStockStatus('')
              setSuggestions([])
              setShowSuggestions(false)
              router.push('/dashboard/inventory')
            }}
            className="flex items-center gap-1.5 rounded-xl border border-paper-3 bg-white px-3 py-2.5 text-sm text-ink-2 transition-colors hover:bg-paper hover:text-ink"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Clear {activeFilterCount > 1 ? `(${activeFilterCount})` : ''}
          </button>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose/20 bg-rose/10 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-ink">
              {selectedIds.length} product{selectedIds.length === 1 ? '' : 's'} selected
            </p>
            <p className="text-xs text-ink-2">Delete them together instead of repeating single-product deletes.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="rounded-xl border border-paper-3 bg-white px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-paper"
            >
              Clear Selection
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="inline-flex items-center gap-2 rounded-xl bg-rose px-4 py-2 text-sm font-semibold text-snow transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {bulkDeleting ? (
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" opacity=".3"/><path d="M12 2a10 10 0 0110 10"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              )}
              Delete Selected
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-paper-3 bg-white">
        {products.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-paper-3 bg-paper">
                <th className="px-5 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all products on this page"
                    className="h-4 w-4 rounded border-paper-3 accent-[var(--color-brand)]"
                  />
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-3">Product</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-3">SKU</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-3">Category</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-3">Cost Price</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-3">Selling Price</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-3">Qty</th>
                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-ink-3">Status</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => {
                const status = statusLabel(p.quantity, p.reorderLevel)
                const selected = selectedIds.includes(p.id)
                return (
                  <tr key={p.id} className={`border-b border-paper-3 last:border-b-0 ${selected ? 'bg-brand-soft/70' : i % 2 === 1 ? 'bg-paper/45' : ''}`}>
                    <td className="px-5 py-3 align-top">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelection(p.id)}
                        aria-label={`Select ${p.name}`}
                        className="mt-1 h-4 w-4 rounded border-paper-3 accent-[var(--color-brand)]"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-ink">{p.name}</p>
                      {p.supplier && <p className="text-xs text-ink-3">{p.supplier}</p>}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-ink-2">{p.sku ?? '-'}</td>
                    <td className="px-5 py-3 text-ink-2">{p.category ?? '-'}</td>
                    <td className="px-5 py-3 text-right text-ink-2">
                      {p.costPrice != null ? `NPR ${Number(p.costPrice).toLocaleString()}` : '-'}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-ink">NPR {Number(p.price).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right font-semibold text-ink">{p.quantity}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${status.cls}`}>
                        {status.text}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <RestockProductModal product={{ id: p.id, name: p.name, supplier: p.supplier, costPrice: p.costPrice }} />
                        <AddProductModal product={p} onClose={() => router.refresh()} categories={categories.map((c) => c.name)} />
                        <button
                          type="button"
                          onClick={() => handleDelete(p)}
                          disabled={deleting === p.id || bulkDeleting}
                          className="flex items-center gap-1.5 rounded-lg border border-rose/24 px-3 py-1.5 text-xs font-semibold text-rose transition-colors hover:bg-rose/10 disabled:opacity-50"
                        >
                          {deleting === p.id ? (
                            <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" opacity=".3"/><path d="M12 2a10 10 0 0110 10"/></svg>
                          ) : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                          )}
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-ink-3">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3">
              <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
            </svg>
            <p className="text-sm font-medium text-ink">
              {activeFilterCount ? 'No products match your filters' : 'No products yet'}
            </p>
            <p className="mt-1 text-xs text-ink-2">
              {activeFilterCount ? 'Try clearing your filters' : 'Click "Add Product" to create your first product'}
            </p>
          </div>
        )}
        <Pagination
          basePath="/dashboard/inventory"
          currentPage={currentPage}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={pageSize}
          extraParams={extraParams}
        />
      </div>

      {showManageCategories && (
        <ManageCategoriesModal
          categories={categories}
          onAdd={(cat) => setCategories((prev) => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)))}
          onDelete={(id) => setCategories((prev) => prev.filter((c) => c.id !== id))}
          onRename={(updated) => setCategories((prev) => prev.map((c) => c.id === updated.id ? updated : c).sort((a, b) => a.name.localeCompare(b.name)))}
          onClose={() => setShowManageCategories(false)}
        />
      )}
    </div>
  )
}
