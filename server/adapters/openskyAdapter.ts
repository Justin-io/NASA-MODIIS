/**
 * OpenSky Network Adapter
 * Fetches live ADS-B aircraft state vectors and classifies aerial fire responders.
 * Env: OPENSKY_USERNAME, OPENSKY_PASSWORD (Basic Auth)
 * API: https://opensky-network.org/api/states/all
 */

interface BoundingBox {
  latMin: number;
  lngMin: number;
  latMax: number;
  lngMax: number;
}

/** OpenSky raw state vector tuple (index-mapped per API spec). */
type StateVector = [
  string,         // 0  icao24
  string | null,  // 1  callsign
  string,         // 2  origin_country
  number | null,  // 3  time_position
  number,         // 4  last_contact
  number | null,  // 5  longitude
  number | null,  // 6  latitude
  number | null,  // 7  baro_altitude (m)
  boolean,        // 8  on_ground
  number | null,  // 9  velocity (m/s)
  number | null,  // 10 true_track (deg)
  number | null,  // 11 vertical_rate (m/s)
  number[] | null,// 12 sensors
  number | null,  // 13 geo_altitude (m)
  string | null,  // 14 squawk
  boolean,        // 15 spi
  number,         // 16 position_source
];

interface OpenSkyResponse {
  time: number;
  states: StateVector[] | null;
}

export type AircraftType = 'TANKER' | 'HELICOPTER' | 'UNKNOWN';

export interface AircraftState {
  icao24:         string;
  callsign:       string | null;
  originCountry:  string;
  lat:            number | null;
  lng:            number | null;
  altitudeM:      number | null;
  onGround:       boolean;
  velocityMs:     number | null;
  trackDeg:       number | null;
  verticalRateMs: number | null;
  squawk:         string | null;
  lastContact:    number;
}

export interface AerialResponder extends AircraftState {
  aircraftType:   AircraftType;
  responderClass: string;
}

/** Region bounding boxes (lat/lng). */
const REGION_BBOXES: Record<string, BoundingBox> = {
  'REG-NILGIRI':  { latMin: 11.0, lngMin: 76.0, latMax: 12.5, lngMax: 77.5 },
  'REG-SIERRA':   { latMin: 36.0, lngMin: -121.0, latMax: 39.0, lngMax: -118.0 },
  'REG-ARCADIA':  { latMin: 37.0, lngMin: -8.5, latMax: 42.0, lngMax: -6.0 },
  'REG-PANTANAL': { latMin: -21.0, lngMin: -58.5, latMax: -16.0, lngMax: -54.0 },
};

/** Callsign prefixes/substrings that indicate a fire aerial responder. */
const TANKER_PATTERNS    = ['TANKER', 'TNK', 'AIRTANKER', 'RETARDANT', 'P2V', 'P-3', 'C-130', 'DC-10', 'B747'];
const HELICOPTER_PATTERNS = ['HELITACK', 'HELI', 'HAWK', 'HAWK', 'S-61', 'S-70', 'UH-1', 'BELL', 'CHINOOK'];
const AIR_ATTACK_PATTERNS = ['AIR ATTACK', 'AIRATK', 'ATKS', 'OV-10', 'LEAD PLANE', 'LEADPLANE'];

function classifyCallsign(callsign: string | null): { aircraftType: AircraftType; responderClass: string } | null {
  if (!callsign) return null;
  const cs = callsign.trim().toUpperCase();

  for (const p of TANKER_PATTERNS) {
    if (cs.includes(p)) return { aircraftType: 'TANKER', responderClass: 'AIR_TANKER' };
  }
  for (const p of HELICOPTER_PATTERNS) {
    if (cs.includes(p)) return { aircraftType: 'HELICOPTER', responderClass: 'HELITACK' };
  }
  for (const p of AIR_ATTACK_PATTERNS) {
    if (cs.includes(p)) return { aircraftType: 'TANKER', responderClass: 'AIR_ATTACK' };
  }
  return null;
}

function vectorToState(sv: StateVector): AircraftState {
  return {
    icao24:         sv[0],
    callsign:       sv[1]?.trim() ?? null,
    originCountry:  sv[2],
    lat:            sv[6],
    lng:            sv[5],
    altitudeM:      sv[7],
    onGround:       sv[8],
    velocityMs:     sv[9],
    trackDeg:       sv[10],
    verticalRateMs: sv[11],
    squawk:         sv[14],
    lastContact:    sv[4],
  };
}

class OpenSkyAdapter {
  private get username(): string {
    return process.env.OPENSKY_USERNAME ?? '';
  }
  private get password(): string {
    return process.env.OPENSKY_PASSWORD ?? '';
  }
  private readonly baseUrl = 'https://opensky-network.org/api';
  private requestCount = 0;
  private lastError: string | null = null;

  private buildAuthHeader(): string | null {
    if (!this.username || !this.password) return null;
    return 'Basic ' + Buffer.from(`${this.username}:${this.password}`).toString('base64');
  }

  private async fetchStates(bbox: BoundingBox): Promise<OpenSkyResponse> {
    const params = new URLSearchParams({
      lamin: String(bbox.latMin),
      lomin: String(bbox.lngMin),
      lamax: String(bbox.latMax),
      lomax: String(bbox.lngMax),
    });

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    const auth = this.buildAuthHeader();
    if (auth) headers['Authorization'] = auth;

    const url = `${this.baseUrl}/states/all?${params.toString()}`;
    this.requestCount++;

    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        const msg = `OpenSky HTTP ${response.status}: ${response.statusText}`;
        this.lastError = msg;
        throw new Error(msg);
      }
      const data = (await response.json()) as OpenSkyResponse;
      this.lastError = null;
      return data;
    } catch (err: any) {
      this.lastError = err.message ?? 'Unknown error';
      throw err;
    }
  }

  async fetchAircraftInBbox(bbox: BoundingBox): Promise<{ aircraft: AircraftState[]; count: number; timestamp: string }> {
    const data = await this.fetchStates(bbox);
    const aircraft: AircraftState[] = (data.states ?? []).map(vectorToState);
    return {
      aircraft,
      count:     aircraft.length,
      timestamp: new Date(data.time * 1000).toISOString(),
    };
  }

  async getAerialResponders(regionId: string): Promise<{
    regionId:   string;
    responders: AerialResponder[];
    count:      number;
    timestamp:  string;
    bbox:       BoundingBox;
  }> {
    const bbox = REGION_BBOXES[regionId];
    if (!bbox) throw new Error(`Unknown regionId: ${regionId}. Valid: ${Object.keys(REGION_BBOXES).join(', ')}`);

    const data = await this.fetchStates(bbox);
    const responders: AerialResponder[] = [];

    for (const sv of data.states ?? []) {
      const state = vectorToState(sv);
      const classification = classifyCallsign(state.callsign);
      if (!classification) continue;
      responders.push({ ...state, ...classification });
    }

    return {
      regionId,
      responders,
      count:     responders.length,
      timestamp: new Date(data.time * 1000).toISOString(),
      bbox,
    };
  }

  getStatus() {
    return {
      configured:    Boolean(this.username && this.password),
      authenticated: Boolean(this.username),
      requestCount:  this.requestCount,
      lastError:     this.lastError,
      regionIds:     Object.keys(REGION_BBOXES),
    };
  }
}

export const openskyAdapter = new OpenSkyAdapter();
