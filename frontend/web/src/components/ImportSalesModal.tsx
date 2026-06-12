'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'

type Product = { id: number; name: string; price: number; quantity: number }

type ParsedSaleItem = {
  productName: string
  quantity: number
  unitPrice: number
}

type ParsedSale = {
  saleDate: string
  customerName: string | null
  paymentMethod: string
  items: ParsedSaleItem[]
}

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function lookupKeys(value: string) {
  const normalized = normalizeName(value)
  const compact = normalized.replace(/[^a-z0-9]/g, '')
  return compact && compact !== normalized ? [normalized, compact] : [normalized]
}

export default function ImportSalesModal({ products }: { products: Product[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [sales, setSales] = useState<ParsedSale[] | null>(null)

  const productMap = useMemo(() => {
    const map = new Map<string, Product>()
    for (const product of products) {
      for (const key of lookupKeys(product.name)) {
        map.set(key, product)
      }
    }
    return map
  }, [products])

  async function handleFile(file: File) {
    setLoading(true)
    setError('')

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const fileText = XLSX.utils.sheet_to_csv(worksheet)

      const res = await fetch('/api/ai/parse-sales-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileText }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.error ?? 'Could not parse this sales sheet.')
        return
      }

      if (!data.sales || data.sales.length === 0) {
        setError('No sales could be extracted from this file.')
        return
      }

      setSales(data.sales)
    } catch {
      setError('Could not read the Excel file. Please try a different sheet.')
    } finally {
      setLoading(false)
    }
  }

  function updateSale(index: number, field: keyof ParsedSale, value: string) {
    setSales((prev) => {
      if (!prev) return prev
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  function updateItem(saleIndex: number, itemIndex: number, field: keyof ParsedSaleItem, value: string) {
    setSales((prev) => {
      if (!prev) return prev
      const next = [...prev]
      const sale = next[saleIndex]
      const items = [...sale.items]
      items[itemIndex] = {
        ...items[itemIndex],
        [field]: field === 'productName' ? value : Number(value),
      }
      next[saleIndex] = { ...sale, items }
      return next
    })
  }

  function removeSale(index: number) {
    setSales((prev) => {
      if (!prev) return prev
      const next = prev.filter((_, saleIndex) => saleIndex !== index)
      return next.length > 0 ? next : null
    })
  }

  async function importSales() {
    if (!sales || sales.length === 0) return
    setImporting(true)
    setError('')

    try {
      const missingProducts = new Set<string>()
      const payloadSales = []

      for (const sale of sales) {
        if (!sale.saleDate) {
          throw new Error('Every imported sale needs a date before you can save.')
        }

        const items = sale.items.map((item) => {
          const matched = lookupKeys(item.productName)
            .map((key) => productMap.get(key))
            .find(Boolean)
          if (!matched) {
            missingProducts.add(item.productName)
            return null
          }
          return {
            productId: matched.id,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
          }
        }).filter(Boolean)

        payloadSales.push({
          customerName: sale.customerName?.trim() || null,
          paymentMethod: sale.paymentMethod || 'CASH',
          saleDate: `${sale.saleDate}T12:00:00`,
          items,
        })
      }

      if (missingProducts.size > 0) {
        throw new Error(`These product names do not match inventory yet: ${Array.from(missingProducts).join(', ')}`)
      }

      const res = await fetch('/api/sales/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sales: payloadSales }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error ?? data.message ?? 'Sales import failed.')
      }

      setOpen(false)
      setSales(null)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sales import failed.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      <button
        onClick={() => {
          setOpen(true)
          setSales(null)
          setError('')
        }}
        className="inline-flex items-center gap-2 rounded-2xl border border-paper-3 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
        Import Excel
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative mx-4 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-paper-3 bg-white shadow-[0_24px_80px_rgba(24,33,52,0.22)]">
            <div className="flex items-center justify-between border-b border-paper-3 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-ink">AI Sales Import</h2>
                <p className="mt-1 text-xs text-ink-2">Upload an Excel sheet, review the parsed historical sales, then save them as analytics records without changing inventory.</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-ink-3 transition hover:text-ink">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              {!sales ? (
                <div className="rounded-[24px] border border-dashed border-paper-3 bg-paper/60 p-8 text-center">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void handleFile(file)
                      e.currentTarget.value = ''
                    }}
                    className="mx-auto block text-sm text-ink"
                  />
                  <p className="mt-4 text-sm text-ink-2">
                    Best results come from sheets with sale date, customer, payment method, product name, quantity, and unit price columns.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sales.map((sale, saleIndex) => (
                    <section key={saleIndex} className="rounded-[24px] border border-paper-3 bg-paper/55 p-4">
                      <div className="grid gap-3 md:grid-cols-[160px_1fr_160px_auto]">
                        <label className="block">
                          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-ink-3">Sale date</span>
                          <input
                            type="date"
                            value={sale.saleDate}
                            onChange={(e) => updateSale(saleIndex, 'saleDate', e.target.value)}
                            className="w-full rounded-2xl border border-paper-3 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-ink-3">Customer</span>
                          <input
                            type="text"
                            value={sale.customerName ?? ''}
                            onChange={(e) => updateSale(saleIndex, 'customerName', e.target.value)}
                            className="w-full rounded-2xl border border-paper-3 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-ink-3">Payment</span>
                          <select
                            value={sale.paymentMethod}
                            onChange={(e) => updateSale(saleIndex, 'paymentMethod', e.target.value)}
                            className="w-full rounded-2xl border border-paper-3 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                          >
                            {['CASH', 'CARD', 'DIGITAL', 'DUE'].map((method) => (
                              <option key={method} value={method}>{method}</option>
                            ))}
                          </select>
                        </label>
                        <button
                          onClick={() => removeSale(saleIndex)}
                          className="self-end rounded-2xl border border-paper-3 bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:border-rose hover:text-rose"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="mt-4 space-y-2">
                        {sale.items.map((item, itemIndex) => {
                          const matched = lookupKeys(item.productName)
                            .map((key) => productMap.get(key))
                            .find(Boolean)
                          return (
                            <div key={itemIndex} className="grid gap-2 rounded-2xl bg-white p-3 md:grid-cols-[1fr_120px_140px_auto]">
                              <div>
                                <input
                                  type="text"
                                  value={item.productName}
                                  onChange={(e) => updateItem(saleIndex, itemIndex, 'productName', e.target.value)}
                                  list={`sale-product-list-${saleIndex}-${itemIndex}`}
                                  className="w-full rounded-xl border border-paper-3 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                                />
                                <datalist id={`sale-product-list-${saleIndex}-${itemIndex}`}>
                                  {products.map((product) => (
                                    <option key={product.id} value={product.name} />
                                  ))}
                                </datalist>
                                <p className={`mt-1 text-xs ${matched ? 'text-mint' : 'text-rose'}`}>
                                  {matched ? `Matched to inventory: ${matched.name}` : 'No inventory match yet'}
                                </p>
                              </div>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateItem(saleIndex, itemIndex, 'quantity', e.target.value)}
                                className="w-full rounded-xl border border-paper-3 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                              />
                              <input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(saleIndex, itemIndex, 'unitPrice', e.target.value)}
                                className="w-full rounded-xl border border-paper-3 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                              />
                              <div className="flex items-center justify-end text-sm font-semibold text-ink">
                                NPR {(Number(item.quantity) * Number(item.unitPrice)).toLocaleString()}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              )}

              {error ? (
                <p className="mt-4 rounded-2xl bg-rose/16 px-4 py-3 text-sm font-medium text-ink">{error}</p>
              ) : null}
            </div>

            <div className="border-t border-paper-3 px-6 py-4">
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-2xl border border-paper-3 bg-white px-4 py-3 text-sm font-semibold text-ink"
                >
                  Close
                </button>
                <button
                  onClick={() => void importSales()}
                  disabled={!sales || sales.length === 0 || loading || importing}
                  className="rounded-2xl bg-night px-5 py-3 text-sm font-semibold text-snow transition hover:bg-night-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Parsing sheet...' : importing ? 'Importing sales...' : 'Import Sales'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
