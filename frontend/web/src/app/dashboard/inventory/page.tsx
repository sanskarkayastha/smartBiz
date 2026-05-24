import { requireSession, apiFetch } from '@/src/lib/session'
import InventoryClient from './InventoryClient'

type Product = {
  id: number
  name: string
  sku: string | null
  category: string | null
  price: number
  quantity: number
  reorderLevel: number | null
  supplier: string | null
}

const PAGE_SIZE = 15

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await requireSession()
  const { page: pageParam } = await searchParams
  const page = Math.max(0, parseInt(pageParam ?? '0', 10) || 0)

  const data = await apiFetch<{ content: Product[]; totalPages: number; totalElements: number }>(
    `/inventory/products?page=${page}&size=${PAGE_SIZE}`,
    session
  )

  return (
    <InventoryClient
      initialProducts={data?.content ?? []}
      currentPage={page}
      totalPages={data?.totalPages ?? 1}
      totalElements={data?.totalElements ?? 0}
      pageSize={PAGE_SIZE}
    />
  )
}
