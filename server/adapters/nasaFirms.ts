/**
 * NASA FIRMS Active-Fire Adapter — v2.7.0
 *
 * PRODUCT DISTINCTION (SCI-01):
 *   MODIS_1KM    — MODIS Terra & Aqua Collection 6.1, ~1 km nadir active fire
 *   VIIRS_375M   — VIIRS I-band 375 m enhanced-resolution product (SNPP, NOAA-20, NOAA-21)
 *   VIIRS_750M   — VIIRS M-band 750 m continuity product (not yet available in NRT API; BLOCKED)
 *
 * DATA INTEGRITY (DATA-05, DATA-06):
 *   - VIIRS confidence classes (low/nominal/high) are preserved as native strings; never converted
 *     to invented numeric percentages.
 *   - Missing FRP, brightness temperature, scan, track values are preserved as null.
 *   - Silent defaults (frpMw: 15.0, brightness: 310.0) are PROHIBITED.
 *   - CSV parsing handles RFC 4180 quoted fields to prevent field corruption.
 *
 * Source: https://firms.modaps.eosdis.nasa.gov/api/
 */

import https from 'https';

export type ProductLayer = 'MODIS_1KM' | 'VIIRS_375M' | 'VIIRS_750M';
export type ViirsCategoryConfidence = 'low' | 'nominal' | 'high';
export type ModisNumericConfidence = number; // 0-100 as reported by source

/**
 * Raw satellite observation record preserving all native source fields.
 * Fields may be null where source data is absent or invalid — never silently defaulted.
 */
export interface RawSatelliteObservation {
  // Observation identity
  id: string;
  sourceProvider: 'NASA_FIRMS';
  sourceProductId: string;       // e.g. 'VIIRS_NOAA20_NRT', 'MODIS_NRT'
  productLayer: ProductLayer;
  satellite: string;             // e.g. 'N20', 'Terra', 'Aqua', 'NPP', 'N21'
  sensor: string;                // e.g. 'VIIRS', 'MODIS'

  // Acquisition geometry
  acquisitionTimestampUtc: string;   // ISO-8601 UTC
  ingestionTimestampUtc: string;     // When ALEX received this record
  lat: number;
  lng: number;

  // Native source measurements — null when absent or invalid in source
  frpMw: number | null;              // Fire Radiative Power in MW (null if missing)
  brightnessKelvin: number | null;   // Band 21/22 brightness temperature in Kelvin
  brightness2Kelvin: number | null;  // Band 31 background temperature (MODIS T31 / VIIRS BT21)
  scanKm: number | null;             // Pixel scan dimension in km (null if missing)
  trackKm: number | null;            // Pixel track dimension in km (null if missing)

  // Confidence — NEVER converted across types; preserved exactly as source provides
  // MODIS: integer 0-100; VIIRS: categorical string 'low'/'nominal'/'high'
  modisConfidencePct: ModisNumericConfidence | null;
  viirsConfidenceCategory: ViirsCategoryConfidence | null;

  // Observation context
  dayNight: 'D' | 'N' | null;
  version: string | null;           // Product version (e.g. '6.1NRT')
  type: number | null;              // MODIS fire type flag (0-3)
}

export type FirmsApiSensor =
  | 'MODIS_NRT'
  | 'MODIS_SP'
  | 'VIIRS_SNPP_NRT'
  | 'VIIRS_SNPP_SP'
  | 'VIIRS_NOAA20_NRT'
  | 'VIIRS_NOAA20_SP'
  | 'VIIRS_NOAA21_NRT'
  | 'VIIRS_NOAA21_SP';

export interface FirmsFetchOptions {
  mapKey?: string;
  sensor?: FirmsApiSensor;
  days?: number; // 1-10
  areaBbox?: [number, number, number, number]; // [west, south, east, north]
  country?: string; // ISO-3 country code e.g. 'IND'
  dateStr?: string; // optional YYYY-MM-DD
}

export interface FirmsFetchResult {
  observations: RawSatelliteObservation[];
  isLive: boolean;
  queryType: 'area_bbox' | 'country';
  providerNotice: string;
  ingestionTimestamp: string;
  recordCount: number;
}

// Maps API sensor key to product layer and satellite identity
const SENSOR_METADATA: Record<string, { productLayer: ProductLayer; satelliteHint: string }> = {
  MODIS_NRT: { productLayer: 'MODIS_1KM', satelliteHint: 'MODIS' },
  MODIS_SP: { productLayer: 'MODIS_1KM', satelliteHint: 'MODIS' },
  VIIRS_SNPP_NRT: { productLayer: 'VIIRS_375M', satelliteHint: 'NPP' },
  VIIRS_SNPP_SP: { productLayer: 'VIIRS_375M', satelliteHint: 'NPP' },
  VIIRS_NOAA20_NRT: { productLayer: 'VIIRS_375M', satelliteHint: 'N20' },
  VIIRS_NOAA20_SP: { productLayer: 'VIIRS_375M', satelliteHint: 'N20' },
  VIIRS_NOAA21_NRT: { productLayer: 'VIIRS_375M', satelliteHint: 'N21' },
  VIIRS_NOAA21_SP: { productLayer: 'VIIRS_375M', satelliteHint: 'N21' },
};

/**
 * Parse RFC 4180 CSV correctly, handling quoted fields with embedded commas.
 * Prevents field corruption from naive comma-splitting on geospatial CSV data.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = false; }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { fields.push(current.trim()); current = ''; }
      else { current += ch; }
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseNullableFloat(val: string | undefined): number | null {
  if (!val || val.trim() === '' || val.trim().toLowerCase() === 'nan') return null;
  const n = parseFloat(val.trim());
  return isNaN(n) ? null : n;
}

function parseNullableInt(val: string | undefined): number | null {
  if (!val || val.trim() === '') return null;
  const n = parseInt(val.trim(), 10);
  return isNaN(n) ? null : n;
}

export class NasaFirmsAdapter {
  private explicitKey: string | null;

  constructor(mapKey?: string) {
    this.explicitKey = mapKey || null;
  }

  public get mapKey(): string | null {
    return (
      this.explicitKey ||
      process.env.NASA_FIRMS_MAP_KEY ||
      process.env.FIRMS_MAP_KEY ||
      process.env.FIRMS_API_KEY ||
      null
    );
  }

  public getStatus(): {
    configured: boolean;
    provider: string;
    message: string;
    supportedProducts: Array<{ id: FirmsApiSensor; productLayer: ProductLayer; description: string }>;
    supportedSensors: string[];
  } {
    const supportedProducts = [
      { id: 'MODIS_NRT' as FirmsApiSensor, productLayer: 'MODIS_1KM' as ProductLayer, description: 'MODIS Terra & Aqua ~1 km active fire (Collection 6.1 NRT)' },
      { id: 'MODIS_SP' as FirmsApiSensor, productLayer: 'MODIS_1KM' as ProductLayer, description: 'MODIS Terra & Aqua Standard Science Quality Archive' },
      { id: 'VIIRS_SNPP_NRT' as FirmsApiSensor, productLayer: 'VIIRS_375M' as ProductLayer, description: 'VIIRS Suomi-NPP 375 m active fire (NRT)' },
      { id: 'VIIRS_NOAA20_NRT' as FirmsApiSensor, productLayer: 'VIIRS_375M' as ProductLayer, description: 'VIIRS NOAA-20 (JPSS-1) 375 m active fire (NRT)' },
      { id: 'VIIRS_NOAA21_NRT' as FirmsApiSensor, productLayer: 'VIIRS_375M' as ProductLayer, description: 'VIIRS NOAA-21 (JPSS-2) 375 m active fire (NRT)' },
    ];
    const supportedSensors = supportedProducts.map((p) => `${p.id} (${p.description})`);

    if (!this.mapKey) {
      return {
        configured: false,
        provider: 'NASA FIRMS Near-Real-Time',
        message: 'Awaiting NASA_FIRMS_MAP_KEY. Obtain a free key at https://firms.modaps.eosdis.nasa.gov/api/map_key/',
        supportedProducts,
        supportedSensors,
      };
    }
    return {
      configured: true,
      provider: 'NASA FIRMS Near-Real-Time',
      message: 'NASA FIRMS NRT key configured. Ready for AOI and Country queries.',
      supportedProducts,
      supportedSensors,
    };
  }

  /**
   * Fetch real active-fire hotspot detections from NASA FIRMS NRT API.
   * Returns RawSatelliteObservation records with all native fields preserved.
   * Missing values remain null — no synthetic defaults.
   */
  public async fetchObservations(options: FirmsFetchOptions = {}): Promise<FirmsFetchResult> {
    const ingestionTimestamp = new Date().toISOString();
    const key = options.mapKey || this.mapKey;
    const queryType: 'area_bbox' | 'country' = options.areaBbox ? 'area_bbox' : 'country';

    if (!key) {
      return {
        observations: [],
        isLive: false,
        queryType,
        providerNotice: 'NASA_FIRMS_MAP_KEY not supplied. No synthetic fallback. Set key to enable NRT ingestion.',
        ingestionTimestamp,
        recordCount: 0,
      };
    }

    const sensor: FirmsApiSensor = options.sensor || 'VIIRS_NOAA20_NRT';
    const days = Math.min(Math.max(options.days || 1, 1), 10);

    let url: string;
    if (options.areaBbox && options.areaBbox.length === 4) {
      const bboxStr = options.areaBbox.join(',');
      url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/${sensor}/${bboxStr}/${days}`;
      if (options.dateStr) url += `/${options.dateStr}`;
    } else {
      const country = options.country || 'IND';
      url = `https://firms.modaps.eosdis.nasa.gov/api/country/csv/${key}/${sensor}/${country}/${days}`;
      if (options.dateStr) url += `/${options.dateStr}`;
    }

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const csvText = await new Promise<string>((resolve, reject) => {
          const req = https.get(url, { family: 4, timeout: 12000, headers: { 'User-Agent': 'FireLens-Science/3.0' } }, (res) => {
            let data = '';
            res.on('data', (c) => (data += c));
            res.on('end', () => {
              if (res.statusCode === 429) {
                reject(new Error('HTTP 429'));
              } else if (res.statusCode && res.statusCode >= 400) {
                reject(new Error(`HTTP ${res.statusCode}: ${data}`));
              } else {
                resolve(data);
              }
            });
          });
          req.on('error', (e) => reject(e));
          req.on('timeout', () => {
            req.destroy();
            reject(new Error(`Timeout fetching ${url}`));
          });
        });

        const observations = this.parseFirmsCsv(csvText, sensor, ingestionTimestamp);

        return {
          observations,
          isLive: true,
          queryType,
          providerNotice: `Ingested ${observations.length} observations from NASA FIRMS ${sensor} (${queryType}).`,
          ingestionTimestamp,
          recordCount: observations.length,
        };
      } catch (err: any) {
        lastError = err;
        if (err.message === 'HTTP 429') {
          await new Promise((r) => setTimeout(r, attempt * 2000));
        } else if (attempt < 3) {
          await new Promise((r) => setTimeout(r, attempt * 1000));
        }
      }
    }

    return {
      observations: [],
      isLive: false,
      queryType,
      providerNotice: `NASA FIRMS fetch failed after 3 attempts: ${lastError?.message || 'Network error'}. No synthetic fallback.`,
      ingestionTimestamp,
      recordCount: 0,
    };
  }

  /**
   * Parse FIRMS CSV with RFC 4180 field handling.
   * DATA-05: Confidence categories preserved as native strings; NEVER converted to invented numbers.
   * DATA-06: Missing numeric fields stored as null; NEVER silently defaulted.
   */
  public parseFirmsCsv(
    csv: string,
    sensorKey: FirmsApiSensor,
    ingestionTimestamp: string = new Date().toISOString()
  ): RawSatelliteObservation[] {
    const lines = csv.split('\n').filter((l) => l.trim().length > 0);
    if (lines.length <= 1) return [];

    const headerLine = lines[0];
    const headers = parseCsvLine(headerLine).map((h) => h.toLowerCase().replace(/\s+/g, '_'));

    const idx = (name: string) => headers.indexOf(name);
    const latIdx = idx('latitude');
    const lngIdx = idx('longitude');
    const brightIdx = idx('brightness');
    const bright2Idx = idx('bright_t31');
    const scanIdx = idx('scan');
    const trackIdx = idx('track');
    const dateIdx = idx('acq_date');
    const timeIdx = idx('acq_time');
    const satIdx = idx('satellite');
    const confIdx = idx('confidence');
    const frpIdx = idx('frp');
    const dayNightIdx = idx('daynight');
    const versionIdx = idx('version');
    const typeIdx = idx('type');

    if (latIdx < 0 || lngIdx < 0) {
      console.warn('FIRMS CSV missing required latitude/longitude columns');
      return [];
    }

    const { productLayer } = SENSOR_METADATA[sensorKey] || { productLayer: 'VIIRS_375M' };
    const isModis = sensorKey === 'MODIS_NRT';

    const results: RawSatelliteObservation[] = [];
    const seenKeys = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const parts = parseCsvLine(lines[i]);
      if (parts.length < 3) continue;

      const lat = parseNullableFloat(parts[latIdx]);
      const lng = parseNullableFloat(parts[lngIdx]);
      if (lat === null || lng === null) continue;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;

      const dateStr = parts[dateIdx] || '';
      const timeStr = (parts[timeIdx] || '0000').padStart(4, '0');
      if (!dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) continue;
      const acquisitionTimestampUtc = `${dateStr}T${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}:00Z`;

      // Satellite identification from source field
      const satVal = (parts[satIdx] || '').trim().toUpperCase();
      let satellite = satVal || SENSOR_METADATA[sensorKey]?.satelliteHint || 'UNKNOWN';
      // Normalize common abbreviations
      if (satVal.includes('TERRA') || satVal === 'T') satellite = 'Terra';
      else if (satVal.includes('AQUA') || satVal === 'A') satellite = 'Aqua';
      else if (satVal.includes('NPP') || satVal.includes('SNPP') || satVal === 'N') satellite = 'NPP';
      else if (satVal.includes('20') || satVal.includes('N20') || satVal === '1') satellite = 'N20';
      else if (satVal.includes('21') || satVal.includes('N21') || satVal === '2') satellite = 'N21';

      // Deduplication: sensor + coordinate + timestamp
      const dedupKey = `${sensorKey}_${lat.toFixed(4)}_${lng.toFixed(4)}_${acquisitionTimestampUtc}`;
      if (seenKeys.has(dedupKey)) continue;
      seenKeys.add(dedupKey);

      // DATA-06: No silent defaults. Missing → null.
      const frpMw = parseNullableFloat(parts[frpIdx]);
      const brightnessKelvin = parseNullableFloat(parts[brightIdx]);
      const brightness2Kelvin = bright2Idx >= 0 ? parseNullableFloat(parts[bright2Idx]) : null;
      const scanKm = parseNullableFloat(parts[scanIdx]);
      const trackKm = parseNullableFloat(parts[trackIdx]);

      // DATA-05: Confidence preservation.
      // MODIS provides integer 0-100. VIIRS provides categorical strings.
      let modisConfidencePct: number | null = null;
      let viirsConfidenceCategory: ViirsCategoryConfidence | null = null;

      const confRaw = (parts[confIdx] || '').trim().toLowerCase();
      if (isModis) {
        // MODIS: numeric confidence 0-100
        const num = parseNullableFloat(parts[confIdx]);
        modisConfidencePct = (num !== null && num >= 0 && num <= 100) ? num : null;
      } else {
        // VIIRS: categorical — 'l', 'n', 'h' or full words
        if (confRaw === 'l' || confRaw === 'low') viirsConfidenceCategory = 'low';
        else if (confRaw === 'n' || confRaw === 'nominal') viirsConfidenceCategory = 'nominal';
        else if (confRaw === 'h' || confRaw === 'high') viirsConfidenceCategory = 'high';
        // Unknown/missing → remains null (never default to any category)
      }

      const dayNightRaw = (parts[dayNightIdx] || '').trim().toUpperCase();
      const dayNight: 'D' | 'N' | null = dayNightRaw === 'D' ? 'D' : dayNightRaw === 'N' ? 'N' : null;

      results.push({
        id: `FIRMS-${sensorKey}-${satellite}-${lat.toFixed(5)}-${lng.toFixed(5)}-${acquisitionTimestampUtc.replace(/[:\-TZ]/g, '')}`,
        sourceProvider: 'NASA_FIRMS',
        sourceProductId: sensorKey,
        productLayer,
        satellite,
        sensor: isModis ? 'MODIS' : 'VIIRS',
        acquisitionTimestampUtc,
        ingestionTimestampUtc: ingestionTimestamp,
        lat,
        lng,
        frpMw,
        brightnessKelvin,
        brightness2Kelvin,
        scanKm,
        trackKm,
        modisConfidencePct,
        viirsConfidenceCategory,
        dayNight,
        version: versionIdx >= 0 ? (parts[versionIdx] || null) : null,
        type: typeIdx >= 0 ? parseNullableInt(parts[typeIdx]) : null,
      });
    }

    return results;
  }
}

export const nasaFirmsAdapter = new NasaFirmsAdapter();
