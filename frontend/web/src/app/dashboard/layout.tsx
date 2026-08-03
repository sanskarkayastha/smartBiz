import { requireSession } from '@/src/lib/session'
import Sidebar from '@/src/components/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession()
  const today = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kathmandu',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date())

  return (
    <div className="min-h-screen bg-paper-2 p-2 sm:p-3 lg:p-4">
      <div className="relative min-h-[calc(100vh-1rem)] overflow-hidden rounded-[24px] border border-paper-3 bg-white sm:min-h-[calc(100vh-1.5rem)] lg:min-h-[calc(100vh-2rem)]">
        <div className="grid min-h-[calc(100vh-1rem)] sm:min-h-[calc(100vh-1.5rem)] lg:min-h-[calc(100vh-2rem)] xl:grid-cols-[286px_minmax(0,1fr)]">
          <Sidebar fullName={session.fullName} email={session.email} />
          <main className="min-w-0 bg-paper-2">
            <div className="space-y-5">
              <header className="bg-white/96 px-4 py-4 sm:px-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-ink sm:text-[1.7rem]">
                      Welcome back, {session.fullName.split(' ')[0]} <span className="text-brand">.</span>
                    </h1>
                    <p className="mt-1 text-sm text-ink-2">
                      Sales, stock, suppliers, and customer dues in one admin view.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                    <div className="flex items-center gap-3 rounded-[16px] border border-paper-3 bg-white px-3 py-2">
                      <div className="h-10 w-10 overflow-hidden rounded-full bg-[linear-gradient(135deg,var(--color-night),var(--color-night-edge))] text-center text-sm font-bold leading-10 text-snow">
                        {session.fullName
                          .split(' ')
                          .map((part) => part[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{session.fullName}</p>
                        <p className="truncate text-xs text-ink-2">{today}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </header>
              <div className="px-4 pb-5 sm:px-6 sm:pb-6">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
