'use client'

import { useState, useRef, useEffect } from 'react'

type Message = { role: 'user' | 'ai'; content: string }
type ParsedProduct = { name: string; quantity: number; rate: number }
type ReviewProduct = ParsedProduct & { id?: number; isNew: boolean }

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
  const [scanLoading, setScanLoading] = useState(false)
  const [reviewProducts, setReviewProducts] = useState<ReviewProduct[] | null>(null)
  const [savingProducts, setSavingProducts] = useState(false)
  const [existingProducts, setExistingProducts] = useState<{ id: number; name: string; quantity: number }[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim()
    if (!text || loading) return
    setInput('')

    const userMsg: Message = { role: 'user', content: text }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setLoading(true)

    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updated.map((m) => ({ role: m.role === 'ai' ? 'model' : 'user', text: m.content })),
        }),
      })
      const data = await res.json()
      setMessages((prev) => [...prev, { role: 'ai', content: data.response ?? 'No response received.' }])
    } catch {
      setMessages((prev) => [...prev, { role: 'ai', content: 'Something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setScanLoading(true)
    try {
      // Load existing products for match detection
      const productsRes = await fetch('/api/products')
      const products = await productsRes.json().catch(() => [])
      setExistingProducts(products)

      const base64 = await fileToBase64(file)
      const res = await fetch('/api/ai/scan-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mimeType: file.type }),
      })
      const data = await res.json()
      const parsed: ParsedProduct[] = data.products ?? []

      if (parsed.length === 0) {
        alert('No products could be detected in this image.')
        return
      }

      const reviewed: ReviewProduct[] = parsed.map((p) => {
        const match = products.find(
          (ex: { id: number; name: string }) => ex.name.toLowerCase() === p.name.toLowerCase()
        )
        return { name: p.name, quantity: p.quantity, unitPrice: p.rate, id: match?.id, isNew: !match }
      })
      setReviewProducts(reviewed)
    } catch {
      alert('Failed to scan invoice. Please try again.')
    } finally {
      setScanLoading(false)
    }
  }

  async function saveScannedProducts() {
    if (!reviewProducts) return
    setSavingProducts(true)
    let saved = 0
    try {
      for (const p of reviewProducts) {
        if (p.isNew) {
          await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: p.name, quantity: p.quantity, price: p.unitPrice, costPrice: p.unitPrice }),
          })
        } else if (p.id) {
          await fetch(`/api/products/${p.id}/stock`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantityChange: p.quantity, type: 'RESTOCK', reason: 'Invoice scan' }),
          })
        }
        saved++
      }
      setReviewProducts(null)
      setMessages((prev) => [
        ...prev,
        { role: 'ai', content: `Invoice processed: ${saved} product${saved !== 1 ? 's' : ''} updated in inventory.` },
      ])
    } catch {
      alert('Some products failed to save. Please check your inventory.')
    } finally {
      setSavingProducts(false)
    }
  }

  function updateReviewProduct(idx: number, field: keyof ParsedProduct, value: string) {
    setReviewProducts((prev) => {
      if (!prev) return prev
      const copy = [...prev]
      copy[idx] = { ...copy[idx], [field]: field === 'name' ? value : Number(value) }
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

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="shrink-0 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-[#135BEC]" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-none">AI Assistant</h1>
            <p className="text-xs text-gray-400 mt-0.5">Powered by Gemini</p>
          </div>
        </div>

        {/* Quick prompts */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => send(p)}
              disabled={loading}
              className="whitespace-nowrap px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full hover:bg-blue-100 disabled:opacity-50 transition-colors shrink-0"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Chat thread */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center">
            <svg className="w-10 h-10 mb-3 text-blue-200" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <p className="text-sm font-medium text-gray-500">Ask anything about your business</p>
            <p className="text-xs mt-1">Use quick prompts above or type your own question</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'ai' && (
              <div className="w-6 h-6 rounded-full bg-[#135BEC]/10 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                <svg className="w-3.5 h-3.5 text-[#135BEC]" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                msg.role === 'user'
                  ? 'bg-[#135BEC] text-white rounded-br-sm'
                  : 'bg-white border border-gray-100 shadow-sm text-gray-800 rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-6 h-6 rounded-full bg-[#135BEC]/10 flex items-center justify-center shrink-0 mr-2 mt-0.5">
              <svg className="w-3.5 h-3.5 text-[#135BEC]" fill="currentColor" viewBox="0 0 20 20">
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
        <div ref={bottomRef} />
      </div>

      {/* Invoice Review Panel */}
      {reviewProducts && (
        <div className="shrink-0 border-t border-gray-100 bg-amber-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-amber-800">Review Scanned Products ({reviewProducts.length})</p>
            <button onClick={() => setReviewProducts(null)} className="text-gray-400 hover:text-gray-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
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
                  type="number"
                  value={p.quantity}
                  onChange={(e) => updateReviewProduct(idx, 'quantity', e.target.value)}
                  className="w-14 text-sm text-center border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <span className="text-xs text-gray-400">qty</span>
                <input
                  type="number"
                  value={p.unitPrice}
                  onChange={(e) => updateReviewProduct(idx, 'unitPrice', e.target.value)}
                  className="w-20 text-sm text-center border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <span className="text-xs text-gray-400">NPR</span>
                <button onClick={() => removeReviewProduct(idx)} className="text-gray-400 hover:text-red-500 shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setReviewProducts(null)} className="flex-1 py-2 border border-amber-200 rounded-lg text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors">
              Cancel
            </button>
            <button
              onClick={saveScannedProducts}
              disabled={savingProducts}
              className="flex-1 py-2 bg-[#135BEC] text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {savingProducts ? 'Saving…' : 'Save to Inventory'}
            </button>
          </div>
        </div>
      )}

      {/* Input Row */}
      <div className="shrink-0 pt-3 border-t border-gray-100">
        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={scanLoading}
            title="Upload invoice/receipt image"
            className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 shrink-0"
          >
            {scanLoading ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-[#135BEC] rounded-full animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
              </svg>
            )}
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
            }}
            placeholder="Ask about your business…"
            rows={1}
            className="flex-1 resize-none px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#135BEC] placeholder-gray-400 max-h-32 overflow-y-auto"
            style={{ lineHeight: '1.4' }}
          />

          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="p-2.5 bg-[#135BEC] text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 px-1">Upload a bill/receipt image to auto-update inventory · Enter to send</p>
      </div>
    </div>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const result = reader.result as string
      // Strip the data:image/...;base64, prefix
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
  })
}
