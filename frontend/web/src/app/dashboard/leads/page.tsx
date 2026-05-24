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
  searchParams: Promise<{ page?: string }>
}) {
  const session = await requireSession()
  const { page: pageParam } = await searchParams
  const page = Math.max(0, parseInt(pageParam ?? '0', 10) || 0)

  const data = await apiFetch<{ content: Lead[]; totalPages: number; totalElements: number }>(
    `/leads?page=${page}&size=${PAGE_SIZE}`,
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
      />
    </div>
  )
}
