'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Product = { id: number; name: string; price: number; quantity: number }
type PaymentMethod = 'CASH' | 'CARD' | 'DIGITAL'
type CartItem = { product: Product; quantity: number; unitPrice: number }

export default function AddSaleModal({ products }: { products: Product[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const filtered = products.filter(
    (p) => p.quantity > 0 && p.name.toLowerCase().includes(search.toLowerCase())
  )

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { product, quantity: 1, unitPrice: product.price }]
    })
  }

  function updateQty(productId: number, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i)
        .filter((i) => i.quantity > 0)
    )
  }

  function updatePrice(productId: number, value: string) {
    const parsed = parseFloat(value)
    setCart((prev) =>
      prev.map((i) =>
        i.product.id === productId ? { ...i, unitPrice: isNaN(parsed) ? i.unitPrice : parsed } : i
      )
    )
  }

  const total = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0)

  function handleOpen() {
    setCart([])
    setSearch('')
    setPaymentMethod('CASH')
    setError('')
    setOpen(true)
  }

  async function handleSubmit() {
    if (cart.length === 0) { setError('Add at least one item.'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
          paymentMethod,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? d.message ?? 'Failed to record sale.')
        return
      }
      setOpen(false)
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
        onClick={handleOpen}
        className="flex items-center gap-2 px-4 py-2 bg-[#135BEC] text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        New Sale
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">New Sale</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Product picker */}
              <div className="flex-1 flex flex-col border-r border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50">
                  <input
                    type="text"
                    placeholder="Search products…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#135BEC] focus:border-transparent"
                  />
                </div>
                <div className="overflow-y-auto flex-1">
                  {filtered.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-10">No products in stock</p>
                  ) : (
                    filtered.map((p) => {
                      const inCart = cart.find((i) => i.product.id === p.id)
                      return (
                        <div key={p.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 hover:bg-gray-50/60">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                            <p className="text-xs text-gray-400">NPR {Number(p.price).toLocaleString()} · {p.quantity} in stock</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            {inCart ? (
                              <>
                                <button
                                  onClick={() => updateQty(p.id, -1)}
                                  className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                </button>
                                <span className="w-6 text-center text-sm font-semibold text-gray-900">{inCart.quantity}</span>
                              </>
                            ) : null}
                            <button
                              onClick={() => addToCart(p)}
                              className="w-7 h-7 rounded-lg bg-[#135BEC] flex items-center justify-center text-white hover:bg-blue-700 transition-colors"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Cart + Summary */}
              <div className="w-64 flex flex-col px-4 py-4 gap-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cart</p>
                <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                  {cart.length === 0 ? (
                    <p className="text-xs text-gray-400 pt-4 text-center">No items yet</p>
                  ) : (
                    cart.map((i) => (
                      <div key={i.product.id} className="text-xs border border-gray-100 rounded-lg p-2 space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-gray-700 font-medium truncate flex-1">{i.product.name}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => updateQty(i.product.id, -1)}
                              className="w-5 h-5 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-100"
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            </button>
                            <span className="w-5 text-center font-semibold">{i.quantity}</span>
                            <button
                              onClick={() => updateQty(i.product.id, 1)}
                              className="w-5 h-5 rounded bg-[#135BEC] flex items-center justify-center text-white hover:bg-blue-700"
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-gray-500">
                          <span>Price:</span>
                          <span className="text-gray-400 text-[10px]">NPR</span>
                          <input
                            type="number"
                            value={i.unitPrice}
                            onChange={(e) => updatePrice(i.product.id, e.target.value)}
                            className="w-16 border border-gray-200 rounded px-1 py-0.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#135BEC]"
                          />
                          <span className="text-gray-400 ml-auto">= NPR {(i.unitPrice * i.quantity).toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t border-gray-100 pt-3 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Total</span>
                    <span className="text-base font-bold text-gray-900">NPR {total.toLocaleString()}</span>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1.5">Payment</p>
                    <div className="grid grid-cols-3 gap-1">
                      {(['CASH', 'CARD', 'DIGITAL'] as PaymentMethod[]).map((m) => (
                        <button
                          key={m}
                          onClick={() => setPaymentMethod(m)}
                          className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            paymentMethod === m
                              ? 'bg-[#135BEC] text-white border-[#135BEC]'
                              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && <p className="text-xs text-red-600 bg-red-50 px-2 py-1.5 rounded-lg">{error}</p>}

                  <button
                    onClick={handleSubmit}
                    disabled={loading || cart.length === 0}
                    className="w-full py-2.5 bg-[#135BEC] text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Recording…' : 'Complete Sale'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
