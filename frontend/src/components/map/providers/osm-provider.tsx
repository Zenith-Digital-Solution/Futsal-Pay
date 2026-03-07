'use client';

/**
 * OSM Provider — uses Leaflet + OpenStreetMap tiles.
 * No API key required.
 *
 * To switch to this provider set ACTIVE_MAP_PROVIDER = 'osm' in map-config.ts.
 * Install deps (already done): npm install leaflet react-leaflet @types/leaflet
 */

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MapProviderProps } from '../types';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../map-config';

// Fix the webpack/Next.js broken default-icon path
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Icons ─────────────────────────────────────────────────────────────────────

/** Blue pulsing dot — current user position */
const userIcon = L.divIcon({
  html: `<div style="
    width:18px;height:18px;
    background:#2563eb;
    border:3px solid white;
    border-radius:50%;
    box-shadow:0 0 0 5px rgba(37,99,235,0.25),0 2px 8px rgba(0,0,0,0.3);
  "></div>`,
  className: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

/** Green label pin for a ground */
function makeGroundIcon(name: string) {
  const label = name.length > 22 ? name.slice(0, 20) + '…' : name;
  return L.divIcon({
    html: `
      <div style="
        display:inline-block;
        transform:translate(-50%, calc(-100% - 8px));
        background:#16a34a;color:#fff;
        border-radius:8px;padding:5px 10px;
        font-size:11px;font-weight:700;
        white-space:nowrap;
        box-shadow:0 2px 8px rgba(0,0,0,0.35);
        border:2px solid white;
        position:relative;
        line-height:1.4;
      ">
        <span style="display:inline-flex;align-items:center;gap:4px;">
          <span style="font-size:13px;line-height:1;">⚽</span>${label}
        </span>
        <div style="
          position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);
          width:0;height:0;
          border-left:7px solid transparent;
          border-right:7px solid transparent;
          border-top:8px solid #16a34a;
        "></div>
      </div>`,
    className: '',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -46],
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function stars(rating: number) {
  const full = Math.round(rating);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

/** Re-centres the map whenever the user location prop changes */
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

// ── Provider component ────────────────────────────────────────────────────────

export default function OSMProvider({ markers, userLocation, height = '60vh' }: MapProviderProps) {
  let center: [number, number] = DEFAULT_CENTER;

  if (userLocation) {
    center = [userLocation.lat, userLocation.lng];
  } else if (markers.length > 0) {
    const avgLat = markers.reduce((s, m) => s + m.lat, 0) / markers.length;
    const avgLng = markers.reduce((s, m) => s + m.lng, 0) / markers.length;
    center = [avgLat, avgLng];
  }

  return (
    <div style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
      <MapContainer center={center} zoom={DEFAULT_ZOOM} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User location marker */}
        {userLocation && (
          <>
            <RecenterMap lat={userLocation.lat} lng={userLocation.lng} />
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
              <Popup>
                <div style={{ fontWeight: 700, color: '#1d4ed8', fontSize: '13px' }}>
                  📍 You are here
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* Ground markers */}
        {markers.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={makeGroundIcon(m.name)}>
            <Popup maxWidth={280} minWidth={220}>
              <div style={{ fontFamily: 'inherit', lineHeight: 1.4 }}>
                <h3 style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 4px', color: '#111' }}>
                  {m.name}
                </h3>
                <div style={{ fontSize: '12px', color: '#555', marginBottom: '4px' }}>
                  📍 {m.location}
                </div>
                {m.description && (
                  <p style={{ fontSize: '12px', color: '#444', margin: '0 0 6px', lineHeight: 1.5 }}>
                    {m.description.length > 110 ? m.description.slice(0, 108) + '…' : m.description}
                  </p>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <span style={{ color: '#f59e0b', fontSize: '13px', letterSpacing: '1px' }}>
                    {stars(m.average_rating)}
                  </span>
                  <span style={{ fontSize: '12px', color: '#555' }}>
                    {m.average_rating.toFixed(1)} ({m.rating_count})
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: '#16a34a' }}>
                    Rs. {m.price_per_hour.toLocaleString()}/hr
                  </span>
                  <a
                    href={`/grounds/${m.id}`}
                    style={{
                      background: '#16a34a', color: '#fff',
                      padding: '5px 12px', borderRadius: '6px',
                      fontSize: '12px', fontWeight: 700, textDecoration: 'none',
                    }}
                  >
                    Go to Ground →
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
