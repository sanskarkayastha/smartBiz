import Link from 'next/link'
import { requireSession, apiFetch } from '@/src/lib/session'
import AiInsightCard from '@/src/components/AiInsightCard'
import AnalyticsControls, {
  type AnalyticsMetric,
  type AnalyticsPeriod,
} from '@/src/components/AnalyticsControls'

type AnalyticsBucket = 'HOUR' | 'DAY' | 'WEEK' | 'MONTH'
type TrendPoint = { periodStart: string; revenue: number; orders: number; itemsSold: number }
type SalesTrend = {
  from: string
  to: string
  bucket: AnalyticsBucket
  totals: { revenue: number; orders: number; itemsSold: number; averageOrderValue: number }
  points: TrendPoint[]
}
type Product = { id: number; name: string; category: string | null; quantity: number; reorderLevel: number | null }
type Customer = { id: number; name: string; phone: string | null; dueAmount: number }
type SupplierSummary = {
  totalSuppliers: number
  suppliersWithBalance: number
  totalBalanceOwed: number
  linkedProducts: number
  suppliersNeedingRestock: number
  lowStockProducts: number
  outOfStockProducts: number
}
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
type SearchParams = Promise<{ metric?: string; period?: string; from?: string; to?: string }>

const METRICS: AnalyticsMetric[] = ['revenue', 'orders', 'items']
const PERIODS: AnalyticsPeriod[] = ['today', '7d', '30d', '90d', 'custom']

function formatCurrency(value: number) {
  return `NPR ${Math.round(value || 0).toLocaleString()}`
}

function formatMetricValue(metric: AnalyticsMetric, value: number) {
  if (metric === 'revenue') return formatCurrency(value)
  return `${Math.round(value || 0).toLocaleString()} ${metric === 'orders' ? 'orders' : 'items'}`
}

function dateKeyInKathmandu() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kathmandu',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

function addDays(dateKey: string, amount: number) {
  const date = new Date(`${dateKey}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}

function inclusiveDays(from: string, to: string) {
  return Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1
}

function validDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

function resolveRange(rawPeriod: string | undefined, rawFrom: string, rawTo: string) {
  const today = dateKeyInKathmandu()
  const requestedPeriod = PERIODS.includes(rawPeriod as AnalyticsPeriod) ? rawPeriod as AnalyticsPeriod : '7d'

  if (
    requestedPeriod === 'custom' &&
    validDateKey(rawFrom) &&
    validDateKey(rawTo) &&
    rawFrom <= rawTo &&
    rawTo <= today &&
    inclusiveDays(rawFrom, rawTo) <= 366
  ) {
    const days = inclusiveDays(rawFrom, rawTo)
    const bucket: AnalyticsBucket = days <= 1 ? 'HOUR' : days <= 31 ? 'DAY' : days <= 180 ? 'WEEK' : 'MONTH'
    return { period: 'custom' as const, from: rawFrom, to: rawTo, bucket, today }
  }

  if (requestedPeriod === 'today') return { period: 'today' as const, from: today, to: today, bucket: 'HOUR' as const, today }
  if (requestedPeriod === '30d') return { period: '30d' as const, from: addDays(today, -29), to: today, bucket: 'DAY' as const, today }
  if (requestedPeriod === '90d') return { period: '90d' as const, from: addDays(today, -89), to: today, bucket: 'WEEK' as const, today }
  return { period: '7d' as const, from: addDays(today, -6), to: today, bucket: 'DAY' as const, today }
}

function displayDate(dateKey: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(new Date(`${dateKey}T00:00:00Z`))
}

function rangeLabel(period: AnalyticsPeriod, from: string, to: string) {
  if (period === 'today') return `Today, ${displayDate(to, { month: 'short', day: 'numeric' })}`
  return `${displayDate(from, { month: 'short', day: 'numeric' })} to ${displayDate(to, { month: 'short', day: 'numeric', year: 'numeric' })}`
}

function pointLabel(point: TrendPoint, bucket: AnalyticsBucket, pointCount: number) {
  const date = new Date(`${point.periodStart}Z`)
  if (bucket === 'HOUR') return new Intl.DateTimeFormat('en-US', { hour: 'numeric', timeZone: 'UTC' }).format(date)
  if (bucket === 'MONTH') return new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(date)
  if (bucket === 'WEEK') return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date)
  return new Intl.DateTimeFormat('en-US', pointCount <= 7
    ? { weekday: 'short', timeZone: 'UTC' }
    : { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date)
}

function pointFullLabel(point: TrendPoint, bucket: AnalyticsBucket) {
  const date = new Date(`${point.periodStart}Z`)
  if (bucket === 'HOUR') {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', timeZone: 'UTC',
    }).format(date)
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  }).format(date)
}

function showPointLabel(index: number, total: number) {
  if (total <= 7) return true
  const step = Math.ceil((total - 1) / 6)
  return index === 0 || index === total - 1 || index % step === 0
}

function metricPointValue(metric: AnalyticsMetric, point: TrendPoint) {
  if (metric === 'orders') return Number(point.orders)
  if (metric === 'items') return Number(point.itemsSold)
  return Number(point.revenue)
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[14px] bg-paper px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">{label}</p>
      <p className="mt-2 truncate text-lg font-bold text-ink">{value}</p>
    </div>
  )
}

function AttentionRow({ href, label, value, detail }: { href: string; label: string; value: string; detail: string }) {
  return (
    <Link
      href={href}
      className="group flex min-h-16 items-center justify-between gap-4 rounded-[15px] border border-paper-3 px-4 py-3 outline-none transition hover:bg-paper focus-visible:ring-2 focus-visible:ring-night/25"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink group-hover:text-brand">{label}</p>
        <p className="mt-1 truncate text-xs text-ink-2">{detail}</p>
      </div>
      <span className="shrink-0 text-sm font-bold text-ink">{value}</span>
    </Link>
  )
}

export default async function OverviewPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession()
  const params = await searchParams
  const metric = METRICS.includes(params.metric as AnalyticsMetric) ? params.metric as AnalyticsMetric : 'revenue'
  const resolved = resolveRange(params.period, params.from ?? '', params.to ?? '')
  const trendPath = `/sales/analytics/trend?from=${resolved.from}&to=${resolved.to}&bucket=${resolved.bucket}`

  const [trend, lowStock, dueCustomers, sales, supplierSummary] = await Promise.all([
    apiFetch<SalesTrend>(trendPath, session),
    apiFetch<Product[]>('/inventory/products/low-stock', session),
    apiFetch<Customer[]>('/customers/with-due', session),
    apiFetch<Sale[]>('/sales', session),
    apiFetch<SupplierSummary>('/inventory/suppliers/summary', session),
  ])

  const lowStockItems = lowStock ?? []
  const dueItems = dueCustomers ?? []
  const recentSales = (sales ?? []).slice(0, 4)
  const supplierBalance = Number(supplierSummary?.totalBalanceOwed ?? 0)
  const dueTotal = dueItems.reduce((sum, customer) => sum + Number(customer.dueAmount), 0)
  const stockAttention = lowStockItems.length
  const outOfStock = Number(supplierSummary?.outOfStockProducts ?? lowStockItems.filter((item) => item.quantity === 0).length)
  const points = trend?.points ?? []
  const values = points.map((point) => metricPointValue(metric, point))
  const maxValue = Math.max(...values, 0)
  const selectedTotal = metric === 'orders'
    ? Number(trend?.totals.orders ?? 0)
    : metric === 'items'
      ? Number(trend?.totals.itemsSold ?? 0)
      : Number(trend?.totals.revenue ?? 0)
  const metricTitle = metric === 'orders' ? 'Orders' : metric === 'items' ? 'Items sold' : 'Revenue'
  const chartWidth = 720
  const chartTop = 22
  const chartBaseline = 188
  const chartLeft = 28
  const chartRight = chartWidth - 28
  const chartCoordinates = points.map((point, index) => {
    const value = values[index]
    const x = points.length === 1
      ? chartWidth / 2
      : chartLeft + (index / Math.max(points.length - 1, 1)) * (chartRight - chartLeft)
    const y = maxValue > 0
      ? chartBaseline - (value / maxValue) * (chartBaseline - chartTop)
      : chartBaseline
    return { point, value, x, y }
  })
  const linePath = chartCoordinates.map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')
  const areaPath = chartCoordinates.length
    ? `M ${chartCoordinates[0].x} ${chartBaseline} ${chartCoordinates.map(({ x, y }) => `L ${x} ${y}`).join(' ')} L ${chartCoordinates.at(-1)?.x ?? chartRight} ${chartBaseline} Z`
    : ''

  const upcomingActions = [
    ...lowStockItems.slice(0, 3).map((product) => ({
      id: `stock-${product.id}`,
      href: `/dashboard/inventory?search=${encodeURIComponent(product.name)}`,
      icon: 'S',
      title: product.name,
      subtitle: `${product.category ?? 'Uncategorized'} stock needs review`,
      amount: `${product.quantity} left`,
      tone: 'bg-brand-soft text-brand',
    })),
    ...(supplierBalance > 0 ? [{
      id: 'supplier-balance',
      href: '/dashboard/suppliers',
      icon: 'P',
      title: 'Supplier payments',
      subtitle: `${supplierSummary?.suppliersWithBalance ?? 0} suppliers have balances`,
      amount: formatCurrency(supplierBalance),
      tone: 'bg-amber/20 text-ink',
    }] : []),
    ...dueItems.slice(0, 3).map((customer) => ({
      id: `due-${customer.id}`,
      href: `/dashboard/customers?search=${encodeURIComponent(customer.name)}`,
      icon: 'D',
      title: customer.name,
      subtitle: customer.phone ?? 'Customer due follow-up',
      amount: formatCurrency(Number(customer.dueAmount)),
      tone: 'bg-amber/20 text-ink',
    })),
  ].slice(0, 5)

  return (
    <div className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.7fr)]">
      <section className="space-y-4">
        <article className="min-w-0 rounded-[22px] border border-paper-3 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-ink">{metricTitle} trend</p>
              <h2 className="mt-3 text-[2rem] font-bold leading-none text-ink sm:text-[2.35rem]">
                {formatMetricValue(metric, selectedTotal)}
              </h2>
              <p className="mt-2 text-sm text-ink-2">{rangeLabel(resolved.period, resolved.from, resolved.to)}</p>
            </div>
          </div>

          <div className="mt-5">
            <AnalyticsControls
              key={`${resolved.period}:${resolved.from}:${resolved.to}`}
              metric={metric}
              period={resolved.period}
              customFrom={resolved.from}
              customTo={resolved.to}
              today={resolved.today}
            />
          </div>

          <div className="mt-5 overflow-hidden pb-2">
            {trend === null ? (
              <div className="flex min-h-64 items-center justify-center rounded-[18px] bg-paper px-5 text-center">
                <div>
                  <p className="font-semibold text-ink">Sales analytics are unavailable</p>
                  <p className="mt-2 text-sm text-ink-2">The rest of your dashboard is still ready to use.</p>
                </div>
              </div>
            ) : (
              <div className="w-full">
                <svg
                  viewBox={`0 0 ${chartWidth} 236`}
                  role="img"
                  aria-labelledby={`trend-title-${metric} trend-description-${metric}`}
                  className="block h-auto w-full"
                >
                  <title id={`trend-title-${metric}`}>{`${metricTitle} chart`}</title>
                  <desc id={`trend-description-${metric}`}>
                    {`${metricTitle} for ${rangeLabel(resolved.period, resolved.from, resolved.to)}. Focus a point to hear its exact value.`}
                  </desc>
                  <defs>
                    <linearGradient id={`trend-fill-${metric}`} x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.36 0.008 80)" stopOpacity="0.28" />
                      <stop offset="65%" stopColor="oklch(0.48 0.008 80)" stopOpacity="0.10" />
                      <stop offset="100%" stopColor="oklch(0.62 0.006 80)" stopOpacity="0.01" />
                    </linearGradient>
                  </defs>

                  {[chartTop + 18, (chartTop + chartBaseline) / 2, chartBaseline].map((y) => (
                    <line
                      key={y}
                      x1={chartLeft}
                      x2={chartRight}
                      y1={y}
                      y2={y}
                      stroke="oklch(0.895 0.008 80)"
                      strokeWidth="1"
                      strokeDasharray="5 6"
                    />
                  ))}

                  {areaPath ? <path d={areaPath} fill={`url(#trend-fill-${metric})`} /> : null}
                  {linePath ? (
                    <path
                      d={linePath}
                      fill="none"
                      stroke="oklch(0.26 0.007 80)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  ) : null}

                  {chartCoordinates.map(({ point, value, x, y }, index) => {
                    const fullLabel = pointFullLabel(point, resolved.bucket)
                    return (
                      <g
                        key={point.periodStart}
                        tabIndex={0}
                        role="img"
                        aria-label={`${fullLabel}: ${formatMetricValue(metric, value)}`}
                        className="outline-none"
                      >
                        <title>{`${fullLabel}: ${formatMetricValue(metric, value)}`}</title>
                        <circle cx={x} cy={y} r="14" fill="transparent" />
                        <circle
                          cx={x}
                          cy={y}
                          r="5"
                          fill="oklch(0.985 0.003 80)"
                          stroke="oklch(0.26 0.007 80)"
                          strokeWidth="2.5"
                          vectorEffect="non-scaling-stroke"
                        />
                        <text
                          x={x}
                          y="222"
                          textAnchor="middle"
                          fill="oklch(0.62 0.006 80)"
                          fontSize="11"
                          fontWeight="600"
                        >
                          {showPointLabel(index, points.length)
                            ? pointLabel(point, resolved.bucket, points.length)
                            : ''}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryMetric label="Revenue" value={formatCurrency(Number(trend?.totals.revenue ?? 0))} />
            <SummaryMetric label="Orders" value={Number(trend?.totals.orders ?? 0).toLocaleString()} />
            <SummaryMetric label="Items sold" value={Number(trend?.totals.itemsSold ?? 0).toLocaleString()} />
            <SummaryMetric label="Average order" value={formatCurrency(Number(trend?.totals.averageOrderValue ?? 0))} />
          </div>
        </article>

        <article className="overflow-hidden rounded-[22px] border border-paper-3 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <h3 className="text-base font-semibold text-ink">Recent sales</h3>
              <p className="mt-1 text-sm text-ink-2">Latest recorded transactions.</p>
            </div>
            <Link href="/dashboard/sales" className="inline-flex min-h-11 items-center rounded-[12px] bg-paper px-4 text-sm font-semibold text-ink outline-none transition hover:bg-paper-2 focus-visible:ring-2 focus-visible:ring-night/25">
              View all sales
            </Link>
          </div>
          <div className="overflow-x-auto px-5 pb-4">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="bg-paper text-left text-xs font-semibold text-ink-3">
                  <th className="rounded-l-[12px] px-4 py-3">Activity</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Total amount</th>
                  <th className="rounded-r-[12px] px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.length ? recentSales.map((sale) => (
                  <tr key={sale.id} className="border-b border-paper-3 last:border-b-0">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-brand-soft text-xs font-bold text-brand">S</span>
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
                      <span className="rounded-full bg-mint/16 px-3 py-1.5 text-xs font-semibold text-ink">{sale.status || sale.paymentMethod}</span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-ink-2">No recent sales yet. Record a sale to fill this table.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <aside className="space-y-4">
          <article className="rounded-[22px] border border-paper-3 bg-white p-5">
            <div>
              <p className="text-base font-semibold text-ink">Inventory & dues</p>
              <p className="mt-2 text-sm text-ink-2">Current amounts that need attention.</p>
            </div>
            <div className="mt-5 space-y-3">
              <AttentionRow href="/dashboard/customers" label="Customer due" value={formatCurrency(dueTotal)} detail={`${dueItems.length} customers to follow up`} />
              <AttentionRow href="/dashboard/suppliers" label="Supplier balance" value={formatCurrency(supplierBalance)} detail={`${supplierSummary?.suppliersWithBalance ?? 0} suppliers awaiting payment`} />
              <AttentionRow href="/dashboard/inventory?stockStatus=LOW_STOCK" label="Stock needs attention" value={`${stockAttention} items`} detail="Review products at or below reorder level" />
              <AttentionRow href="/dashboard/inventory?stockStatus=OUT_OF_STOCK" label="Out of stock" value={`${outOfStock} items`} detail="Restock unavailable products first" />
            </div>
          </article>
          <article className="rounded-[22px] border border-paper-3 bg-white p-5">
            <h3 className="text-base font-semibold text-ink">Upcoming work</h3>
            <div className="mt-4 space-y-3">
              {upcomingActions.length ? upcomingActions.map((item) => (
                <Link key={item.id} href={item.href} className="group block rounded-[16px] border border-paper-3 bg-white px-4 py-3.5 outline-none transition hover:bg-paper focus-visible:ring-2 focus-visible:ring-night/25">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-sm font-bold ${item.tone}`}>{item.icon}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink group-hover:text-brand">{item.title}</p>
                        <p className="mt-1 truncate text-xs text-ink-2">{item.subtitle}</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink">{item.amount}</span>
                  </div>
                </Link>
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
    </div>
  )
}
