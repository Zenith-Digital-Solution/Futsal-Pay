'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { TenantSidebar } from '@/components/layout/tenant-sidebar';
import { Header } from '@/components/layout/header';

export default function TenantDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole="tenant">
      <div className="min-h-screen bg-gray-50">
        <TenantSidebar />
        <Header />
        <main className="ml-64 pt-16 p-6">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
