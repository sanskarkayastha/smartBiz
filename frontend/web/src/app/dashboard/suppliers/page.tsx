import { requireSession, apiFetch } from '@/src/lib/session'
import SuppliersClient from './SuppliersClient'

const PAGE_SIZE = 15

type Supplier = {
  id: number
  name: string
  phone: string | null
  email: string | null
  balanceOwed: number
  notes: string | null
  createdAt: string
}

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; hasBalance?: string }>
}) {
  const session = await requireSession()
  const params = await searchParams
  const page = Math.max(0, parseInt(params.page ?? '0', 10) || 0)
  const search = params.search ?? ''
  const hasBalance = params.hasBalance === 'true'

  const qs = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) })
  if (search) qs.set('search', search)
  if (hasBalance) qs.set('hasBalance', 'true')

  const data = await apiFetch<{ content: Supplier[]; totalPages: number; totalElements: number }>(
    `/inventory/suppliers?${qs.toString()}`,
    session
  )
  const suppliers = data?.content ?? []
  const totalPages = data?.totalPages ?? 1
  const totalElements = data?.totalElements ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
        <p className="text-sm text-gray-500 mt-1">{totalElements} suppliers</p>
      </div>

      <SuppliersClient
        suppliers={suppliers}
        currentPage={page}
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={PAGE_SIZE}
        initialSearch={search}
        initialHasBalance={hasBalance}
      />
    </div>
  )
}
