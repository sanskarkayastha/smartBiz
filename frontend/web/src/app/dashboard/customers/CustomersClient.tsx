'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import AddCustomerModal from '@/src/components/AddCustomerModal'
import Pagination from '@/src/components/Pagination'

type Customer = {
  id: number
  name: string
  phone: string | null
  email: string | null
  address?: string | null
  totalPurchases: number
  dueAmount?: number
  lastPurchaseDate: string | null
}

type SaleItem = { productName: string; quantity: number; unitPrice: number }
type Sale = {
  id: number
  customerId: number | null
  customerName: string | null
  totalAmount: number
  paymentMethod: string
  status: string
  saleDate: string
  items: SaleItem[]
}

const PAYMENT_LABELS: Record<string, string> = { CASH: 'Cash', CARD: 'Card', DIGITAL: 'Digital', DUE: 'Due' }

export default function CustomersClient({
  customers: initial,
  sales,
  currentPage,
  totalPages,
  totalElements,
  pageSize,
  initialSearch = '',
  initialHasDue = false,
}: {
  customers: Customer[]
  sales: Sale[]
  currentPage: number
  totalPages: number
  totalElements: number
  pageSize: number
  initialSearch?: string
  initialHasDue?: boolean
}) {
  const router = useRouter()
  const [customers, setCustomers] = useState(initial)
  const [search, setSearch] = useState(initialSearch)
  const [hasDue, setHasDue] = useState(initialHasDue)
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function buildParams(s: string, hd: boolean, page = 0) {
    const sp = new URLSearchParams()
    if (s) sp.set('search', s)
    if (hd) sp.set('hasDue', 'true')
    if (page > 0) sp.set('page', String(page))
    return sp.toString()
  }

  function handleSearchChange(val: string) {
    setSearch(val)
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current)
    if (!val.trim()) {
      setSuggestions([])
      setShowSuggestions(false)
      const qs = buildParams('', hasDue)
      router.push(`/dashboard/customers${qs ? `?${qs}` : ''}`)
      return
    }
    suggestTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers?search=${encodeURIComponent(val)}&page=0&size=5`)
        const data = await res.json()
        setSuggestions((data.content ?? []).map((c: { name: string }) => c.name))
        setShowSuggestions(true)
      } catch { /* ignore */ }
    }, 300)
  }

  function commitSearch(val: string) {
    setSearch(val)
    setSuggestions([])
    setShowSuggestions(false)
    const qs = buildParams(val, hasDue)
    router.push(`/dashboard/customers${qs ? `?${qs}` : ''}`)
  }

  function toggleHasDue() {
    const next = !hasDue
    setHasDue(next)
    const qs = buildParams(search, next)
    router.push(`/dashboard/customers${qs ? `?${qs}` : ''}`)
  }

  const activeFilterCount = [search, hasDue].filter(Boolean).length
  const extraParams: Record<string, string> = {}
  if (search) extraParams.search = search
  if (hasDue) extraParams.hasDue = 'true'

  async function handleDelete(c: Customer) {
    if (!confirm(`Delete customer "${c.name}"? This cannot be undone.`)) return
    setDeletingId(c.id)
    try {
      const res = await fetch(`/api/customers/${c.id}`, { method: 'DELETE' })
      if (res.ok || res.status === 204) {
        setCustomers((prev) => prev.filter((x) => x.id !== c.id))
      } else {
        alert('Failed to delete customer.')
      }
    } catch {
      alert('Network error.')
    } finally {
      setDeletingId(null)
    }
  }

  function handleSaved() {
    window.location.reload()
  }

  const customerSales = historyCustomer
    ? sales.filter((s) => s.customerId === historyCustomer.id)
    : []

  return (
    <>
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitSearch(search) }}
            onBlur={() => setShowSuggestions(false)}
            placeholder="Search by name, phone, or email…"
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#135BEC] bg-white"
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
          onClick={toggleHasDue}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border rounded-xl transition-colors ${
            hasDue
              ? 'bg-red-50 border-red-300 text-red-700'
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
          </svg>
          Has Due
          {hasDue && <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />}
        </button>

        <div className="ml-auto flex items-center gap-3">
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setSearch('')
                setHasDue(false)
                setSuggestions([])
                setShowSuggestions(false)
                router.push('/dashboard/customers')
              }}
              className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Clear
            </button>
          )}
          <AddCustomerModal onSaved={handleSaved} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {customers.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Purchases</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Purchase</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c, i) => (
                <tr key={c.id} className={`border-b border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#135BEC]/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-[#135BEC]">{c.name.slice(0, 2).toUpperCase()}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">{c.name}</span>
                        {(c.dueAmount ?? 0) > 0 && (
                          <span className="ml-2 text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full font-medium">
                            Due NPR {Number(c.dueAmount).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{c.phone ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-600">{c.email ?? '—'}</td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-900">
                    NPR {Number(c.totalPurchases ?? 0).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {c.lastPurchaseDate
                      ? new Date(c.lastPurchaseDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setHistoryCustomer(c)}
                        className="text-xs text-gray-500 hover:text-gray-800 font-medium px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                      >
                        History
                      </button>
                      <AddCustomerModal customer={c} onSaved={handleSaved} />
                      <button
                        onClick={() => handleDelete(c)}
                        disabled={deletingId === c.id}
                        className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors disabled:opacity-40"
                      >
                        {deletingId === c.id ? '…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
            </svg>
            <p className="text-sm font-medium">{activeFilterCount ? 'No customers match your filters' : 'No customers yet'}</p>
            {!activeFilterCount && <p className="text-xs mt-1">Click &quot;Add Customer&quot; to add your first customer</p>}
          </div>
        )}
        <Pagination
          basePath="/dashboard/customers"
          currentPage={currentPage}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={pageSize}
          extraParams={extraParams}
        />
      </div>

      {/* Purchase History Modal */}
      {historyCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setHistoryCustomer(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-900">Purchase History</h2>
                <p className="text-xs text-gray-500 mt-0.5">{historyCustomer.name}</p>
              </div>
              <button onClick={() => setHistoryCustomer(null)} className="text-gray-400 hover:text-gray-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
              {customerSales.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No purchases recorded for this customer.</p>
              ) : (
                customerSales.map((s) => (
                  <div key={s.id} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {new Date(s.saleDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(s.saleDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">NPR {Number(s.totalAmount).toLocaleString()}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          s.paymentMethod === 'DUE'
                            ? 'bg-red-50 text-red-600'
                            : 'bg-green-50 text-green-700'
                        }`}>
                          {PAYMENT_LABELS[s.paymentMethod] ?? s.paymentMethod}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {s.items?.slice(0, 3).map((item, idx) => (
                        <p key={idx} className="text-xs text-gray-600">
                          {item.productName} × {item.quantity} — NPR {Number(item.unitPrice).toLocaleString()}
                        </p>
                      ))}
                      {(s.items?.length ?? 0) > 3 && (
                        <p className="text-xs text-gray-400">+{s.items.length - 3} more items</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
