'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'

type Product = { id: number; name: string; price: number; quantity: number }
type PaymentMethod = 'CASH' | 'CARD' | 'ESEWA' | 'DUE'
type CartItem = { product: Product; quantity: number; unitPrice: number }
type CustomerSuggestion = { id: number; name: string; phone: string | null }
type CustomerApiResponse = CustomerSuggestion[] | { content?: CustomerSuggestion[] }
type PosPayment = { paymentId: string; saleId: number; amount: number; status: 'BOOKED' | 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED' | 'EXPIRED' | 'REVIEW'; qrPayload: string | null; deeplink: string | null; referenceCode: string | null; expiresAt: string; environment: 'UAT' | 'PRODUCTION' }

const ESEWA_INTENT_DEMO_URL = 'https://gitlab.com/esewa-pub/esewa-intent-payment-app'

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string; helper: string }> = [
  { value: 'CASH', label: 'Cash', helper: 'Paid in cash' },
  { value: 'CARD', label: 'Card', helper: 'Card payment' },
  { value: 'ESEWA', label: 'eSewa', helper: 'Verified amount-filled QR' },
  { value: 'DUE', label: 'Due', helper: 'Pay later' },
]

function hasInvalidSalePrice(cart: CartItem[]) {
  return cart.some((item) => !Number.isFinite(item.unitPrice) || item.unitPrice <= 0)
}

function parseCustomers(data: CustomerApiResponse): CustomerSuggestion[] {
  return Array.isArray(data) ? data : data.content ?? []
}

function formatCurrency(value: number) {
  return `NPR ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

function CloseIcon({ size = 18 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

function MinusIcon() {
  return (
    <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M5 12h14" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function EsewaPaymentStep({ payment, checking, onCheck, onCancel, onDone, onBack }: {
  payment: PosPayment; checking: boolean; onCheck: () => void; onCancel: () => void; onDone: () => void; onBack: () => void
}) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer) }, [])
  const seconds = now === null ? null : Math.max(0, Math.floor((new Date(payment.expiresAt).getTime() - now) / 1000))
  const countdown = seconds === null ? '--:--' : `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  const waiting = payment.status === 'BOOKED' || payment.status === 'PENDING'
  const isUat = payment.environment === 'UAT' || payment.deeplink?.includes('rc-links.esewa.com.np')
  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-paper">
      <header className="flex min-h-20 items-center justify-between gap-5 border-b border-paper-3 bg-white px-6">
        <div><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand">{isUat ? 'eSewa test payment' : 'eSewa payment'}</p><h3 className="mt-1 text-xl font-extrabold text-ink">{isUat ? 'Scan with the test app' : 'Ask the buyer to scan'}</h3></div>
        {waiting ? <span className="rounded-xl bg-amber/25 px-3 py-2 text-sm font-extrabold tabular-nums text-ink">{countdown}</span> : null}
      </header>
      <div className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-8">
        {waiting && payment.qrPayload ? <div className="text-center"><div className="inline-flex rounded-[28px] border border-paper-3 bg-white p-5 shadow-sm"><QRCodeSVG value={payment.qrPayload} size={260} bgColor="#FDFEFF" fgColor="#17243D" /></div><p className="mt-6 text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink-3">Amount to pay</p><p className="mt-1 text-3xl font-extrabold tabular-nums text-ink">NPR {Number(payment.amount).toLocaleString()}</p>{isUat ? <div className="mx-auto mt-4 max-w-md rounded-2xl border border-amber bg-amber/20 px-4 py-3 text-sm leading-6 text-ink"><p className="font-extrabold">UAT QR</p><p className="mt-1">The normal eSewa app cannot open this test QR. Install eSewa&apos;s Intent demo app, then scan with the phone camera.</p><a href={ESEWA_INTENT_DEMO_URL} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-11 items-center font-bold text-brand underline underline-offset-4">View official test app setup</a></div> : <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-ink-2">Open eSewa, scan this code, and confirm the amount. SmartBiz records the sale only after eSewa verifies payment.</p>}</div> : null}
        {payment.status === 'SUCCEEDED' ? <div className="max-w-md text-center"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-mint text-3xl font-black text-ink">✓</div><h3 className="mt-6 text-2xl font-extrabold text-ink">Payment verified</h3><p className="mt-2 text-sm leading-6 text-ink-2">NPR {Number(payment.amount).toLocaleString()} received. Stock and the sale are finalized.</p></div> : null}
        {['FAILED', 'CANCELED', 'EXPIRED'].includes(payment.status) ? <div className="max-w-md text-center"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-rose/18 text-3xl font-black text-ink">×</div><h3 className="mt-6 text-2xl font-extrabold text-ink">Payment not completed</h3><p className="mt-2 text-sm leading-6 text-ink-2">Reserved stock was released. Return to the cart and choose another method.</p></div> : null}
        {payment.status === 'REVIEW' ? <div className="max-w-md text-center"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber/25 text-3xl font-black text-ink">!</div><h3 className="mt-6 text-2xl font-extrabold text-ink">Verification needs attention</h3><p className="mt-2 text-sm leading-6 text-ink-2">Stock stays reserved until eSewa returns a safe final status. Do not collect a second payment.</p></div> : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 border-t border-paper-3 bg-white px-6 py-5">
        {waiting && payment.deeplink ? <a href={payment.deeplink} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand px-5 text-sm font-bold text-snow">{isUat ? 'Open eSewa test payment' : 'Open eSewa on this device'}</a> : null}
        {waiting || payment.status === 'REVIEW' ? <button type="button" onClick={onCheck} disabled={checking} className="min-h-12 rounded-2xl border border-paper-3 bg-white px-5 text-sm font-bold text-ink disabled:opacity-60">{checking ? 'Checking…' : 'Check payment'}</button> : null}
        {waiting ? <button type="button" onClick={onCancel} className="min-h-12 px-4 text-sm font-bold text-rose">Cancel safely</button> : null}
        {payment.status === 'SUCCEEDED' ? <button type="button" onClick={onDone} className="min-h-12 rounded-2xl bg-brand px-6 text-sm font-bold text-snow">Done</button> : null}
        {['FAILED', 'CANCELED', 'EXPIRED'].includes(payment.status) ? <button type="button" onClick={onBack} className="min-h-12 rounded-2xl bg-night px-6 text-sm font-bold text-snow">Back to cart</button> : null}
      </div>
    </div>
  )
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
  const [posPayment, setPosPayment] = useState<PosPayment | null>(null)
  const [checkingPayment, setCheckingPayment] = useState(false)
  const customerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const posPaymentId = posPayment?.paymentId
  const checkPosPayment = useCallback(async () => {
    if (!posPaymentId) return
    setCheckingPayment(true)
    try { const response = await fetch(`/api/sales/esewa-payments/${posPaymentId}`); if (response.ok) setPosPayment(await response.json()) }
    finally { setCheckingPayment(false) }
  }, [posPaymentId])

  useEffect(() => {
    if (!posPayment || !['BOOKED', 'PENDING', 'REVIEW'].includes(posPayment.status)) return
    const timer = window.setInterval(() => void checkPosPayment(), 2500)
    return () => window.clearInterval(timer)
  }, [posPayment, checkPosPayment])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return products.filter((product) => product.quantity > 0 && product.name.toLowerCase().includes(query))
  }, [products, search])

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const total = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.setTimeout(() => searchRef.current?.focus(), 0)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) setOpen(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, loading])

  useEffect(() => {
    if (!open) return
    const handler = (event: MouseEvent) => {
      if (customerRef.current && !customerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    const trimmed = customerSearch.trim()
    if (trimmed.length < 1 || selectedCustomer) {
      return
    }

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch('/api/customers')
        const data: CustomerApiResponse = await res.json()
        const customers = parseCustomers(data)
        const query = trimmed.toLowerCase()
        setCustomerSuggestions(
          customers
            .filter((customer) => customer.name.toLowerCase().includes(query) || (customer.phone ?? '').includes(query))
            .slice(0, 5)
        )
      } catch {
        setCustomerSuggestions([])
      }
    }, 250)

    return () => clearTimeout(timeout)
  }, [customerSearch, selectedCustomer])

  function addToCart(product: Product) {
    setError('')
    setPosPayment(null)
    setCart((previous) => {
      const existing = previous.find((item) => item.product.id === product.id)
      if (existing) {
        if (existing.quantity >= product.quantity) return previous
        return previous.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...previous, { product, quantity: 1, unitPrice: product.price }]
    })
  }

  function updateQty(productId: number, delta: number) {
    setError('')
    setCart((previous) =>
      previous
        .map((item) => {
          if (item.product.id !== productId) return item
          const nextQuantity = Math.min(item.product.quantity, item.quantity + delta)
          return { ...item, quantity: nextQuantity }
        })
        .filter((item) => item.quantity > 0)
    )
  }

  function removeFromCart(productId: number) {
    setCart((previous) => previous.filter((item) => item.product.id !== productId))
  }

  function updatePrice(productId: number, value: string) {
    const parsed = Number(value)
    setCart((previous) =>
      previous.map((item) =>
        item.product.id === productId ? { ...item, unitPrice: value === '' ? 0 : parsed } : item
      )
    )
  }

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

  function handleClose() {
    if (!loading) setOpen(false)
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
      setError('Add at least one product to continue.')
      return
    }

    if (hasInvalidSalePrice(cart)) {
      setError('Every item needs a sale price greater than zero.')
      return
    }

    if (paymentMethod === 'DUE' && !selectedCustomer && !customerSearch.trim()) {
      setError('Choose a customer before recording a due sale.')
      return
    }

    setError('')
    setLoading(true)

    try {
      const resolvedCustomer = await resolveCustomer()
      const typedCustomerName = customerSearch.trim() || undefined
      const customerName = resolvedCustomer?.name ?? typedCustomerName

      const res = await fetch(paymentMethod === 'ESEWA' ? '/api/sales/esewa-payments' : '/api/sales', {
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
          saleDate: saleDate || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? data.message ?? 'Failed to record sale.')
        return
      }

      if (paymentMethod === 'ESEWA') setPosPayment(await res.json())
      else { setOpen(false); router.refresh() }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-night px-4 py-2.5 text-sm font-semibold text-snow transition-colors hover:bg-night-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-night focus-visible:ring-offset-2"
      >
        <PlusIcon />
        New Sale
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-night/60" onClick={handleClose} aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="record-sale-title"
            aria-describedby="record-sale-description"
            className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-[0_24px_80px_rgba(24,33,52,0.28)] sm:max-h-[92vh] sm:max-w-6xl sm:rounded-[28px] sm:border sm:border-paper-3"
          >
            {posPayment ? <EsewaPaymentStep payment={posPayment} checking={checkingPayment} onCheck={() => void checkPosPayment()} onCancel={async () => { setCheckingPayment(true); try { const response = await fetch(`/api/sales/esewa-payments/${posPayment.paymentId}`, { method: 'POST' }); setPosPayment(await response.json()) } finally { setCheckingPayment(false) } }} onDone={() => { setOpen(false); setPosPayment(null); setCart([]); router.refresh() }} onBack={() => setPosPayment(null)} /> : null}
            <header className="flex shrink-0 items-start justify-between gap-5 border-b border-paper-3 px-5 py-4 sm:px-6 sm:py-5">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 id="record-sale-title" className="text-xl font-bold tracking-tight text-ink">Record sale</h2>
                  {itemCount > 0 ? (
                    <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-ink">
                      {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </span>
                  ) : null}
                </div>
                <p id="record-sale-description" className="mt-1 text-sm text-ink-2">
                  Add products, choose payment, and confirm the total.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                aria-label="Close record sale"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-ink-2 transition-colors hover:bg-paper hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-night disabled:opacity-50"
              >
                <CloseIcon size={20} />
              </button>
            </header>

            <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_400px] lg:overflow-hidden">
              <section aria-labelledby="products-heading" className="flex min-h-0 flex-col border-b border-paper-3 lg:border-r lg:border-b-0">
                <div className="shrink-0 border-b border-paper-3 px-5 py-4 sm:px-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 id="products-heading" className="text-sm font-bold text-ink">Products</h3>
                      <p className="mt-0.5 text-xs text-ink-3">{filtered.length} available</p>
                    </div>
                    <label className="text-right">
                      <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">Sale time</span>
                      <input
                        type="datetime-local"
                        value={saleDate}
                        onChange={(event) => setSaleDate(event.target.value)}
                        aria-label="Sale date and time, leave blank to use current time"
                        className="mt-1 h-10 max-w-52 rounded-xl border border-paper-3 bg-white px-3 text-xs text-ink outline-none transition-colors hover:border-ink-3 focus:border-night focus:ring-2 focus:ring-brand-soft"
                      />
                    </label>
                  </div>

                  <div className="relative mt-4">
                    <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-ink-3">
                      <SearchIcon />
                    </span>
                    <input
                      ref={searchRef}
                      type="search"
                      placeholder="Search products"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      className="h-12 w-full rounded-2xl border border-paper-3 bg-paper/60 pr-12 pl-11 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 hover:border-ink-3 focus:border-night focus:bg-white focus:ring-2 focus:ring-brand-soft"
                    />
                    {search ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearch('')
                          searchRef.current?.focus()
                        }}
                        aria-label="Clear product search"
                        className="absolute inset-y-0 right-2 my-auto flex h-9 w-9 items-center justify-center rounded-xl text-ink-3 hover:bg-paper-2 hover:text-ink"
                      >
                        <CloseIcon size={15} />
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="max-h-[45vh] min-h-0 overflow-y-auto lg:max-h-none lg:flex-1">
                  {filtered.length === 0 ? (
                    <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-paper text-ink-2">
                        <SearchIcon />
                      </div>
                      <p className="mt-4 text-sm font-semibold text-ink">No matching products</p>
                      <p className="mt-1 max-w-64 text-sm text-ink-3">Try another name or clear the search.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-paper-3">
                      {filtered.map((product) => {
                        const inCart = cart.find((item) => item.product.id === product.id)
                        const atStockLimit = inCart?.quantity === product.quantity
                        return (
                          <div
                            key={product.id}
                            className={`flex min-h-[76px] items-center gap-4 px-5 py-3 transition-colors sm:px-6 ${inCart ? 'bg-brand-soft/60' : 'hover:bg-paper/55'}`}
                          >
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${inCart ? 'bg-night text-snow' : 'bg-paper-2 text-ink-2'}`}>
                              {product.name.trim().charAt(0).toUpperCase() || 'P'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-ink">{product.name}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                                <span className="font-semibold text-ink-2">{formatCurrency(product.price)}</span>
                                <span className="text-ink-3">{product.quantity} in stock</span>
                              </div>
                            </div>

                            {inCart ? (
                              <div className="flex shrink-0 items-center rounded-2xl border border-paper-3 bg-white p-1 shadow-sm">
                                <button
                                  type="button"
                                  onClick={() => updateQty(product.id, -1)}
                                  aria-label={`Remove one ${product.name}`}
                                  className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-2 transition-colors hover:bg-paper hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-night"
                                >
                                  <MinusIcon />
                                </button>
                                <span className="w-8 text-center text-sm font-bold tabular-nums text-ink">{inCart.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => addToCart(product)}
                                  disabled={atStockLimit}
                                  aria-label={`Add one ${product.name}`}
                                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-night text-snow transition-colors hover:bg-night-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-night focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-paper-2 disabled:text-ink-3"
                                >
                                  <PlusIcon />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => addToCart(product)}
                                className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-2xl border border-paper-3 bg-white px-3.5 text-xs font-semibold text-ink shadow-sm transition-colors hover:border-night hover:bg-night hover:text-snow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-night focus-visible:ring-offset-2"
                              >
                                <PlusIcon />
                                Add
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </section>

              <aside aria-labelledby="order-heading" className="flex min-h-[600px] min-w-0 flex-col bg-paper/45 lg:min-h-0">
                <div className="flex shrink-0 items-center justify-between border-b border-paper-3 px-5 py-4">
                  <div>
                    <h3 id="order-heading" className="text-sm font-bold text-ink">Current order</h3>
                    <p className="mt-0.5 text-xs text-ink-3">{cart.length} {cart.length === 1 ? 'product' : 'products'}</p>
                  </div>
                  {cart.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setCart([])}
                      className="min-h-10 rounded-xl px-3 text-xs font-semibold text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-night"
                    >
                      Clear order
                    </button>
                  ) : null}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5">
                  {cart.length === 0 ? (
                    <div className="flex h-full min-h-44 flex-col items-center justify-center py-8 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-paper-3 bg-white text-ink-2">
                        <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 6h15l-2 8H8L6 3H3" />
                          <circle cx="9" cy="20" r="1" />
                          <circle cx="18" cy="20" r="1" />
                        </svg>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-ink">Your order is empty</p>
                      <p className="mt-1 text-xs text-ink-3">Add a product to get started.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-paper-3">
                      {cart.map((item) => (
                        <div key={item.product.id} className="py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-ink">{item.product.name}</p>
                              <p className="mt-1 text-xs text-ink-3">{item.quantity} × {formatCurrency(item.unitPrice)}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.product.id)}
                              aria-label={`Remove ${item.product.name} from order`}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-3 transition-colors hover:bg-rose/16 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-night"
                            >
                              <CloseIcon size={15} />
                            </button>
                          </div>

                          <div className="mt-3 grid grid-cols-[1fr_auto] items-end gap-3">
                            <label>
                              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">Unit price</span>
                              <div className="flex h-10 items-center rounded-xl border border-paper-3 bg-white px-3 focus-within:border-night focus-within:ring-2 focus-within:ring-brand-soft">
                                <span className="mr-2 text-xs font-semibold text-ink-3">NPR</span>
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  value={item.unitPrice || ''}
                                  onChange={(event) => updatePrice(item.product.id, event.target.value)}
                                  min="0.01"
                                  step="0.01"
                                  aria-label={`Unit price for ${item.product.name}`}
                                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink outline-none"
                                />
                              </div>
                            </label>
                            <div className="pb-2 text-right">
                              <p className="text-[11px] text-ink-3">Line total</p>
                              <p className="mt-0.5 text-sm font-bold tabular-nums text-ink">{formatCurrency(item.unitPrice * item.quantity)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="shrink-0 border-t border-paper-3 bg-white px-5 py-5">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium text-ink-3">Total to collect</p>
                      <p className="mt-1 text-2xl font-extrabold tracking-tight tabular-nums text-ink">{formatCurrency(total)}</p>
                    </div>
                    <p className="pb-1 text-xs font-medium text-ink-3">{itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
                  </div>

                  <fieldset className="mt-5">
                    <legend className="text-xs font-bold text-ink">Payment method</legend>
                    <div className="mt-2 grid grid-cols-4 gap-2">
                      {PAYMENT_METHODS.map((method) => {
                        const selected = paymentMethod === method.value
                        return (
                          <button
                            type="button"
                            key={method.value}
                            onClick={() => {
                              setPaymentMethod(method.value)
                              setError('')
                            }}
                            aria-pressed={selected}
                            title={method.helper}
                            className={`min-h-11 rounded-xl px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-night focus-visible:ring-offset-2 ${
                              selected
                                ? method.value === 'DUE'
                                  ? 'bg-amber text-ink'
                                  : 'bg-night text-snow'
                                : 'border border-paper-3 bg-white text-ink-2 hover:border-ink-3 hover:text-ink'
                            }`}
                          >
                            {method.label}
                          </button>
                        )
                      })}
                    </div>
                  </fieldset>

                  <div ref={customerRef} className="relative mt-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label htmlFor="sale-customer" className="text-xs font-bold text-ink">Customer</label>
                      <span className={`text-[11px] font-semibold ${paymentMethod === 'DUE' ? 'text-ink' : 'text-ink-3'}`}>
                        {paymentMethod === 'DUE' ? 'Required for due' : 'Optional'}
                      </span>
                    </div>

                    {selectedCustomer ? (
                      <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-paper-3 bg-paper px-3.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-bold text-ink">
                          {selectedCustomer.name.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">{selectedCustomer.name}</p>
                          {selectedCustomer.phone ? <p className="truncate text-xs text-ink-3">{selectedCustomer.phone}</p> : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(null)
                            setCustomerSearch('')
                          }}
                          aria-label="Remove selected customer"
                          className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-3 hover:bg-paper-2 hover:text-ink"
                        >
                          <CloseIcon size={15} />
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          id="sale-customer"
                          type="text"
                          value={customerSearch}
                          onChange={(event) => {
                            setCustomerSearch(event.target.value)
                            if (!event.target.value.trim()) setCustomerSuggestions([])
                            setShowSuggestions(true)
                            setError('')
                          }}
                          onFocus={() => setShowSuggestions(true)}
                          placeholder="Search by name or phone"
                          role="combobox"
                          aria-autocomplete="list"
                          aria-expanded={showSuggestions && customerSuggestions.length > 0}
                          aria-controls="sale-customer-suggestions"
                          className={`h-12 w-full rounded-2xl border bg-white px-4 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus:ring-2 focus:ring-brand-soft ${
                            paymentMethod === 'DUE' && !customerSearch.trim() ? 'border-amber' : 'border-paper-3 hover:border-ink-3 focus:border-night'
                          }`}
                        />

                        {showSuggestions && customerSuggestions.length > 0 ? (
                          <div id="sale-customer-suggestions" role="listbox" className="absolute bottom-[calc(100%+8px)] z-20 w-full overflow-hidden rounded-2xl border border-paper-3 bg-white shadow-[0_14px_40px_rgba(24,33,52,0.18)]">
                            {customerSuggestions.map((customer) => (
                              <button
                                type="button"
                                role="option"
                                aria-selected="false"
                                key={customer.id}
                                onClick={() => {
                                  setSelectedCustomer(customer)
                                  setCustomerSearch(customer.name)
                                  setShowSuggestions(false)
                                }}
                                className="flex min-h-12 w-full items-center justify-between gap-3 border-b border-paper-3 px-4 py-2.5 text-left last:border-b-0 hover:bg-paper focus:bg-paper focus:outline-none"
                              >
                                <span className="truncate text-sm font-semibold text-ink">{customer.name}</span>
                                {customer.phone ? <span className="shrink-0 text-xs text-ink-3">{customer.phone}</span> : null}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )}

                    {!selectedCustomer && customerSearch.trim() ? (
                      <p className="mt-1.5 text-[11px] text-ink-3">Select a match, or a new customer will be created.</p>
                    ) : null}
                  </div>

                  {error ? (
                    <div role="alert" className="mt-4 flex gap-3 rounded-2xl border border-rose/40 bg-rose/14 px-3.5 py-3 text-sm font-medium text-ink">
                      <svg aria-hidden="true" className="mt-0.5 shrink-0" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 8v5M12 17h.01" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading || cart.length === 0}
                    className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-brand px-4 text-sm font-bold text-snow transition-colors hover:bg-night-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-night focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-paper-2 disabled:text-ink-3"
                  >
                    {loading ? (paymentMethod === 'ESEWA' ? 'Preparing QR…' : 'Recording sale…') : cart.length === 0 ? 'Add products to continue' : paymentMethod === 'ESEWA' ? `Show eSewa QR · ${formatCurrency(total)}` : `Record sale · ${formatCurrency(total)}`}
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
