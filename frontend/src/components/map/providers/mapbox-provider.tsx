'use client';

/**
 * Mapbox Provider — uses Mapbox GL JS via react-map-gl.
 *
 * To activate:
 *   1. Set ACTIVE_MAP_PROVIDER = 'mapbox' in map-config.ts
 *   2. Add your token: NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...
 *   3. Install deps: npm install mapbox-gl react-map-gl @types/mapbox-gl
 *   4. Replace this stub with the real implementation below the comment.
 *
 * Stub implementation reference:
 * ─────────────────────────────────────────────────────────────────────────────
 * import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/mapbox';
 * import 'mapbox-gl/dist/mapbox-gl.css';
 *
 * export default function MapboxProvider({ markers, userLocation, height = '60vh' }: MapProviderProps) {
 *   const [popupId, setPopupId] = useState<string | null>(null);
 *   const center = userLocation ?? { lng: DEFAULT_CENTER[1], lat: DEFAULT_CENTER[0] };
 *
 *   return (
 *     <Map
 *       mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
 *       initialViewState={{ longitude: center.lng, latitude: center.lat, zoom: DEFAULT_ZOOM }}
 *       style={{ width: '100%', height }}
 *       mapStyle="mapbox://styles/mapbox/streets-v12"
 *     >
 *       <NavigationControl />
 *       {markers.map((m) => (
 *         <Marker key={m.id} longitude={m.lng} latitude={m.lat} onClick={() => setPopupId(m.id)}>
 *           <span style={{ fontSize: '24px', cursor: 'pointer' }}>⚽</span>
 *         </Marker>
 *       ))}
 *       {popupId && (() => {
 *         const m = markers.find((x) => x.id === popupId)!;
 *         return (
 *           <Popup longitude={m.lng} latitude={m.lat} onClose={() => setPopupId(null)}>
 *             <strong>{m.name}</strong>
 *             <p>{m.description}</p>
 *             <a href={`/grounds/${m.id}`}>Go to Ground →</a>
 *           </Popup>
 *         );
 *       })()}
 *     </Map>
 *   );
 * }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { MapProviderProps } from '../types';

export default function MapboxProvider({ height = '60vh' }: MapProviderProps) {
  return (
    <div
      style={{ height, borderRadius: '12px' }}
      className="flex flex-col items-center justify-center bg-gray-50 dark:bg-white/5 border border-dashed border-gray-300 dark:border-white/20"
    >
      <p className="text-2xl mb-3">🗺️</p>
      <p className="font-semibold text-gray-700 dark:text-slate-200">Mapbox Provider</p>
      <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 text-center max-w-xs">
        Set <code className="bg-gray-100 dark:bg-white/10 px-1 rounded">NEXT_PUBLIC_MAPBOX_TOKEN</code> and
        install <code className="bg-gray-100 dark:bg-white/10 px-1 rounded">react-map-gl mapbox-gl</code> to activate.
      </p>
      <a
        href="https://docs.mapbox.com/mapbox-gl-js/guides/"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:underline"
      >
        Mapbox GL JS docs →
      </a>
    </div>
  );
}
