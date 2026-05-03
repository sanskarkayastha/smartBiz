import { requireSession } from '@/src/lib/session'
import Sidebar from '@/src/components/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession()

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar fullName={session.fullName} email={session.email} />
      <main className="ml-60 flex-1 p-8 min-w-0">
        {children}
      </main>
    </div>
  )
}
