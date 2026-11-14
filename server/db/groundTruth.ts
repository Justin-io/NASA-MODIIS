/**
 * Ground Truth Validation Records — v2.7.0
 *
 * DATA INTEGRITY NOTICE (DATA-03):
 *
 * Previous versions contained hard-coded FRP values, classification labels, and
 * evacuation flags for named locations (GT-001 through GT-015) labeled as
 * "verified historical benchmark cases." These values were fabricated — not retrieved
 * from official incident databases, fire services, or independently verified field records.
 *
 * v2.7.0 quarantines these records from production use. They are preserved here only
 * as SYNTHETIC_TEST_CASES for isolated unit tests that need structural test data,
 * clearly labeled as synthetic and NEVER used in production model evaluation.
 *
 * REAL GROUND TRUTH ACQUISITION PATH (BLOCKED: requires external data sources):
 *   - Official wildfire perimeter databases (e.g., NIFC NIFC/CAL FIRE for USA,
 *     India's Forest Survey of India records, European EFFIS confirmed records)
 *   - Landsat/Sentinel-2 burn scar products for spatial validation
 *   - Formally published and DOI-cited incident databases
 *   Status: UNAVAILABLE — document as BLOCKED until integrated
 *
 * DO NOT add new entries without: source URL, data access date, official incident ID,
 * independent verification method, and signed reviewer record.
 */

export interface GroundTruthCase {
  id: string;
  region: string;
  year: number;
  lat: number;
  lng: number;
  modisFrpMw: number;
  viirsFrpMw: number;
  detectionDistanceKm: number;
  isConfirmedWildfire: boolean;
  isIndustrialHeatOrGlint: boolean;
  actualEvacuationWarranted: boolean;
  /** Provenance metadata — required for production use */
  provenance?: {
    sourceAgency: string;
    officialIncidentId: string;
    sourceUrl: string;
    dataAccessDate: string;
    verificationMethod: string;
  };
}

/**
 * Production ground truth dataset — empty until real verified records are integrated.
 * Only real, source-cited, independently verified cases may appear here.
 */
export const HISTORICAL_GROUND_TRUTH_DATASET: GroundTruthCase[] = [];

/**
 * Synthetic test cases — for use ONLY in isolated unit tests (test/fixtures/).
 * These are NEVER production data. They are intentionally labeled synthetic.
 * Any test using these must import from test/fixtures/, not from this file.
 */
export const SYNTHETIC_TEST_CASES_DO_NOT_USE_IN_PRODUCTION: GroundTruthCase[] = [
  // Synthetic wildfire-positive case for algorithm unit tests
  { id: 'SYNTHETIC-001', region: 'TestRegion-A', year: 2024, lat: 11.4185, lng: 76.7042, modisFrpMw: 142, viirsFrpMw: 156, detectionDistanceKm: 0.35, isConfirmedWildfire: true, isIndustrialHeatOrGlint: false, actualEvacuationWarranted: true },
  // Synthetic industrial-heat false alarm case
  { id: 'SYNTHETIC-002', region: 'TestRegion-B', year: 2024, lat: 11.3050, lng: 76.9420, modisFrpMw: 12, viirsFrpMw: 14, detectionDistanceKm: 1.85, isConfirmedWildfire: false, isIndustrialHeatOrGlint: true, actualEvacuationWarranted: false },
];
