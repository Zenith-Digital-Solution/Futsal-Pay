/**
 * Shared types for the Map Strategy Pattern.
 *
 * Each provider (OSM, Mapbox, Google) receives a `MapProviderProps` object
 * and is responsible for rendering the map using its own SDK/tiles.
 */

export interface GroundMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  location: string;
  description?: string;
  average_rating: number;
  rating_count: number;
  price_per_hour: number;
}

export interface MapProviderProps {
  markers: GroundMarker[];
  userLocation: { lat: number; lng: number } | null;
  /** CSS height of the map container, e.g. "60vh" or "500px" */
  height?: string;
  /** Public API key for the active provider (null for OSM) */
  apiKey?: string | null;
}
