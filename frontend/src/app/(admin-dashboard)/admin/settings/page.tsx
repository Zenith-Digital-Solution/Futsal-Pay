'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth-store';
import {
  Shield,
  Bell,
  Database,
  Globe,
  Key,
  Info,
} from 'lucide-react';

const TABS = [
  { id: 'platform', label: 'Platform', icon: Globe },
  { id: 'security', label: 'Security',  icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'about', label: 'About', icon: Info },
] as const;

type TabId = (typeof TABS)[number]['id'];

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-blue-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div className="ml-6 flex-shrink-0">{children}</div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const { user } = useAuthStore();

  // Platform toggles (UI-only — wire to backend config API as needed)
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [emailVerification, setEmailVerification] = useState(true);
  const [twoFARequired, setTwoFARequired] = useState(false);
  const [rateLimitEnabled, setRateLimitEnabled] = useState(true);
  const [adminNotifications, setAdminNotifications] = useState(true);
  const [ownerAlerts, setOwnerAlerts] = useState(true);

  const [activeTab, setActiveTab] = useState<TabId>('platform');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
        <p className="text-gray-500 mt-1">
          Manage global platform configuration. Logged in as{' '}
          <span className="font-medium text-blue-600">
            {user?.email ?? 'superuser'}
          </span>
          .
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'platform' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Globe className="h-5 w-5 text-blue-600" />
              Platform Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SettingRow
              label="Maintenance Mode"
              description="Temporarily disable access for all non-superusers."
            >
              <Toggle checked={maintenanceMode} onChange={setMaintenanceMode} />
            </SettingRow>
            <SettingRow
              label="Open Registration"
              description="Allow new users to sign up."
            >
              <Toggle checked={registrationOpen} onChange={setRegistrationOpen} />
            </SettingRow>
            <SettingRow
              label="Email Verification Required"
              description="Users must verify their email before accessing the platform."
            >
              <Toggle checked={emailVerification} onChange={setEmailVerification} />
            </SettingRow>

            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-700 flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                Some settings require a server restart or environment variable change (e.g.{' '}
                <code className="font-mono bg-amber-100 px-1 rounded">PAYOUT_MODE</code>).
                Contact your DevOps team for infrastructure-level changes.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'security' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Shield className="h-5 w-5 text-blue-600" />
              Security Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SettingRow
              label="Require 2FA for All Users"
              description="Force all users to enable two-factor authentication."
            >
              <Toggle checked={twoFARequired} onChange={setTwoFARequired} />
            </SettingRow>
            <SettingRow
              label="Rate Limiting"
              description="Enforce API rate limits (100 req/min default)."
            >
              <Toggle checked={rateLimitEnabled} onChange={setRateLimitEnabled} />
            </SettingRow>
            <SettingRow
              label="JWT Secret"
              description="The signing key for access tokens."
            >
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Key className="h-4 w-4" />
                <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">
                  ••••••••••••••••
                </span>
              </div>
            </SettingRow>
            <SettingRow
              label="Active Sessions"
              description="Manage all platform login sessions."
            >
              <a
                href="/admin/sessions"
                className="text-sm text-blue-600 hover:underline font-medium"
              >
                View Sessions →
              </a>
            </SettingRow>
          </CardContent>
        </Card>
      )}

      {activeTab === 'notifications' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Bell className="h-5 w-5 text-blue-600" />
              Notification Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SettingRow
              label="Admin Alert Emails"
              description="Receive email alerts for critical platform events."
            >
              <Toggle checked={adminNotifications} onChange={setAdminNotifications} />
            </SettingRow>
            <SettingRow
              label="Owner Alerts"
              description="Notify ground owners of subscription and payout events."
            >
              <Toggle checked={ownerAlerts} onChange={setOwnerAlerts} />
            </SettingRow>
          </CardContent>
        </Card>
      )}

      {activeTab === 'about' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Database className="h-5 w-5 text-blue-600" />
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Application', value: 'Futsal Pay Platform' },
                { label: 'Version', value: '0.1.0' },
                { label: 'Backend', value: 'FastAPI + SQLite' },
                { label: 'Frontend', value: 'Next.js 14 (App Router)' },
                { label: 'Auth', value: 'JWT + Casbin RBAC' },
                { label: 'Superuser', value: user?.email ?? '—' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-gray-500">{item.label}</span>
                  <span className="font-medium text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
