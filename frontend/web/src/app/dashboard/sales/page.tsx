import { requireSession, apiFetch } from '@/src/lib/session'
import AddSaleModal from '@/src/components/AddSaleModal'
import ImportSalesModal from '@/src/components/ImportSalesModal'
import SalesFilters from '@/src/components/SalesFilters'

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
type Product = { id: number; name: string; price: number; quantity: number }

type SearchParams = Promise<{
  date?: string
  dateFrom?: string
  dateTo?: string
}>

const PAYMENT_LABELS: Record<string, string> = { CASH: 'Cash', CARD: 'Card', DIGITAL: 'Digital', DUE: 'Due' }

function formatCurrency(value: number) {
  return `NPR ${Number(value).toLocaleString()}`
}

function formatDisplayDate(raw: string) {
  return new Date(raw).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatQueryDate(raw: string) {
  return new Date(`${raw}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function toDateKey(raw: string) {
  const date = new Date(raw)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildSalesPath(date: string, dateFrom: string, dateTo: string) {
  const params = new URLSearchParams()
  if (date) {
    params.set('date', date)
  } else {
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
  }
  const query = params.toString()
  return query ? `/sales?${query}` : '/sales'
}

export default async function SalesPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession()
  const { date: dateParam = '', dateFrom: dateFromParam = '', dateTo: dateToParam = '' } = await searchParams
  const [sales, productsData] = await Promise.all([
    apiFetch<Sale[]>(buildSalesPath(dateParam, dateFromParam, dateToParam), session),
    apiFetch<{ content: Product[] }>('/inventory/products?page=0&size=1000', session),
  ])

  const inStockProducts = (productsData?.content ?? []).filter((product) => product.quantity > 0)
  const saleList = sales ?? []

  const groupedSales = saleList.reduce<Array<{ key: string; label: string; items: Sale[]; total: number }>>((groups, sale) => {
    const key = toDateKey(sale.saleDate)
    const existing = groups.find((group) => group.key === key)

    if (existing) {
      existing.items.push(sale)
      existing.total += Number(sale.totalAmount)
      return groups
    }

    groups.push({
      key,
      label: formatDisplayDate(sale.saleDate),
      items: [sale],
      total: Number(sale.totalAmount),
    })
    return groups
  }, [])

  const filterSummary =
    dateParam
      ? `Sales for ${formatQueryDate(dateParam)}`
      : dateFromParam && dateToParam
      ? `Sales from ${formatQueryDate(dateFromParam)} to ${formatQueryDate(dateToParam)}`
      : dateFromParam
      ? `Sales from ${formatQueryDate(dateFromParam)}`
      : dateToParam
      ? `Sales up to ${formatQueryDate(dateToParam)}`
      : `${saleList.length} transactions across all dates`

  const hasActiveFilter = Boolean(dateParam || dateFromParam || dateToParam)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-extrabold tracking-[-0.04em] text-ink"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Sales
          </h1>
          <p className="mt-2 text-sm text-ink-2">{filterSummary}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ImportSalesModal products={inStockProducts} />
          <AddSaleModal products={inStockProducts} />
        </div>
      </div>

      <SalesFilters
        initialDate={dateParam}
        initialDateFrom={dateFromParam}
        initialDateTo={dateToParam}
      />

      {groupedSales.length > 0 ? (
        <div className="space-y-5">
          {groupedSales.map((group) => (
            <section
              key={group.key}
              className="overflow-hidden rounded-[28px] border border-paper-3 bg-white/84 shadow-[0_18px_50px_rgba(31,42,62,0.08)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper-3 bg-paper/75 px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-3">Sales day</p>
                  <h2 className="mt-1 text-lg font-bold tracking-[-0.03em] text-ink">{group.label}</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-ink">
                    {group.items.length} transaction{group.items.length === 1 ? '' : 's'}
                  </span>
                  <span className="rounded-full bg-brand-soft px-3 py-2 text-xs font-semibold text-ink">
                    {formatCurrency(group.total)}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-paper-3">
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-ink-3">#</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-ink-3">Time</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-ink-3">Items</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-ink-3">Customer</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-ink-3">Payment</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-ink-3">Total</th>
                      <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-ink-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((sale, index) => (
                      <tr key={sale.id} className={index % 2 === 1 ? 'bg-paper/35' : ''}>
                        <td className="px-5 py-4 text-xs font-semibold text-ink-3">#{sale.id}</td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-ink">
                            {new Date(sale.saleDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p className="mt-1 text-xs text-ink-3">
                            {sale.items.reduce((sum, item) => sum + item.quantity, 0)} item units
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-ink">{sale.items?.[0]?.productName ?? '-'}</p>
                          {sale.items?.length > 1 ? (
                            <p className="mt-1 text-xs text-ink-3">+{sale.items.length - 1} more items</p>
                          ) : null}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-ink">{sale.customerName?.trim() || 'Walk-in customer'}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            sale.paymentMethod === 'DUE'
                              ? 'bg-rose/16 text-ink'
                              : 'bg-paper text-ink'
                          }`}>
                            {PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-ink">
                          {formatCurrency(Number(sale.totalAmount))}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="rounded-full bg-mint/18 px-3 py-1 text-xs font-semibold text-ink">
                            {sale.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-[28px] border border-paper-3 bg-white/84 px-6 py-16 text-center shadow-[0_18px_50px_rgba(31,42,62,0.08)]">
          <p className="text-base font-semibold text-ink">
            {hasActiveFilter ? 'No sales matched this filter.' : 'No sales recorded yet.'}
          </p>
          <p className="mt-2 text-sm text-ink-2">
            {hasActiveFilter
              ? 'Try a different day or widen the date range to see more transactions.'
              : 'Record the first transaction and SmartBiz will start organizing sales by day.'}
          </p>
        </div>
      )}
    </div>
  )
}
