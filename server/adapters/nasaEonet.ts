/**
 * NASA EONET wildfire adapter.
 *
 * EONET is a public NASA Earth Observatory Natural Event Tracker feed.  It is
 * deliberately kept separate from FIRMS: an EONET event is an event report,
 * not a thermal-pixel detection and must never be presented as one.
 */
export interface NasaEonetWildfire {
  id: string;
  title: string;
  updated: string;
  sourceUrl: string | null;
  geometryType: 'Point' | 'Polygon' | 'Unknown';
  coordinates: [number, number][];
}

export class NasaEonetAdapter {
  private cached: { expiresAt: number; events: NasaEonetWildfire[] } | null = null;

  public async getOpenWildfires(): Promise<NasaEonetWildfire[]> {
    if (this.cached && this.cached.expiresAt > Date.now()) return this.cached.events;

    const response = await fetch(
      'https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires&status=open&limit=200',
      { headers: { 'User-Agent': 'ALEX-Scientific-Map/3.0' } }
    );
    if (!response.ok) throw new Error(`NASA EONET returned HTTP ${response.status}`);

    const payload: any = await response.json();
    const events: NasaEonetWildfire[] = (payload.events || []).flatMap((event: any) => {
      const geometry = Array.isArray(event.geometry) ? event.geometry.at(-1) : null;
      if (!geometry?.coordinates) return [];

      const coordinates: [number, number][] = geometry.type === 'Point'
        ? [geometry.coordinates]
        : geometry.type === 'Polygon'
          ? geometry.coordinates[0]
          : [];
      if (!coordinates.length) return [];

      return [{
        id: String(event.id),
        title: String(event.title || 'Unnamed NASA EONET wildfire'),
        updated: geometry.date || event.closed || new Date().toISOString(),
        sourceUrl: event.sources?.[0]?.url || null,
        geometryType: geometry.type === 'Point' || geometry.type === 'Polygon' ? geometry.type : 'Unknown',
        coordinates: coordinates.filter((point: unknown): point is [number, number] =>
          Array.isArray(point) && point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1])
        ),
      }];
    });

    this.cached = { events, expiresAt: Date.now() + 10 * 60 * 1000 };
    return events;
  }
}

export const nasaEonetAdapter = new NasaEonetAdapter();
