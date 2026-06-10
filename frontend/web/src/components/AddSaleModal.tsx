'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Product = { id: number; name: string; price: number; quantity: number }
type PaymentMethod = 'CASH' | 'CARD' | 'DIGITAL' | 'DUE'
type CartItem = { product: Product; quantity: number; unitPrice: number }
type CustomerSuggestion = { id: number; name: string; phone: string | null }
type CustomerApiResponse = CustomerSuggestion[] | { content?: CustomerSuggestion[] }

const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'CARD', 'DIGITAL', 'DUE']

function normalizeSaleDateTime(value: string) {
  return value ? `${value}:00` : undefined
}

function parseCustomers(data: CustomerApiResponse): CustomerSuggestion[] {
  return Array.isArray(data) ? data : data.content ?? []
}

export default function AddSaleModal({ products }: { products: Product[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [search, setSearch] = useState('')
  const [saleDate, setSaleDate] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerSuggestions, setCustomerSuggestions] = useState<CustomerSuggestion[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSuggestion | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const customerRef = useRef<HTMLDivElement>(null)

  const filtered = products.filter(
    (product) => product.quantity > 0 && product.name.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (customerSearch.trim().length < 1) return

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch('/api/customers')
        const data: CustomerApiResponse = await res.json()
        const customers = parseCustomers(data)
        const query = customerSearch.toLowerCase()
        setCustomerSuggestions(
          customers.filter((customer) =>
            customer.name.toLowerCase().includes(query) || (customer.phone ?? '').includes(query)
          ).slice(0, 4)
        )
      } catch {
        setCustomerSuggestions([])
      }
    }, 250)

    return () => clearTimeout(timeout)
  }, [customerSearch])

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { product, quantity: 1, unitPrice: product.price }]
    })
  }

  function updateQty(productId: number, delta: number) {
    setCart((prev) =>
      prev
        .map((item) => item.product.id === productId ? { ...item, quantity: item.quantity + delta } : item)
        .filter((item) => item.quantity > 0)
    )
  }

  function updatePrice(productId: number, value: string) {
    const parsed = parseFloat(value)
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, unitPrice: Number.isNaN(parsed) ? item.unitPrice : parsed } : item
      )
    )
  }

  const total = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)

  function handleOpen() {
    setCart([])
    setSearch('')
    setPaymentMethod('CASH')
    setCustomerSearch('')
    setSelectedCustomer(null)
    setCustomerSuggestions([])
    setSaleDate('')
    setError('')
    setOpen(true)
  }

  async function resolveCustomer() {
    const trimmed = customerSearch.trim()
    if (selectedCustomer) return selectedCustomer
    if (!trimmed) return null

    const createRes = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    })
    if (!createRes.ok) {
      const data = await createRes.json().catch(() => ({}))
      throw new Error(data.error ?? 'Could not create customer for this sale.')
    }
    return createRes.json()
  }

  async function handleSubmit() {
    if (cart.length === 0) {
      setError('Add at least one item.')
      return
    }

    if (paymentMethod === 'DUE' && !selectedCustomer && !customerSearch.trim()) {
      setError('Customer is required for DUE payment.')
      return
    }

    setError('')
    setLoading(true)

    try {
      const resolvedCustomer = await resolveCustomer()
      const typedCustomerName = customerSearch.trim() || undefined
      const customerName = resolvedCustomer?.name ?? typedCustomerName

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
          paymentMethod,
          customerId: resolvedCustomer?.id ?? null,
          customerName: customerName || null,
          saleDate: normalizeSaleDateTime(saleDate) ?? null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? data.message ?? 'Failed to record sale.')
        return
      }

      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          onClick={handleOpen}
          className="inline-flex items-center gap-2 rounded-2xl bg-night px-4 py-2.5 text-sm font-semibold text-snow transition hover:bg-night-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Sale
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative mx-4 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-paper-3 bg-white shadow-[0_24px_80px_rgba(24,33,52,0.22)]">
            <div className="flex items-center justify-between border-b border-paper-3 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-ink">Record Sale</h2>
                <p className="mt-1 text-xs text-ink-2">Use today for normal sales, or set a previous date for historical entry.</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-ink-3 transition hover:text-ink">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="grid flex-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="flex min-h-0 flex-col border-r border-paper-3">
                <div className="grid gap-3 border-b border-paper-3 px-4 py-4 md:grid-cols-[1fr_240px]">
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-2xl border border-paper-3 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-3 focus:border-brand"
                  />
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-ink-3">Sale date and time</span>
                    <input
                      type="datetime-local"
                      value={saleDate}
                      onChange={(e) => setSaleDate(e.target.value)}
                      className="w-full rounded-2xl border border-paper-3 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
                    />
                  </label>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <p className="py-12 text-center text-sm text-ink-3">No products in stock match this search.</p>
                  ) : (
                    filtered.map((product) => {
                      const inCart = cart.find((item) => item.product.id === product.id)
                      return (
                        <div key={product.id} className="flex items-center justify-between gap-4 border-b border-paper-3 px-4 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-ink">{product.name}</p>
                            <p className="mt-1 text-xs text-ink-3">
                              NPR {product.price.toLocaleString()} · {product.quantity} in stock
                            </p>
                          </div>
                          <div className="ml-3 flex items-center gap-2">
                            {inCart ? (
                              <>
                                <button
                                  onClick={() => updateQty(product.id, -1)}
                                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-paper-3 text-ink transition hover:bg-paper"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                  </svg>
                                </button>
                                <span className="w-6 text-center text-sm font-bold text-ink">{inCart.quantity}</span>
                              </>
                            ) : null}
                            <button
                              onClick={() => addToCart(product)}
                              className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-white transition hover:opacity-90"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="flex min-h-0 flex-col px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-3">Cart</p>
                <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
                  {cart.length === 0 ? (
                    <p className="pt-6 text-center text-sm text-ink-3">No items yet.</p>
                  ) : (
                    cart.map((item) => (
                      <div key={item.product.id} className="rounded-[20px] border border-paper-3 bg-paper/75 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-ink">{item.product.name}</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => updateQty(item.product.id, -1)}
                              className="flex h-6 w-6 items-center justify-center rounded-lg border border-paper-3 text-ink"
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="5" y1="12" x2="19" y2="12" />
                              </svg>
                            </button>
                            <span className="w-5 text-center text-xs font-bold text-ink">{item.quantity}</span>
                            <button
                              onClick={() => updateQty(item.product.id, 1)}
                              className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand text-white"
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-xs text-ink-3">
                          <span>Price</span>
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updatePrice(item.product.id, e.target.value)}
                            className="w-20 rounded-lg border border-paper-3 bg-white px-2 py-1 text-xs text-ink outline-none focus:border-brand"
                          />
                          <span className="ml-auto font-semibold text-ink">NPR {(item.unitPrice * item.quantity).toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4 border-t border-paper-3 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-ink-2">Total</span>
                    <span className="text-lg font-extrabold text-ink">NPR {total.toLocaleString()}</span>
                  </div>

                  <div ref={customerRef} className="relative mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-3">
                      Customer {paymentMethod === 'DUE' ? '(required)' : '(optional)'}
                    </p>
                    {selectedCustomer ? (
                      <div className="flex items-center gap-2 rounded-2xl border border-paper-3 bg-paper px-3 py-3">
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{selectedCustomer.name}</span>
                        <button
                          onClick={() => {
                            setSelectedCustomer(null)
                            setCustomerSearch('')
                          }}
                          className="text-ink-3 transition hover:text-ink"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={(e) => {
                          const nextValue = e.target.value
                          setCustomerSearch(nextValue)
                          if (!nextValue.trim()) {
                            setCustomerSuggestions([])
                          }
                          setShowSuggestions(true)
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        placeholder="Search or enter customer name..."
                        className="w-full rounded-2xl border border-paper-3 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-3 focus:border-brand"
                      />
                    )}

                    {showSuggestions && customerSuggestions.length > 0 ? (
                      <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-2xl border border-paper-3 bg-white shadow-lg">
                        {customerSuggestions.map((customer) => (
                          <button
                            key={customer.id}
                            onClick={() => {
                              setSelectedCustomer(customer)
                              setCustomerSearch(customer.name)
                              setShowSuggestions(false)
                            }}
                            className="block w-full border-b border-paper-3 px-4 py-3 text-left text-sm last:border-b-0 hover:bg-paper/80"
                          >
                            <span className="font-medium text-ink">{customer.name}</span>
                            {customer.phone ? <span className="ml-2 text-xs text-ink-3">{customer.phone}</span> : null}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-3">Payment</p>
                    <div className="grid grid-cols-2 gap-2">
                      {PAYMENT_METHODS.map((method) => (
                        <button
                          key={method}
                          onClick={() => setPaymentMethod(method)}
                          className={`rounded-2xl px-3 py-2.5 text-xs font-semibold transition ${
                            paymentMethod === method
                              ? method === 'DUE'
                                ? 'bg-rose text-white'
                                : 'bg-night text-snow'
                              : method === 'DUE'
                              ? 'border border-rose/40 bg-white text-ink'
                              : 'border border-paper-3 bg-white text-ink'
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error ? (
                    <p className="mt-4 rounded-2xl bg-rose/16 px-4 py-3 text-sm font-medium text-ink">{error}</p>
                  ) : null}

                  <button
                    onClick={handleSubmit}
                    disabled={loading || cart.length === 0}
                    className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? 'Recording...' : 'Complete Sale'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
