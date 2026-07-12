import { requireSession, apiFetch } from '@/src/lib/session'
import CustomersClient from './CustomersClient'

const PAGE_SIZE = 15

type Customer = {
  id: number
  name: string
  phone: string | null
  email: string | null
  address?: string | null
  totalPurchases: number
  dueAmount?: number
  lastPurchaseDate: string | null
}

type SaleItem = { productName: string; quantity: number; unitPrice: number }
type Sale = {
  id: number
  customerId: number | null
  customerName: string | null
  totalAmount: number
  paymentMethod: string
  status: string
  saleDate: string
  items: SaleItem[]
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; hasDue?: string }>
}) {
  const session = await requireSession()
  const params = await searchParams
  const page = Math.max(0, parseInt(params.page ?? '0', 10) || 0)
  const search = params.search ?? ''
  const hasDue = params.hasDue === 'true'

  const qs = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) })
  if (search) qs.set('search', search)
  if (hasDue) qs.set('hasDue', 'true')

  const [customersData, sales] = await Promise.all([
    apiFetch<{ content: Customer[]; totalPages: number; totalElements: number }>(
      `/customers?${qs.toString()}`,
      session
    ),
    apiFetch<Sale[]>('/sales', session),
  ])

  const customers = customersData?.content ?? []
  const totalPages = customersData?.totalPages ?? 1
  const totalElements = customersData?.totalElements ?? 0

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">Customers</h1>
        <p className="mt-1 text-sm text-ink-2">{totalElements} customers</p>
      </div>

      <CustomersClient
        customers={customers}
        sales={sales ?? []}
        currentPage={page}
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={PAGE_SIZE}
        initialSearch={search}
        initialHasDue={hasDue}
      />
    </div>
  )
}
