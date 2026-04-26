'use client'

import { useState, useTransition, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { Product } from '@/types'
import { createProduct, deleteProduct } from '@/app/actions/inventory'

export default function ProductTable({ products }: { products: Product[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()
  const [formError, formAction, formPending] = useActionState(
    async (prev: string | null, formData: FormData) => {
      const result = await createProduct(prev, formData)
      if (!result) {
        setShowModal(false)
        startTransition(() => router.refresh())
      }
      return result
    },
    null
  )

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  )

  async function handleDelete(id: number) {
    if (!confirm('Delete this product?')) return
    setDeletingId(id)
    await deleteProduct(id)
    startTransition(() => router.refresh())
    setDeletingId(null)
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
          <input
            type="text" placeholder="Search products..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
          />
          <button
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Add Product
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 text-left">Name</th>
                <th className="px-6 py-3 text-left">Category</th>
                <th className="px-6 py-3 text-left">Price (NPR)</th>
                <th className="px-6 py-3 text-left">Qty</th>
                <th className="px-6 py-3 text-left">Reorder Level</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-400">
                    {search ? 'No products match your search.' : 'No products yet. Add one above.'}
                  </td>
                </tr>
              ) : (
                filtered.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-800">{p.name}</td>
                    <td className="px-6 py-3 text-gray-500">{p.category || '—'}</td>
                    <td className="px-6 py-3 text-gray-700">{Number(p.price).toLocaleString()}</td>
                    <td className="px-6 py-3 text-gray-700">{p.quantity}</td>
                    <td className="px-6 py-3 text-gray-500">{p.reorderLevel ?? '—'}</td>
                    <td className="px-6 py-3">
                      {p.lowStock ? (
                        <span className="bg-red-100 text-red-600 text-xs font-medium px-2 py-0.5 rounded-full">Low Stock</span>
                      ) : (
                        <span className="bg-green-100 text-green-600 text-xs font-medium px-2 py-0.5 rounded-full">OK</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => handleDelete(p.id)}
                        disabled={deletingId === p.id || isPending}
                        className="text-red-500 hover:text-red-700 text-xs font-medium disabled:opacity-50"
                      >
                        {deletingId === p.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-800">Add Product</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <form action={formAction} className="space-y-3">
              {formError && (
                <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Product Name *</label>
                  <input name="name" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                  <input name="category" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">SKU</label>
                  <input name="sku" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Price (NPR) *</label>
                  <input name="price" type="number" step="0.01" min="0.01" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Quantity *</label>
                  <input name="quantity" type="number" min="0" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Reorder Level</label>
                  <input name="reorderLevel" type="number" min="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Supplier</label>
                  <input name="supplier" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 font-medium py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={formPending} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg text-sm transition-colors">
                  {formPending ? 'Adding...' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
