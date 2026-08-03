import { requireSession, apiFetch } from '@/src/lib/session'
import InventoryClient from './InventoryClient'

type Product = {
  id: number
  name: string
  sku: string | null
  category: string | null
  price: number
  costPrice: number | null
  quantity: number
  reorderLevel: number | null
  supplier: string | null
  imageUrl: string | null
}

const PAGE_SIZE = 15

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; category?: string; stockStatus?: string }>
}) {
  const session = await requireSession()
  const params = await searchParams
  const page = Math.max(0, parseInt(params.page ?? '0', 10) || 0)
  const search = params.search ?? ''
  const category = params.category ?? ''
  const stockStatus = params.stockStatus ?? ''

  const qs = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) })
  if (search) qs.set('search', search)
  if (category) qs.set('category', category)
  if (stockStatus) qs.set('stockStatus', stockStatus)

  const data = await apiFetch<{ content: Product[]; totalPages: number; totalElements: number }>(
    `/inventory/products?${qs.toString()}`,
    session
  )

  return (
    <InventoryClient
      key={`${page}:${search}:${category}:${stockStatus}:${data?.totalElements ?? 0}`}
      initialProducts={data?.content ?? []}
      currentPage={page}
      totalPages={data?.totalPages ?? 1}
      totalElements={data?.totalElements ?? 0}
      pageSize={PAGE_SIZE}
      initialSearch={search}
      initialCategory={category}
      initialStockStatus={stockStatus}
    />
  )
}
