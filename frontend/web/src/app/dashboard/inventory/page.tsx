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

export default async function InventoryPage() {
  const session = await requireSession()
  const products = await apiFetch<Product[]>('/inventory/products', session)

  return <InventoryClient initialProducts={products ?? []} />
}
