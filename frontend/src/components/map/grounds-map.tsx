'use client';

/**
 * GroundsMap — Strategy Pattern orchestrator.
 *
 * This component is the single entry point for the map feature.
 * It:
 *   1. Fetches the active provider + API key from the backend (useMapConfig)
 *   2. Converts FutsalGround[] → GroundMarker[] (filtering out entries with no coords)
 *   3. Delegates rendering to the correct provider component
 *
 * To switch providers, change MAP_PROVIDER in the backend .env — no frontend
 * code changes are needed.
 *
 * Providers:
 *   osm     → providers/osm-provider.tsx     (Leaflet, no key needed)
 *   mapbox  → providers/mapbox-provider.tsx  (react-map-gl, needs MAPBOX_TOKEN)
 *   google  → providers/google-provider.tsx  (Google Maps JS, needs GOOGLE_MAPS_KEY)
 */

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import type { FutsalGround } from '@/hooks/use-futsal';
import type { MapProviderProps } from './types';
import { useMapConfig } from './use-map-config';

// Pre-declare all three dynamic imports so Next.js can analyse them at build
// time. Only the active one will actually be rendered.
const mapLoader = {
  loading: () => (
    <div className="flex items-center justify-center h-full w-full">
      <div className="flex flex-col items-center gap-2 text-gray-400">
        <Loader2 className="h-7 w-7 animate-spin" />
        <span className="text-sm">Loading map…</span>
      </div>
    </div>
  ),
};

const OSMProvider = dynamic(
  () => import('./providers/osm-provider'),
  { ssr: false, ...mapLoader },
);

const MapboxProvider = dynamic(
  () => import('./providers/mapbox-provider'),
  { ssr: false, ...mapLoader },
);

const GoogleProvider = dynamic(
  () => import('./providers/google-provider'),
  { ssr: false, ...mapLoader },
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function toMarkers(grounds: FutsalGround[]) {
  return grounds
    .filter((g) => g.latitude != null && g.longitude != null)
    .map((g) => ({
      id: g.id,
      name: g.name,
      lat: g.latitude!,
      lng: g.longitude!,
      location: g.location,
      description: g.description,
      average_rating: g.average_rating,
      rating_count: g.rating_count,
      price_per_hour: g.price_per_hour,
    }));
}

// ── Component ─────────────────────────────────────────────────────────────────

interface GroundsMapProps {
  grounds: FutsalGround[];
  userLocation: { lat: number; lng: number } | null;
  height?: string;
}

export default function GroundsMap({ grounds, userLocation, height = '60vh' }: GroundsMapProps) {
  const { provider, apiKey, isLoading: configLoading } = useMapConfig();

  const markers = toMarkers(grounds);

  const providerProps: MapProviderProps = { markers, userLocation, height, apiKey };

  if (configLoading) {
    return (
      <div
        style={{ height, borderRadius: '12px' }}
        className="flex items-center justify-center bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10"
      >
        <div className="flex flex-col items-center gap-2 text-gray-400">
          <Loader2 className="h-7 w-7 animate-spin" />
          <span className="text-sm">Loading map config…</span>
        </div>
      </div>
    );
  }

  if (provider === 'mapbox') return <MapboxProvider {...providerProps} />;
  if (provider === 'google') return <GoogleProvider {...providerProps} />;
  return <OSMProvider {...providerProps} />;
}
