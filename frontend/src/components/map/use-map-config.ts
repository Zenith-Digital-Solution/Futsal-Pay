/**
 * useMapConfig — fetches the active map provider and API key from the backend.
 *
 * The backend reads MAP_PROVIDER / MAPBOX_TOKEN / GOOGLE_MAPS_KEY from its
 * environment variables and exposes them via GET /api/v1/config/map.
 * This hook is the single source of truth for which strategy to render.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { MapProviderName } from './map-config';

interface MapConfigResponse {
  provider: MapProviderName;
  api_key: string | null;
}

export function useMapConfig() {
  const { data, isLoading } = useQuery<MapConfigResponse>({
    queryKey: ['map-config'],
    queryFn: async () => {
      const { data } = await apiClient.get<MapConfigResponse>('/config/map');
      return data;
    },
    staleTime: Infinity, // provider never changes mid-session
  });

  return {
    provider: data?.provider ?? 'osm',
    apiKey: data?.api_key ?? null,
    isLoading,
  };
}
