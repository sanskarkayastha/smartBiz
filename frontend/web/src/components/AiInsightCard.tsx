'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AiInsightCard({ initialInsight }: { initialInsight: string | null }) {
  const router = useRouter()
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const ask = async () => {
    const q = question.trim()
    if (!q || loading) return
    setLoading(true)
    setAnswer(null)
    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })
      const data = await res.json()
      setAnswer(data.response ?? 'No response.')
      router.refresh()
    } catch {
      setAnswer('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        <span className="text-sm font-semibold text-blue-700">AI Insight</span>
      </div>

      {initialInsight && (
        <p className="text-sm text-gray-800 mb-4 leading-relaxed">{initialInsight}</p>
      )}

      {answer && (
        <div className="bg-white border border-blue-100 rounded-lg p-3 mb-4">
          <p className="text-sm text-gray-800 leading-relaxed">{answer}</p>
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask()}
          placeholder="Ask about your business..."
          className="flex-1 text-sm border border-blue-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400"
        />
        <button
          onClick={ask}
          disabled={!question.trim() || loading}
          className="px-4 py-2 bg-[#135BEC] text-white text-sm font-medium rounded-lg disabled:opacity-40 hover:bg-blue-700 transition-colors"
        >
          {loading ? '...' : 'Ask'}
        </button>
      </div>
    </div>
  )
}
