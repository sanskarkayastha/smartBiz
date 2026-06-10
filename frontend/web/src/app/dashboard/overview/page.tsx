import { requireSession, apiFetch } from '@/src/lib/session'
import AiInsightCard from '@/src/components/AiInsightCard'

type SaleSummary = { totalRevenue: number; orderCount: number; avgOrderValue: number }
type Product = { id: number; name: string; category: string | null; quantity: number; reorderLevel: number | null }
type DailyRevenue = { date: string; revenue: number }
type Customer = { id: number; name: string; phone: string | null; dueAmount: number }

function formatCurrency(value: number) {
  return `NPR ${Math.round(value).toLocaleString()}`
}

function StatusPill({ label, tone }: { label: string; tone: 'good' | 'warn' | 'alert' }) {
  const toneClass =
    tone === 'good'
      ? 'bg-mint/18 text-ink'
      : tone === 'warn'
      ? 'bg-amber/22 text-ink'
      : 'bg-rose/18 text-ink'

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneClass}`}>
      {label}
    </span>
  )
}

export default async function OverviewPage() {
  const session = await requireSession()

  const [summary, lowStock, weekly, dueCustomers] = await Promise.all([
    apiFetch<SaleSummary>('/sales/analytics/today', session),
    apiFetch<Product[]>('/inventory/products/low-stock', session),
    apiFetch<DailyRevenue[]>('/sales/analytics/weekly', session),
    apiFetch<Customer[]>('/customers/with-due', session).catch(() => null),
  ])

  const weeklyData = weekly ?? []
  const lowStockItems = lowStock ?? []
  const dueItems = dueCustomers ?? []
  const maxRevenue = Math.max(...weeklyData.map((day) => day.revenue), 1)
  const weeklyTotal = weeklyData.reduce((sum, day) => sum + day.revenue, 0)

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)]">
        <div className="relative overflow-hidden rounded-[34px] bg-night px-6 py-6 text-snow shadow-[0_26px_80px_rgba(24,33,52,0.34)] sm:px-7 sm:py-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(109,156,255,0.24),_transparent_18rem),radial-gradient(circle_at_bottom_left,_rgba(132,214,181,0.12),_transparent_22rem)]" />
          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-snow-2">Today&apos;s trading pulse</p>
                <h2
                  className="mt-3 text-[2.4rem] font-extrabold tracking-[-0.05em] text-snow sm:text-[3rem]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {formatCurrency(summary?.totalRevenue ?? 0)}
                </h2>
              </div>
              <StatusPill
                label={lowStockItems.length > 0 ? `${lowStockItems.length} stock alerts open` : 'Stock is stable'}
                tone={lowStockItems.length > 0 ? 'warn' : 'good'}
              />
            </div>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-snow-2">
              Revenue, order flow, and customer due are visible here so the next action is obvious without digging through tables.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-white/7 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-snow-2">Orders</p>
                <p className="mt-3 text-2xl font-bold tracking-[-0.03em]">{summary?.orderCount ?? 0}</p>
                <p className="mt-2 text-xs text-snow-2">Completed transactions today</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/7 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-snow-2">Average ticket</p>
                <p className="mt-3 text-2xl font-bold tracking-[-0.03em]">{formatCurrency(summary?.avgOrderValue ?? 0)}</p>
                <p className="mt-2 text-xs text-snow-2">Per sale across the day</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/7 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-snow-2">Customer due</p>
                <p className="mt-3 text-2xl font-bold tracking-[-0.03em]">{dueItems.length}</p>
                <p className="mt-2 text-xs text-snow-2">Accounts needing attention</p>
              </div>
            </div>
          </div>
        </div>

        <AiInsightCard />
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="rounded-[30px] border border-paper-3 bg-white/84 p-6 shadow-[0_18px_60px_rgba(31,42,62,0.08)]">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-3">7-day movement</p>
              <h3
                className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-ink"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Weekly revenue
              </h3>
            </div>
            <div className="rounded-full bg-paper px-4 py-2 text-xs font-semibold text-ink">
              {formatCurrency(weeklyTotal)}
            </div>
          </div>

          {weeklyData.length > 0 ? (
            <>
              <div className="mt-8 flex h-56 items-end gap-3">
                {weeklyData.map((day) => {
                  const height = Math.max((day.revenue / maxRevenue) * 100, 10)
                  return (
                    <div key={day.date} className="flex flex-1 flex-col items-center gap-3">
                      <div className="flex h-full w-full items-end">
                        <div
                          className="w-full rounded-t-[18px] bg-[linear-gradient(180deg,rgba(109,156,255,0.86),rgba(54,99,235,0.96))]"
                          style={{ height: `${height}%` }}
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">
                          {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-ink">{formatCurrency(day.revenue)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="mt-5 text-sm leading-6 text-ink-2">
                Use the shape of the week, not just the total. Peaks show rush windows, and flat days usually point to stock or footfall problems.
              </p>
            </>
          ) : (
            <div className="mt-8 rounded-[24px] border border-dashed border-paper-3 bg-paper/70 px-5 py-10 text-center">
              <p className="text-sm font-semibold text-ink">No weekly sales data yet</p>
              <p className="mt-2 text-sm text-ink-2">Record a few sales and SmartBiz will start drawing the rhythm for you.</p>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <section className="rounded-[30px] border border-paper-3 bg-white/84 p-6 shadow-[0_18px_60px_rgba(31,42,62,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-3">Shelf watch</p>
                <h3 className="mt-2 text-xl font-bold tracking-[-0.03em] text-ink">Low stock alerts</h3>
              </div>
              <StatusPill
                label={lowStockItems.length > 0 ? `${lowStockItems.length} open` : 'Healthy'}
                tone={lowStockItems.length > 0 ? 'alert' : 'good'}
              />
            </div>

            {lowStockItems.length > 0 ? (
              <div className="mt-5 space-y-3">
                {lowStockItems.slice(0, 5).map((product) => (
                  <div key={product.id} className="flex items-center justify-between gap-4 rounded-[22px] bg-paper/90 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{product.name}</p>
                      <p className="mt-1 text-xs text-ink-2">
                        {product.category ?? 'Uncategorized'} {product.reorderLevel ? `, reorder at ${product.reorderLevel}` : ''}
                      </p>
                    </div>
                    <span className="rounded-full bg-rose/18 px-3 py-1 text-xs font-semibold text-ink">
                      {product.quantity} left
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-[22px] bg-paper/80 px-4 py-5">
                <p className="text-sm font-semibold text-ink">Nothing urgent here.</p>
                <p className="mt-1 text-sm text-ink-2">Current product quantities are above their reorder levels.</p>
              </div>
            )}
          </section>

          <section className="rounded-[30px] border border-paper-3 bg-white/84 p-6 shadow-[0_18px_60px_rgba(31,42,62,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-3">Receivables</p>
                <h3 className="mt-2 text-xl font-bold tracking-[-0.03em] text-ink">Customers with due</h3>
              </div>
              <StatusPill
                label={dueItems.length > 0 ? `${dueItems.length} to follow up` : 'Clear'}
                tone={dueItems.length > 0 ? 'warn' : 'good'}
              />
            </div>

            {dueItems.length > 0 ? (
              <div className="mt-5 space-y-3">
                {dueItems.slice(0, 5).map((customer) => (
                  <div key={customer.id} className="flex items-center justify-between gap-4 rounded-[22px] bg-paper/90 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{customer.name}</p>
                      <p className="mt-1 text-xs text-ink-2">{customer.phone ?? 'No phone number saved'}</p>
                    </div>
                    <span className="rounded-full bg-amber/24 px-3 py-1 text-xs font-semibold text-ink">
                      {formatCurrency(Number(customer.dueAmount))}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-[22px] bg-paper/80 px-4 py-5">
                <p className="text-sm font-semibold text-ink">No outstanding customer due.</p>
                <p className="mt-1 text-sm text-ink-2">That gives you a cleaner view of cash moving through the business.</p>
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  )
}
