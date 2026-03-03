'use client';

import { Button } from '@/components/ui/button';
import { startOAuthLogin, type OAuthProvider } from '@/lib/oauth';
import { useAnalytics } from '@/hooks/use-analytics';

type EventAction = 'user_signed_in' | 'user_signed_up';

interface SocialAuthButtonsProps {
  action: EventAction;
}

const PROVIDERS: { id: OAuthProvider; label: string; envKey: string }[] = [
  { id: 'google',   label: 'Google',   envKey: 'NEXT_PUBLIC_GOOGLE_ENABLED' },
  { id: 'github',   label: 'GitHub',   envKey: 'NEXT_PUBLIC_GITHUB_ENABLED' },
  { id: 'facebook', label: 'Facebook', envKey: 'NEXT_PUBLIC_FACEBOOK_ENABLED' },
];

function isProviderEnabled(envKey: string): boolean {
  // Resolved at runtime from NEXT_PUBLIC_* env vars
  const map: Record<string, string | undefined> = {
    NEXT_PUBLIC_GOOGLE_ENABLED:   process.env.NEXT_PUBLIC_GOOGLE_ENABLED,
    NEXT_PUBLIC_GITHUB_ENABLED:   process.env.NEXT_PUBLIC_GITHUB_ENABLED,
    NEXT_PUBLIC_FACEBOOK_ENABLED: process.env.NEXT_PUBLIC_FACEBOOK_ENABLED,
  };
  return map[envKey] === 'true';
}

export function SocialAuthButtons({ action }: SocialAuthButtonsProps) {
  const { track } = useAnalytics();

  const enabled = PROVIDERS.filter(p => isProviderEnabled(p.envKey));
  if (enabled.length === 0) return null;

  return (
    <>
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-gray-500">Or continue with</span>
        </div>
      </div>

      <div className={`grid gap-3 w-full grid-cols-${enabled.length}`}>
        {enabled.map(({ id, label }) => (
          <Button
            key={id}
            variant="outline"
            type="button"
            onClick={() => {
              track(action, { method: id });
              startOAuthLogin(id);
            }}
          >
            {label}
          </Button>
        ))}
      </div>
    </>
  );
}
