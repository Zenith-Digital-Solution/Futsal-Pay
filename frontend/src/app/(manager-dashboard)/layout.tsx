'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { ManagerSidebar } from '@/components/layout/manager-sidebar';
import { Header } from '@/components/layout/header';

export default function ManagerDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole="manager">
      <div className="min-h-screen bg-gray-50 dark:bg-[#0A0F1E]">
        <ManagerSidebar />
        <Header />
        <main className="ml-64 pt-16 p-6">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
