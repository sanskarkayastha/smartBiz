'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import EditSupplierModal from '@/src/components/EditSupplierModal'
import CreateSupplierModal from '@/src/components/CreateSupplierModal'
import ViewSupplierProductsModal from '@/src/components/ViewSupplierProductsModal'
import Pagination from '@/src/components/Pagination'

type Supplier = {
  id: number
  name: string
  phone: string | null
  email: string | null
  balanceOwed: number
  notes: string | null
  createdAt: string
  productCount: number
  totalUnits: number
  lowStockCount: number
  outOfStockCount: number
}

type StatusTone = 'danger' | 'warning' | 'info' | 'success'

function formatCurrency(amount: number) {
  return `NPR ${Number(amount || 0).toLocaleString()}`
}

function getSupplierStatus(supplier: Supplier): { label: string; note: string; tone: StatusTone } {
  if (supplier.outOfStockCount > 0) {
    return {
      label: `${supplier.outOfStockCount} out of stock`,
      note: `${supplier.lowStockCount + supplier.outOfStockCount} products need follow-up`,
      tone: 'danger',
    }
  }

  if (supplier.lowStockCount > 0) {
    return {
      label: `${supplier.lowStockCount} low stock`,
      note: 'Reorder soon to avoid stockouts',
      tone: 'warning',
    }
  }

  if (Number(supplier.balanceOwed) > 0) {
    return {
      label: 'Balance due',
      note: `${formatCurrency(Number(supplier.balanceOwed))} still unpaid`,
      tone: 'info',
    }
  }

  return {
    label: 'Well stocked',
    note: 'No urgent supplier follow-up right now',
    tone: 'success',
  }
}

function statusClasses(tone: StatusTone) {
  if (tone === 'danger') return 'bg-rose/14 text-rose'
  if (tone === 'warning') return 'bg-amber/20 text-ink'
  if (tone === 'info') return 'bg-brand-soft text-brand'
  return 'bg-mint/18 text-ink'
}

export default function SuppliersClient({
  suppliers,
  currentPage,
  totalPages,
  totalElements,
  pageSize,
  initialSearch = '',
  initialHasBalance = false,
}: {
  suppliers: Supplier[]
  currentPage: number
  totalPages: number
  totalElements: number
  pageSize: number
  initialSearch?: string
  initialHasBalance?: boolean
}) {
  const router = useRouter()
  const [search, setSearch] = useState(initialSearch)
  const [hasBalance, setHasBalance] = useState(initialHasBalance)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function buildParams(s: string, hb: boolean, page = 0) {
    const sp = new URLSearchParams()
    if (s) sp.set('search', s)
    if (hb) sp.set('hasBalance', 'true')
    if (page > 0) sp.set('page', String(page))
    return sp.toString()
  }

  function handleSearchChange(val: string) {
    setSearch(val)
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current)
    if (!val.trim()) {
      setSuggestions([])
      setShowSuggestions(false)
      const qs = buildParams('', hasBalance)
      router.push(`/dashboard/suppliers${qs ? `?${qs}` : ''}`)
      return
    }

    suggestTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suppliers?search=${encodeURIComponent(val)}&page=0&size=5`)
        const data = await res.json()
        setSuggestions((data.content ?? []).map((supplier: { name: string }) => supplier.name))
        setShowSuggestions(true)
      } catch {
        // ignore suggestion failures
      }
    }, 300)
  }

  function commitSearch(val: string) {
    setSearch(val)
    setSuggestions([])
    setShowSuggestions(false)
    const qs = buildParams(val, hasBalance)
    router.push(`/dashboard/suppliers${qs ? `?${qs}` : ''}`)
  }

  function toggleHasBalance() {
    const next = !hasBalance
    setHasBalance(next)
    const qs = buildParams(search, next)
    router.push(`/dashboard/suppliers${qs ? `?${qs}` : ''}`)
  }

  const activeFilterCount = [search, hasBalance].filter(Boolean).length
  const extraParams: Record<string, string> = {}
  if (search) extraParams.search = search
  if (hasBalance) extraParams.hasBalance = 'true'

  return (
    <>
      <section className="rounded-[22px] border border-paper-3 bg-white p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative min-w-[220px] flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search by name, phone, or email..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitSearch(search) }}
            onBlur={() => setShowSuggestions(false)}
            className="h-12 w-full rounded-[14px] border border-paper-3 bg-white pl-10 pr-4 text-sm text-ink placeholder:text-ink-3 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand/24"
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute left-0 top-full z-10 mt-2 max-h-48 w-full overflow-y-auto rounded-[14px] border border-paper-3 bg-white p-1 shadow-lg">
              {suggestions.map((name) => (
                <li key={name} onMouseDown={() => commitSearch(name)} className="cursor-pointer rounded-[10px] px-3 py-2 text-sm text-ink hover:bg-paper">
                  {name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          onClick={toggleHasBalance}
          className={`inline-flex h-12 items-center gap-2 rounded-[14px] border px-4 text-sm font-semibold transition-colors ${
            hasBalance
              ? 'border-rose/24 bg-rose/10 text-rose'
              : 'border-paper-3 bg-white text-ink-2 hover:bg-paper hover:text-ink'
          }`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
          </svg>
          Has Balance
          {hasBalance && <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose" />}
        </button>

        <div className="ml-auto flex items-center gap-3">
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setSearch('')
                setHasBalance(false)
                setSuggestions([])
                setShowSuggestions(false)
                router.push('/dashboard/suppliers')
              }}
              className="inline-flex h-12 items-center gap-2 rounded-[14px] border border-paper-3 bg-white px-4 text-sm font-semibold text-ink-2 transition-colors hover:bg-paper hover:text-ink"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Clear
            </button>
          )}
          <CreateSupplierModal />
        </div>
      </div>
      </section>

      <div className="overflow-hidden rounded-[22px] border border-paper-3 bg-white">
        {suppliers.length > 0 ? (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[1020px] text-sm">
            <thead>
              <tr className="bg-paper text-left text-xs font-semibold text-ink-3">
                <th className="px-5 py-3">Supplier</th>
                <th className="px-5 py-3">Stock Health</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3 text-right">Balance</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier, index) => {
                const status = getSupplierStatus(supplier)
                const owes = Number(supplier.balanceOwed) > 0

                return (
                  <tr key={supplier.id} className={`border-b border-paper-3 align-top last:border-b-0 ${index % 2 === 1 ? 'bg-paper/45' : ''}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-brand-soft">
                          <span className="text-sm font-bold text-brand">{supplier.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="max-w-[240px]">
                          <p className="font-semibold text-ink">{supplier.name}</p>
                          <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(status.tone)}`}>
                            {status.label}
                          </div>
                          <p className="mt-2 text-xs leading-5 text-ink-2">{status.note}</p>
                          {supplier.notes && <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink-3">{supplier.notes}</p>}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-[14px] bg-paper px-3 py-3">
                          <p className="text-sm font-semibold text-ink">{supplier.productCount}</p>
                          <p className="mt-1 text-[11px] uppercase tracking-wide text-ink-3">Products</p>
                        </div>
                        <div className="rounded-[14px] bg-paper px-3 py-3">
                          <p className="text-sm font-semibold text-ink">{supplier.totalUnits}</p>
                          <p className="mt-1 text-[11px] uppercase tracking-wide text-ink-3">Units On Hand</p>
                        </div>
                        <div className={`rounded-[14px] px-3 py-3 ${supplier.lowStockCount > 0 ? 'bg-amber/20' : 'bg-paper'}`}>
                          <p className="text-sm font-semibold text-ink">{supplier.lowStockCount}</p>
                          <p className="mt-1 text-[11px] uppercase tracking-wide text-ink-3">Low Stock</p>
                        </div>
                        <div className={`rounded-[14px] px-3 py-3 ${supplier.outOfStockCount > 0 ? 'bg-rose/14' : 'bg-paper'}`}>
                          <p className={`text-sm font-semibold ${supplier.outOfStockCount > 0 ? 'text-rose' : 'text-ink'}`}>{supplier.outOfStockCount}</p>
                          <p className="mt-1 text-[11px] uppercase tracking-wide text-ink-3">Out Of Stock</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="space-y-2 text-sm">
                        {supplier.phone ? (
                          <a href={`tel:${supplier.phone}`} className="block font-medium text-ink-2 hover:text-brand">
                            {supplier.phone}
                          </a>
                        ) : (
                          <p className="text-ink-3">No phone</p>
                        )}

                        {supplier.email ? (
                          <a href={`mailto:${supplier.email}`} className="block break-all text-ink-2 hover:text-brand">
                            {supplier.email}
                          </a>
                        ) : (
                          <p className="text-ink-3">No email</p>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex flex-col items-end gap-2">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${owes ? 'bg-rose/14 text-rose' : 'bg-mint/18 text-ink'}`}>
                          {owes ? 'Balance due' : 'Paid up'}
                        </span>
                        <p className="text-sm font-semibold text-ink">{formatCurrency(Number(supplier.balanceOwed))}</p>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {owes && (
                          <EditSupplierModal
                            supplier={supplier}
                            initialAction="payment"
                            triggerLabel="Payment"
                            triggerTone="payment"
                          />
                        )}
                        <ViewSupplierProductsModal supplierId={supplier.id} supplierName={supplier.name} />
                        <EditSupplierModal supplier={supplier} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-4 py-20 text-ink-3">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <p className="text-sm font-medium text-ink">
              {activeFilterCount ? 'No suppliers match your filters' : 'No suppliers yet'}
            </p>
            <p className="mt-1 max-w-sm text-center text-xs text-ink-2">
              {activeFilterCount ? 'Try clearing your filters' : 'Add a supplier directly, or attach one while creating a product so you can track who to reorder from later.'}
            </p>
          </div>
        )}

        <Pagination
          basePath="/dashboard/suppliers"
          currentPage={currentPage}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={pageSize}
          extraParams={extraParams}
        />
      </div>
    </>
  )
}
