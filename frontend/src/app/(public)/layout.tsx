'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { usePathname } from 'next/navigation';
import { getDashboardPath } from '@/lib/role-routing';
import { MapPin, Menu, X } from 'lucide-react';
import { useState } from 'react';

function PublicNav() {
  const { user, isAuthenticated } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const dashPath = user ? getDashboardPath(user) : '/login';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-green-600">
          <MapPin className="h-5 w-5" />
          Futsal Pay
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link href="/grounds" className="hover:text-gray-900 transition-colors">Browse Grounds</Link>
          {isAuthenticated && user ? (
            <>
              <Link href={dashPath} className="hover:text-gray-900 transition-colors">Dashboard</Link>
              <span className="text-gray-300">|</span>
              <span className="text-gray-500">{user.first_name || user.username}</span>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-gray-900 transition-colors">Sign In</Link>
              <Link
                href="/signup"
                className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 transition-colors"
              >
                Sign Up
              </Link>
            </>
          )}
        </nav>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3 text-sm font-medium">
          <Link href="/grounds" className="block text-gray-700 hover:text-gray-900" onClick={() => setMenuOpen(false)}>Browse Grounds</Link>
          {isAuthenticated && user ? (
            <Link href={dashPath} className="block text-gray-700 hover:text-gray-900" onClick={() => setMenuOpen(false)}>Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="block text-gray-700 hover:text-gray-900" onClick={() => setMenuOpen(false)}>Sign In</Link>
              <Link href="/signup" className="block text-green-600 font-semibold" onClick={() => setMenuOpen(false)}>Sign Up</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />
      <main>{children}</main>
    </div>
  );
}

