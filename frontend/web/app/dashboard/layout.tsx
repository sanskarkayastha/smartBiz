import Link from 'next/link'
import { getSession } from '@/app/lib/session'
import { logout } from '@/app/actions/auth'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-indigo-700 text-white flex flex-col">
        <div className="px-6 py-5 border-b border-indigo-600">
          <h1 className="text-xl font-bold">SmartBiz</h1>
          <p className="text-indigo-300 text-xs mt-0.5 truncate">{session?.fullName}</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-indigo-600 transition-colors">
            📊 Dashboard
          </Link>
          <Link href="/dashboard/inventory" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-indigo-600 transition-colors">
            📦 Inventory
          </Link>
        </nav>
        <div className="px-3 py-4 border-t border-indigo-600">
          <form action={logout}>
            <button type="submit" className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-indigo-300 hover:bg-indigo-600 hover:text-white transition-colors">
              🚪 Logout
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-gray-50">
        {children}
      </main>
    </div>
  )
}
