import Image from 'next/image'
import Link from 'next/link'

const FEATURES = [
  {
    number: '01',
    title: 'Sell without the slowdown',
    description: 'Record a sale in seconds. Stock adjusts automatically, so the queue keeps moving and your count stays honest.',
    detail: 'Fast POS / Automatic stock updates',
  },
  {
    number: '02',
    title: 'See what needs attention',
    description: 'Low stock, customer dues, and supplier balances surface before they become expensive surprises.',
    detail: 'Live alerts / Clear follow-ups',
  },
  {
    number: '03',
    title: 'Know the day, not just the total',
    description: 'Follow revenue, orders, and item trends from one calm dashboard, on your laptop or your phone.',
    detail: 'NPR-first analytics / Mobile ready',
  },
  {
    number: '04',
    title: 'Ask your business directly',
    description: 'SmartBiz AI turns your sales and stock into practical answers, without reports to build or menus to search.',
    detail: 'Plain-language insights / Built in',
  },
]

const WORKFLOW = [
  ['Add your products', 'Bring in the catalogue, prices, suppliers, and opening stock.'],
  ['Record the day', 'Capture sales, payments, customer dues, and new leads as they happen.'],
  ['Close with clarity', 'See what moved, what is low, and what tomorrow needs before you leave.'],
]

export default function HomePage() {
  return (
    <main className="landing-page overflow-hidden bg-paper text-ink">
      <header className="landing-nav">
        <div className="mx-auto flex h-[72px] w-full max-w-[1280px] items-center justify-between px-5 sm:px-8">
          <Link href="/" className="group inline-flex min-h-11 items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ink/30">
            <span className="grid size-9 place-items-center rounded-[11px] bg-ink text-snow transition-transform duration-300 group-hover:-rotate-3">
              <BoltIcon />
            </span>
            <span>
              <span className="block font-[family-name:var(--font-display)] text-[15px] font-extrabold leading-none tracking-[-0.02em]">SmartBiz</span>
              <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-3">Business admin</span>
            </span>
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-8 text-sm font-medium text-ink-2 md:flex">
            <a href="#platform" className="transition-colors hover:text-ink">Platform</a>
            <a href="#workflow" className="transition-colors hover:text-ink">How it works</a>
            <a href="#contact" className="transition-colors hover:text-ink">Contact</a>
          </nav>

          <div className="flex items-center gap-1 sm:gap-3">
            <Link href="/login" className="inline-flex min-h-11 items-center whitespace-nowrap rounded-xl px-3 text-sm font-semibold text-ink transition-colors hover:bg-paper-2 sm:px-4">
              Log in
            </Link>
            <Link href="/signup" className="button-press inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-xl bg-ink px-4 text-sm font-semibold text-snow transition-colors hover:bg-night-2 sm:px-5">
              Get started
              <ArrowIcon />
            </Link>
          </div>
        </div>
      </header>

      <section className="hero-stage relative min-h-[calc(100svh-72px)]">
        <div className="relative z-10 mx-auto grid min-h-[calc(100svh-72px)] w-full max-w-[1480px] items-center gap-7 px-5 py-9 sm:px-8 sm:py-12 lg:grid-cols-[minmax(390px,0.82fr)_minmax(560px,1.18fr)] lg:gap-0 lg:px-10 lg:py-10 xl:px-14">
          <div className="hero-copy relative z-20 flex max-w-[650px] flex-col items-start text-left">
            <div className="hero-reveal hero-reveal-1 inline-flex min-h-9 items-center gap-2 rounded-full border border-paper-3 bg-snow/75 px-4 text-xs font-semibold text-ink-2 shadow-[0_8px_24px_oklch(0.2_0.006_80/0.05)]">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-mint opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-[oklch(0.58_0.12_158)]" />
              </span>
              Built in Nepal, for businesses that move
            </div>

            <h1 className="hero-reveal hero-reveal-2 mt-7 font-[family-name:var(--font-display)] text-[clamp(3.2rem,5.6vw,5.8rem)] font-extrabold leading-[0.91] tracking-[-0.058em] text-ink">
              Run the shop.<br />Know the numbers.
            </h1>

            <p className="hero-reveal hero-reveal-3 mt-6 max-w-[560px] text-[clamp(1rem,1.25vw,1.16rem)] leading-7 text-ink-2">
              Sales, stock, suppliers, customers, and practical AI insights. One clear system for the whole business.
            </p>

            <div className="hero-reveal hero-reveal-4 mt-8 flex w-full items-center gap-3 sm:w-auto">
              <Link href="/signup" className="button-press inline-flex min-h-12 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-[14px] bg-ink px-5 text-sm font-bold text-snow transition-colors hover:bg-night-2 sm:flex-none sm:px-6">
                Start for free
                <ArrowIcon />
              </Link>
              <Link href="/login" className="inline-flex min-h-12 flex-1 items-center justify-center whitespace-nowrap rounded-[14px] border border-paper-3 bg-snow/70 px-5 text-sm font-bold text-ink transition hover:border-ink-3 hover:bg-snow sm:flex-none sm:px-6">
                Open dashboard
              </Link>
            </div>

            <p className="hero-reveal hero-reveal-4 mt-4 text-xs font-medium text-ink-3">No credit card required. Set up in minutes.</p>
          </div>

          <div className="hero-product-wrap relative z-10 flex min-h-[250px] w-full items-center justify-center lg:min-h-0 lg:justify-end">
            <div className="hero-product-shell relative w-full lg:w-[min(64vw,980px)] xl:w-[min(59vw,850px)] xl:shrink-0 xl:translate-x-3">
              <Image
                src="/smartbiz-hero-transparent.png"
                width={1536}
                height={1024}
                priority
                quality={75}
                sizes="(max-width: 1023px) 92vw, 64vw"
                alt="SmartBiz dashboard on a laptop beside the SmartBiz mobile app"
                className="hero-product-image block h-auto w-full"
              />
            </div>
          </div>
        </div>

        <div className="hero-floor" aria-hidden="true" />
      </section>

      <section className="border-y border-paper-3 bg-snow py-6" aria-label="SmartBiz capabilities">
        <div className="mx-auto grid max-w-[1180px] grid-cols-2 gap-y-5 px-6 sm:grid-cols-4 sm:px-8">
          {['Sales & POS', 'Inventory', 'Customers & Leads', 'AI insights'].map((item, index) => (
            <div key={item} className={`flex items-center justify-center gap-2 text-center text-xs font-bold text-ink-2 sm:text-sm ${index > 0 ? 'sm:border-l sm:border-paper-3' : ''}`}>
              <CheckIcon />
              {item}
            </div>
          ))}
        </div>
      </section>

      <section id="platform" className="bg-night py-24 text-snow sm:py-32 lg:py-40">
        <div className="mx-auto max-w-[1220px] px-6 sm:px-8">
          <div className="grid items-end gap-10 border-b border-night-edge pb-12 lg:grid-cols-[1.15fr_0.85fr] lg:pb-16">
            <h2 className="max-w-[720px] font-[family-name:var(--font-display)] text-[clamp(2.5rem,5vw,5.2rem)] font-extrabold leading-[0.96] tracking-[-0.05em]">
              Your business is already connected. Your tools should be too.
            </h2>
            <p className="max-w-[520px] text-base leading-7 text-snow-2 lg:justify-self-end lg:text-lg">
              SmartBiz keeps each part of the day in sync, from the first product sold to the last customer payment collected.
            </p>
          </div>

          <div className="divide-y divide-night-edge">
            {FEATURES.map((feature) => (
              <article key={feature.number} className="group grid gap-5 py-9 sm:grid-cols-[70px_0.85fr_1.15fr] sm:items-start sm:gap-8 sm:py-12">
                <span className="font-[family-name:var(--font-display)] text-sm font-bold text-snow-2">{feature.number}</span>
                <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold leading-tight tracking-[-0.025em] text-snow transition-transform duration-500 ease-out group-hover:translate-x-1 sm:text-3xl">
                  {feature.title}
                </h3>
                <div className="max-w-[570px] sm:justify-self-end">
                  <p className="text-base leading-7 text-snow-2">{feature.description}</p>
                  <p className="mt-4 text-xs font-bold uppercase tracking-[0.13em] text-mint">{feature.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="bg-paper py-24 sm:py-32 lg:py-40">
        <div className="mx-auto max-w-[1220px] px-6 sm:px-8">
          <div className="grid gap-14 lg:grid-cols-[0.82fr_1.18fr] lg:gap-24">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <p className="text-sm font-bold text-ink-3">A simpler daily rhythm</p>
              <h2 className="mt-5 max-w-[520px] font-[family-name:var(--font-display)] text-[clamp(2.5rem,4.5vw,4.8rem)] font-extrabold leading-[0.96] tracking-[-0.05em]">
                From opening time to a clean close.
              </h2>
              <p className="mt-6 max-w-[470px] text-base leading-7 text-ink-2">
                No complicated setup. No accounting maze. SmartBiz follows the way a real shop day already works.
              </p>
              <Link href="/signup" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-[14px] bg-ink px-6 text-sm font-bold text-snow transition-colors hover:bg-night-2">
                Set up SmartBiz
                <ArrowIcon />
              </Link>
            </div>

            <ol className="border-t border-paper-3">
              {WORKFLOW.map(([title, description], index) => (
                <li key={title} className="grid gap-5 border-b border-paper-3 py-9 sm:grid-cols-[64px_1fr] sm:py-12">
                  <span className="grid size-11 place-items-center rounded-full bg-ink font-[family-name:var(--font-display)] text-sm font-bold text-snow">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-[-0.025em] sm:text-3xl">{title}</h3>
                    <p className="mt-3 max-w-[540px] text-base leading-7 text-ink-2">{description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="bg-[oklch(0.86_0.11_154)] py-20 text-ink sm:py-28">
        <div className="mx-auto flex max-w-[1120px] flex-col items-start justify-between gap-10 px-6 sm:px-8 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-bold">Built for the counter. Ready for growth.</p>
            <h2 className="mt-5 max-w-[760px] font-[family-name:var(--font-display)] text-[clamp(2.7rem,5.5vw,5.7rem)] font-extrabold leading-[0.92] tracking-[-0.055em]">
              End every day knowing exactly where the business stands.
            </h2>
          </div>
          <Link href="/signup" className="button-press inline-flex min-h-14 shrink-0 items-center gap-3 rounded-[16px] bg-ink px-7 text-sm font-bold text-snow transition-colors hover:bg-night-2">
            Start for free
            <ArrowIcon />
          </Link>
        </div>
      </section>

      <footer id="contact" className="bg-night py-14 text-snow">
        <div className="mx-auto max-w-[1220px] px-6 sm:px-8">
          <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
            <div>
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-[11px] bg-snow text-ink"><BoltIcon /></span>
                <span className="font-[family-name:var(--font-display)] text-lg font-extrabold">SmartBiz</span>
              </div>
              <p className="mt-5 max-w-[390px] text-sm leading-6 text-snow-2">A sharper way for Nepal&apos;s small businesses to manage sales, stock, customers, and the day ahead.</p>
            </div>
            <div>
              <h3 className="text-sm font-bold text-snow">Product</h3>
              <div className="mt-4 flex flex-col items-start gap-3 text-sm text-snow-2">
                <a href="#platform" className="transition-colors hover:text-snow">Platform</a>
                <a href="#workflow" className="transition-colors hover:text-snow">How it works</a>
                <Link href="/login" className="transition-colors hover:text-snow">Log in</Link>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-snow">Contact</h3>
              <div className="mt-4 space-y-3 text-sm text-snow-2">
                <p>support@smartbiz.com.np</p>
                <p>Kathmandu, Nepal</p>
              </div>
            </div>
          </div>
          <div className="mt-12 flex flex-col justify-between gap-3 border-t border-night-edge pt-6 text-xs text-snow-2 sm:flex-row">
            <p>&copy; 2026 SmartBiz. All rights reserved.</p>
            <p>Made for businesses in Nepal.</p>
          </div>
        </div>
      </footer>
    </main>
  )
}

function BoltIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2 4.8 13.1h6.7L11 22l8.2-11.1h-6.7L13 2Z" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-mint/45 text-ink" aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 12 4 4L19 6" />
      </svg>
    </span>
  )
}
