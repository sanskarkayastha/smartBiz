'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const NAV_GROUPS = [
  {
    label: 'Main Menu',
    items: [
      {
        label: 'Dashboard',
        href: '/dashboard/overview',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
        ),
      },
      {
        label: 'Inventory',
        href: '/dashboard/inventory',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
        ),
      },
      {
        label: 'Suppliers',
        href: '/dashboard/suppliers',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        ),
      },
      {
        label: 'Sales',
        href: '/dashboard/sales',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="20" x2="12" y2="10" />
            <line x1="18" y1="20" x2="18" y2="4" />
            <line x1="6" y1="20" x2="6" y2="16" />
          </svg>
        ),
      },
      {
        label: 'Customers',
        href: '/dashboard/customers',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
      {
        label: 'Leads',
        href: '/dashboard/leads',
        badge: 'CRM',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Features',
    items: [
      {
        label: 'AI Assistant',
        href: '/dashboard/ai',
        badge: 'Live',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 0 0 .951-.69l1.07-3.292z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'General',
    items: [
      {
        label: 'Settings',
        href: '/dashboard/settings',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        ),
      },
    ],
  },
]

type Props = { fullName: string; email: string }

export default function Sidebar({ fullName, email }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const initials = fullName
    .split(' ')
    .map((name) => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <aside className="relative mb-0 self-start overflow-hidden bg-white xl:w-[286px]">
      <div>
        <div className="px-4 pb-4 pt-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-[linear-gradient(135deg,var(--color-brand),oklch(0.77_0.18_63))] text-white">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M13 2 5 13h6l-1 9 9-12h-6l1-8Z" fill="currentColor" />
              </svg>
            </span>
            <div>
              <p className="text-xl font-bold text-ink">SmartBiz</p>
              <p className="text-xs text-ink-2">Business admin</p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-[13px] border border-paper-3 bg-white px-3 py-2.5">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-3">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <span className="min-w-0 flex-1 truncate text-sm text-ink-2">Search</span>
            <span className="rounded-md border border-paper-3 px-1.5 py-0.5 text-[10px] font-semibold text-ink-3">K</span>
          </div>
        </div>

        <nav className="px-3.5 py-4">
          <div className="space-y-5">
            {NAV_GROUPS.map((group) => (
              <section key={group.label}>
                <p className="px-2 pb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-3">
                  {group.label}
                </p>
                <div className="space-y-1.5">
                  {group.items.map(({ label, href, icon, badge }) => {
                    const active = pathname.startsWith(href)
                    return (
                      <Link
                        key={href}
                        href={href}
                        className={`group flex items-center gap-3 rounded-[13px] px-3 py-2.5 text-sm font-medium transition duration-200 ${
                          active
                            ? 'bg-night text-snow'
                            : 'text-ink-2 hover:bg-paper hover:text-ink'
                        }`}
                      >
                        <span
                          className={`flex h-[32px] w-[32px] items-center justify-center rounded-[10px] transition duration-200 ${
                            active
                              ? 'bg-white/10 text-snow'
                              : 'bg-white text-ink-2 group-hover:bg-brand-soft group-hover:text-brand'
                          }`}
                        >
                          {icon}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{label}</span>
                        {badge ? (
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                              active ? 'bg-white/10 text-snow-2' : 'bg-brand-soft text-brand'
                            }`}
                          >
                            {badge}
                          </span>
                        ) : null}
                      </Link>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        </nav>

        <div className="px-4 py-4">
          <div className="rounded-[16px] border border-paper-3 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-night text-sm font-bold text-snow">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{fullName}</p>
                <p className="truncate text-xs text-ink-2">{email}</p>
              </div>
            </div>
            <div className="mt-4 rounded-[14px] bg-paper px-3 py-3">
              <p className="text-sm font-bold text-ink">Starter Plan</p>
              <p className="mt-1 text-xs leading-5 text-ink-2">
                Keep your shop organized with sales, stock, CRM, and AI tools.
              </p>
              <button
                type="button"
                className="mt-3 inline-flex w-full items-center justify-center rounded-[12px] bg-[linear-gradient(135deg,var(--color-brand),oklch(0.77_0.18_63))] px-3 py-2.5 text-xs font-bold text-white"
              >
                Upgrade Plan
              </button>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[13px] border border-paper-3 bg-white px-4 py-2.5 text-sm font-semibold text-rose transition duration-200 hover:bg-rose/10"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
            Log out
          </button>
        </div>
      </div>
    </aside>
  )
}
