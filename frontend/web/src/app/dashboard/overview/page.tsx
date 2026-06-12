import { requireSession, apiFetch } from '@/src/lib/session'
import AiInsightCard from '@/src/components/AiInsightCard'

type SaleSummary = { totalRevenue: number; orderCount: number; avgOrderValue: number }
type Product = { id: number; name: string; category: string | null; quantity: number; reorderLevel: number | null }
type DailyRevenue = { date: string; revenue: number }
type Customer = { id: number; name: string; phone: string | null; dueAmount: number }

function formatCurrency(value: number) {
  return `NPR ${Math.round(value).toLocaleString()}`
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'NPR',
    maximumFractionDigits: 0,
    notation: value >= 100000 ? 'compact' : 'standard',
  }).format(Math.round(value))
}

function shortDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
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
  const dueTotal = dueItems.reduce((sum, customer) => sum + Number(customer.dueAmount), 0)
  const pressureTotal = Math.max(weeklyTotal + dueTotal + lowStockItems.length * 3000, 1)
  const revenueShare = clamp((weeklyTotal / pressureTotal) * 100, 18, 72)
  const dueShare = clamp((dueTotal / pressureTotal) * 100, dueTotal > 0 ? 12 : 0, 18)
  const inventoryShare = Math.max(100 - revenueShare - dueShare, 10)
  const bestDay = weeklyData.reduce<DailyRevenue | null>((best, day) => {
    if (!best || day.revenue > best.revenue) return day
    return best
  }, null)

  return (
    <div className="space-y-3">
      <section className="grid gap-3 2xl:grid-cols-[minmax(0,1.12fr)_minmax(340px,0.92fr)]">
        <article className="rounded-[26px] border border-paper-3 bg-white/90 p-5 shadow-[0_12px_30px_rgba(31,42,62,0.04)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-3">Earning overview</p>
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-paper-3 text-[11px] font-semibold text-ink-3">i</span>
              </div>
              <h2
                className="mt-4 text-[2.3rem] font-extrabold tracking-[-0.05em] text-ink sm:text-[2.8rem]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {formatCurrency(summary?.totalRevenue ?? 0)}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <StatusPill
                label={summary?.orderCount ? `${summary.orderCount} orders today` : 'No sales yet'}
                tone={summary && summary.orderCount > 0 ? 'good' : 'warn'}
              />
              <div className="rounded-2xl border border-paper-3 bg-paper px-4 py-2 text-sm font-semibold text-ink">
                This week
              </div>
            </div>
          </div>

          {weeklyData.length > 0 ? (
            <>
              <div className="mt-5 rounded-[22px] border border-paper-3 bg-[linear-gradient(180deg,rgba(247,248,252,0.92),rgba(255,255,255,0.96))] px-4 py-4">
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {weeklyData.map((day, index) => {
                    const height = Math.max((day.revenue / maxRevenue) * 100, 18)
                    const active = bestDay?.date === day.date

                    return (
                      <div key={day.date} className="flex min-w-[132px] flex-1 flex-col justify-end gap-2.5">
                        <div className="rounded-[16px] border border-paper-3 bg-white/90 px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">
                            {shortDate(day.date)}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-ink">{formatCompactCurrency(day.revenue)}</p>
                        </div>
                        <div className="relative flex h-40 items-end overflow-hidden rounded-[20px] border border-paper-3 bg-[linear-gradient(180deg,rgba(109,156,255,0.05),rgba(109,156,255,0.00))] px-3 pb-3">
                          <div className="absolute inset-x-3 top-1/4 border-t border-dashed border-paper-3" />
                          <div className="absolute inset-x-3 top-2/4 border-t border-dashed border-paper-3" />
                          <div className="absolute inset-x-3 top-3/4 border-t border-dashed border-paper-3" />
                          <div
                            className={`relative w-full rounded-[16px] ${
                              active
                                ? 'bg-[linear-gradient(180deg,rgba(109,156,255,0.96),rgba(54,99,235,0.98))] shadow-[0_10px_18px_rgba(72,110,255,0.16)]'
                                : 'bg-[linear-gradient(180deg,rgba(109,156,255,0.30),rgba(109,156,255,0.72))]'
                            }`}
                            style={{ height: `${height}%` }}
                          />
                          {index === weeklyData.length - 1 ? (
                            <div className="absolute right-3 top-3 rounded-full border border-paper-3 bg-white/92 px-3 py-1 text-[11px] font-semibold text-ink">
                              Peak: {bestDay ? formatCompactCurrency(bestDay.revenue) : formatCompactCurrency(day.revenue)}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[18px] bg-paper px-4 py-3.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-3">Weekly total</p>
                  <p className="mt-2 text-xl font-bold tracking-[-0.03em] text-ink">{formatCurrency(weeklyTotal)}</p>
                </div>
                <div className="rounded-[18px] bg-paper px-4 py-3.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-3">Average ticket</p>
                  <p className="mt-2 text-xl font-bold tracking-[-0.03em] text-ink">{formatCurrency(summary?.avgOrderValue ?? 0)}</p>
                </div>
                <div className="rounded-[18px] bg-paper px-4 py-3.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-3">Best day</p>
                  <p className="mt-2 text-xl font-bold tracking-[-0.03em] text-ink">
                    {bestDay ? shortDate(bestDay.date) : 'No data'}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-6 rounded-[26px] border border-dashed border-paper-3 bg-paper/80 px-5 py-12 text-center">
              <p className="text-sm font-semibold text-ink">No weekly sales data yet</p>
              <p className="mt-2 text-sm text-ink-2">Record a few sales and the dashboard will start building your revenue rhythm.</p>
            </div>
          )}
        </article>

        <article className="rounded-[26px] border border-paper-3 bg-white/90 p-5 shadow-[0_12px_30px_rgba(31,42,62,0.04)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-3">Operational overview</p>
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-paper-3 text-[11px] font-semibold text-ink-3">i</span>
              </div>
              <h2
                className="mt-4 text-[2.1rem] font-extrabold tracking-[-0.05em] text-ink sm:text-[2.5rem]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {formatCurrency(dueTotal)}
              </h2>
              <p className="mt-2 text-sm text-ink-2">Outstanding customer due currently on the books.</p>
            </div>
            <div className="rounded-2xl border border-paper-3 bg-paper px-4 py-2 text-sm font-semibold text-ink">
              This week
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              {
                label: 'Low stock',
                value: lowStockItems.length,
                note: lowStockItems.length > 0 ? `${lowStockItems[0]?.name ?? 'Review shelves'} first` : 'No urgent items',
                tone: 'bg-rose/15',
              },
              {
                label: 'Due customers',
                value: dueItems.length,
                note: dueItems.length > 0 ? `${dueItems[0]?.name ?? 'Follow-up needed'} is waiting` : 'No due follow-up',
                tone: 'bg-amber/20',
              },
              {
                label: 'Orders today',
                value: summary?.orderCount ?? 0,
                note: summary?.orderCount ? 'Transactions are being recorded' : 'No orders recorded yet',
                tone: 'bg-mint/16',
              },
            ].map((item) => (
              <div key={item.label} className={`rounded-[18px] ${item.tone} px-4 py-3.5`}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-3">{item.label}</p>
                <p className="mt-3 text-3xl font-bold tracking-[-0.04em] text-ink">{item.value}</p>
                <p className="mt-2 text-sm leading-6 text-ink-2">{item.note}</p>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <div className="flex flex-wrap items-center gap-5">
              <div className="flex items-center gap-2 text-sm text-ink">
                <span className="h-3 w-3 rounded-full bg-brand" />
                <span>Revenue flow</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-ink">
                <span className="h-3 w-3 rounded-full bg-amber" />
                <span>Receivables</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-ink">
                <span className="h-3 w-3 rounded-full bg-paper-3" />
                <span>Inventory pressure</span>
              </div>
            </div>
            <div className="mt-4 flex h-12 overflow-hidden rounded-[16px] border border-paper-3 bg-paper">
              <div className="h-full bg-brand" style={{ width: `${revenueShare}%` }} />
              <div className="h-full bg-amber" style={{ width: `${dueShare}%` }} />
              <div className="h-full bg-paper-3" style={{ width: `${inventoryShare}%` }} />
            </div>
            <p className="mt-3 text-sm leading-6 text-ink-2">
              This breakdown keeps the dashboard feeling active even before deeper reporting lands, while still grounding the layout in live business numbers.
            </p>
          </div>
        </article>
      </section>

      <section className="grid gap-3 2xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.82fr)]">
        <article className="rounded-[26px] border border-paper-3 bg-white/90 p-5 shadow-[0_12px_30px_rgba(31,42,62,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-3">Cash flow</p>
              <h3
                className="mt-2 text-[2.1rem] font-extrabold tracking-[-0.05em] text-ink"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {formatCurrency(weeklyTotal)}
              </h3>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-paper p-1">
              <span className="rounded-full bg-night px-4 py-1.5 text-xs font-semibold text-snow">Income</span>
              <span className="px-3 py-1.5 text-xs font-semibold text-ink-2">Exposure</span>
              <span className="px-3 py-1.5 text-xs font-semibold text-ink-2">Savings</span>
            </div>
          </div>

          <div className="mt-6 rounded-[22px] border border-paper-3 bg-[linear-gradient(180deg,rgba(250,250,252,0.92),rgba(255,255,255,0.96))] px-4 py-5">
            <div className="flex h-56 items-end gap-3">
              {(weeklyData.length > 0 ? weeklyData : Array.from({ length: 7 }, (_, index) => ({ date: `2026-01-0${index + 1}`, revenue: 0 }))).map((day, index) => {
                const height = weeklyData.length > 0 ? Math.max((day.revenue / maxRevenue) * 100, 12) : 18 + (index % 3) * 8
                const active = bestDay?.date === day.date || (!weeklyData.length && index === 4)

                return (
                  <div key={`${day.date}-${index}`} className="flex flex-1 flex-col items-center gap-3">
                    <div className="relative flex h-full w-full items-end justify-center">
                      <div className="absolute inset-x-0 top-1/4 border-t border-dashed border-paper-3" />
                      <div className="absolute inset-x-0 top-2/4 border-t border-dashed border-paper-3" />
                      <div className="absolute inset-x-0 top-3/4 border-t border-dashed border-paper-3" />
                      <div
                        className={`w-full rounded-[18px] ${
                          active
                            ? 'bg-[linear-gradient(180deg,rgba(255,183,94,0.98),rgba(54,99,235,0.96))] shadow-[0_10px_20px_rgba(255,183,94,0.18)]'
                            : 'bg-[linear-gradient(180deg,rgba(236,239,244,0.98),rgba(221,226,236,0.98))]'
                        }`}
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">
                        {weeklyData.length > 0 ? new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' }) : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-ink">
                        {weeklyData.length > 0 ? formatCompactCurrency(day.revenue) : 'Waiting'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </article>

        <div className="space-y-4">
          <AiInsightCard />

          <article className="rounded-[26px] border border-paper-3 bg-white/90 p-5 shadow-[0_12px_30px_rgba(31,42,62,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-3">Priority queue</p>
                <h3 className="mt-2 text-xl font-bold tracking-[-0.03em] text-ink">Upcoming actions</h3>
              </div>
              <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-[16px] border border-paper-3 bg-paper text-lg font-semibold text-ink transition duration-200 hover:border-brand/30 hover:bg-white hover:text-brand">
                +
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              {lowStockItems.slice(0, 2).map((product) => (
                <div key={`stock-${product.id}`} className="rounded-[18px] border border-paper-3 bg-paper/80 px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-brand-soft text-brand">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{product.name}</p>
                        <p className="mt-1 text-sm text-ink-2">{product.category ?? 'Uncategorized'}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-rose/16 px-3 py-1 text-xs font-semibold text-ink">{product.quantity} left</span>
                  </div>
                </div>
              ))}

              {dueItems.slice(0, 2).map((customer) => (
                <div key={`due-${customer.id}`} className="rounded-[18px] border border-paper-3 bg-paper/80 px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-amber/20 text-ink">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 1v22" />
                          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{customer.name}</p>
                        <p className="mt-1 text-sm text-ink-2">{customer.phone ?? 'No phone number saved'}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-amber/20 px-3 py-1 text-xs font-semibold text-ink">{formatCurrency(Number(customer.dueAmount))}</span>
                  </div>
                </div>
              ))}

              {lowStockItems.length === 0 && dueItems.length === 0 ? (
                <div className="rounded-[18px] border border-dashed border-paper-3 bg-paper/80 px-4 py-6 text-center">
                  <p className="text-sm font-semibold text-ink">No urgent tasks right now.</p>
                  <p className="mt-2 text-sm text-ink-2">The queue will fill itself when inventory or receivables need attention.</p>
                </div>
              ) : null}
            </div>
          </article>
        </div>
      </section>
    </div>
  )
}
