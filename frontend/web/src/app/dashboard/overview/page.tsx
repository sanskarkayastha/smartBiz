import { requireSession, apiFetch } from '@/src/lib/session'
import AiInsightCard from '@/src/components/AiInsightCard'

type SaleSummary = { totalRevenue: number; orderCount: number; avgOrderValue: number }
type Product = { id: number; name: string; category: string | null; quantity: number; reorderLevel: number | null }
type DailyRevenue = { date: string; revenue: number }
type Customer = { id: number; name: string; phone: string | null; dueAmount: number }
type SaleItem = { productName: string; quantity: number; unitPrice: number }
type Sale = {
  id: number
  totalAmount: number
  paymentMethod: string
  status: string
  saleDate: string
  customerName?: string | null
  items: SaleItem[]
}

function formatCurrency(value: number) {
  return `NPR ${Math.round(value || 0).toLocaleString()}`
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'NPR',
    maximumFractionDigits: 0,
    notation: value >= 100000 ? 'compact' : 'standard',
  }).format(Math.round(value || 0))
}

function shortDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function dayLabel(date: string) {
  return new Date(date).toLocaleDateString(undefined, { weekday: 'short' })
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function chartPoints(data: DailyRevenue[], maxRevenue: number) {
  if (!data.length) return ''
  return data
    .map((day, index) => {
      const x = data.length === 1 ? 50 : (index / (data.length - 1)) * 100
      const y = 92 - clamp((day.revenue / maxRevenue) * 68, 8, 68)
      return `${x},${y}`
    })
    .join(' ')
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] bg-paper px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">{label}</p>
      <p className="mt-2 text-lg font-bold text-ink">{value}</p>
    </div>
  )
}

export default async function OverviewPage() {
  const session = await requireSession()

  const [summary, lowStock, weekly, dueCustomers, sales] = await Promise.all([
    apiFetch<SaleSummary>('/sales/analytics/today', session),
    apiFetch<Product[]>('/inventory/products/low-stock', session),
    apiFetch<DailyRevenue[]>('/sales/analytics/weekly', session),
    apiFetch<Customer[]>('/customers/with-due', session).catch(() => null),
    apiFetch<Sale[]>('/sales', session).catch(() => null),
  ])

  const weeklyData = weekly ?? []
  const lowStockItems = lowStock ?? []
  const dueItems = dueCustomers ?? []
  const recentSales = (sales ?? []).slice(0, 4)
  const maxRevenue = Math.max(...weeklyData.map((day) => day.revenue), 1)
  const weeklyTotal = weeklyData.reduce((sum, day) => sum + day.revenue, 0)
  const dueTotal = dueItems.reduce((sum, customer) => sum + Number(customer.dueAmount), 0)
  const bestDay = weeklyData.reduce<DailyRevenue | null>((best, day) => {
    if (!best || day.revenue > best.revenue) return day
    return best
  }, null)
  const pressureTotal = Math.max(weeklyTotal + dueTotal + lowStockItems.length * 3000, 1)
  const revenueShare = clamp((weeklyTotal / pressureTotal) * 100, 18, 70)
  const dueShare = clamp((dueTotal / pressureTotal) * 100, dueTotal > 0 ? 12 : 0, 32)
  const stockShare = Math.max(100 - revenueShare - dueShare, 8)
  const points = chartPoints(weeklyData, maxRevenue)
  const areaPoints = points ? `0,96 ${points} 100,96` : ''

  const upcomingActions = [
    ...lowStockItems.slice(0, 3).map((product) => ({
      id: `stock-${product.id}`,
      icon: 'S',
      title: product.name,
      subtitle: `${product.category ?? 'Uncategorized'} stock needs review`,
      amount: `${product.quantity} left`,
      tone: 'bg-brand-soft text-brand',
    })),
    ...dueItems.slice(0, 3).map((customer) => ({
      id: `due-${customer.id}`,
      icon: 'D',
      title: customer.name,
      subtitle: customer.phone ?? 'Customer due follow-up',
      amount: formatCurrency(Number(customer.dueAmount)),
      tone: 'bg-amber/20 text-ink',
    })),
  ].slice(0, 5)

  return (
    <div className="space-y-5">
      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
        <article className="rounded-[24px] border border-paper-3 bg-white p-6 shadow-[0_12px_30px_rgba(30,30,30,0.035)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-base font-semibold text-ink">Earning Overview</p>
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-paper-3 text-[11px] font-semibold text-ink-3">i</span>
              </div>
              <h2 className="mt-4 text-[2.35rem] font-bold leading-none text-ink sm:text-[2.8rem]">
                {formatCurrency(summary?.totalRevenue ?? 0)}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-mint/16 px-3 py-1.5 text-xs font-semibold text-ink">
                {summary?.orderCount ? `${summary.orderCount} orders` : 'No sales yet'}
              </span>
              <span className="rounded-[12px] border border-paper-3 bg-white px-4 py-2 text-sm font-semibold text-ink">
                This Week
              </span>
            </div>
          </div>

          <div className="mt-6">
            <div className="relative h-56 overflow-hidden rounded-[20px] bg-white">
              <div className="absolute inset-x-0 top-6 border-t border-dashed border-paper-3" />
              <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-paper-3" />
              <div className="absolute inset-x-0 bottom-10 border-t border-dashed border-paper-3" />
              {points ? (
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                  <defs>
                    <linearGradient id="earningFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.69 0.205 41)" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="oklch(0.69 0.205 41)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <polygon points={areaPoints} fill="url(#earningFill)" />
                  <polyline points={points} fill="none" stroke="oklch(0.69 0.205 41)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : null}
              {bestDay ? (
                <div className="absolute right-4 top-4 rounded-[14px] border border-paper-3 bg-white px-4 py-2 text-sm shadow-[0_8px_18px_rgba(30,30,30,0.06)]">
                  <span className="text-ink-2">{shortDate(bestDay.date)}: </span>
                  <span className="font-bold text-ink">{formatCompactCurrency(bestDay.revenue)}</span>
                </div>
              ) : null}
              <div className="absolute inset-x-0 bottom-0 grid grid-cols-7 gap-2 text-xs font-medium text-ink-2">
                {(weeklyData.length ? weeklyData : Array.from({ length: 7 }, (_, index) => ({ date: `2026-01-${String(index + 1).padStart(2, '0')}`, revenue: 0 }))).map((day, index) => (
                  <div key={`${day.date}-${index}`} className="text-center">
                    {weeklyData.length ? dayLabel(day.date) : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-[24px] border border-paper-3 bg-white p-6 shadow-[0_12px_30px_rgba(30,30,30,0.035)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-base font-semibold text-ink">Business Overview</p>
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-paper-3 text-[11px] font-semibold text-ink-3">i</span>
              </div>
              <h2 className="mt-4 text-[2.35rem] font-bold leading-none text-ink sm:text-[2.8rem]">
                {formatCurrency(dueTotal)}
              </h2>
            </div>
            <span className="rounded-[12px] border border-paper-3 bg-white px-4 py-2 text-sm font-semibold text-ink">
              This Month
            </span>
          </div>

          <div className="mt-8">
            <p className="text-sm font-semibold text-ink">Workload Breakdown</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="flex items-start gap-2">
                <span className="mt-1 h-3 w-3 rounded-full bg-brand" />
                <div>
                  <p className="text-sm font-semibold text-ink">Revenue</p>
                  <p className="mt-1 text-sm text-ink-2">{formatCurrency(weeklyTotal)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-1 h-3 w-3 rounded-full bg-amber" />
                <div>
                  <p className="text-sm font-semibold text-ink">Customer Due</p>
                  <p className="mt-1 text-sm text-ink-2">{formatCurrency(dueTotal)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-1 h-3 w-3 rounded-full bg-paper-3" />
                <div>
                  <p className="text-sm font-semibold text-ink">Low Stock</p>
                  <p className="mt-1 text-sm text-ink-2">{lowStockItems.length} items</p>
                </div>
              </div>
            </div>
            <div className="mt-5 flex h-12 overflow-hidden rounded-[4px] bg-paper">
              <div className="h-full bg-brand" style={{ width: `${revenueShare}%` }} />
              <div className="h-full bg-amber" style={{ width: `${dueShare}%` }} />
              <div className="h-full bg-paper-3" style={{ width: `${stockShare}%` }} />
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.7fr)]">
        <div className="space-y-5">
          <article className="rounded-[24px] border border-paper-3 bg-white p-6 shadow-[0_12px_30px_rgba(30,30,30,0.035)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold text-ink">Cash Flow</p>
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-paper-3 text-[11px] font-semibold text-ink-3">i</span>
                </div>
                <h3 className="mt-4 text-[2.25rem] font-bold leading-none text-ink">
                  {formatCurrency(weeklyTotal)}
                </h3>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-paper p-1">
                <span className="rounded-full bg-night px-4 py-2 text-xs font-semibold text-snow">Income</span>
                <span className="px-4 py-2 text-xs font-semibold text-ink-2">Due</span>
                <span className="px-4 py-2 text-xs font-semibold text-ink-2">Stock</span>
              </div>
            </div>

            <div className="mt-6">
              <div className="relative flex h-64 items-end gap-3 overflow-hidden">
                <div className="absolute inset-x-0 top-8 border-t border-dashed border-paper-3" />
                <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-paper-3" />
                <div className="absolute inset-x-0 bottom-12 border-t border-dashed border-paper-3" />
                {(weeklyData.length ? weeklyData : Array.from({ length: 7 }, (_, index) => ({ date: `2026-01-${String(index + 1).padStart(2, '0')}`, revenue: 0 }))).map((day, index) => {
                  const active = bestDay?.date === day.date || (!weeklyData.length && index === 4)
                  const height = weeklyData.length ? clamp((day.revenue / maxRevenue) * 100, 14, 90) : 22 + (index % 3) * 10

                  return (
                    <div key={`${day.date}-${index}`} className="relative z-10 flex flex-1 flex-col items-center gap-3">
                      <div className="flex h-52 w-full items-end justify-center">
                        <div
                          className={`w-full max-w-[52px] rounded-t-[16px] ${
                            active
                              ? 'bg-[linear-gradient(180deg,var(--color-brand),oklch(0.86_0.15_76))] shadow-[0_12px_20px_rgba(249,115,22,0.18)]'
                              : 'bg-[linear-gradient(180deg,oklch(0.92_0.006_80),oklch(0.86_0.008_80))]'
                          }`}
                          style={{ height: `${height}%` }}
                        />
                      </div>
                      <p className={`text-xs font-semibold ${active ? 'text-ink' : 'text-ink-3'}`}>
                        {weeklyData.length ? dayLabel(day.date) : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MetricChip label="Weekly total" value={formatCurrency(weeklyTotal)} />
              <MetricChip label="Avg ticket" value={formatCurrency(summary?.avgOrderValue ?? 0)} />
              <MetricChip label="Best day" value={bestDay ? shortDate(bestDay.date) : 'No data'} />
            </div>
          </article>

          <article className="overflow-hidden rounded-[24px] border border-paper-3 bg-white shadow-[0_12px_30px_rgba(30,30,30,0.035)]">
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
              <h3 className="text-base font-semibold text-ink">Recent Transaction</h3>
              <button type="button" className="inline-flex items-center gap-2 rounded-[12px] bg-paper px-4 py-2 text-sm font-semibold text-ink">
                Filter
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 6h16M7 12h10M10 18h4" />
                </svg>
              </button>
            </div>
            <div className="overflow-x-auto px-6 pb-5">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="rounded-[12px] bg-paper text-left text-xs font-semibold text-ink-3">
                    <th className="rounded-l-[12px] px-4 py-3">Activity</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Total Amount</th>
                    <th className="rounded-r-[12px] px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.length ? recentSales.map((sale) => (
                    <tr key={sale.id} className="border-b border-paper-3 last:border-b-0">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-brand-soft text-xs font-bold text-brand">
                            S
                          </span>
                          <div>
                            <p className="font-semibold text-ink">{sale.items?.[0]?.productName ?? 'Sale recorded'}</p>
                            <p className="mt-1 text-xs text-ink-2">{sale.customerName?.trim() || 'Walk-in customer'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 font-medium text-ink-2">
                        {new Date(sale.saleDate).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-4 font-bold text-ink">+{formatCurrency(Number(sale.totalAmount))}</td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-mint/16 px-3 py-1.5 text-xs font-semibold text-ink">
                          {sale.status || sale.paymentMethod}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-ink-2">
                        No recent sales yet. Record a sale to fill this table.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </div>

        <aside className="space-y-5">
          <article className="rounded-[24px] border border-paper-3 bg-white p-5 shadow-[0_12px_30px_rgba(30,30,30,0.035)]">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-ink">Upcoming Work</h3>
              <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] border border-paper-3 bg-white text-xl leading-none text-ink">
                +
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {upcomingActions.length ? upcomingActions.map((item) => (
                <div key={item.id} className="rounded-[16px] border border-paper-3 bg-white px-4 py-3.5 shadow-[0_5px_14px_rgba(30,30,30,0.03)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`flex h-11 w-11 items-center justify-center rounded-[14px] text-sm font-bold ${item.tone}`}>
                        {item.icon}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{item.title}</p>
                        <p className="mt-1 truncate text-xs text-ink-2">{item.subtitle}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink">{item.amount}</span>
                  </div>
                </div>
              )) : (
                <div className="rounded-[16px] border border-dashed border-paper-3 bg-paper px-4 py-8 text-center">
                  <p className="text-sm font-semibold text-ink">No urgent work right now</p>
                  <p className="mt-2 text-sm text-ink-2">Low stock and due follow-ups will appear here.</p>
                </div>
              )}
            </div>
          </article>

          <AiInsightCard />
        </aside>
      </section>
    </div>
  )
}
