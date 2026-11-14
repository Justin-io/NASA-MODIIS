import {
  AnnualBurningSummary,
  MonthlyBurningActivityRecord,
} from '../../src/shared/types';
import { computeRegionalBurningCalendarMath } from '../../src/shared/fireCalendarMath';
import { HISTORICAL_FIRE_OBSERVATIONS, RegionalHistoricalFireRecord } from '../../src/shared/fireObservationsData';

export class FireCalendarService {
  public getRegionalBurningCalendar(
    regionId: string,
    records?: RegionalHistoricalFireRecord[]
  ): {
    regionId: string;
    dataAvailability: 'AVAILABLE' | 'UNAVAILABLE';
    unavailabilityReason?: string;
    baselinePeriod: string;
    monthlyRecords: MonthlyBurningActivityRecord[];
    annualSummaries: AnnualBurningSummary[];
    historicalMediansByMonth: (number | null)[];
  } {
    return computeRegionalBurningCalendarMath(regionId, records);
  }

  public generateCalendarCsv(regionId: string, records?: RegionalHistoricalFireRecord[]): string {
    const data = this.getRegionalBurningCalendar(regionId, records);
    const headers = [
      'Year',
      'Month',
      'Month_Name',
      'MODIS_Hotspots',
      'VIIRS_375m_Hotspots',
      'Harmonized_Hotspot_Cells',
      'Mean_FRP_MW',
      'Historical_Median_2000_2025',
      'Anomaly_Score_Pct',
      'Observation_Coverage_Pct',
      'Data_Confidence',
      'Is_Historical_Baseline',
    ];

    const rows = data.monthlyRecords.map((r) => [
      r.year,
      r.month,
      r.monthLabel,
      r.modisHotspots,
      r.viirsHotspots,
      r.harmonizedHotspots,
      r.meanFrpMw,
      r.historicalMedianHotspots,
      r.anomalyScorePct,
      r.observationCoveragePct,
      r.dataConfidence,
      r.isHistoricalBaseline ? 'TRUE' : 'FALSE',
    ]);

    const metadataComment = [
      `# ALEX (Autonomous Live Environmental eXpert) — Fire Intelligence Subsystem`,
      `# Region: ${regionId}`,
      `# Baseline: ${data.baselinePeriod}`,
      `# Data Availability: ${data.dataAvailability}`,
      `# Export Timestamp: ${new Date().toISOString()}`,
      `# Policy: Scientific Harmonization, Verified Observation Coverage Weighting`,
    ].join('\n');

    return `${metadataComment}\n${headers.join(',')}\n${rows.map((r) => r.join(',')).join('\n')}`;
  }

  public generateCalendarGeoJson(
    regionId: string,
    latCenter = 11.4185,
    lngCenter = 76.7042,
    records?: RegionalHistoricalFireRecord[]
  ): string {
    const data = this.getRegionalBurningCalendar(regionId, records);
    const rawObs = (records || HISTORICAL_FIRE_OBSERVATIONS).filter((o) => o.regionId === regionId);
    const lookup = new Map<string, { lat: number; lng: number }>();
    for (const o of rawObs) {
      if (o.latAnchor !== null && o.lngAnchor !== null) {
        lookup.set(`${o.year}-${o.month}`, { lat: o.latAnchor, lng: o.lngAnchor });
      }
    }

    const features = data.monthlyRecords.map((r) => {
      const coord = lookup.get(`${r.year}-${r.month}`) || {
        lat: latCenter,
        lng: lngCenter,
      };

      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [Number(coord.lng.toFixed(5)), Number(coord.lat.toFixed(5))],
        },
        properties: {
          year: r.year,
          month: r.month,
          monthLabel: r.monthLabel,
          harmonizedHotspots: r.harmonizedHotspots,
          meanFrpMw: r.meanFrpMw,
          anomalyScorePct: r.anomalyScorePct,
          confidence: r.dataConfidence,
          observationCoveragePct: r.observationCoveragePct,
        },
      };
    });

    const fc = {
      type: 'FeatureCollection',
      name: `ALEX_Fire_Calendar_${regionId}`,
      crs: {
        type: 'name',
        properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' },
      },
      features,
    };

    return JSON.stringify(fc, null, 2);
  }
}

export const fireCalendarService = new FireCalendarService();
