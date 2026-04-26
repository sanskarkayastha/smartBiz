import { getSession } from '@/app/lib/session'
import { fetchProducts } from '@/app/lib/api'
import { Product } from '@/types'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) return null

  let products: Product[] = []
  try {
    products = await fetchProducts(session.token, session.userId)
  } catch {
    products = []
  }

  const totalValue = products.reduce((sum, p) => sum + p.price * p.quantity, 0)
  const lowStockCount = products.filter(p => p.lowStock).length
  const recentProducts = products.slice(0, 5)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Welcome back, {session.fullName} 👋</h2>
        <p className="text-gray-500 text-sm mt-1">Here&apos;s what&apos;s happening with your business today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard label="Total Products" value={products.length} icon="📦" color="indigo" />
        <StatCard label="Low Stock Alerts" value={lowStockCount} icon="⚠️" color={lowStockCount > 0 ? 'red' : 'green'} />
        <StatCard label="Inventory Value" value={`NPR ${totalValue.toLocaleString()}`} icon="💰" color="emerald" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Recent Products</h3>
          <Link href="/dashboard/inventory" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
            View all →
          </Link>
        </div>
        {recentProducts.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400">
            <p>No products yet.</p>
            <Link href="/dashboard/inventory" className="mt-2 inline-block text-indigo-600 text-sm hover:underline">
              Add your first product
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentProducts.map((p) => (
              <div key={p.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.category || 'Uncategorised'}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">NPR {p.price}</span>
                  <span className="text-sm text-gray-600">Qty: {p.quantity}</span>
                  {p.lowStock && (
                    <span className="text-xs bg-red-100 text-red-600 font-medium px-2 py-0.5 rounded-full">Low Stock</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 border-indigo-200',
    red: 'bg-red-50 border-red-200',
    green: 'bg-green-50 border-green-200',
    emerald: 'bg-emerald-50 border-emerald-200',
  }
  return (
    <div className={`rounded-xl border p-6 ${colors[color] || colors.indigo}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  )
}
