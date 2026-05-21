import { requireSession, apiFetch } from '@/src/lib/session'
import CustomersClient from './CustomersClient'

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

export default async function CustomersPage() {
  const session = await requireSession()
  const [customers, sales] = await Promise.all([
    apiFetch<Customer[]>('/customers', session),
    apiFetch<Sale[]>('/sales', session),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <p className="text-sm text-gray-500 mt-1">{customers?.length ?? 0} customers</p>
      </div>

      <CustomersClient customers={customers ?? []} sales={sales ?? []} />
    </div>
  )
}
