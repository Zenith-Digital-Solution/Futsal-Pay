'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { SubscriptionGate } from '@/components/auth/subscription-gate';
import { OwnerSidebar } from '@/components/layout/owner-sidebar';
import { Header } from '@/components/layout/header';

export default function OwnerDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole="owner">
      <SubscriptionGate>
        <div className="min-h-screen bg-gray-50 dark:bg-[#0A0F1E]">
          <OwnerSidebar />
          <Header />
          <main className="ml-64 pt-16 p-6">{children}</main>
        </div>
      </SubscriptionGate>
    </ProtectedRoute>
  );
}
