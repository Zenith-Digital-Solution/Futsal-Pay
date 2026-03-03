'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, ArrowRight, ArrowUpRight } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { getDashboardPath } from '@/lib/role-routing';

/* ─── tiny helpers ─────────────────────────────────────────────────────────── */

function Divider() {
  return <div className="w-full h-px bg-slate-200 dark:bg-white/5" />;
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
      {children}
    </span>
  );
}

/* ─── Marquee strip ────────────────────────────────────────────────────────── */
const STRIP = ['Real-Time Availability', 'Instant Booking', 'Secure Payments via Khalti & eSewa', '50+ Grounds', 'Cancel Anytime', 'Verified Grounds', 'No Hidden Fees'];

function MarqueeStrip() {
  const text = [...STRIP, ...STRIP].join('  ·  ');
  return (
    <div className="overflow-hidden border-y border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] py-3 select-none">
      <div className="flex whitespace-nowrap animate-marquee text-xs font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-500">
        <span className="pr-12">{text}</span>
        <span className="pr-12">{text}</span>
      </div>
    </div>
  );
}

/* ─── Court SVG ────────────────────────────────────────────────────────────── */
function CourtSVG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 260" className={className} fill="none">
      <rect x="4" y="4" width="392" height="252" rx="6" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.7" />
      <line x1="200" y1="4" x2="200" y2="256" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" />
      <circle cx="200" cy="130" r="40" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" />
      <circle cx="200" cy="130" r="4" fill="currentColor" fillOpacity="0.6" />
      {/* Left penalty area */}
      <rect x="4" y="80" width="52" height="100" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" />
      <rect x="4" y="105" width="22" height="50" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
      {/* Right penalty area */}
      <rect x="344" y="80" width="52" height="100" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" />
      <rect x="374" y="105" width="22" height="50" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
      {/* Center spot */}
      <circle cx="200" cy="130" r="2" fill="currentColor" fillOpacity="0.9" />
    </svg>
  );
}

/* ─── Main Page ────────────────────────────────────────────────────────────── */

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && user) router.push(getDashboardPath(user));
    else if (isAuthenticated) router.push('/dashboard');
  }, [isAuthenticated, user, router]);

  return (
    <div className="bg-[#f8f9fa] dark:bg-[#0A0F1E] text-slate-900 dark:text-white">

      {/* ══ HERO ═══════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[90vh] flex flex-col justify-between px-6 md:px-14 pt-16 pb-12 overflow-hidden">

        {/* Faint court in background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <CourtSVG className="w-full max-w-3xl text-slate-900 dark:text-white opacity-[0.04]" />
        </div>
        {/* Subtle color wash */}
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full bg-emerald-500/5 dark:bg-emerald-500/10 blur-[120px] pointer-events-none" />

        {/* Top row: issue-number label + location pill */}
        <div className="relative flex items-center justify-between">
          <Tag>Nepal&apos;s Futsal Platform</Tag>
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <MapPin className="h-3 w-3" /> Kathmandu · Pokhara · Chitwan
          </span>
        </div>

        {/* Headline block — asymmetric, large, editorial */}
        <div className="relative max-w-5xl">
          <p className="text-xs font-bold tracking-[0.3em] uppercase text-emerald-600 dark:text-emerald-400 mb-6">Book · Play · Repeat</p>
          <h1 className="font-extrabold tracking-tight leading-none">
            <span className="block text-[clamp(3.5rem,10vw,8rem)] text-slate-900 dark:text-white">Find your</span>
            <span className="block text-[clamp(3.5rem,10vw,8rem)]">
              <span className="text-emerald-500">perfect</span>
              <span className="text-slate-900 dark:text-white"> ground.</span>
            </span>
          </h1>
          <p className="mt-8 max-w-xl text-base md:text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
            Real-time availability. Instant confirmation. Secure payments.
            Everything you need to get on the pitch — in seconds.
          </p>
          <div className="mt-10 flex items-center gap-5">
            <Link
              href="/grounds"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-7 py-3.5 text-sm font-bold text-white shadow-md shadow-emerald-500/25 hover:bg-emerald-400 transition-all hover:-translate-y-0.5"
            >
              Browse Grounds <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/signup" className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1">
              Create account <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Bottom stat row */}
        <div className="relative flex flex-wrap gap-8 pt-10 border-t border-slate-200 dark:border-white/5">
          {[['50+', 'Grounds'], ['5,000+', 'Bookings'], ['2,000+', 'Players'], ['4.9★', 'Avg Rating']].map(([v, l]) => (
            <div key={l}>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{v}</p>
              <p className="text-xs text-slate-400 mt-0.5">{l}</p>
            </div>
          ))}
        </div>
      </section>

      <MarqueeStrip />

      {/* ══ WHAT WE DO — full-width list, not a grid ════════════════════════ */}
      <section className="px-6 md:px-14 py-24">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">What we offer</h2>
            <p className="text-sm text-slate-400 max-w-xs">Everything a player or ground owner needs.</p>
          </div>

          {/* Each feature is a full-width expandable row, not a card */}
          <div className="divide-y divide-slate-200 dark:divide-white/5">
            {[
              { num: '01', title: 'Live Ground Discovery',       detail: 'Search by location, surface type, and price. Every listing has photos, operating hours, and verified details.' },
              { num: '02', title: 'Real-Time Slot Booking',      detail: 'See exactly which slots are open right now. Book instantly — no waiting, no calls, no double-booking.' },
              { num: '03', title: 'Khalti & eSewa Payments',     detail: 'Pay securely through Nepal\'s most-used payment gateways. Every transaction is logged and protected.' },
              { num: '04', title: 'Ratings & Player Reviews',    detail: 'Leave honest reviews after your game. Owners respond. Quality stays high.' },
              { num: '05', title: 'Owner Management Dashboard',  detail: 'Ground owners get a full suite — booking calendar, staff management, revenue analytics, and subscription billing.' },
              { num: '06', title: 'Cancellation & Refunds',      detail: 'Flexible cancellation policies set by each ground. No hidden fees. Clear terms upfront.' },
            ].map(({ num, title, detail }) => (
              <div key={num} className="group flex flex-col sm:flex-row sm:items-start gap-4 py-7 cursor-default">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-600 w-8 shrink-0 mt-1">{num}</span>
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h3 className="text-lg md:text-xl font-semibold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {title}
                  </h3>
                  <p className="sm:max-w-sm text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {detail}
                  </p>
                </div>
                <ArrowUpRight className="hidden sm:block h-4 w-4 text-slate-300 dark:text-slate-700 group-hover:text-emerald-500 transition-colors shrink-0 mt-1" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* ══ OVERSIZED NUMBERS — editorial typographic section ═══════════════ */}
      <section className="px-6 md:px-14 py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs font-bold tracking-[0.3em] uppercase text-slate-400 dark:text-slate-500 mb-10">By the numbers</p>
          <div className="flex flex-col gap-0">
            {[
              { value: '50+',    label: 'Verified futsal grounds across Nepal' },
              { value: '5K+',    label: 'Bookings completed on the platform' },
              { value: '2K+',    label: 'Active players trust Futsal Pay' },
              { value: '4.9',    label: 'Average ground rating from real reviews' },
            ].map(({ value, label }, i) => (
              <div key={value} className={`flex items-baseline gap-6 md:gap-10 py-4 border-b border-slate-200 dark:border-white/5 ${i === 0 ? 'border-t' : ''}`}>
                <span className="text-[clamp(3rem,8vw,6rem)] font-black leading-none tracking-tight text-slate-900 dark:text-white w-44 shrink-0">{value}</span>
                <span className="text-base md:text-lg text-slate-500 dark:text-slate-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* ══ PROCESS — vertical timeline ═════════════════════════════════════ */}
      <section className="px-6 md:px-14 py-24">
        <div className="max-w-3xl mx-auto">
          <Tag>How it works</Tag>
          <h2 className="text-3xl md:text-4xl font-bold mt-6 mb-16 text-slate-900 dark:text-white">From search to kickoff<br />in under 2 minutes.</h2>

          <div className="relative pl-10 border-l-2 border-dashed border-slate-200 dark:border-white/10 space-y-14">
            {[
              { step: '1', title: 'Browse & filter grounds',  body: 'Open the grounds page. Filter by location, surface, or price. Each listing shows real photos and operating hours.' },
              { step: '2', title: 'Pick a date and slot',      body: 'Tap any ground to see a live calendar. Green slots are open. Select your time, confirm your party size.' },
              { step: '3', title: 'Pay securely',              body: 'Checkout via Khalti or eSewa. You\'ll get an instant booking confirmation with a reference code.' },
              { step: '4', title: 'Show up and play',          body: 'Arrive at the ground, show your booking code. The court is yours. Rate the experience after.' },
            ].map(({ step, title, body }) => (
              <div key={step} className="relative">
                {/* Timeline dot */}
                <div className="absolute -left-[2.85rem] top-0 w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-emerald-500/30">
                  {step}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* ══ TESTIMONIAL — single large quote, not cards ══════════════════════ */}
      <section className="px-6 md:px-14 py-28">
        <div className="max-w-4xl mx-auto">
          <Tag>Players say</Tag>
          {/* Big featured quote */}
          <blockquote className="mt-10 text-2xl md:text-4xl font-semibold leading-snug text-slate-800 dark:text-slate-100">
            &ldquo;Booking used to mean a dozen WhatsApp messages.
            Now I open Futsal Pay, pick a slot, pay — and we&apos;re playing
            the same evening. It&apos;s that simple.&rdquo;
          </blockquote>
          <div className="mt-8 flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">R</div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white text-sm">Rohan Shrestha</p>
              <p className="text-xs text-slate-400">Regular player · Kathmandu</p>
            </div>
          </div>

          {/* Two shorter pull-quotes below */}
          <div className="mt-16 grid sm:grid-cols-2 gap-px border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden">
            {[
              { q: 'My bookings went up 3x after listing on Futsal Pay. The owner dashboard is everything.',   name: 'Anil M.', role: 'Ground Owner' },
              { q: 'Finally an app built for Nepal. Khalti works perfectly, confirmation is instant.',         name: 'Priya T.', role: 'Team Captain' },
            ].map(({ q, name, role }) => (
              <div key={name} className="bg-slate-50 dark:bg-white/[0.02] p-8">
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6 italic">&ldquo;{q}&rdquo;</p>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{name} <span className="font-normal text-slate-400">· {role}</span></p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA — split halves, not centred card ════════════════════════════ */}
      <section className="grid md:grid-cols-2 min-h-[40vh]">
        <div className="bg-slate-900 dark:bg-[#060A14] flex flex-col justify-center px-10 md:px-16 py-20">
          <p className="text-xs font-bold tracking-[0.3em] uppercase text-emerald-400 mb-6">Get started</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">Ready to hit<br />the ground?</h2>
          <p className="mt-4 text-slate-400 text-sm max-w-xs leading-relaxed">Join thousands of players and ground owners. Free to join, no card required.</p>
        </div>
        <div className="bg-emerald-500 flex flex-col justify-center items-start px-10 md:px-16 py-20 gap-6">
          <h3 className="text-2xl md:text-3xl font-extrabold text-white">Start playing today.</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/signup" className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-emerald-700 hover:bg-emerald-50 transition-all">
              Create Free Account <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/grounds" className="inline-flex items-center gap-2 rounded-xl border-2 border-white/40 px-7 py-3.5 text-sm font-bold text-white hover:border-white transition-all">
              Browse Grounds
            </Link>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ═══════════════════════════════════════════════════════════ */}
      <footer className="border-t border-slate-200 dark:border-white/5 px-6 md:px-14 py-10 bg-white dark:bg-[#060A14]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <MapPin className="h-3.5 w-3.5 text-white" />
            </div>
            Futsal Pay
          </div>
          <div className="flex items-center gap-8 text-sm text-slate-400">
            <Link href="/grounds" className="hover:text-slate-900 dark:hover:text-white transition-colors">Browse Grounds</Link>
            <Link href="/login"   className="hover:text-slate-900 dark:hover:text-white transition-colors">Sign In</Link>
            <Link href="/signup"  className="hover:text-slate-900 dark:hover:text-white transition-colors">Sign Up</Link>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-600">© {new Date().getFullYear()} Futsal Pay</p>
        </div>
      </footer>
    </div>
  );
}
