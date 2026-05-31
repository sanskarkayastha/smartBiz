'use client'

import { useState } from 'react'

export type Category = { id: number; name: string }

type Props = {
  categories: Category[]
  onAdd: (cat: Category) => void
  onDelete: (id: number) => void
  onRename: (cat: Category) => void
  onClose: () => void
}

export default function ManageCategoriesModal({ categories, onAdd, onDelete, onRename, onClose }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleAdd() {
    const trimmed = newName.trim()
    if (!trimmed) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Failed to add category.')
        return
      }
      onAdd(data as Category)
      setNewName('')
    } catch {
      setError('Network error.')
    } finally {
      setSaving(false)
    }
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id)
    setEditValue(cat.name)
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditValue('')
  }

  async function commitEdit(id: number) {
    const trimmed = editValue.trim()
    if (!trimmed) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Failed to rename category.')
        return
      }
      onRename(data as Category)
      setEditingId(null)
    } catch {
      setError('Network error.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete category "${name}"? Products with this category will keep the label.`)) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
      if (res.ok || res.status === 204) {
        onDelete(id)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Failed to delete category.')
      }
    } catch {
      setError('Network error.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Manage Categories</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{error}</p>}

        <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-gray-50">
          {categories.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No categories yet. Add one below.</p>
          ) : (
            categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-2 py-2.5">
                {editingId === cat.id ? (
                  <>
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitEdit(cat.id)
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      className="flex-1 px-2.5 py-1.5 border border-[#135BEC] rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#135BEC]/30"
                    />
                    <button
                      onClick={() => commitEdit(cat.id)}
                      disabled={saving}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50 transition-colors"
                      title="Save"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors"
                      title="Cancel"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-gray-800">{cat.name}</span>
                    <button
                      onClick={() => startEdit(cat)}
                      className="p-1.5 text-gray-400 hover:text-[#135BEC] hover:bg-[#135BEC]/5 rounded-lg transition-colors"
                      title="Rename"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id, cat.name)}
                      disabled={saving}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <div className="pt-4 border-t border-gray-100 mt-2">
          <p className="text-xs font-semibold text-gray-500 mb-2">Add Category</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Electronics"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#135BEC] focus:border-transparent"
            />
            <button
              onClick={handleAdd}
              disabled={saving || !newName.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#135BEC] text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
