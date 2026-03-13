"""
Public configuration endpoint.

Returns non-sensitive runtime config that the frontend needs to bootstrap
itself (e.g. which map provider to use and the corresponding public API key).
No authentication is required.
"""

from fastapi import APIRouter
from pydantic import BaseModel

from src.apps.core.config import settings

router = APIRouter(prefix="/config", tags=["config"])


class MapConfig(BaseModel):
    provider: str
    """Active map provider: 'osm' | 'mapbox' | 'google'"""

    api_key: str | None
    """Public API key for the active provider, or null for OSM (no key needed)."""


@router.get("/map", response_model=MapConfig)
async def get_map_config() -> MapConfig:
    """Return the active map provider and its public API key."""
    provider = settings.MAP_PROVIDER.lower()

    if provider == "mapbox":
        api_key = settings.MAPBOX_TOKEN or None
    elif provider == "google":
        api_key = settings.GOOGLE_MAPS_KEY or None
    else:
        provider = "osm"
        api_key = None

    return MapConfig(provider=provider, api_key=api_key)
