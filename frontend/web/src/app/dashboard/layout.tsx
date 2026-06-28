import { requireSession } from '@/src/lib/session'
import Sidebar from '@/src/components/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession()
  const today = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date())

  return (
    <div className="min-h-screen bg-paper-2 px-3 py-4 sm:px-5 lg:px-8 lg:py-8">
      <div className="relative mx-auto max-w-[1560px] overflow-hidden rounded-[28px] border border-white bg-paper shadow-[0_24px_70px_rgba(30,30,30,0.08)]">
        <div className="grid min-h-[calc(100vh-4rem)] xl:grid-cols-[286px_minmax(0,1fr)]">
          <Sidebar fullName={session.fullName} email={session.email} />
          <main className="min-w-0 border-t border-paper-3 bg-paper-2 xl:border-l xl:border-t-0">
            <div className="space-y-5">
              <header className="border-b border-paper-3 bg-white px-4 py-4 sm:px-6">
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
                    <div className="flex items-center gap-2">
                      {[
                        (
                          <svg key="help" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M9.09 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3" />
                            <path d="M12 17h.01" />
                          </svg>
                        ),
                        (
                          <svg key="mail" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="5" width="18" height="14" rx="2" />
                            <path d="m3 7 9 6 9-6" />
                          </svg>
                        ),
                        (
                          <svg key="bell" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                            <path d="M10.3 21a2 2 0 0 0 3.4 0" />
                          </svg>
                        ),
                      ].map((icon, index) => (
                        <button
                          key={index}
                          type="button"
                          className="inline-flex h-11 w-11 items-center justify-center rounded-[14px] border border-paper-3 bg-white text-ink transition duration-200 hover:border-brand/40 hover:bg-brand-soft hover:text-brand"
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 rounded-[16px] border border-paper-3 bg-white px-3 py-2">
                      <div className="h-10 w-10 overflow-hidden rounded-full bg-[linear-gradient(135deg,var(--color-brand),oklch(0.78_0.18_72))] text-center text-sm font-bold leading-10 text-white">
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
