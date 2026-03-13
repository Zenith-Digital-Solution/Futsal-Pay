'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { queryClient } from '@/lib/query-client';
import { PostHogProvider } from '@/components/analytics/posthog-provider';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <PostHogProvider />
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
