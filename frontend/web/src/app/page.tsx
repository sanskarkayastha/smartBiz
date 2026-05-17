import Link from 'next/link'

const FEATURES = [
  {
    n: '01',
    title: 'Inventory Management',
    desc: 'Track every product, set reorder alerts, and never run out of stock unexpectedly. Works across your whole catalogue.',
  },
  {
    n: '02',
    title: 'Point of Sale',
    desc: 'Record sales in seconds with a clean POS interface. Accept cash, card, or digital payments. Stock updates automatically.',
  },
  {
    n: '03',
    title: 'Customer Management',
    desc: 'Build a complete customer database. Track purchase history, contact details, and total spend for every customer.',
  },
  {
    n: '04',
    title: 'Sales Analytics',
    desc: "See today's revenue, order count, and a 7-day trend chart at a glance. Know how your business is performing right now.",
  },
  {
    n: '05',
    title: 'Mobile App',
    desc: 'Run your business from anywhere with the SmartBiz mobile app. Full POS, inventory, and customer access on your phone.',
  },
  {
    n: '06',
    title: 'Secure & Private',
    desc: 'Your data is yours. Every account is fully isolated. No other business can see your inventory, sales, or customers.',
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Create your account',
    desc: 'Sign up free in under a minute. No credit card, no setup fees.',
  },
  {
    n: '02',
    title: 'Add your products',
    desc: 'Build your inventory catalogue with prices, stock levels, and categories.',
  },
  {
    n: '03',
    title: 'Start selling',
    desc: 'Record sales, manage customers, and watch your analytics grow in one place.',
  },
]

const BARS = [42, 67, 28, 84, 55, 91, 73]
const MAX_BAR = 91

function DashboardPreview() {
  return (
    <div
      className="rounded-2xl border border-navy-edge w-full max-w-sm select-none"
      style={{ backgroundColor: 'oklch(0.20 0.025 264)' }}
    >
      {/* window chrome */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-navy-edge">
        <div className="w-2.5 h-2.5 rounded-full bg-navy-edge" />
        <div className="w-2.5 h-2.5 rounded-full bg-navy-edge" />
        <div className="w-2.5 h-2.5 rounded-full bg-navy-edge" />
        <span className="ml-2 text-xs font-medium text-snow-2">SmartBiz</span>
      </div>

      <div className="p-5">
        {/* revenue */}
        <div className="mb-5">
          <p className="text-xs text-snow-2 mb-1.5">Total Sales Today</p>
          <p
            className="text-snow tracking-tight leading-none mb-1"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2rem',
              fontWeight: 800,
            }}
          >
            NPR 24,500
          </p>
          <p className="text-xs" style={{ color: 'oklch(0.72 0.18 145)' }}>
            ↑ 12% from yesterday
          </p>
        </div>

        {/* bar chart */}
        <div className="flex items-end gap-1 mb-5" style={{ height: 64 }}>
          {BARS.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm bg-brand"
              style={{
                height: `${(h / MAX_BAR) * 100}%`,
                opacity: 0.55 + (h / MAX_BAR) * 0.45,
              }}
            />
          ))}
        </div>

        {/* stock alerts */}
        <div>
          <p className="text-xs font-semibold text-snow-2 mb-2.5">Stock Alerts</p>
          <div className="space-y-2">
            {[
              { name: 'Basmati Rice 5kg', qty: 3, level: 'low' as const },
              { name: 'Mustard Oil 1L',   qty: 0, level: 'out' as const },
              { name: 'Sugar 1kg',        qty: 28, level: 'ok'  as const },
            ].map((p) => (
              <div key={p.name} className="flex items-center justify-between gap-3">
                <span className="text-xs text-snow truncate">{p.name}</span>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded shrink-0"
                  style={
                    p.level === 'out'
                      ? { backgroundColor: 'oklch(0.25 0.08 20)', color: 'oklch(0.72 0.18 20)' }
                      : p.level === 'low'
                      ? { backgroundColor: 'oklch(0.28 0.07 75)', color: 'oklch(0.80 0.15 80)' }
                      : { backgroundColor: 'oklch(0.25 0.07 145)', color: 'oklch(0.72 0.16 145)' }
                  }
                >
                  {p.qty === 0 ? 'Out of stock' : `${p.qty} left`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <div>
      {/* ── Navbar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-navy-edge bg-navy/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="text-base font-bold text-snow"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            SmartBiz
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-snow-2">
            <a href="#features" className="hover:text-snow transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-snow transition-colors">How it works</a>
            <a href="#contact" className="hover:text-snow transition-colors">Contact</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-snow-2 hover:text-snow px-4 py-2 rounded-lg transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold text-snow bg-brand hover:opacity-90 px-4 py-2 rounded-lg transition-opacity"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="bg-navy pt-20 pb-24 lg:pb-32 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-[1fr_auto] gap-14 lg:gap-20 items-center">

            {/* text */}
            <div>
              <p className="fade-up-0 text-xs font-semibold tracking-widest text-brand uppercase mb-7">
                Built for small businesses in Nepal
              </p>
              <h1
                className="fade-up-1 text-snow leading-none mb-6"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(2.6rem, 5vw + 0.5rem, 4.25rem)',
                  fontWeight: 800,
                  letterSpacing: '-0.025em',
                }}
              >
                Inventory. Sales.<br />Customers.<br />One place.
              </h1>
              <p className="fade-up-2 text-snow-2 leading-relaxed mb-8 max-w-lg text-base">
                SmartBiz is built for shops and small businesses across Nepal. Record a sale in seconds, track stock, and know where every rupee goes.
              </p>
              <div className="fade-up-3 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand text-snow font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm"
                >
                  Start for free
                  <ArrowRight />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-navy-edge text-snow-2 hover:text-snow hover:border-snow-2 font-medium rounded-xl transition-colors text-sm"
                >
                  Sign in to dashboard
                </Link>
              </div>
              <p className="mt-4 text-xs text-snow-2 opacity-50">No credit card required</p>
            </div>

            {/* preview */}
            <div className="fade-up-2 hidden lg:block">
              <DashboardPreview />
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-fog">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-14">
            <h2
              className="text-ink leading-tight mb-3"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.75rem, 3vw, 2.4rem)',
                fontWeight: 700,
                letterSpacing: '-0.015em',
              }}
            >
              Everything your shop needs
            </h2>
            <p className="text-ink-2 max-w-xl text-sm leading-relaxed">
              Stop juggling spreadsheets and notebooks. SmartBiz brings everything into one clean, fast interface.
            </p>
          </div>

          <div>
            {FEATURES.map((f) => (
              <div
                key={f.n}
                className="border-t border-fog-2 py-6 flex gap-4 sm:gap-6 items-start"
              >
                <span className="text-xs font-semibold text-ink-3 tabular-nums mt-0.5 w-6 shrink-0">{f.n}</span>
                <div className="flex flex-col sm:flex-row sm:items-start sm:gap-6 flex-1 min-w-0">
                  <span
                    className="font-semibold text-ink text-sm mb-1 sm:mb-0 shrink-0"
                    style={{ minWidth: '11rem' }}
                  >
                    {f.title}
                  </span>
                  <span className="text-ink-2 text-sm leading-relaxed">{f.desc}</span>
                </div>
              </div>
            ))}
            <div className="border-t border-fog-2" />
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 bg-fog-1">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-14">
            <h2
              className="text-ink leading-tight mb-3"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.75rem, 3vw, 2.25rem)',
                fontWeight: 700,
                letterSpacing: '-0.015em',
              }}
            >
              Up and running in minutes
            </h2>
            <p className="text-ink-2 text-sm">
              No IT team required. Set up your entire business on SmartBiz in an afternoon.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16">
            {STEPS.map((s) => (
              <div key={s.n}>
                <div
                  className="leading-none mb-4 font-bold"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(3.5rem, 6vw, 5.5rem)',
                    fontWeight: 800,
                    letterSpacing: '-0.04em',
                    color: 'oklch(0.87 0.012 264)',
                  }}
                >
                  {s.n}
                </div>
                <h3 className="font-semibold text-ink text-base mb-2">{s.title}</h3>
                <p className="text-ink-2 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <section className="bg-navy py-24">
        <div className="max-w-5xl mx-auto px-6">
          <h2
            className="text-snow leading-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              maxWidth: '18ch',
            }}
          >
            Ready to take control of your business?
          </h2>
          <p className="text-snow-2 mb-8 text-base max-w-md leading-relaxed">
            Join small business owners in Nepal who manage their inventory, sales, and customers with SmartBiz.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-brand text-snow font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm"
          >
            Create your free account
            <ArrowRight />
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer id="contact" className="bg-navy border-t border-navy-edge py-14">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
            <div>
              <p
                className="text-base font-bold text-snow mb-3"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                SmartBiz
              </p>
              <p className="text-sm text-snow-2 leading-relaxed">
                Business management software built for small businesses in Nepal. Simple, fast, and reliable.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-snow tracking-wide uppercase mb-4">Product</h4>
              <ul className="space-y-2.5 text-sm text-snow-2">
                <li><a href="#features" className="hover:text-snow transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-snow transition-colors">How it works</a></li>
                <li><Link href="/login" className="hover:text-snow transition-colors">Log In</Link></li>
                <li><Link href="/signup" className="hover:text-snow transition-colors">Create Account</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-snow tracking-wide uppercase mb-4">Contact</h4>
              <ul className="space-y-2.5 text-sm text-snow-2">
                <li>support@smartbiz.com.np</li>
                <li>Kathmandu, Nepal</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-navy-edge pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-snow-2">
            <span>© 2025 SmartBiz. All rights reserved.</span>
            <span>Made in Nepal</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

function ArrowRight() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}
