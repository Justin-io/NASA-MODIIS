import test from 'node:test';
import assert from 'node:assert/strict';
import { LearningService } from '../server/services/learningService';
import { globalStore } from '../server/db/store';

test('LearningService - requires human commander sign-off for model promotion', async () => {
  await globalStore.init();
  const service = new LearningService();

  // Test 1: In purified production without ground truth, evaluation is safely blocked
  const blockedResult = await service.evaluateChallengerModel(
    'alex-cortex-challenger-v2.4',
    { spatialDedupRadiusDeg: 0.012 }
  );
  assert.equal(blockedResult.decision, 'EVALUATION_BLOCKED');
  assert.equal(blockedResult.evaluationStatus, 'NO_REAL_GROUND_TRUTH_AVAILABLE');

  // Test 2: When benchmark data is provided, candidate requires human commander sign-off
  const championBenchmark = {
    modelId: 'alex-cortex-champion-v2.7',
    modelVersion: '2.7.0',
    benchmarkDate: '2026-11-01T00:00:00Z',
    role: 'champion' as const,
    metrics: {
      falsePositiveRatePct: 10.0,
      sensorHarmonizationErrorPct: 8.0,
      routePredictionMapePct: 5.0,
      claimVerificationAccuracyPct: 80.0,
      toolCallSchemaCompliancePct: 99.0,
    },
    status: 'active_baseline' as const,
    evaluationDetails: 'Test baseline',
  };
  globalStore.getState().benchmarks = [championBenchmark];

  const testCases = [
    { id: 'TC-1', region: 'TestRegion', year: 2024, lat: 11.41, lng: 76.70, modisFrpMw: 120, viirsFrpMw: 130, detectionDistanceKm: 0.3, isConfirmedWildfire: true, isIndustrialHeatOrGlint: false, actualEvacuationWarranted: true },
    { id: 'TC-2', region: 'TestRegion', year: 2024, lat: 11.30, lng: 76.94, modisFrpMw: 10, viirsFrpMw: 12, detectionDistanceKm: 2.0, isConfirmedWildfire: false, isIndustrialHeatOrGlint: true, actualEvacuationWarranted: false },
  ];

  const evalResult = await service.evaluateChallengerModel(
    'alex-cortex-challenger-v2.4',
    { spatialDedupRadiusDeg: 0.012 },
    testCases
  );

  // Superior models must NOT auto-promote; they require human commander sign-off
  assert.equal(evalResult.decision, 'NEEDS_HUMAN_SIGN_OFF');
  assert.ok(evalResult.validationReport.includes('require authorized human commander signature'));
});
