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
    <div className="min-h-screen px-3 py-3 sm:px-4 sm:py-4">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(124,160,255,0.12),_transparent_28rem),radial-gradient(circle_at_bottom_right,_rgba(244,202,120,0.10),_transparent_32rem)]" />
      <div className="relative mx-auto max-w-[1600px]">
        <div className="grid gap-3 xl:grid-cols-[264px_minmax(0,1fr)]">
          <Sidebar fullName={session.fullName} email={session.email} />
          <main className="min-w-0">
            <div className="space-y-4">
              <header className="rounded-[24px] border border-paper-3 bg-white/82 px-4 py-3 shadow-[0_10px_24px_rgba(31,42,62,0.035)] sm:px-5">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-3">Today&apos;s command center</p>
                      <span className="rounded-full border border-paper-3 bg-paper px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">
                        Dashboard
                      </span>
                    </div>
                    <div className="mt-2 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                      <div className="min-w-0">
                        <h1
                          className="text-xl font-extrabold tracking-[-0.04em] text-ink sm:text-[1.7rem]"
                          style={{ fontFamily: 'var(--font-display)' }}
                        >
                          Welcome back, {session.fullName.split(' ')[0]}.
                        </h1>
                        <p className="mt-1 text-sm leading-6 text-ink-2">
                          Revenue, stock, follow-ups, and AI guidance in one quick view.
                        </p>
                      </div>
                      <div className="hidden rounded-full border border-paper-3 bg-brand-soft px-3 py-1.5 text-[11px] font-semibold text-ink lg:inline-flex">
                        Live business signal
                      </div>
                    </div>
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
                          className="inline-flex h-10 w-10 items-center justify-center rounded-[18px] border border-paper-3 bg-paper text-ink transition duration-200 hover:border-brand/30 hover:bg-white hover:text-brand"
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                    <div className="rounded-[16px] border border-paper-3 bg-paper px-3 py-2 text-right">
                      <p className="text-sm font-semibold text-ink">{session.fullName}</p>
                      <p className="text-xs text-ink-2">{today}</p>
                    </div>
                  </div>
                </div>
              </header>
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
