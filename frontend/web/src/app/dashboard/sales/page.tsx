import { requireSession, apiFetch } from '@/src/lib/session'
import AddSaleModal from '@/src/components/AddSaleModal'

type SaleItem = { productName: string; quantity: number; unitPrice: number }
type Sale = {
  id: number
  totalAmount: number
  paymentMethod: string
  status: string
  saleDate: string
  items: SaleItem[]
}
type Product = { id: number; name: string; price: number; quantity: number }

const PAYMENT_LABELS: Record<string, string> = { CASH: 'Cash', CARD: 'Card', DIGITAL: 'Digital', DUE: 'Due' }

export default async function SalesPage() {
  const session = await requireSession()
  const [sales, productsData] = await Promise.all([
    apiFetch<Sale[]>('/sales', session),
    apiFetch<{ content: Product[] }>('/inventory/products?page=0&size=1000', session),
  ])

  const inStockProducts = (productsData?.content ?? []).filter((p) => p.quantity > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
          <p className="text-sm text-gray-500 mt-1">{sales?.length ?? 0} transactions</p>
        </div>
        <AddSaleModal products={inStockProducts} />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {sales && sales.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s, i) => (
                <tr key={s.id} className={`border-b border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                  <td className="px-5 py-3 text-gray-400 font-mono text-xs">#{s.id}</td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-800">
                      {new Date(s.saleDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(s.saleDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-gray-700">{s.items?.[0]?.productName ?? '—'}</p>
                    {s.items?.length > 1 && <p className="text-xs text-gray-400">+{s.items.length - 1} more</p>}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      s.paymentMethod === 'DUE'
                        ? 'bg-red-50 text-red-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {PAYMENT_LABELS[s.paymentMethod] ?? s.paymentMethod}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-900">
                    NPR {Number(s.totalAmount).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3">
              <line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="16"/>
            </svg>
            <p className="text-sm font-medium">No sales recorded yet</p>
            <p className="text-xs mt-1">Click &quot;New Sale&quot; to record your first transaction</p>
          </div>
        )}
      </div>
    </div>
  )
}
