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
    <div className="min-h-screen bg-transparent p-4">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(124,160,255,0.15),_transparent_28rem),radial-gradient(circle_at_bottom_left,_rgba(244,202,120,0.12),_transparent_30rem)]" />
      <div className="relative lg:pl-[19rem]">
        <Sidebar fullName={session.fullName} email={session.email} />
        <main className="min-w-0">
          <div className="mx-auto max-w-7xl space-y-6">
            <header className="overflow-hidden rounded-[30px] border border-paper-3 bg-white/78 shadow-[0_18px_60px_rgba(31,42,62,0.08)] backdrop-blur">
              <div className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-7 lg:py-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-3">Today&apos;s command center</p>
                  <h1
                    className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-ink sm:text-[2rem]"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    Run the floor with fewer blind spots.
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-2">
                    Watch revenue, stock risk, customer due, and AI guidance from one sharper workspace.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                  <div className="rounded-full border border-paper-3 bg-paper px-4 py-2 text-xs font-semibold text-ink">
                    {today}
                  </div>
                  <div className="rounded-full border border-paper-3 bg-brand-soft px-4 py-2 text-xs font-semibold text-ink">
                    Live business signal
                  </div>
                </div>
              </div>
            </header>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
