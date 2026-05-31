'use client'

import { useState, useRef } from 'react'
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

  const totalOwed = suppliers.reduce((sum, s) => sum + Number(s.balanceOwed), 0)

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
        setSuggestions((data.content ?? []).map((s: { name: string }) => s.name))
        setShowSuggestions(true)
      } catch { /* ignore */ }
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
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search by name, phone, or email…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitSearch(search) }}
            onBlur={() => setShowSuggestions(false)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#135BEC] bg-white"
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-10 top-full left-0 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
              {suggestions.map((name) => (
                <li key={name} onMouseDown={() => commitSearch(name)} className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-800">
                  {name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          onClick={toggleHasBalance}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border rounded-xl transition-colors ${
            hasBalance
              ? 'bg-red-50 border-red-300 text-red-700'
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
          </svg>
          Has Balance
          {hasBalance && <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />}
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
              className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Clear
            </button>
          )}
          <CreateSupplierModal />
        </div>
      </div>

      {/* Summary card */}
      {totalOwed > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-5 py-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p className="text-sm text-red-700 font-medium">
            Outstanding balance: <span className="font-bold">NPR {totalOwed.toLocaleString()}</span> across {suppliers.filter(s => Number(s.balanceOwed) > 0).length} supplier(s)
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {suppliers.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Supplier</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Balance Owed</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s, i) => {
                const owes = Number(s.balanceOwed) > 0
                return (
                  <tr key={s.id} className={`border-b border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#135BEC]/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-[#135BEC]">{s.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{s.name}</p>
                          {s.notes && <p className="text-xs text-gray-400 truncate max-w-48">{s.notes}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{s.phone ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{s.email ?? '—'}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${owes ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                        NPR {Number(s.balanceOwed).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <ViewSupplierProductsModal supplierId={s.id} supplierName={s.name} />
                        <EditSupplierModal supplier={s} />
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
            <p className="text-xs mt-1">
              {activeFilterCount ? 'Try clearing your filters' : 'Use "Add Supplier" above, or add a supplier name when creating a product'}
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
