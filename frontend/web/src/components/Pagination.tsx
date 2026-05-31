'use client'

import Link from 'next/link'

export default function Pagination({
  basePath,
  currentPage,
  totalPages,
  totalElements,
  pageSize,
  extraParams = {},
}: {
  basePath: string
  currentPage: number
  totalPages: number
  totalElements: number
  pageSize: number
  extraParams?: Record<string, string>
}) {
  if (totalPages <= 1) return null

  const from = totalElements === 0 ? 0 : currentPage * pageSize + 1
  const to = Math.min((currentPage + 1) * pageSize, totalElements)

  function buildUrl(page: number) {
    const params = new URLSearchParams({ ...extraParams, page: String(page) })
    return `${basePath}?${params.toString()}`
  }

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
      <p className="text-sm text-gray-500">
        Showing {from}–{to} of {totalElements}
      </p>
      <div className="flex items-center gap-2">
        {currentPage > 0 ? (
          <Link
            href={buildUrl(currentPage - 1)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Previous
          </Link>
        ) : (
          <span className="px-3 py-1.5 text-sm border border-gray-100 rounded-lg text-gray-300 cursor-not-allowed">
            Previous
          </span>
        )}
        <span className="text-sm text-gray-500 font-medium">
          {currentPage + 1} / {totalPages}
        </span>
        {currentPage < totalPages - 1 ? (
          <Link
            href={buildUrl(currentPage + 1)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Next
          </Link>
        ) : (
          <span className="px-3 py-1.5 text-sm border border-gray-100 rounded-lg text-gray-300 cursor-not-allowed">
            Next
          </span>
        )}
      </div>
    </div>
  )
}
