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
      <section className="rounded-[22px] border border-paper-3 bg-white p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative min-w-[220px] flex-1">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitSearch(search) }}
            onBlur={() => setShowSuggestions(false)}
            placeholder="Search by name, phone, or email…"
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

        <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={toggleHasDue}
          className={`inline-flex h-12 items-center gap-2 rounded-[14px] border px-4 text-sm font-semibold transition-colors ${
            hasDue
              ? 'border-rose/24 bg-rose/10 text-rose'
              : 'border-paper-3 bg-white text-ink-2 hover:bg-paper hover:text-ink'
          }`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
          </svg>
          Has Due
          {hasDue && <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose" />}
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
              className="inline-flex h-12 items-center gap-2 rounded-[14px] border border-paper-3 bg-white px-4 text-sm font-semibold text-ink-2 transition-colors hover:bg-paper hover:text-ink"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Clear
            </button>
          )}
          <AddCustomerModal onSaved={handleSaved} />
        </div>
      </div>
      </div>
      </section>

      <div className="overflow-hidden rounded-[22px] border border-paper-3 bg-white">
        {customers.length > 0 ? (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="bg-paper text-left text-xs font-semibold text-ink-3">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3 text-right">Total Purchases</th>
                <th className="px-5 py-3">Last Purchase</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c, i) => (
                <tr key={c.id} className={`border-b border-paper-3 last:border-b-0 ${i % 2 === 1 ? 'bg-paper/45' : ''}`}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-brand-soft">
                        <span className="text-xs font-bold text-brand">{c.name.slice(0, 2).toUpperCase()}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-ink">{c.name}</span>
                        {(c.dueAmount ?? 0) > 0 && (
                          <span className="ml-2 rounded-full bg-rose/14 px-2 py-1 text-xs font-semibold text-rose">
                            Due NPR {Number(c.dueAmount).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-ink-2">{c.phone ?? '-'}</td>
                  <td className="px-5 py-4 text-ink-2">{c.email ?? '-'}</td>
                  <td className="px-5 py-4 text-right font-bold text-ink">
                    NPR {Number(c.totalPurchases ?? 0).toLocaleString()}
                  </td>
                  <td className="px-5 py-4 text-ink-2">
                    {c.lastPurchaseDate
                      ? new Date(c.lastPurchaseDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
                      : '-'}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setHistoryCustomer(c)}
                        className="rounded-[10px] px-3 py-1.5 text-xs font-semibold text-ink-2 transition-colors hover:bg-paper hover:text-ink"
                      >
                        History
                      </button>
                      <AddCustomerModal customer={c} onSaved={handleSaved} />
                      <button
                        onClick={() => handleDelete(c)}
                        disabled={deletingId === c.id}
                        className="rounded-[10px] px-3 py-1.5 text-xs font-semibold text-rose transition-colors hover:bg-rose/10 disabled:opacity-40"
                      >
                        {deletingId === c.id ? '...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-4 py-20 text-ink-3">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
            </svg>
            <p className="text-sm font-medium text-ink">{activeFilterCount ? 'No customers match your filters' : 'No customers yet'}</p>
            {!activeFilterCount && <p className="mt-1 text-xs text-ink-2">Click &quot;Add Customer&quot; to add your first customer</p>}
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
          <div className="relative mx-4 flex max-h-[80vh] w-full max-w-lg flex-col rounded-[22px] bg-white shadow-xl">
            <div className="flex shrink-0 items-center justify-between border-b border-paper-3 px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-ink">Purchase History</h2>
                <p className="mt-0.5 text-xs text-ink-2">{historyCustomer.name}</p>
              </div>
              <button onClick={() => setHistoryCustomer(null)} className="text-ink-3 hover:text-ink">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
              {customerSales.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-3">No purchases recorded for this customer.</p>
              ) : (
                customerSales.map((s) => (
                  <div key={s.id} className="rounded-[14px] border border-paper-3 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-ink">
                          {new Date(s.saleDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-xs text-ink-3">
                          {new Date(s.saleDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-ink">NPR {Number(s.totalAmount).toLocaleString()}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          s.paymentMethod === 'DUE'
                            ? 'bg-rose/14 text-rose'
                            : 'bg-mint/18 text-ink'
                        }`}>
                          {PAYMENT_LABELS[s.paymentMethod] ?? s.paymentMethod}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {s.items?.slice(0, 3).map((item, idx) => (
                        <p key={idx} className="text-xs text-ink-2">
                          {item.productName} × {item.quantity} — NPR {Number(item.unitPrice).toLocaleString()}
                        </p>
                      ))}
                      {(s.items?.length ?? 0) > 3 && (
                        <p className="text-xs text-ink-3">+{s.items.length - 3} more items</p>
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
