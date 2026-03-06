/**
 * Map provider type definitions and static defaults.
 *
 * The active provider is configured in the backend (MAP_PROVIDER env var)
 * and fetched at runtime via GET /api/v1/config/map.
 * Use the useMapConfig() hook to read provider + api_key in components.
 */

export type MapProviderName = 'osm' | 'mapbox' | 'google';

/**
 * Default map centre used when neither user location nor ground coordinates
 * are available. Currently set to the centre of Nepal.
 */
export const DEFAULT_CENTER: [number, number] = [28.3949, 84.124];

/** Default zoom level */
export const DEFAULT_ZOOM = 13;
