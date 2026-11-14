import {
  ObservationOpportunity,
  OrbitalDriftRecord,
  SatelliteMissionId,
  SatelliteOrbitRecord,
  ViewingGeometry,
} from './types';

export const REGISTERED_SATELLITES: SatelliteOrbitRecord[] = [
  {
    id: 'TERRA',
    name: 'Terra (EOS AM-1)',
    agency: 'NASA / Earth Science Division',
    orbitType: 'sun_synchronous',
    altitudeKm: 694.0,
    inclinationDeg: 98.2,
    raanDeg: 124.6,
    eccentricity: 0.0012,
    periodMinutes: 98.6,
    repeatCycleDays: 16,
    meanLocalEquatorCrossingTime: '09:05 AM Descending (Drift Mode)',
    sensorPayload: ['MODIS', 'ASTER', 'CERES', 'MISR', 'MOPITT'],
    primaryInstruments: 'MODIS (Moderate Resolution Imaging Spectroradiometer, 36 spectral bands, 1km thermal)',
    operationalStatus: 'orbital_drift_mode',
    noradId: 25994,
    tleEpoch: '2026-10-31T00:00:00Z',
    driftHistory: [
      {
        year: 2000,
        altitudeKm: 705.0,
        mlstHours: 10.5,
        crossingTimeFormatted: '10:30 AM Descending',
        driftPhase: 'Nominal Constellation Maintenance',
        samplingBiasFactor: 1.0,
        scientificNotes: 'Strict 10:30 AM equator crossing maintained in Morning Constellation with Landsat 7.',
      },
      {
        year: 2018,
        altitudeKm: 705.0,
        mlstHours: 10.5,
        crossingTimeFormatted: '10:30 AM Descending',
        driftPhase: 'End of Inclination Adjustments',
        samplingBiasFactor: 1.0,
        scientificNotes: 'Final inclination adjust burn completed in Feb 2020 to conserve remaining hydrazine propellant.',
      },
      {
        year: 2020,
        altitudeKm: 704.8,
        mlstHours: 10.42,
        crossingTimeFormatted: '10:25 AM Descending',
        driftPhase: 'Free Drift Inception',
        samplingBiasFactor: 0.96,
        scientificNotes: 'Inclination drift began, initiating gradual shift of equatorial crossing to earlier local times.',
      },
      {
        year: 2022,
        altitudeKm: 694.2,
        mlstHours: 9.95,
        crossingTimeFormatted: '09:57 AM Descending',
        driftPhase: 'Constellation Exit & Orbit Lowering',
        samplingBiasFactor: 0.84,
        scientificNotes: 'Orbital altitude lowered by ~10.8 km in Oct 2022 to clear the 705 km Morning Constellation orbit.',
      },
      {
        year: 2024,
        altitudeKm: 694.1,
        mlstHours: 9.45,
        crossingTimeFormatted: '09:27 AM Descending',
        driftPhase: 'Accelerated MLST Drift',
        samplingBiasFactor: 0.72,
        scientificNotes: 'Crossing time shifted earlier. Solar zenith angles increased at observation time; shadows elongated.',
      },
      {
        year: 2026,
        altitudeKm: 694.0,
        mlstHours: 9.08,
        crossingTimeFormatted: '09:05 AM Descending',
        driftPhase: 'Current Operational Epoch',
        samplingBiasFactor: 0.61,
        scientificNotes: 'Current epoch: crossing at ~09:05 AM. Lower ambient fire radiative intensity observed due to early morning diurnal timing.',
      },
    ],
  },
  {
    id: 'AQUA',
    name: 'Aqua (EOS PM-1)',
    agency: 'NASA / Earth Science Division',
    orbitType: 'sun_synchronous',
    altitudeKm: 702.5,
    inclinationDeg: 98.2,
    raanDeg: 284.2,
    eccentricity: 0.0014,
    periodMinutes: 98.8,
    repeatCycleDays: 16,
    meanLocalEquatorCrossingTime: '13:30 PM Ascending',
    sensorPayload: ['MODIS', 'AIRS', 'AMSU-A', 'CERES'],
    primaryInstruments: 'MODIS (Afternoon Constellation / A-Train reference)',
    operationalStatus: 'operational',
    noradId: 27424,
    tleEpoch: '2026-10-31T00:00:00Z',
    driftHistory: [
      {
        year: 2002,
        altitudeKm: 705.0,
        mlstHours: 13.5,
        crossingTimeFormatted: '01:30 PM Ascending',
        driftPhase: 'Nominal A-Train Baseline',
        samplingBiasFactor: 1.0,
        scientificNotes: 'Nominal afternoon crossing captures peak diurnal fire radiative power.',
      },
      {
        year: 2026,
        altitudeKm: 702.5,
        mlstHours: 13.58,
        crossingTimeFormatted: '01:35 PM Ascending',
        driftPhase: 'Maintained Afternoon Epoch',
        samplingBiasFactor: 1.02,
        scientificNotes: 'Minimal drift in MLST. Remained stable within ±10 minutes of nominal afternoon crossing.',
      },
    ],
  },
  {
    id: 'SUOMI_NPP',
    name: 'Suomi-NPP (SNPP)',
    agency: 'NASA / NOAA',
    orbitType: 'sun_synchronous',
    altitudeKm: 824.0,
    inclinationDeg: 98.7,
    raanDeg: 45.1,
    eccentricity: 0.0001,
    periodMinutes: 101.4,
    repeatCycleDays: 16,
    meanLocalEquatorCrossingTime: '13:25 PM Ascending',
    sensorPayload: ['VIIRS', 'CrIS', 'ATMS', 'OMPS'],
    primaryInstruments: 'VIIRS (Visible Infrared Imaging Radiometer Suite, 375m I-bands + 750m M-bands)',
    operationalStatus: 'degraded',
    noradId: 37849,
    tleEpoch: '2026-10-31T00:00:00Z',
    driftHistory: [
      {
        year: 2011,
        altitudeKm: 824.0,
        mlstHours: 13.5,
        crossingTimeFormatted: '01:30 PM Ascending',
        driftPhase: 'Commissioning Baseline',
        samplingBiasFactor: 1.0,
        scientificNotes: 'Established 375m active fire detection benchmark in afternoon orbit.',
      },
      {
        year: 2026,
        altitudeKm: 823.6,
        mlstHours: 13.42,
        crossingTimeFormatted: '01:25 PM Ascending',
        driftPhase: 'Operational Transition',
        samplingBiasFactor: 0.98,
        scientificNotes: 'Transitioning to secondary data product baseline; primary JPSS operational duty fulfilled by NOAA-20 and NOAA-21.',
      },
    ],
  },
  {
    id: 'NOAA_20',
    name: 'NOAA-20 (JPSS-1)',
    agency: 'NOAA / NESDIS',
    orbitType: 'sun_synchronous',
    altitudeKm: 824.0,
    inclinationDeg: 98.7,
    raanDeg: 58.6,
    eccentricity: 0.0001,
    periodMinutes: 101.4,
    repeatCycleDays: 16,
    meanLocalEquatorCrossingTime: '12:40 PM Ascending (~50 min ahead of SNPP)',
    sensorPayload: ['VIIRS', 'CrIS', 'ATMS', 'OMPS'],
    primaryInstruments: 'VIIRS (JPSS Primary Operational Platform)',
    operationalStatus: 'operational',
    noradId: 43013,
    tleEpoch: '2026-10-31T00:00:00Z',
    driftHistory: [],
  },
  {
    id: 'NOAA_21',
    name: 'NOAA-21 (JPSS-2)',
    agency: 'NOAA / NESDIS',
    orbitType: 'sun_synchronous',
    altitudeKm: 824.0,
    inclinationDeg: 98.7,
    raanDeg: 72.1,
    eccentricity: 0.0001,
    periodMinutes: 101.4,
    repeatCycleDays: 16,
    meanLocalEquatorCrossingTime: '13:30 PM Ascending',
    sensorPayload: ['VIIRS', 'CrIS', 'ATMS', 'OMPS'],
    primaryInstruments: 'VIIRS (JPSS-2 Active Science Mission)',
    operationalStatus: 'operational',
    noradId: 54234,
    tleEpoch: '2026-10-31T00:00:00Z',
    driftHistory: [],
  },
  {
    id: 'SENTINEL_1A',
    name: 'Sentinel-1A (Copernicus C-SAR)',
    agency: 'ESA / Copernicus',
    orbitType: 'sun_synchronous',
    altitudeKm: 693.0,
    inclinationDeg: 98.18,
    raanDeg: 194.2,
    eccentricity: 0.00015,
    periodMinutes: 98.6,
    repeatCycleDays: 12,
    meanLocalEquatorCrossingTime: '18:00 PM Ascending / 06:00 AM Descending',
    sensorPayload: ['C-SAR (Synthetic Aperture Radar)'],
    primaryInstruments: 'C-Band SAR (All-weather, day/night radar surface roughness & burn scar perimeter)',
    operationalStatus: 'operational',
    noradId: 39634,
    tleEpoch: '2026-10-31T00:00:00Z',
    driftHistory: [],
  },
  {
    id: 'SENTINEL_2A',
    name: 'Sentinel-2A (Copernicus MSI)',
    agency: 'ESA / Copernicus',
    orbitType: 'sun_synchronous',
    altitudeKm: 786.0,
    inclinationDeg: 98.62,
    raanDeg: 210.5,
    eccentricity: 0.0001,
    periodMinutes: 100.6,
    repeatCycleDays: 10,
    meanLocalEquatorCrossingTime: '10:30 AM Descending',
    sensorPayload: ['MSI (MultiSpectral Instrument, 13 bands, 10m/20m/60m)'],
    primaryInstruments: 'MSI (NBR, NDVI, dNBR Burn Severity Mapping)',
    operationalStatus: 'operational',
    noradId: 40697,
    tleEpoch: '2026-10-31T00:00:00Z',
    driftHistory: [],
  },
  {
    id: 'SENTINEL_3A',
    name: 'Sentinel-3A (Copernicus SLSTR)',
    agency: 'ESA / EUMETSAT',
    orbitType: 'sun_synchronous',
    altitudeKm: 814.5,
    inclinationDeg: 98.65,
    raanDeg: 228.0,
    eccentricity: 0.0001,
    periodMinutes: 101.0,
    repeatCycleDays: 27,
    meanLocalEquatorCrossingTime: '10:00 AM Descending',
    sensorPayload: ['SLSTR', 'OLCI', 'SRAL', 'MWR'],
    primaryInstruments: 'SLSTR (Sea and Land Surface Temperature Radiometer, Dedicated 1km F1/F2 active-fire channels)',
    operationalStatus: 'operational',
    noradId: 41335,
    tleEpoch: '2026-10-31T00:00:00Z',
    driftHistory: [],
  },
  {
    id: 'HIMAWARI_9',
    name: 'Himawari-9 (JMA)',
    agency: 'Japan Meteorological Agency / JAXA',
    orbitType: 'geostationary',
    altitudeKm: 35786.0,
    inclinationDeg: 0.05,
    raanDeg: 0.0,
    eccentricity: 0.0002,
    periodMinutes: 1436.1,
    repeatCycleDays: 1,
    meanLocalEquatorCrossingTime: 'Geostationary 140.7°E (Continuous 10-minute cadence)',
    sensorPayload: ['AHI (Advanced Himawari Imager)'],
    primaryInstruments: 'AHI (16 spectral bands, 2km infrared active fire detection across Asia-Pacific)',
    operationalStatus: 'operational',
    noradId: 41836,
    tleEpoch: '2026-10-31T00:00:00Z',
    driftHistory: [],
  },
  {
    id: 'GOES_19',
    name: 'GOES-19 (GOES-East Operational)',
    agency: 'NOAA / NASA',
    orbitType: 'geostationary',
    altitudeKm: 35786.0,
    inclinationDeg: 0.08,
    raanDeg: 0.0,
    eccentricity: 0.0001,
    periodMinutes: 1436.1,
    repeatCycleDays: 1,
    meanLocalEquatorCrossingTime: 'Geostationary 75.2°W (Continuous 5-minute CONUS cadence)',
    sensorPayload: ['ABI', 'GLM', 'SUVI', 'EXIS'],
    primaryInstruments: 'ABI (Advanced Baseline Imager, FDCF Fire Detection & Characterization)',
    operationalStatus: 'operational',
    noradId: 60133,
    tleEpoch: '2026-10-31T00:00:00Z',
    driftHistory: [],
  },
  {
    id: 'GCOM_C',
    name: 'GCOM-C (Shikisai)',
    agency: 'JAXA',
    orbitType: 'sun_synchronous',
    altitudeKm: 798.0,
    inclinationDeg: 98.6,
    raanDeg: 180.2,
    eccentricity: 0.0001,
    periodMinutes: 100.8,
    repeatCycleDays: 34,
    meanLocalEquatorCrossingTime: '10:30 AM Descending',
    sensorPayload: ['SGLI (Second-generation Global Imager)'],
    primaryInstruments: 'SGLI (JASMES Daily 250m Global Active Fire & FRP Product)',
    operationalStatus: 'operational',
    noradId: 43065,
    tleEpoch: '2026-10-31T00:00:00Z',
    driftHistory: [],
  },
  {
    id: 'LANDSAT_9',
    name: 'Landsat 9',
    agency: 'USGS / NASA',
    orbitType: 'sun_synchronous',
    altitudeKm: 705.0,
    inclinationDeg: 98.2,
    raanDeg: 312.4,
    eccentricity: 0.0001,
    periodMinutes: 98.9,
    repeatCycleDays: 16,
    meanLocalEquatorCrossingTime: '10:11 AM Descending',
    sensorPayload: ['OLI-2 (Operational Land Imager)', 'TIRS-2 (Thermal Infrared Sensor)'],
    primaryInstruments: 'TIRS-2 / OLI-2 (Collection 2 Level-3 Burned Area & Thermal Profiling)',
    operationalStatus: 'operational',
    noradId: 49260,
    tleEpoch: '2026-10-31T00:00:00Z',
    driftHistory: [],
  },
];

export function computeViewingGeometryMath(
  satelliteId: SatelliteMissionId,
  scanAngleDeg: number
): ViewingGeometry {
  const sat = REGISTERED_SATELLITES.find((s) => s.id === satelliteId) || REGISTERED_SATELLITES[0];
  const earthRadiusKm = 6371.0;
  const altitudeKm = sat.altitudeKm;

  const scanRad = (Math.abs(scanAngleDeg) * Math.PI) / 180;
  const sinViewZenith = ((earthRadiusKm + altitudeKm) / earthRadiusKm) * Math.sin(scanRad);
  const clampedSin = Math.min(0.9999, Math.max(0, sinViewZenith));
  const viewZenithRad = Math.asin(clampedSin);
  const viewZenithDeg = (viewZenithRad * 180) / Math.PI;

  const geometricSecant = 1.0 / Math.cos(viewZenithRad);

  let pixelFootprintKm2 = 1.0;
  let bowtieExpansionRatio = 1.0;

  if (satelliteId === 'TERRA' || satelliteId === 'AQUA') {
    const trackScale = Math.sqrt(geometricSecant);
    const scanScale = geometricSecant * geometricSecant;
    bowtieExpansionRatio = scanScale * trackScale;
    pixelFootprintKm2 = 1.0 * bowtieExpansionRatio;
  } else if (satelliteId.includes('VIIRS') || satelliteId.includes('NOAA')) {
    const aggregationFactor = Math.min(2.1, 1.0 + (Math.abs(scanAngleDeg) / 55.0) * 1.1);
    bowtieExpansionRatio = aggregationFactor;
    pixelFootprintKm2 = (0.375 * 0.375) * bowtieExpansionRatio * bowtieExpansionRatio;
  } else if (sat.orbitType === 'geostationary') {
    pixelFootprintKm2 = 4.0 * geometricSecant;
    bowtieExpansionRatio = geometricSecant;
  } else {
    bowtieExpansionRatio = geometricSecant;
    pixelFootprintKm2 = 0.01 * geometricSecant;
  }

  const swathWidthKm = 2.0 * earthRadiusKm * Math.asin(
    Math.sin(scanRad) * (altitudeKm / earthRadiusKm + 1) - scanRad
  );

  return {
    satelliteId,
    scanAngleDeg,
    offNadirAngleDeg: Math.abs(scanAngleDeg),
    viewZenithAngleDeg: Math.round(viewZenithDeg * 10) / 10,
    solarZenithAngleDeg: Math.round((35.0 + Math.abs(scanAngleDeg) * 0.4) * 10) / 10,
    pixelFootprintKm2: Math.round(pixelFootprintKm2 * 100) / 100,
    swathWidthKm: Math.round(Math.abs(swathWidthKm) || (altitudeKm * 2.8)),
    bowtieExpansionRatio: Math.round(bowtieExpansionRatio * 100) / 100,
  };
}

export function evaluateTerraDriftImpactMath(targetYear: number) {
  const terra = REGISTERED_SATELLITES.find((s) => s.id === 'TERRA')!;
  const history = terra.driftHistory;
  const record =
    history.find((h) => h.year === targetYear) ||
    history[history.length - 1];

  const driftMinutes = Math.round((10.5 - record.mlstHours) * 60);

  // Orbital physics: J2 geopotential perturbation & nodal precession rate
  const j2 = 1.08263e-3;
  const earthRadiusKm = 6378.137;
  const mu = 398600.4418; // km^3 / s^2
  const a = earthRadiusKm + record.altitudeKm;
  const e = 0.0012;
  const p = a * (1 - e * e);
  const meanMotionRadSec = Math.sqrt(mu / Math.pow(a, 3));
  const incRad = (98.2 * Math.PI) / 180;
  // dOmega/dt = -1.5 * J2 * (Re/p)^2 * n * cos(i)
  const nodalPrecessionRadSec = -1.5 * j2 * Math.pow(earthRadiusKm / p, 2) * meanMotionRadSec * Math.cos(incRad);
  const nodalPrecessionDegDay = Number(((nodalPrecessionRadSec * 180 / Math.PI) * 86400).toFixed(4));

  return {
    year: record.year,
    altitudeKm: record.altitudeKm,
    mlstHours: record.mlstHours,
    crossingTimeFormatted: record.crossingTimeFormatted,
    driftMinutes,
    nodalPrecessionDegDay,
    driftPhase: record.driftPhase,
    scientificAssessment: `Between 2000 and ${record.year}, Terra's mean local solar equator crossing time drifted from 10:30 AM to ${record.crossingTimeFormatted} (drift of ${driftMinutes} min, orbital altitude ${record.altitudeKm} km, nodal precession rate ${nodalPrecessionDegDay}°/day). Wildfire radiant heat release follows a marked diurnal curve peaking in early afternoon (~13:00-15:00 local solar time). Morning observations at ${record.crossingTimeFormatted} sample cooler ambient fuel prior to peak diurnal drying. In accordance with Rule 14, ungrounded fixed attenuation formulas (~39%) are excluded; multi-year trends must be normalized against cross-calibrated concurrent passes from Aqua (13:30) and NOAA-20/21.`,
    recommendedMethodology: 'Apply empirical solar zenith and diurnal cycle normalization or cross-validate longitudinal trends with concurrent afternoon observations from Aqua (13:30) and NOAA-20/NOAA-21 (12:40/13:30).',
  };
}
