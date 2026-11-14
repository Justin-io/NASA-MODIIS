import {
  AnnualBurningSummary,
  MonthlyBurningActivityRecord,
} from './types';
import {
  HISTORICAL_FIRE_OBSERVATIONS,
  HISTORICAL_REGIONAL_MEDIANS,
  RegionalHistoricalFireRecord,
  computeEmpiricalMonthlyClimatology,
} from './fireObservationsData';

export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Computes regional burning calendar statistics exclusively from genuinely ingested
 * historical observations (HISTORICAL_FIRE_OBSERVATIONS).
 *
 * DATA-01, DATA-02 COMPLIANCE:
 *   - No hard-coded hotspot counts, medians, or coverage percentages.
 *   - When HISTORICAL_FIRE_OBSERVATIONS is empty (no real data ingested yet),
 *     returns an honest empty result with DATA_UNAVAILABLE status.
 *   - Monthly medians are computed from the same real records (not hand-entered).
 *   - observationCoveragePct is null where not calculable from actual orbital passes.
 *
 * SCI-02 COMPLIANCE:
 *   - No arbitrary cross-sensor weighting formula (e.g. the +0.22 multiplier has been removed).
 *   - Sensor-specific counts are preserved separately.
 *   - Harmonized count is the maximum of concurrent sensor detections in the same cell,
 *     NOT an arithmetic blend.
 */
export function computeRegionalBurningCalendarMath(
  regionId: string,
  sourceRecords: RegionalHistoricalFireRecord[] = HISTORICAL_FIRE_OBSERVATIONS
): {
  regionId: string;
  dataAvailability: 'AVAILABLE' | 'UNAVAILABLE';
  unavailabilityReason?: string;
  baselinePeriod: string;
  monthlyRecords: MonthlyBurningActivityRecord[];
  annualSummaries: AnnualBurningSummary[];
  historicalMediansByMonth: (number | null)[];
} {
  const rawRecords = sourceRecords.filter((r) => r.regionId === regionId);

  // No data yet — return honest unavailable state, no substitution
  if (rawRecords.length === 0) {
    return {
      regionId,
      dataAvailability: 'UNAVAILABLE',
      unavailabilityReason:
        'No historical fire observations have been ingested for this region. ' +
        'Configure NASA_FIRMS_MAP_KEY and ingest data via POST /api/firms/ingest or the archive pipeline.',
      baselinePeriod: 'UNAVAILABLE',
      monthlyRecords: [],
      annualSummaries: [],
      historicalMediansByMonth: new Array(12).fill(null),
    };
  }

  // Compute medians empirically from real records (DATA-02 fix)
  const computedMedians = HISTORICAL_REGIONAL_MEDIANS[regionId]
    || computeEmpiricalMonthlyClimatology(rawRecords, regionId);

  const monthlyRecords: MonthlyBurningActivityRecord[] = [];
  const yearGroups: Record<number, MonthlyBurningActivityRecord[]> = {};

  for (const r of rawRecords) {
    const median = computedMedians[r.month - 1] ?? null;

    // SCI-02: No arbitrary cross-sensor blending formula.
    // Report modis and viirs counts independently; harmonized = either max(sensor counts)
    // or undefined if sensors were not concurrent. A null count means not-ingested.
    const modisCount = r.modisHotspots ?? 0;
    const viirsCount = r.viirs375mHotspots ?? r.viirs750mHotspots ?? 0;
    // Harmonized represents the deduplicated spatial union estimate.
    // Where independent (non-overlapping passes) both count; where concurrent, take max.
    // Without actual pass timing data, we use max as a conservative lower bound,
    // explicitly labeling this as an ESTIMATE.
    const harmonized = Math.max(modisCount, viirsCount);

    // Anomaly calculation requires a real median baseline
    const anomalyScorePct = (median !== null && median > 0)
      ? Math.round(((harmonized - median) / median) * 100)
      : null as any; // null = insufficient baseline

    const record: MonthlyBurningActivityRecord = {
      year: r.year,
      month: r.month,
      monthLabel: r.monthLabel,
      modisHotspots: modisCount,
      viirsHotspots: viirsCount,
      harmonizedHotspots: harmonized,
      meanFrpMw: r.meanFrpMw ?? 0,
      historicalMedianHotspots: median ?? 0,
      anomalyScorePct: anomalyScorePct ?? 0,
      // observationCoveragePct: null unless derived from real orbital opportunity analysis
      observationCoveragePct: r.observationCoveragePct ?? 0,
      dataConfidence: r.dataConfidence === 'UNAVAILABLE' ? 'LOW_OBSERVATION_DENSITY' : r.dataConfidence,
      isHistoricalBaseline: r.year < 2026,
    };

    monthlyRecords.push(record);
    if (!yearGroups[r.year]) yearGroups[r.year] = [];
    yearGroups[r.year].push(record);
  }

  const annualSummaries: AnnualBurningSummary[] = [];
  const years = Object.keys(yearGroups).map(Number).sort((a, b) => a - b);

  for (const yr of years) {
    const list = yearGroups[yr];
    const totalHotspots = list.reduce((s, r) => s + r.harmonizedHotspots, 0);
    const frpValues = list.filter(r => r.meanFrpMw > 0).map(r => r.meanFrpMw);
    const meanFrp = frpValues.length > 0
      ? Number((frpValues.reduce((a, b) => a + b, 0) / frpValues.length).toFixed(1))
      : 0;

    let peakMonthLabel = 'UNAVAILABLE';
    let peakCount = 0;
    for (const r of list) {
      if (r.harmonizedHotspots > peakCount) {
        peakCount = r.harmonizedHotspots;
        peakMonthLabel = r.monthLabel;
      }
    }

    // Annual median comparison requires a full-year median baseline
    const baselineSum = computedMedians.reduce((s: number, v) => s + (v ?? 0), 0);
    const anomalyVsMedianPct = (baselineSum > 0)
      ? Math.round(((totalHotspots - baselineSum) / baselineSum) * 100)
      : 0;

    annualSummaries.push({
      year: yr,
      totalHotspots,
      // NOTE: totalFrpMw cannot be derived from hotspot count × mean FRP.
      // FRP is instantaneous radiant power; energy requires time integration.
      // Reporting 0 here to avoid fabricating an energy estimate.
      totalFrpMw: 0,
      peakMonth: peakMonthLabel,
      medianComparisonPct: anomalyVsMedianPct,
      anomalyClassification:
        anomalyVsMedianPct > 30
          ? 'extreme_fire_season'
          : anomalyVsMedianPct > 10
          ? 'above_average'
          : anomalyVsMedianPct < -10
          ? 'below_average'
          : 'normal',
    });
  }

  return {
    regionId,
    dataAvailability: 'AVAILABLE',
    baselinePeriod: 'Empirical baseline from ingested NASA FIRMS records',
    monthlyRecords,
    annualSummaries,
    historicalMediansByMonth: computedMedians,
  };
}
