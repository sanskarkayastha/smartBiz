'use client'

import { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'

type Message = { role: 'user' | 'ai'; content: string }
type ParsedProduct = { name: string; quantity: number; rate: number; category?: string }
type ParsedSaleItem = { productName: string; quantity: number; unitPrice: number }
type ParsedSale = { saleDate: string; customerName: string | null; paymentMethod: string; items: ParsedSaleItem[] }
type ReviewProduct = ParsedProduct & { id?: number; isNew: boolean; unitPrice: number; category?: string }
type InventoryProduct = { id: number; name: string }
type ProductListResponse = InventoryProduct[] | { content?: InventoryProduct[] }
type Supplier = { id: number; name: string }
type SupplierListResponse = Supplier[] | { content?: Supplier[] }
type AiQueryResult = {
  response?: string
  products?: ParsedProduct[]
  sales?: ParsedSale[]
  supplierName?: string | null
}
type AttachmentState = {
  label: string;
  image?: string;
  mimeType?: string;
  fileText?: string;
} | null

const QUICK_PROMPTS = [
  'How is my business doing today?',
  'Which products are selling most?',
  'What should I reorder?',
  'Show me revenue this week',
  'Who are my best customers?',
]

export default function AiPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [attachment, setAttachment] = useState<AttachmentState>(null)
  const [reviewProducts, setReviewProducts] = useState<ReviewProduct[] | null>(null)
  const [reviewSupplier, setReviewSupplier] = useState('')
  const [reviewSales, setReviewSales] = useState<ParsedSale[] | null>(null)
  const [savingProducts, setSavingProducts] = useState(false)
  const [savingSales, setSavingSales] = useState(false)
  const [inventoryProducts, setInventoryProducts] = useState<InventoryProduct[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const threadRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const thread = threadRef.current
    if (!thread) return

    thread.scrollTo({ top: thread.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ||
      file.type.includes('spreadsheet') || file.type.includes('excel')

    if (isExcel) {
      try {
        const buffer = await file.arrayBuffer()
        const wb = XLSX.read(buffer, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const csvText = XLSX.utils.sheet_to_csv(ws)
        setAttachment({ label: file.name, fileText: csvText })
      } catch {
        alert('Could not read the Excel file. Please try a different file.')
      }
    } else {
      const base64 = await fileToBase64(file)
      setAttachment({ label: file.name, image: base64, mimeType: file.type })
    }
  }

  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim()
    const currentAttachment = attachment
    if ((!text && !currentAttachment) || loading) return

    setInput('')
    setAttachment(null)

    const displayText = text || `📎 ${currentAttachment!.label}`
    const userMsg: Message = { role: 'user', content: displayText }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setLoading(true)

    try {
      const payload = updated.map((m) => ({ role: m.role === 'ai' ? 'ai' : 'user', text: m.content }))
      const body: Record<string, unknown> = { messages: payload }
      if (currentAttachment?.image) { body.image = currentAttachment.image; body.mimeType = currentAttachment.mimeType }
      if (currentAttachment?.fileText) body.fileText = currentAttachment.fileText

      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json() as AiQueryResult
      setMessages((prev) => [...prev, { role: 'ai', content: data.response ?? 'No response received.' }])

      if ((data.products && data.products.length > 0) || (data.sales && data.sales.length > 0)) {
        const [existing, supplierOptions] = await Promise.all([
          loadInventoryProducts(),
          data.products && data.products.length > 0 ? loadSuppliers() : Promise.resolve(suppliers),
        ])

        if (data.sales && data.sales.length > 0) {
          setReviewProducts(null)
          setReviewSupplier('')
          setReviewSales(data.sales)
        }

        if (data.products && data.products.length > 0) {
          setReviewSales(null)
          const extractedSupplier = data.supplierName?.trim() ?? ''
          const matchedSupplier = findMatchingSupplier(extractedSupplier, supplierOptions)
          setReviewSupplier(matchedSupplier?.name ?? extractedSupplier)
          const reviewed: ReviewProduct[] = data.products.map((p: ParsedProduct) => {
            const match = existing.find((ex) =>
              ex.name.toLowerCase() === p.name.toLowerCase()
            )
            return { name: p.name, quantity: p.quantity, rate: p.rate, unitPrice: p.rate, category: p.category, id: match?.id, isNew: !match }
          })
          setReviewProducts(reviewed)
        }
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'ai', content: 'Something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  async function saveScannedProducts() {
    if (!reviewProducts) return
    setSavingProducts(true)
    let saved = 0
    const failed: ReviewProduct[] = []
    const errors: string[] = []
    const supplier = resolveSupplierName(reviewSupplier, suppliers)
    try {
      for (const p of reviewProducts) {
        let res: Response
        if (p.isNew) {
          res = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: p.name,
              quantity: p.quantity,
              price: p.unitPrice,
              costPrice: p.unitPrice,
              category: p.category || undefined,
              supplier: supplier || undefined,
            }),
          })
        } else if (p.id) {
          if (supplier && p.unitPrice > 0) {
            res = await fetch(`/api/products/${p.id}/restock`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                quantityAdded: p.quantity,
                unitCost: p.unitPrice,
                supplier,
                paymentStatus: 'PAID',
                amountPaidNow: null,
                note: 'AI extraction',
              }),
            })
          } else {
            res = await fetch(`/api/products/${p.id}/stock`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ quantityChange: p.quantity, type: 'RESTOCK', reason: 'AI extraction' }),
            })

            if (res.ok && supplier) {
              res = await fetch(`/api/products/${p.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ supplier }),
              })
            }
          }
        } else {
          failed.push(p)
          errors.push(`${p.name}: product match is missing`)
          continue
        }

        if (!res.ok) {
          failed.push(p)
          errors.push(`${p.name}: ${await readErrorMessage(res)}`)
          continue
        }

        saved++
      }
      setReviewProducts(failed.length > 0 ? failed : null)

      if (failed.length === 0) {
        setReviewSupplier('')
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            content: `Done! ${saved} product${saved !== 1 ? 's' : ''} updated in inventory.${supplier ? ` Supplier: ${supplier}.` : ''}`,
          },
        ])
        return
      }

      const firstError = errors[0] ?? 'Unknown error'
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          content: saved > 0
            ? `Saved ${saved} product${saved !== 1 ? 's' : ''}, but ${failed.length} still need${failed.length === 1 ? 's' : ''} attention. First issue: ${firstError}.`
            : `I couldn't save the extracted products yet. First issue: ${firstError}.`,
        },
      ])
    } finally {
      setSavingProducts(false)
    }
  }

  async function loadInventoryProducts(): Promise<InventoryProduct[]> {
    const existingRes = await fetch('/api/products')
    const existingData: ProductListResponse = await existingRes.json().catch(() => [])
    const existing = extractInventoryProducts(existingData)
    setInventoryProducts(existing)
    return existing
  }

  async function loadSuppliers(): Promise<Supplier[]> {
    const res = await fetch('/api/suppliers?page=0&size=100')
    const data: SupplierListResponse = await res.json().catch(() => [])
    const existing = extractSuppliers(data)
    setSuppliers(existing)
    return existing
  }

  async function saveReviewedSales() {
    if (!reviewSales) return
    setSavingSales(true)

    try {
      const availableProducts = inventoryProducts.length > 0 ? inventoryProducts : await loadInventoryProducts()
      const productMap = buildInventoryProductMap(availableProducts)
      const missingProducts = new Set<string>()
      const payloadSales = []

      for (const sale of reviewSales) {
        if (!sale.saleDate?.trim()) {
          throw new Error('Every imported sale needs a date before you can save.')
        }

        const items = sale.items.map((item) => {
          const matched = findMatchingInventoryProduct(item.productName, productMap)
          if (!matched) {
            missingProducts.add(item.productName)
            return null
          }

          const quantity = Math.round(Number(item.quantity))
          const unitPrice = Number(item.unitPrice)

          if (!Number.isFinite(quantity) || quantity <= 0) {
            throw new Error(`"${item.productName}" needs a quantity greater than 0.`)
          }

          if (!Number.isFinite(unitPrice) || unitPrice < 0) {
            throw new Error(`"${item.productName}" needs a valid unit price.`)
          }

          return {
            productId: matched.id,
            quantity,
            unitPrice,
          }
        }).filter(Boolean)

        if (items.length === 0) {
          throw new Error('Each imported sale needs at least one valid item.')
        }

        payloadSales.push({
          customerName: sale.customerName?.trim() || null,
          paymentMethod: normalizeSalePaymentMethod(sale.paymentMethod),
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

      if (!res.ok) {
        throw new Error(await readErrorMessage(res))
      }

      setReviewSales(null)
      setMessages((prev) => [
        ...prev,
        { role: 'ai', content: `Imported ${reviewSales.length} historical sale${reviewSales.length === 1 ? '' : 's'} successfully.` },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', content: err instanceof Error ? err.message : 'Sales import failed.' },
      ])
    } finally {
      setSavingSales(false)
    }
  }

  function updateReviewProduct(idx: number, field: string, value: string) {
    setReviewProducts((prev) => {
      if (!prev) return prev
      const copy = [...prev]
      const stringFields = ['name', 'category']
      copy[idx] = { ...copy[idx], [field]: stringFields.includes(field) ? value : Number(value) }
      return copy
    })
  }

  function removeReviewProduct(idx: number) {
    setReviewProducts((prev) => {
      if (!prev) return prev
      const copy = prev.filter((_, i) => i !== idx)
      return copy.length > 0 ? copy : null
    })
  }

  function updateReviewSale(idx: number, field: keyof ParsedSale, value: string) {
    setReviewSales((prev) => {
      if (!prev) return prev
      const copy = [...prev]
      copy[idx] = { ...copy[idx], [field]: value }
      return copy
    })
  }

  function updateReviewSaleItem(saleIndex: number, itemIndex: number, field: keyof ParsedSaleItem, value: string) {
    setReviewSales((prev) => {
      if (!prev) return prev
      const copy = [...prev]
      const sale = copy[saleIndex]
      const items = [...sale.items]
      items[itemIndex] = {
        ...items[itemIndex],
        [field]: field === 'productName' ? value : Number(value),
      }
      copy[saleIndex] = { ...sale, items }
      return copy
    })
  }

  function removeReviewSale(idx: number) {
    setReviewSales((prev) => {
      if (!prev) return prev
      const copy = prev.filter((_, i) => i !== idx)
      return copy.length > 0 ? copy : null
    })
  }

  const canSend = (!!input.trim() || !!attachment) && !loading
  const inventoryProductMap = buildInventoryProductMap(inventoryProducts)
  const matchedReviewSupplier = findMatchingSupplier(reviewSupplier, suppliers)

  return (
    <section className="flex h-[calc(100dvh-10.25rem)] min-h-[32rem] flex-col overflow-hidden rounded-[22px] border border-paper-3 bg-white shadow-[0_1px_2px_oklch(0.20_0.006_80/0.03)]">
      {/* Header */}
      <div className="shrink-0 border-b border-paper-3 px-4 pb-3 pt-4 sm:px-5">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-ink" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-none">AI Assistant</h1>
            <p className="text-xs text-gray-400 mt-0.5">Powered by Gemini</p>
          </div>
        </div>

        {/* Quick prompts */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => send(p)}
              disabled={loading}
              className="min-h-11 shrink-0 whitespace-nowrap rounded-full bg-paper px-4 py-2 text-xs font-medium text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Chat thread */}
      <div ref={threadRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-paper/40 px-4 py-5 sm:px-5">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center">
            <svg className="mb-3 h-10 w-10 text-paper-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <p className="text-sm font-medium text-gray-500">Ask anything about your business</p>
            <p className="text-xs mt-1">Attach an image or Excel file and describe what you want to do</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'ai' && (
              <div className="mr-2 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paper-2">
                <svg className="h-3.5 w-3.5 text-ink" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                msg.role === 'user'
                  ? 'rounded-br-sm bg-night text-snow'
                  : 'bg-white border border-gray-100 shadow-sm text-gray-800 rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="mr-2 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paper-2">
              <svg className="h-3.5 w-3.5 text-ink" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm px-4 py-2.5">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div aria-hidden="true" />
      </div>

      {/* Product Review Panel */}
      {reviewProducts && (
        <div className="shrink-0 border-t border-gray-100 bg-amber-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-amber-800">Review Extracted Products ({reviewProducts.length})</p>
            <button
              onClick={() => { setReviewProducts(null); setReviewSupplier('') }}
              aria-label="Close product review"
              className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-400 hover:bg-amber-100 hover:text-gray-600"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="grid items-end gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-amber-900">Supplier</span>
              <input
                value={reviewSupplier}
                onChange={(e) => setReviewSupplier(e.target.value)}
                list="ai-supplier-options"
                placeholder="No supplier detected"
                className="h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm text-ink placeholder:text-ink-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-amber/35"
              />
              <datalist id="ai-supplier-options">
                {suppliers.map((supplierOption) => (
                  <option key={supplierOption.id} value={supplierOption.name} />
                ))}
              </datalist>
            </label>
            <p className={`pb-3 text-xs font-medium ${matchedReviewSupplier ? 'text-emerald-700' : reviewSupplier.trim() ? 'text-amber-800' : 'text-ink-3'}`}>
              {matchedReviewSupplier
                ? 'Existing supplier matched'
                : reviewSupplier.trim()
                  ? 'New supplier will be created'
                  : 'Products will have no supplier'}
            </p>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {reviewProducts.map((p, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-amber-100">
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded shrink-0 ${p.isNew ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                  {p.isNew ? 'New' : 'Existing'}
                </span>
                <input
                  value={p.name}
                  onChange={(e) => updateReviewProduct(idx, 'name', e.target.value)}
                  className="flex-1 text-sm text-gray-800 bg-transparent focus:outline-none min-w-0"
                />
                <input
                  value={p.category ?? ''}
                  onChange={(e) => updateReviewProduct(idx, 'category', e.target.value)}
                  placeholder="Category"
                  className="w-24 rounded border border-gray-200 px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-night/20"
                />
                <input
                  type="number"
                  value={p.quantity}
                  onChange={(e) => updateReviewProduct(idx, 'quantity', e.target.value)}
                  className="w-14 rounded border border-gray-200 px-1 py-0.5 text-center text-sm focus:outline-none focus:ring-1 focus:ring-night/20"
                />
                <span className="text-xs text-gray-400">qty</span>
                <input
                  type="number"
                  value={p.unitPrice}
                  onChange={(e) => updateReviewProduct(idx, 'unitPrice', e.target.value)}
                  className="w-20 rounded border border-gray-200 px-1 py-0.5 text-center text-sm focus:outline-none focus:ring-1 focus:ring-night/20"
                />
                <span className="text-xs text-gray-400">NPR</span>
                <button onClick={() => removeReviewProduct(idx)} className="text-gray-400 hover:text-red-500 shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setReviewProducts(null); setReviewSupplier('') }} className="flex-1 py-2 border border-amber-200 rounded-lg text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors">
              Cancel
            </button>
            <button
              onClick={saveScannedProducts}
              disabled={savingProducts}
              className="flex-1 rounded-lg bg-night py-2 text-sm font-semibold text-snow transition-colors hover:bg-night-2 disabled:opacity-60"
            >
              {savingProducts ? 'Saving…' : 'Save to Inventory'}
            </button>
          </div>
        </div>
      )}

      {/* Sales Review Panel */}
      {reviewSales && (
        <div className="shrink-0 border-t border-gray-100 bg-slate-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Review Extracted Sales ({reviewSales.length})</p>
            <button onClick={() => setReviewSales(null)} className="text-gray-400 hover:text-gray-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {reviewSales.map((sale, saleIndex) => (
              <section key={saleIndex} className="rounded-2xl border border-slate-200 bg-white p-3 space-y-3">
                <div className="grid gap-2 md:grid-cols-[150px_1fr_150px_auto]">
                  <input
                    type="date"
                    value={sale.saleDate}
                    onChange={(e) => updateReviewSale(saleIndex, 'saleDate', e.target.value)}
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-night/20"
                  />
                  <input
                    value={sale.customerName ?? ''}
                    onChange={(e) => updateReviewSale(saleIndex, 'customerName', e.target.value)}
                    placeholder="Customer"
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-night/20"
                  />
                  <select
                    value={normalizeSalePaymentMethod(sale.paymentMethod)}
                    onChange={(e) => updateReviewSale(saleIndex, 'paymentMethod', e.target.value)}
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-night/20"
                  >
                    {['CASH', 'CARD', 'DIGITAL', 'DUE'].map((method) => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                  <button onClick={() => removeReviewSale(saleIndex)} className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:border-red-200 hover:text-red-500">
                    Remove
                  </button>
                </div>

                <div className="space-y-2">
                  {sale.items.map((item, itemIndex) => {
                    const matched = findMatchingInventoryProduct(item.productName, inventoryProductMap)
                    return (
                      <div key={itemIndex} className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 md:grid-cols-[1fr_110px_140px_auto]">
                        <div>
                          <input
                            value={item.productName}
                            onChange={(e) => updateReviewSaleItem(saleIndex, itemIndex, 'productName', e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-night/20"
                          />
                          <p className={`mt-1 text-xs ${matched ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {matched ? `Matched to inventory: ${matched.name}` : 'No inventory match yet'}
                          </p>
                        </div>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateReviewSaleItem(saleIndex, itemIndex, 'quantity', e.target.value)}
                          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-night/20"
                        />
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateReviewSaleItem(saleIndex, itemIndex, 'unitPrice', e.target.value)}
                          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-night/20"
                        />
                        <div className="flex items-center justify-end text-sm font-semibold text-gray-700">
                          NPR {(Number(item.quantity) * Number(item.unitPrice)).toLocaleString()}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setReviewSales(null)} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">
              Cancel
            </button>
            <button
              onClick={saveReviewedSales}
              disabled={savingSales}
              className="flex-1 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 transition-colors"
            >
              {savingSales ? 'Importing…' : 'Save Historical Sales'}
            </button>
          </div>
        </div>
      )}

      {/* Input Row */}
      <div className="shrink-0 border-t border-paper-3 bg-white px-4 pb-4 pt-3 sm:px-5">
        {/* Attachment chip */}
        {attachment && (
          <div className="mb-2 flex w-fit max-w-xs items-center gap-1.5 rounded-lg border border-paper-3 bg-paper px-1 py-1">
            <svg className="h-3.5 w-3.5 shrink-0 text-ink-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
            </svg>
            <span className="max-w-[180px] truncate text-xs font-medium text-ink-2">{attachment.label}</span>
            <button onClick={() => setAttachment(null)} className="shrink-0 text-ink-3 hover:text-ink">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.xlsx,.xls"
            onChange={handleFileSelected}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            title="Attach image or Excel file"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-paper hover:text-ink focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
            }}
            placeholder={attachment ? 'Describe what you want to do with this file…' : 'Ask about your business…'}
            rows={1}
            className="max-h-32 flex-1 resize-none overflow-y-auto rounded-xl border border-gray-200 px-3 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-night/20"
            style={{ lineHeight: '1.4' }}
          />

          <button
            onClick={() => send()}
            disabled={!canSend}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-night text-snow transition-colors hover:bg-night-2 focus:outline-none focus:ring-2 focus:ring-night/20 focus:ring-offset-2 disabled:opacity-40"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 px-1">Attach an image or .xlsx file to extract products or historical sales · Enter to send</p>
      </div>
    </section>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
  })
}

function extractInventoryProducts(data: ProductListResponse): InventoryProduct[] {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.content)) return data.content
  return []
}

function extractSuppliers(data: SupplierListResponse): Supplier[] {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.content)) return data.content
  return []
}

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function lookupKeys(value: string) {
  const normalized = normalizeName(value)
  const compact = normalized.replace(/[^a-z0-9]/g, '')
  return compact && compact !== normalized ? [normalized, compact] : [normalized]
}

function buildInventoryProductMap(products: InventoryProduct[]) {
  const map = new Map<string, InventoryProduct>()
  for (const product of products) {
    for (const key of lookupKeys(product.name)) {
      map.set(key, product)
    }
  }
  return map
}

function findMatchingInventoryProduct(name: string, productMap: Map<string, InventoryProduct>) {
  return lookupKeys(name).map((key) => productMap.get(key)).find(Boolean)
}

function findMatchingSupplier(name: string, suppliers: Supplier[]) {
  if (!name.trim()) return undefined
  const keys = lookupKeys(name)
  return suppliers.find((supplier) => lookupKeys(supplier.name).some((key) => keys.includes(key)))
}

function resolveSupplierName(name: string, suppliers: Supplier[]) {
  const trimmed = name.trim()
  if (!trimmed) return ''
  return findMatchingSupplier(trimmed, suppliers)?.name ?? trimmed
}

function normalizeSalePaymentMethod(paymentMethod: string) {
  return ['CASH', 'CARD', 'DIGITAL', 'DUE'].includes(paymentMethod) ? paymentMethod : 'CASH'
}

async function readErrorMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => null) as
    | { error?: string; details?: Record<string, string> }
    | null

  if (body?.details) {
    const detail = Object.values(body.details)[0]
    if (detail) return detail
  }

  if (body?.error) return body.error
  return `Request failed with status ${res.status}`
}
