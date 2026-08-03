'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

export type AnalyticsMetric = 'revenue' | 'orders' | 'items'
export type AnalyticsPeriod = 'today' | '7d' | '30d' | '90d' | 'custom'

type Props = {
  metric: AnalyticsMetric
  period: AnalyticsPeriod
  customFrom: string
  customTo: string
  today: string
}

const METRICS: Array<{ value: AnalyticsMetric; label: string }> = [
  { value: 'revenue', label: 'Revenue' },
  { value: 'orders', label: 'Orders' },
  { value: 'items', label: 'Items sold' },
]

const PERIODS: Array<{ value: AnalyticsPeriod; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'custom', label: 'Custom' },
]

function inclusiveDays(from: string, to: string) {
  const start = Date.parse(`${from}T00:00:00Z`)
  const end = Date.parse(`${to}T00:00:00Z`)
  return Math.floor((end - start) / 86_400_000) + 1
}

export default function AnalyticsControls({ metric, period, customFrom, customTo, today }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [from, setFrom] = useState(customFrom)
  const [to, setTo] = useState(customTo)
  const [error, setError] = useState('')

  function navigate(update: (params: URLSearchParams) => void) {
    const params = new URLSearchParams({ metric, period })
    if (period === 'custom') {
      params.set('from', customFrom)
      params.set('to', customTo)
    }
    update(params)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  function chooseMetric(nextMetric: AnalyticsMetric) {
    navigate((params) => params.set('metric', nextMetric))
  }

  function choosePeriod(nextPeriod: AnalyticsPeriod) {
    setError('')
    navigate((params) => {
      params.set('period', nextPeriod)
      if (nextPeriod === 'custom') {
        params.set('from', from)
        params.set('to', to)
      } else {
        params.delete('from')
        params.delete('to')
      }
    })
  }

  function applyCustomRange() {
    setError('')
    if (!from || !to) {
      setError('Choose both a start and end date.')
      return
    }
    if (from > to) {
      setError('The start date must be before the end date.')
      return
    }
    if (to > today) {
      setError('The end date cannot be in the future.')
      return
    }
    if (inclusiveDays(from, to) > 366) {
      setError('Choose a range of 366 days or less.')
      return
    }

    navigate((params) => {
      params.set('period', 'custom')
      params.set('from', from)
      params.set('to', to)
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-[14px] bg-paper p-1" aria-label="Chart metric">
          {METRICS.map((option) => {
            const active = metric === option.value
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => chooseMetric(option.value)}
                className={`min-h-11 shrink-0 rounded-[11px] px-4 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-night/30 ${
                  active ? 'bg-night text-snow' : 'text-ink-2 hover:bg-white hover:text-ink'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>

        <div className="flex max-w-full gap-1 overflow-x-auto" aria-label="Chart date range">
          {PERIODS.map((option) => {
            const active = period === option.value
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => choosePeriod(option.value)}
                className={`min-h-11 shrink-0 rounded-[11px] border px-3.5 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-night/30 ${
                  active
                    ? 'border-night bg-night text-snow'
                    : 'border-paper-3 bg-white text-ink-2 hover:bg-paper hover:text-ink'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {period === 'custom' ? (
        <div className="rounded-[16px] border border-paper-3 bg-paper/55 p-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-ink">From</span>
              <input
                type="date"
                value={from}
                max={today}
                onChange={(event) => setFrom(event.target.value)}
                className="h-11 w-full rounded-[12px] border border-paper-3 bg-white px-3 text-sm text-ink outline-none focus:border-night focus:ring-2 focus:ring-night/15"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-ink">To</span>
              <input
                type="date"
                value={to}
                max={today}
                onChange={(event) => setTo(event.target.value)}
                className="h-11 w-full rounded-[12px] border border-paper-3 bg-white px-3 text-sm text-ink outline-none focus:border-night focus:ring-2 focus:ring-night/15"
              />
            </label>
            <button
              type="button"
              onClick={applyCustomRange}
              className="inline-flex h-11 items-center justify-center rounded-[12px] bg-night px-5 text-sm font-semibold text-snow outline-none transition hover:bg-night-2 focus-visible:ring-2 focus-visible:ring-night/30"
            >
              Apply range
            </button>
          </div>
          {error ? <p className="mt-3 text-sm font-medium text-rose" role="alert">{error}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
