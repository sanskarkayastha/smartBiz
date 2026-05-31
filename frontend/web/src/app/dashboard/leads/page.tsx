import { requireSession, apiFetch } from '@/src/lib/session'
import LeadsClient from './LeadsClient'

const PAGE_SIZE = 15

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

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; stage?: string; source?: string; overdueOnly?: string }>
}) {
  const session = await requireSession()
  const params = await searchParams
  const page = Math.max(0, parseInt(params.page ?? '0', 10) || 0)
  const search = params.search ?? ''
  const stage = params.stage ?? ''
  const source = params.source ?? ''
  const overdueOnly = params.overdueOnly === 'true'

  const qs = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) })
  if (search) qs.set('search', search)
  if (stage) qs.set('stage', stage)
  if (source) qs.set('source', source)
  if (overdueOnly) qs.set('overdueOnly', 'true')

  const data = await apiFetch<{ content: Lead[]; totalPages: number; totalElements: number }>(
    `/leads?${qs.toString()}`,
    session
  )
  const leads = data?.content ?? []
  const totalPages = data?.totalPages ?? 1
  const totalElements = data?.totalElements ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <p className="text-sm text-gray-500 mt-1">{totalElements} leads in pipeline</p>
      </div>

      <LeadsClient
        leads={leads}
        currentPage={page}
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={PAGE_SIZE}
        initialSearch={search}
        initialStage={stage}
        initialSource={source}
        initialOverdueOnly={overdueOnly}
      />
    </div>
  )
}
