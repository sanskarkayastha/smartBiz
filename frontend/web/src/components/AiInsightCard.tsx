'use client'

import { useState } from 'react'

const PROMPTS = [
  'What needs restocking first?',
  'Summarize today in plain language.',
  'Which customers should I follow up with?',
]

export default function AiInsightCard() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const ask = async (preset?: string) => {
    const nextQuestion = (preset ?? question).trim()
    if (!nextQuestion || loading) return

    setLoading(true)
    setAnswer(null)

    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', text: nextQuestion }] }),
      })
      const data = await res.json()
      setAnswer(data.response ?? 'No response.')
      setQuestion(preset ? '' : '')
    } catch {
      setAnswer('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-[30px] border border-paper-3 bg-[linear-gradient(180deg,rgba(235,241,255,0.92),rgba(255,255,255,0.96))] p-6 shadow-[0_18px_50px_rgba(48,69,112,0.08)]">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-night text-white shadow-[0_12px_30px_rgba(33,45,70,0.22)]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 0 0 .951-.69l1.07-3.292z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-3">AI business assistant</p>
            <span className="rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold text-ink-2">
              Gemini-powered
            </span>
          </div>
          <h2
            className="mt-3 text-2xl font-extrabold tracking-[-0.04em] text-ink"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Ask for a sharper read on the business.
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-ink-2">
            Use plain language. SmartBiz will pull today&apos;s sales, weekly movement, low stock, and due customers into the answer.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => ask(prompt)}
            disabled={loading}
            className="rounded-full border border-paper-3 bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-[24px] border border-white/80 bg-white/88 p-4">
        {answer ? (
          <p className="whitespace-pre-line text-sm leading-7 text-ink">{answer}</p>
        ) : loading ? (
          <div className="space-y-2.5 py-1">
            <div className="h-3 rounded-full bg-paper-2" />
            <div className="h-3 w-[92%] rounded-full bg-paper-2" />
            <div className="h-3 w-[76%] rounded-full bg-paper-2" />
          </div>
        ) : (
          <p className="text-sm leading-6 text-ink-2">
            Start with something simple like: what is weak today, what should I restock, or who needs follow-up first?
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask()}
          placeholder="Ask about stock, sales, due customers, or momentum"
          className="min-w-0 flex-1 rounded-2xl border border-paper-3 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-3 focus:border-brand"
        />
        <button
          onClick={() => ask()}
          disabled={!question.trim() || loading}
          className="inline-flex items-center justify-center rounded-2xl bg-night px-5 py-3 text-sm font-semibold text-snow transition hover:bg-night-2 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {loading ? 'Thinking...' : 'Ask SmartBiz AI'}
        </button>
      </div>
    </section>
  )
}
