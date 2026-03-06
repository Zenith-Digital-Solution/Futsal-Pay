'use client';

/**
 * Google Maps Provider — uses Google Maps JavaScript API via @react-google-maps/api.
 *
 * To activate:
 *   1. Set MAP_PROVIDER=google in backend .env
 *   2. Set GOOGLE_MAPS_KEY=AIza... in backend .env
 *   3. Install deps: npm install @react-google-maps/api
 *   4. Replace this stub with the real implementation below the comment.
 *
 * Stub implementation reference:
 * ─────────────────────────────────────────────────────────────────────────────
 * import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api';
 * import { useState } from 'react';
 *
 * export default function GoogleProvider({ markers, userLocation, height = '60vh', apiKey }: MapProviderProps) {
 *   const { isLoaded } = useJsApiLoader({ googleMapsApiKey: apiKey ?? '' });
 *   const [activeId, setActiveId] = useState<string | null>(null);
 *   const center = userLocation
 *     ? { lat: userLocation.lat, lng: userLocation.lng }
 *     : { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] };
 *
 *   if (!isLoaded) return <div style={{ height }}>Loading Google Maps…</div>;
 *
 *   return (
 *     <GoogleMap mapContainerStyle={{ width: '100%', height }} center={center} zoom={DEFAULT_ZOOM}>
 *       {userLocation && <Marker position={center} label="You" />}
 *       {markers.map((m) => (
 *         <Marker
 *           key={m.id}
 *           position={{ lat: m.lat, lng: m.lng }}
 *           onClick={() => setActiveId(m.id)}
 *         />
 *       ))}
 *       {activeId && (() => {
 *         const m = markers.find((x) => x.id === activeId)!;
 *         return (
 *           <InfoWindow position={{ lat: m.lat, lng: m.lng }} onCloseClick={() => setActiveId(null)}>
 *             <>
 *               <strong>{m.name}</strong>
 *               <p>{m.description}</p>
 *               <a href={`/grounds/${m.id}`}>Go to Ground →</a>
 *             </>
 *           </InfoWindow>
 *         );
 *       })()}
 *     </GoogleMap>
 *   );
 * }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { MapProviderProps } from '../types';

export default function GoogleProvider({ height = '60vh' }: MapProviderProps) {
  return (
    <div
      style={{ height, borderRadius: '12px' }}
      className="flex flex-col items-center justify-center bg-gray-50 dark:bg-white/5 border border-dashed border-gray-300 dark:border-white/20"
    >
      <p className="text-2xl mb-3">🗺️</p>
      <p className="font-semibold text-gray-700 dark:text-slate-200">Google Maps Provider</p>
      <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 text-center max-w-xs">
        Set <code className="bg-gray-100 dark:bg-white/10 px-1 rounded">GOOGLE_MAPS_KEY</code> in backend{' '}
        <code className="bg-gray-100 dark:bg-white/10 px-1 rounded">.env</code> and
        install <code className="bg-gray-100 dark:bg-white/10 px-1 rounded">@react-google-maps/api</code> to activate.
      </p>
      <a
        href="https://developers.google.com/maps/documentation/javascript/get-api-key"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:underline"
      >
        Google Maps JS API docs →
      </a>
    </div>
  );
}
