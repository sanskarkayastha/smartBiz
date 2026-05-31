'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import AddLeadModal from '@/src/components/AddLeadModal'
import Pagination from '@/src/components/Pagination'

type Lead = {
  id: number
  name: string
  phone: string | null
  email: string | null
  stage: string
  source: string | null
  estimatedValue: number | null
  notes: string | null
  followUpDate: string | null
  createdAt: string
}

const STAGES = ['NEW', 'CONTACTED', 'INTERESTED', 'PROPOSAL', 'WON', 'LOST']
const STAGE_ORDER = ['NEW', 'CONTACTED', 'INTERESTED', 'PROPOSAL', 'WON']

const STAGE_COLORS: Record<string, string> = {
  NEW: 'bg-gray-100 text-gray-700',
  CONTACTED: 'bg-blue-100 text-blue-700',
  INTERESTED: 'bg-amber-100 text-amber-700',
  PROPOSAL: 'bg-purple-100 text-purple-700',
  WON: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-700',
}

const SOURCE_OPTIONS = [
  { value: '', label: 'All Sources' },
  { value: 'WALK_IN', label: 'Walk-in' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'SOCIAL_MEDIA', label: 'Social Media' },
  { value: 'PHONE_CALL', label: 'Phone Call' },
  { value: 'ONLINE', label: 'Online' },
  { value: 'OTHER', label: 'Other' },
]

const SOURCE_LABELS: Record<string, string> = {
  WALK_IN: 'Walk-in', REFERRAL: 'Referral', SOCIAL_MEDIA: 'Social Media',
  PHONE_CALL: 'Phone Call', ONLINE: 'Online', OTHER: 'Other',
}

export default function LeadsClient({
  leads: initial,
  currentPage,
  totalPages,
  totalElements,
  pageSize,
  initialSearch = '',
  initialStage = '',
  initialSource = '',
  initialOverdueOnly = false,
}: {
  leads: Lead[]
  currentPage: number
  totalPages: number
  totalElements: number
  pageSize: number
  initialSearch?: string
  initialStage?: string
  initialSource?: string
  initialOverdueOnly?: boolean
}) {
  const router = useRouter()
  const [leads, setLeads] = useState(initial)
  const [search, setSearch] = useState(initialSearch)
  const [stage, setStage] = useState(initialStage)
  const [source, setSource] = useState(initialSource)
  const [overdueOnly, setOverdueOnly] = useState(initialOverdueOnly)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [convertingId, setConvertingId] = useState<number | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const today = new Date().toISOString().split('T')[0]

  function buildParams(s: string, st: string, src: string, oo: boolean, page = 0) {
    const sp = new URLSearchParams()
    if (s) sp.set('search', s)
    if (st) sp.set('stage', st)
    if (src) sp.set('source', src)
    if (oo) sp.set('overdueOnly', 'true')
    if (page > 0) sp.set('page', String(page))
    return sp.toString()
  }

  function pushUrl(s: string, st: string, src: string, oo: boolean) {
    const qs = buildParams(s, st, src, oo)
    router.push(`/dashboard/leads${qs ? `?${qs}` : ''}`)
  }

  function handleSearchChange(val: string) {
    setSearch(val)
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current)
    if (!val.trim()) {
      setSuggestions([])
      setShowSuggestions(false)
      pushUrl('', stage, source, overdueOnly)
      return
    }
    suggestTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/leads?search=${encodeURIComponent(val)}&page=0&size=5`)
        const data = await res.json()
        setSuggestions((data.content ?? []).map((l: { name: string }) => l.name))
        setShowSuggestions(true)
      } catch { /* ignore */ }
    }, 300)
  }

  function commitSearch(val: string) {
    setSearch(val)
    setSuggestions([])
    setShowSuggestions(false)
    pushUrl(val, stage, source, overdueOnly)
  }

  function handleStageClick(val: string) {
    const next = stage === val ? '' : val
    setStage(next)
    pushUrl(search, next, source, overdueOnly)
  }

  function handleSourceChange(val: string) {
    setSource(val)
    pushUrl(search, stage, val, overdueOnly)
  }

  function toggleOverdueOnly() {
    const next = !overdueOnly
    setOverdueOnly(next)
    pushUrl(search, stage, source, next)
  }

  const activeFilterCount = [search, stage, source, overdueOnly].filter(Boolean).length
  const extraParams: Record<string, string> = {}
  if (search) extraParams.search = search
  if (stage) extraParams.stage = stage
  if (source) extraParams.source = source
  if (overdueOnly) extraParams.overdueOnly = 'true'

  async function moveStage(lead: Lead, direction: 'forward' | 'back') {
    const idx = STAGE_ORDER.indexOf(lead.stage)
    const newStage = direction === 'forward' ? STAGE_ORDER[idx + 1] : STAGE_ORDER[idx - 1]
    if (!newStage) return
    setLoadingId(lead.id)
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      })
      if (res.ok) {
        const updated = await res.json()
        setLeads((prev) => prev.map((l) => (l.id === lead.id ? updated : l)))
      }
    } finally {
      setLoadingId(null)
    }
  }

  async function handleDelete(lead: Lead) {
    if (!confirm(`Delete lead "${lead.name}"? This cannot be undone.`)) return
    setLoadingId(lead.id)
    try {
      const res = await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' })
      if (res.ok || res.status === 204) {
        setLeads((prev) => prev.filter((l) => l.id !== lead.id))
        if (expandedId === lead.id) setExpandedId(null)
      } else {
        alert('Failed to delete lead.')
      }
    } finally {
      setLoadingId(null)
    }
  }

  async function handleConvert(lead: Lead) {
    if (!confirm(`Convert "${lead.name}" to a customer? The lead will be deleted.`)) return
    setConvertingId(lead.id)
    try {
      const res = await fetch(`/api/leads/${lead.id}/convert`, { method: 'POST' })
      if (res.ok) {
        setLeads((prev) => prev.filter((l) => l.id !== lead.id))
        if (expandedId === lead.id) setExpandedId(null)
        alert(`${lead.name} has been converted to a customer!`)
      } else {
        alert('Failed to convert lead.')
      }
    } finally {
      setConvertingId(null)
    }
  }

  function handleSaved() { window.location.reload() }

  return (
    <div className="space-y-5">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitSearch(search) }}
            onBlur={() => setShowSuggestions(false)}
            placeholder="Search by name, phone, or email…"
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#135BEC] bg-white"
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-10 top-full left-0 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
              {suggestions.map((name) => (
                <li key={name} onMouseDown={() => commitSearch(name)} className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-800">
                  {name}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Source dropdown */}
        <select
          value={source}
          onChange={(e) => handleSourceChange(e.target.value)}
          className={`px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#135BEC] bg-white ${source ? 'border-[#135BEC] text-[#135BEC] font-medium' : 'border-gray-200 text-gray-700'}`}
        >
          {SOURCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Overdue toggle */}
        <button
          onClick={toggleOverdueOnly}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border rounded-xl transition-colors ${
            overdueOnly
              ? 'bg-red-50 border-red-300 text-red-700'
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Overdue
          {overdueOnly && <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />}
        </button>

        <div className="ml-auto flex items-center gap-3">
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setSearch(''); setStage(''); setSource(''); setOverdueOnly(false)
                setSuggestions([]); setShowSuggestions(false)
                router.push('/dashboard/leads')
              }}
              className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Clear {activeFilterCount > 1 ? `(${activeFilterCount})` : ''}
            </button>
          )}
          <AddLeadModal onSaved={handleSaved} />
        </div>
      </div>

      {/* Stage Filter Tabs — now server-side */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[{ value: '', label: 'All' }, ...STAGES.map((s) => ({ value: s, label: s }))].map(({ value, label }) => {
          const active = stage === value
          const isActiveStage = active && value !== ''
          return (
            <button
              key={value}
              onClick={() => handleStageClick(value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                active
                  ? 'bg-[#135BEC] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
              {isActiveStage && (
                <span className="px-1.5 py-0.5 rounded-full text-xs bg-white/20 text-white">
                  {totalElements}
                </span>
              )}
              {value === '' && !stage && (
                <span className="px-1.5 py-0.5 rounded-full text-xs bg-white/20 text-white">
                  {totalElements}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Leads List */}
      {leads.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 text-gray-400">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
          <p className="text-sm font-medium">{activeFilterCount ? 'No leads match your filters' : 'No leads yet'}</p>
          {!activeFilterCount && <p className="text-xs mt-1">Click &quot;Add Lead&quot; to start tracking your pipeline</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {leads.map((lead) => {
            const expanded = expandedId === lead.id
            const stageIdx = STAGE_ORDER.indexOf(lead.stage)
            const canGoBack = stageIdx > 0
            const canGoForward = stageIdx >= 0 && stageIdx < STAGE_ORDER.length - 1
            const isOverdue = lead.followUpDate && lead.followUpDate < today
            const isLoading = loadingId === lead.id

            return (
              <div key={lead.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                  className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
                  onClick={() => setExpandedId(expanded ? null : lead.id)}
                >
                  <div className="w-9 h-9 rounded-full bg-[#135BEC]/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-[#135BEC]">{lead.name.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{lead.name}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STAGE_COLORS[lead.stage] ?? 'bg-gray-100 text-gray-600'}`}>
                        {lead.stage}
                      </span>
                      {isOverdue && (
                        <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                          ⚠ Overdue
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {[lead.phone, lead.email].filter(Boolean).join(' · ') || 'No contact info'}
                    </p>
                  </div>
                  {lead.estimatedValue != null && (
                    <span className="text-xs font-semibold text-gray-700 shrink-0">
                      NPR {Number(lead.estimatedValue).toLocaleString()}
                    </span>
                  )}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className={`shrink-0 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>

                {expanded && (
                  <div className="px-5 pb-5 border-t border-gray-50 pt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {lead.phone && (
                        <div>
                          <p className="text-xs text-gray-400 font-medium mb-0.5">Phone</p>
                          <p className="text-gray-800">{lead.phone}</p>
                        </div>
                      )}
                      {lead.email && (
                        <div>
                          <p className="text-xs text-gray-400 font-medium mb-0.5">Email</p>
                          <p className="text-gray-800 truncate">{lead.email}</p>
                        </div>
                      )}
                      {lead.source && (
                        <div>
                          <p className="text-xs text-gray-400 font-medium mb-0.5">Source</p>
                          <p className="text-gray-800">{SOURCE_LABELS[lead.source] ?? lead.source}</p>
                        </div>
                      )}
                      {lead.followUpDate && (
                        <div>
                          <p className="text-xs text-gray-400 font-medium mb-0.5">Follow-up</p>
                          <p className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-800'}>
                            {new Date(lead.followUpDate + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                            {isOverdue && ' (Overdue)'}
                          </p>
                        </div>
                      )}
                    </div>

                    {lead.notes && (
                      <div>
                        <p className="text-xs text-gray-400 font-medium mb-0.5">Notes</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{lead.notes}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-3 py-2 border-t border-gray-50">
                      <button
                        onClick={() => moveStage(lead, 'back')}
                        disabled={!canGoBack || isLoading || lead.stage === 'LOST'}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                        {stageIdx > 0 ? STAGE_ORDER[stageIdx - 1] : '—'}
                      </button>
                      <span className={`flex-1 text-center text-xs font-bold px-3 py-1.5 rounded-full ${STAGE_COLORS[lead.stage] ?? 'bg-gray-100 text-gray-600'}`}>
                        {isLoading ? '…' : lead.stage}
                      </span>
                      <button
                        onClick={() => moveStage(lead, 'forward')}
                        disabled={!canGoForward || isLoading || lead.stage === 'LOST'}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        {stageIdx >= 0 && stageIdx < STAGE_ORDER.length - 1 ? STAGE_ORDER[stageIdx + 1] : '—'}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <AddLeadModal lead={lead} onSaved={handleSaved} />
                      {lead.stage === 'WON' && (
                        <button
                          onClick={() => handleConvert(lead)}
                          disabled={convertingId === lead.id}
                          className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:opacity-60 transition-colors"
                        >
                          {convertingId === lead.id ? 'Converting…' : 'Convert to Customer'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(lead)}
                        disabled={isLoading}
                        className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-40 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <Pagination
            basePath="/dashboard/leads"
            currentPage={currentPage}
            totalPages={totalPages}
            totalElements={totalElements}
            pageSize={pageSize}
            extraParams={extraParams}
          />
        </div>
      )}
    </div>
  )
}
