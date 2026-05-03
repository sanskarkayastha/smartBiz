import { requireSession, apiFetch } from '@/src/lib/session'
import AddCustomerModal from '@/src/components/AddCustomerModal'

type Customer = {
  id: number
  name: string
  phone: string | null
  email: string | null
  totalPurchases: number
  lastPurchaseDate: string | null
}

export default async function CustomersPage() {
  const session = await requireSession()
  const customers = await apiFetch<Customer[]>('/customers', session)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-1">{customers?.length ?? 0} customers</p>
        </div>
        <AddCustomerModal />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {customers && customers.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Purchases</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Purchase</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c, i) => (
                <tr key={c.id} className={`border-b border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#135BEC]/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-[#135BEC]">{c.name.slice(0, 2).toUpperCase()}</span>
                      </div>
                      <span className="font-medium text-gray-900">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{c.phone ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-600">{c.email ?? '—'}</td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-900">
                    NPR {Number(c.totalPurchases ?? 0).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {c.lastPurchaseDate
                      ? new Date(c.lastPurchaseDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
            </svg>
            <p className="text-sm font-medium">No customers yet</p>
            <p className="text-xs mt-1">Click &quot;Add Customer&quot; to add your first customer</p>
          </div>
        )}
      </div>
    </div>
  )
}
