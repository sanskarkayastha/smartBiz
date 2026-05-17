import { requireSession, apiFetch } from '@/src/lib/session'
import EditSupplierModal from '@/src/components/EditSupplierModal'
import CreateSupplierModal from '@/src/components/CreateSupplierModal'
import ViewSupplierProductsModal from '@/src/components/ViewSupplierProductsModal'

type Supplier = {
  id: number
  name: string
  phone: string | null
  email: string | null
  balanceOwed: number
  notes: string | null
  createdAt: string
}

export default async function SuppliersPage() {
  const session = await requireSession()
  const suppliers = await apiFetch<Supplier[]>('/inventory/suppliers', session)

  const totalOwed = (suppliers ?? []).reduce((sum, s) => sum + Number(s.balanceOwed), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-sm text-gray-500 mt-1">
            {suppliers?.length ?? 0} suppliers · Total owed: NPR {totalOwed.toLocaleString()}
          </p>
        </div>
        <CreateSupplierModal />
      </div>

      {/* Summary card */}
      {totalOwed > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-5 py-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p className="text-sm text-red-700 font-medium">
            Outstanding balance: <span className="font-bold">NPR {totalOwed.toLocaleString()}</span> across {(suppliers ?? []).filter(s => Number(s.balanceOwed) > 0).length} supplier(s)
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {suppliers && suppliers.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Supplier</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Balance Owed</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s, i) => {
                const owes = Number(s.balanceOwed) > 0
                return (
                  <tr key={s.id} className={`border-b border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#135BEC]/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-[#135BEC]">{s.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{s.name}</p>
                          {s.notes && <p className="text-xs text-gray-400 truncate max-w-48">{s.notes}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{s.phone ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{s.email ?? '—'}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${owes ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                        NPR {Number(s.balanceOwed).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <ViewSupplierProductsModal supplierId={s.id} supplierName={s.name} />
                        <EditSupplierModal supplier={s} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <p className="text-sm font-medium">No suppliers yet</p>
            <p className="text-xs mt-1">Use &ldquo;Add Supplier&rdquo; above, or add a supplier name when creating a product</p>
          </div>
        )}
      </div>
    </div>
  )
}
