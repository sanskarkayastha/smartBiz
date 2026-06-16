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

type SupplierSummary = {
  totalSuppliers: number
  suppliersWithBalance: number
  totalBalanceOwed: number
  linkedProducts: number
  suppliersNeedingRestock: number
  lowStockProducts: number
  outOfStockProducts: number
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
  if (tone === 'danger') return 'bg-red-50 text-red-700'
  if (tone === 'warning') return 'bg-amber-50 text-amber-700'
  if (tone === 'info') return 'bg-blue-50 text-blue-700'
  return 'bg-emerald-50 text-emerald-700'
}

export default function SuppliersClient({
  suppliers,
  summary,
  currentPage,
  totalPages,
  totalElements,
  pageSize,
  initialSearch = '',
  initialHasBalance = false,
}: {
  suppliers: Supplier[]
  summary: SupplierSummary
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

  const summaryMessage = summary.totalSuppliers === 0
    ? 'Suppliers become useful when they show who needs a reorder and who still needs payment.'
    : summary.suppliersNeedingRestock > 0
      ? `${summary.suppliersNeedingRestock} supplier${summary.suppliersNeedingRestock === 1 ? '' : 's'} need restock follow-up across ${summary.lowStockProducts + summary.outOfStockProducts} products.`
      : summary.suppliersWithBalance > 0
        ? `Stock looks healthy. ${summary.suppliersWithBalance} supplier${summary.suppliersWithBalance === 1 ? '' : 's'} still have unpaid balances.`
        : 'All linked supplier products are stocked and no urgent supplier balances are open.'

  return (
    <>
      <div className="rounded-[28px] border border-blue-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#135BEC]">Supplier Desk</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">Know who to reorder from next</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{summaryMessage}</p>
          </div>

          <div className="grid min-w-full gap-3 sm:grid-cols-3 lg:min-w-[480px]">
            <div className="rounded-2xl bg-blue-50 px-4 py-4">
              <p className="text-2xl font-semibold text-slate-900">{summary.totalSuppliers}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">Suppliers</p>
            </div>
            <div className="rounded-2xl bg-amber-50 px-4 py-4">
              <p className="text-2xl font-semibold text-slate-900">{summary.suppliersNeedingRestock}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">Need Restock</p>
            </div>
            <div className="rounded-2xl bg-red-50 px-4 py-4">
              <p className="text-2xl font-semibold text-slate-900">{formatCurrency(summary.totalBalanceOwed)}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">Outstanding Due</p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <div className="rounded-full bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700">
            {summary.linkedProducts} linked products
          </div>
          <div className="rounded-full bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
            {summary.lowStockProducts} low stock
          </div>
          <div className="rounded-full bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            {summary.outOfStockProducts} out of stock
          </div>
          <div className="rounded-full bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
            {summary.suppliersWithBalance} with unpaid balance
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search by name, phone, or email..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitSearch(search) }}
            onBlur={() => setShowSuggestions(false)}
            className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#135BEC]"
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute left-0 top-full z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-lg">
              {suggestions.map((name) => (
                <li key={name} onMouseDown={() => commitSearch(name)} className="cursor-pointer px-3 py-2 text-sm text-gray-800 hover:bg-gray-100">
                  {name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          onClick={toggleHasBalance}
          className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${
            hasBalance
              ? 'border-red-300 bg-red-50 text-red-700'
              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
          </svg>
          Has Balance
          {hasBalance && <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />}
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
              className="flex items-center gap-1.5 rounded-2xl border border-gray-200 px-3 py-3 text-sm text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-800"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Clear
            </button>
          )}
          <CreateSupplierModal />
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-gray-100 bg-white shadow-sm">
        {suppliers.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-slate-50">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Supplier</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Stock Health</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Contact</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Balance</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier, index) => {
                const status = getSupplierStatus(supplier)
                const owes = Number(supplier.balanceOwed) > 0

                return (
                  <tr key={supplier.id} className={`border-b border-gray-50 align-top ${index % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#135BEC]/10">
                          <span className="text-sm font-bold text-[#135BEC]">{supplier.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="max-w-[240px]">
                          <p className="font-semibold text-slate-900">{supplier.name}</p>
                          <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(status.tone)}`}>
                            {status.label}
                          </div>
                          <p className="mt-2 text-xs leading-5 text-slate-500">{status.note}</p>
                          {supplier.notes && <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{supplier.notes}</p>}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-2xl bg-slate-50 px-3 py-3">
                          <p className="text-sm font-semibold text-slate-900">{supplier.productCount}</p>
                          <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">Products</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-3">
                          <p className="text-sm font-semibold text-slate-900">{supplier.totalUnits}</p>
                          <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">Units On Hand</p>
                        </div>
                        <div className={`rounded-2xl px-3 py-3 ${supplier.lowStockCount > 0 ? 'bg-amber-50' : 'bg-slate-50'}`}>
                          <p className={`text-sm font-semibold ${supplier.lowStockCount > 0 ? 'text-amber-700' : 'text-slate-900'}`}>{supplier.lowStockCount}</p>
                          <p className={`mt-1 text-[11px] uppercase tracking-wide ${supplier.lowStockCount > 0 ? 'text-amber-600' : 'text-slate-500'}`}>Low Stock</p>
                        </div>
                        <div className={`rounded-2xl px-3 py-3 ${supplier.outOfStockCount > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                          <p className={`text-sm font-semibold ${supplier.outOfStockCount > 0 ? 'text-red-700' : 'text-slate-900'}`}>{supplier.outOfStockCount}</p>
                          <p className={`mt-1 text-[11px] uppercase tracking-wide ${supplier.outOfStockCount > 0 ? 'text-red-600' : 'text-slate-500'}`}>Out Of Stock</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="space-y-2 text-sm">
                        {supplier.phone ? (
                          <a href={`tel:${supplier.phone}`} className="block font-medium text-slate-700 hover:text-[#135BEC]">
                            {supplier.phone}
                          </a>
                        ) : (
                          <p className="text-slate-400">No phone</p>
                        )}

                        {supplier.email ? (
                          <a href={`mailto:${supplier.email}`} className="block break-all text-slate-500 hover:text-[#135BEC]">
                            {supplier.email}
                          </a>
                        ) : (
                          <p className="text-slate-400">No email</p>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex flex-col items-end gap-2">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${owes ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
                          {owes ? 'Balance due' : 'Paid up'}
                        </span>
                        <p className="text-sm font-semibold text-slate-900">{formatCurrency(Number(supplier.balanceOwed))}</p>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <ViewSupplierProductsModal supplierId={supplier.id} supplierName={supplier.name} />
                        <EditSupplierModal supplier={supplier} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <p className="text-sm font-medium">
              {activeFilterCount ? 'No suppliers match your filters' : 'No suppliers yet'}
            </p>
            <p className="mt-1 max-w-sm text-center text-xs">
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
