import { requireSession, apiFetch } from '@/src/lib/session'
import AiInsightCard from '@/src/components/AiInsightCard'

type SaleSummary = { totalRevenue: number; orderCount: number; avgOrderValue: number }
type Product = { id: number; name: string; category: string | null; quantity: number; reorderLevel: number | null }
type DailyRevenue = { date: string; revenue: number }
type Customer = { id: number; name: string; phone: string | null; dueAmount: number }

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default async function OverviewPage() {
  const session = await requireSession()

  const [summary, lowStock, weekly, aiData, dueCustomers] = await Promise.all([
    apiFetch<SaleSummary>('/sales/analytics/today', session),
    apiFetch<Product[]>('/inventory/products/low-stock', session),
    apiFetch<DailyRevenue[]>('/sales/analytics/weekly', session),
    apiFetch<{ insight: string }>('/ai/insights', session).catch(() => null),
    apiFetch<Customer[]>('/customers/with-due', session).catch(() => null),
  ])

  const maxRevenue = Math.max(...(weekly ?? []).map((d) => d.revenue), 1)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Today&apos;s snapshot of your business</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Revenue Today"
          value={`NPR ${(summary?.totalRevenue ?? 0).toLocaleString()}`}
          sub="All completed sales"
        />
        <StatCard
          label="Orders Today"
          value={String(summary?.orderCount ?? 0)}
          sub="Completed transactions"
        />
        <StatCard
          label="Avg. Order Value"
          value={`NPR ${Math.round(summary?.avgOrderValue ?? 0).toLocaleString()}`}
          sub="Per transaction"
        />
      </div>

      <AiInsightCard initialInsight={aiData?.insight ?? null} />

      <div className="grid grid-cols-2 gap-6">
        {/* Weekly Chart */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Weekly Revenue</h2>
          {weekly && weekly.length > 0 ? (
            <div className="flex items-end gap-2 h-28">
              {weekly.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-[#135BEC] opacity-80 min-h-[4px]"
                    style={{ height: `${Math.max((d.revenue / maxRevenue) * 80, 4)}px` }}
                  />
                  <span className="text-[10px] text-gray-400">
                    {new Date(d.date).toLocaleDateString(undefined, { weekday: 'narrow' })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 pt-8 text-center">No sales data yet</p>
          )}
        </div>

        {/* Low Stock */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            Low Stock Alerts
            {lowStock && lowStock.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-red-50 text-red-600 text-xs rounded-md font-medium">
                {lowStock.length}
              </span>
            )}
          </h2>
          {lowStock && lowStock.length > 0 ? (
            <div className="space-y-2">
              {lowStock.slice(0, 6).map((p) => (
                <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{p.name}</p>
                    {p.category && <p className="text-xs text-gray-400">{p.category}</p>}
                  </div>
                  <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                    {p.quantity} left
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 pt-4 text-center">All stock levels are healthy</p>
          )}
        </div>
      </div>

      {/* Customers with Due */}
      {dueCustomers && dueCustomers.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              Customers with Due
              <span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-xs rounded-md font-medium">
                {dueCustomers.length}
              </span>
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {dueCustomers.slice(0, 6).map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{c.name}</p>
                  {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                </div>
                <span className="text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                  NPR {Number(c.dueAmount).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
