'use client'

import { useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

type FilterMode = 'all' | 'exact' | 'range'

type Props = {
  initialDate: string
  initialDateFrom: string
  initialDateTo: string
}

function buildMode(date: string, dateFrom: string, dateTo: string): FilterMode {
  if (date) return 'exact'
  if (dateFrom || dateTo) return 'range'
  return 'all'
}

export default function SalesFilters({ initialDate, initialDateFrom, initialDateTo }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<FilterMode>(() => buildMode(initialDate, initialDateFrom, initialDateTo))
  const [exactDate, setExactDate] = useState(initialDate)
  const [dateFrom, setDateFrom] = useState(initialDateFrom)
  const [dateTo, setDateTo] = useState(initialDateTo)
  const [error, setError] = useState('')

  const summary = useMemo(() => {
    if (mode === 'exact' && exactDate) return `Showing sales for ${exactDate}`
    if (mode === 'range' && dateFrom && dateTo) return `Showing sales from ${dateFrom} to ${dateTo}`
    if (mode === 'range' && dateFrom) return `Showing sales from ${dateFrom}`
    if (mode === 'range' && dateTo) return `Showing sales up to ${dateTo}`
    return 'Showing all recorded sales'
  }, [dateFrom, dateTo, exactDate, mode])

  function push(nextMode: FilterMode, nextDate: string, nextDateFrom: string, nextDateTo: string) {
    const params = new URLSearchParams(searchParams.toString())

    params.delete('date')
    params.delete('dateFrom')
    params.delete('dateTo')

    if (nextMode === 'exact' && nextDate) {
      params.set('date', nextDate)
    }

    if (nextMode === 'range') {
      if (nextDateFrom) params.set('dateFrom', nextDateFrom)
      if (nextDateTo) params.set('dateTo', nextDateTo)
    }

    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  function applyFilters() {
    setError('')

    if (mode === 'exact') {
      if (!exactDate) {
        setError('Choose a date to filter the sales list.')
        return
      }
      push(mode, exactDate, '', '')
      return
    }

    if (mode === 'range') {
      if (!dateFrom && !dateTo) {
        setError('Choose at least one date for the range filter.')
        return
      }
      if (dateFrom && dateTo && dateFrom > dateTo) {
        setError('The start date must be before the end date.')
        return
      }
      push(mode, '', dateFrom, dateTo)
      return
    }

    push('all', '', '', '')
  }

  function clearFilters() {
    setMode('all')
    setExactDate('')
    setDateFrom('')
    setDateTo('')
    setError('')
    push('all', '', '', '')
  }

  return (
    <section className="rounded-[28px] border border-paper-3 bg-white/84 p-5 shadow-[0_18px_50px_rgba(31,42,62,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-3">Sales filters</p>
          <p className="mt-2 text-sm text-ink-2">{summary}</p>
        </div>
        <button
          type="button"
          onClick={clearFilters}
          className="rounded-full border border-paper-3 bg-paper px-4 py-2 text-xs font-semibold text-ink transition hover:border-brand hover:text-brand"
        >
          Clear filters
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'All sales' },
          { id: 'exact', label: 'Exact date' },
          { id: 'range', label: 'Date range' },
        ].map((tab) => {
          const active = mode === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setMode(tab.id as FilterMode)
                setError('')
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                active ? 'bg-night text-snow' : 'border border-paper-3 bg-white text-ink hover:border-brand hover:text-brand'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {mode === 'exact' ? (
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-ink">Choose day</span>
            <input
              type="date"
              value={exactDate}
              onChange={(e) => setExactDate(e.target.value)}
              className="w-full rounded-2xl border border-paper-3 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
            />
          </label>
        ) : null}

        {mode === 'range' ? (
          <>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-ink">From date</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-2xl border border-paper-3 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-ink">To date</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-2xl border border-paper-3 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
              />
            </label>
          </>
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 rounded-2xl bg-rose/16 px-4 py-3 text-sm font-medium text-ink">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={applyFilters}
          className="inline-flex items-center justify-center rounded-2xl bg-night px-5 py-3 text-sm font-semibold text-snow transition hover:bg-night-2"
        >
          Apply filters
        </button>
      </div>
    </section>
  )
}
