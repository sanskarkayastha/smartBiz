import { getSession } from '@/app/lib/session'
import { fetchProducts } from '@/app/lib/api'
import { Product } from '@/types'
import ProductTable from './ProductTable'

export default async function InventoryPage() {
  const session = await getSession()
  if (!session) return null

  let products: Product[] = []
  try {
    products = await fetchProducts(session.token, session.userId)
  } catch {
    products = []
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Inventory</h2>
        <p className="text-gray-500 text-sm mt-1">{products.length} product{products.length !== 1 ? 's' : ''} in stock</p>
      </div>
      <ProductTable products={products} />
    </div>
  )
}
