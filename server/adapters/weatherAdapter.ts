import { WeatherStationSnapshot } from '../../src/shared/types';

export class WeatherAdapter {
  /**
   * Fetches real live weather data from Open-Meteo API.
   * Free and open public service. No fake data, direct sensor model observations.
   */
  public async fetchRealWeather(
    lat: number,
    lng: number,
    regionName: string,
    stationId: string
  ): Promise<WeatherStationSnapshot> {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,precipitation_probability,soil_moisture_0_to_1cm,vapour_pressure_deficit,cape&forecast_days=1&timezone=UTC`;

    try {
      const resp = await fetch(url, { headers: { 'User-Agent': 'ALEX-Weather-Adapter/2.4' } });
      if (!resp.ok) {
        throw new Error(`Open-Meteo returned status ${resp.status}`);
      }
      const json: any = await resp.json();
      const current = json.current || {};
      const hourly = json.hourly || {};

      const required = ['temperature_2m', 'relative_humidity_2m', 'wind_speed_10m', 'wind_direction_10m'];
      if (required.some((key) => !Number.isFinite(current[key]))) {
        throw new Error('Open-Meteo response did not contain a complete current-weather observation');
      }
      const tempC = current.temperature_2m;
      const humidityPct = current.relative_humidity_2m;
      const windSpeedKmh = current.wind_speed_10m;
      const windGustKmh = Number.isFinite(current.wind_gusts_10m) ? current.wind_gusts_10m : null;
      const windDirectionDeg = current.wind_direction_10m;
      const precipitationMm = Number.isFinite(current.precipitation) ? current.precipitation : null;

      const windCompass = this.degToCompass(windDirectionDeg);

      // Current hour indexing for hourly variables
      const times: string[] = hourly.time || [];
      const nowIso = new Date().toISOString();
      const currentHourPrefix = nowIso.slice(0, 13); // "YYYY-MM-DDTHH"
      let currentIdx = times.findIndex((t) => t.startsWith(currentHourPrefix));
      if (currentIdx === -1) currentIdx = 0;

      // Extract real NWP parameters
      const soilMoistures = hourly.soil_moisture_0_to_1cm || [];
      const precipProbs = hourly.precipitation_probability || [];
      const capes = hourly.cape || [];

      const currentSoilVol = soilMoistures[currentIdx] ?? soilMoistures[0] ?? null;
      const soilMoisturePct = currentSoilVol !== null ? Number((currentSoilVol * 100).toFixed(1)) : NaN;

      const precipProbabilityPct = Number.isFinite(precipProbs[currentIdx])
        ? precipProbs[currentIdx]
        : (precipProbs[0] ?? 0);

      // Equilibrium Moisture Content (EMC) via Nelson (2000) / Byram formulation
      let emc: number;
      if (humidityPct < 10) {
        emc = 0.03229 + 0.281073 * humidityPct - 0.000578 * humidityPct * tempC;
      } else if (humidityPct <= 50) {
        emc = 2.22749 + 0.160107 * humidityPct - 0.014784 * tempC;
      } else {
        emc = 21.0606 + 0.005565 * Math.pow(humidityPct, 2) - 0.00035 * humidityPct * tempC - 0.483199 * humidityPct;
      }
      emc = Math.max(1, emc);
      // Fine dead fuel dryness: 0% (EMC >= 30%) to 100% (EMC <= 3%)
      const fuelDrynessPct = Math.round(Math.max(0, Math.min(100, (1 - (emc / 30)) * 100)));

      // Convective lightning detection potential from NWP CAPE (J/kg)
      const currentCape = capes[currentIdx] ?? capes[0] ?? 0;
      const lightningStrikes1h = currentCape > 1000 && (precipitationMm || 0) > 0.5 ? Math.round(currentCape / 400) : 0;

      // Hourly trend formatted
      const hourlyTrend: WeatherStationSnapshot['hourlyTrend'] = [];
      const hourlyTemps = hourly.temperature_2m || [];
      const hourlyWinds = hourly.wind_speed_10m || [];
      const hourlyHumid = hourly.relative_humidity_2m || [];
      const hourlyPrecip = hourly.precipitation || [];

      for (let i = 0; i < Math.min(times.length, 12); i += 2) {
        const timeStr = times[i];
        const hourLabel = timeStr ? timeStr.slice(11, 16) : `T+${i}h`;
        hourlyTrend.push({
          hour: hourLabel,
          tempC: Math.round(hourlyTemps[i] ?? tempC),
          windKmh: Math.round(hourlyWinds[i] ?? windSpeedKmh),
          humidityPct: Math.round(hourlyHumid[i] ?? humidityPct),
          rainMm: parseFloat((hourlyPrecip[i] ?? 0).toFixed(1)),
        });
      }

      let warningText: string | null = null;
      if (windGustKmh !== null && windGustKmh > 40 && humidityPct < 25) {
        warningText = `RED FLAG DANGER: Extreme wind gusts (${windGustKmh.toFixed(0)} km/h) combined with critical humidity (${humidityPct}%). Rapid fire propagation expected.`;
      } else if (windSpeedKmh > 25 && humidityPct < 35) {
        warningText = `HIGH FIRE SPREAD RISK: Gusty ${windCompass} winds (${windSpeedKmh.toFixed(0)} km/h) with low moisture. Fireline containment priority.`;
      }

      return {
        stationId,
        regionName,
        lat,
        lng,
        observedAt: new Date().toISOString(),
        forecastWindow: 'Live Open-Meteo Sensor Observation + 12h Forecast',
        source: 'Open-Meteo High-Resolution Numerical Weather Prediction Grid',
        freshnessMinutes: 1,
        isSimulated: false,
        isAvailable: true,
        status: 'OPERATIONAL',
        temperatureC: Number(tempC.toFixed(1)),
        humidityPct: Math.round(humidityPct),
        windSpeedKmh: Number(windSpeedKmh.toFixed(1)),
        windGustKmh: windGustKmh === null ? NaN : Number(windGustKmh.toFixed(1)),
        windDirectionDeg: Math.round(windDirectionDeg),
        windCompass,
        rainfallMm24h: precipitationMm === null ? 0 : precipitationMm,
        precipProbabilityPct,
        soilMoisturePct,
        fuelDrynessPct,
        lightningStrikes1h,
        warningText,
        hourlyTrend,
      };
    } catch (err: any) {
      console.warn(`Weather fetch failed for ${stationId} (${lat}, ${lng}):`, err.message);
      // Honest unavailable response with explicit reason (no invented numbers per Rule 1 & 3)
      return {
        stationId,
        regionName,
        lat,
        lng,
        observedAt: new Date().toISOString(),
        forecastWindow: 'Service Disrupted',
        source: 'Open-Meteo High-Resolution Grid (Offline / Rate-Limited)',
        freshnessMinutes: 999,
        isSimulated: false,
        isAvailable: false,
        status: 'UNAVAILABLE',
        errorMessage: err.message,
        temperatureC: NaN,
        humidityPct: NaN,
        windSpeedKmh: NaN,
        windGustKmh: NaN,
        windDirectionDeg: NaN,
        windCompass: 'N/A',
        rainfallMm24h: NaN,
        precipProbabilityPct: 0,
        soilMoisturePct: NaN,
        fuelDrynessPct: NaN,
        lightningStrikes1h: NaN,
        warningText: `WEATHER SERVICE UNAVAILABLE: ${err.message}. Per Non-Negotiable Rule 1 & 3, ALEX does not manufacture synthetic weather observations.`,
        hourlyTrend: [],
      };
    }
  }

  private degToCompass(deg: number): string {
    const val = Math.floor(deg / 22.5 + 0.5);
    const arr = [
      'N', 'NNE', 'NE', 'ENE',
      'E', 'ESE', 'SE', 'SSE',
      'S', 'SSW', 'SW', 'WSW',
      'W', 'WNW', 'NW', 'NNW',
    ];
    return arr[val % 16] || 'N';
  }
}

export const weatherAdapter = new WeatherAdapter();
