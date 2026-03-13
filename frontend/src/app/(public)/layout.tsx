'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { getDashboardPath } from '@/lib/role-routing';
import { MapPin, Menu, X, Sun, Moon } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from 'next-themes';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-lg transition-colors text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
      aria-label="Toggle theme"
    >
      <Sun className="h-4 w-4 hidden dark:block" />
      <Moon className="h-4 w-4 block dark:hidden" />
    </button>
  );
}

function PublicNav() {
  const { user, isAuthenticated } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const dashPath = user ? getDashboardPath(user) : '/login';

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#0A0F1E]/80 border-b border-slate-200 dark:border-white/5 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-slate-900 dark:text-white">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
            <MapPin className="h-4 w-4 text-white" />
          </div>
          Futsal Pay
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-500 dark:text-slate-400">
          <Link href="/grounds" className="hover:text-slate-900 dark:hover:text-white transition-colors">Browse Grounds</Link>
          {isAuthenticated && user ? (
            <>
              <Link href={dashPath} className="hover:text-slate-900 dark:hover:text-white transition-colors">Dashboard</Link>
              <span className="text-slate-200 dark:text-slate-600">|</span>
              <span className="text-slate-700 dark:text-slate-300">{user.first_name || user.username}</span>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-slate-900 dark:hover:text-white transition-colors">Sign In</Link>
              <Link href="/signup" className="rounded-lg bg-emerald-500 px-4 py-2 text-white font-semibold hover:bg-emerald-400 transition-colors shadow-sm shadow-emerald-500/20">
                Sign Up
              </Link>
            </>
          )}
          <ThemeToggle />
        </nav>

        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle />
          <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-300" onClick={() => setMenuOpen((v) => !v)}>
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-slate-100 dark:border-white/5 bg-white dark:bg-[#0A0F1E] px-4 py-4 space-y-3 text-sm font-medium">
          <Link href="/grounds" className="block text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white" onClick={() => setMenuOpen(false)}>Browse Grounds</Link>
          {isAuthenticated && user ? (
            <Link href={dashPath} className="block text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white" onClick={() => setMenuOpen(false)}>Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="block text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white" onClick={() => setMenuOpen(false)}>Sign In</Link>
              <Link href="/signup" className="block text-emerald-600 font-semibold" onClick={() => setMenuOpen(false)}>Sign Up</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#0A0F1E]">
      <PublicNav />
      <main>{children}</main>
    </div>
  );
}
