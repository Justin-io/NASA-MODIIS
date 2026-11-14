import { ModelBenchmarkRecord } from '../db/store';
import { globalStore } from '../db/store';
import { globalLedger } from '../db/ledger';
import { HISTORICAL_GROUND_TRUTH_DATASET } from '../db/groundTruth';

export interface EvaluationProposal {
  proposalId: string;
  targetParameter: 'spatial_dedup_radius' | 'frp_anomaly_multiplier' | 'wind_eccentricity_weight' | 'call_timeout_seconds';
  currentValue: number;
  proposedValue: number;
  rationale: string;
  sourceFailureIncidentId: string;
}

export class LearningService {
  /**
   * Evaluates a challenger model configuration against the ground-truth dataset.
   *
   * DATA-03 FIX: The ground truth dataset (HISTORICAL_GROUND_TRUTH_DATASET) is now empty
   * in production — all previously hardcoded values were fabricated and have been removed.
   * When no real ground-truth data exists, evaluation is BLOCKED and returns UNAVAILABLE.
   *
   * DATA-04 FIX: The "champion" baseline no longer contains hardcoded metric values
   * (falsePositiveRatePct: 2.8, sensorHarmonizationErrorPct: 4.1, etc.) — those were
   * invented numbers with no actual measurement basis.
   *
   * A model may only be promoted after passing documented evaluation against
   * a genuine, independently acquired, source-cited benchmark dataset.
   */
  public async evaluateChallengerModel(
    challengerId: string,
    proposedConfig: Record<string, any>,
    providedDataset?: any[]
  ): Promise<{
    decision: 'PROMOTE_CANDIDATE' | 'REJECT_CANDIDATE' | 'NEEDS_HUMAN_SIGN_OFF' | 'EVALUATION_BLOCKED';
    evaluationStatus: string;
    validationReport: string;
    championMetrics?: ModelBenchmarkRecord['metrics'];
    challengerMetrics?: ModelBenchmarkRecord['metrics'];
  }> {
    const dataset = providedDataset || HISTORICAL_GROUND_TRUTH_DATASET;

    // BLOCKED: No real ground-truth data available
    if (dataset.length === 0) {
      const report = [
        `EVALUATION BLOCKED — No real ground-truth dataset available.`,
        ``,
        `Previous versions used fabricated FRP/classification values as ground truth.`,
        `Those have been removed. Real evaluation requires:`,
        `  1. Official incident database records with source citations`,
        `  2. Independently verified fire/non-fire classifications`,
        `  3. Provenance: sourceAgency, officialIncidentId, sourceUrl, dataAccessDate`,
        ``,
        `Status: UNAVAILABLE — Model promotion is blocked until real data is integrated.`,
        `Governing Rule: require authorized human commander signature for production promotion.`,
      ].join('\n');

      await globalLedger.appendEvent('model_evaluated', 'ALEX_SELF_LEARNING_ENGINE', {
        challengerId,
        evaluationStatus: 'BLOCKED_NO_REAL_GROUND_TRUTH',
        timestamp: new Date().toISOString(),
      });

      return {
        decision: 'EVALUATION_BLOCKED',
        evaluationStatus: 'NO_REAL_GROUND_TRUTH_AVAILABLE',
        validationReport: report,
      };
    }

    // When real ground-truth data is available, compute empirical metrics
    const store = globalStore.getState();
    const champion = store.benchmarks?.find((b) => b.role === 'champion');

    if (!champion) {
      return {
        decision: 'EVALUATION_BLOCKED',
        evaluationStatus: 'NO_CHAMPION_BASELINE',
        validationReport: 'No champion baseline exists. A baseline must be registered before challenger evaluation.',
      };
    }

    const wildfireCases = dataset.filter((c) => c.isConfirmedWildfire);
    const nonWildfireCases = dataset.filter((c) => !c.isConfirmedWildfire);

    const dedupRadiusKm = (proposedConfig.spatialDedupRadiusDeg || 0.015) * 111.0;
    const minFrpThreshold = proposedConfig.minFrpThresholdMw || 20.0;

    let falsePositives = 0;
    let truePositives = 0;
    let harmonisationErrorAccum = 0;

    for (const c of dataset) {
      const isPredictedWildfire =
        (c.viirsFrpMw >= minFrpThreshold || c.modisFrpMw >= minFrpThreshold) &&
        c.detectionDistanceKm <= dedupRadiusKm;

      if (isPredictedWildfire && !c.isConfirmedWildfire) falsePositives++;
      if (isPredictedWildfire && c.isConfirmedWildfire) truePositives++;

      const frpDiffPct = Math.abs(c.viirsFrpMw - c.modisFrpMw) / Math.max(1, c.viirsFrpMw);
      harmonisationErrorAccum += frpDiffPct;
    }

    const calculatedFprPct = Number(((falsePositives / Math.max(1, nonWildfireCases.length)) * 100).toFixed(1));
    const calculatedAccuracyPct = Number(((truePositives / Math.max(1, wildfireCases.length)) * 100).toFixed(1));
    const calculatedHarmonizationErrorPct = Number(((harmonisationErrorAccum / dataset.length) * 100).toFixed(1));

    const challengerMetrics: ModelBenchmarkRecord['metrics'] = {
      falsePositiveRatePct: calculatedFprPct,
      sensorHarmonizationErrorPct: calculatedHarmonizationErrorPct,
      routePredictionMapePct: null as any,     // Not evaluated in this run
      claimVerificationAccuracyPct: calculatedAccuracyPct,
      toolCallSchemaCompliancePct: null as any, // Not evaluated in this run
    };

    const isSuperior =
      challengerMetrics.falsePositiveRatePct <= champion.metrics.falsePositiveRatePct &&
      challengerMetrics.claimVerificationAccuracyPct >= champion.metrics.claimVerificationAccuracyPct;

    const validationReport = [
      `Challenger benchmark on ${dataset.length} real ground-truth cases.`,
      `- Sample: ${wildfireCases.length} confirmed wildfires, ${nonWildfireCases.length} non-wildfires.`,
      `- False Positive Rate: Champion ${champion.metrics.falsePositiveRatePct}% vs Challenger ${calculatedFprPct}%`,
      `- Harmonization Error: Champion ${champion.metrics.sensorHarmonizationErrorPct}% vs Challenger ${calculatedHarmonizationErrorPct}%`,
      `- Claim Accuracy: Champion ${champion.metrics.claimVerificationAccuracyPct}% vs Challenger ${calculatedAccuracyPct}%`,
      `Governing Rule: Model promotions require authorized human commander signature.`,
    ].join('\n');

    await globalLedger.appendEvent('model_evaluated', 'ALEX_SELF_LEARNING_ENGINE', {
      challengerId,
      championId: champion.modelId,
      challengerMetrics,
      isSuperior,
    });

    return {
      decision: isSuperior ? 'NEEDS_HUMAN_SIGN_OFF' : 'REJECT_CANDIDATE',
      evaluationStatus: 'COMPLETED',
      championMetrics: champion.metrics,
      challengerMetrics,
      validationReport,
    };
  }

  /**
   * Promotes a candidate challenger after authorized human sign-off.
   */
  public async promoteModelCandidate(
    challengerId: string,
    authorizedBy: string
  ): Promise<ModelBenchmarkRecord | null> {
    const store = globalStore.getState();
    const currentChampion = store.benchmarks.find((b) => b.role === 'champion');
    const challenger = store.benchmarks.find((b) => b.modelId === challengerId);

    if (!challenger) return null;

    if (currentChampion) {
      currentChampion.role = 'challenger';
      currentChampion.status = 'active_baseline';
    }

    challenger.role = 'champion';
    challenger.status = 'promoted';

    await globalLedger.appendEvent('model_evaluated', authorizedBy, {
      action: 'MODEL_PROMOTED_TO_CHAMPION',
      modelId: challenger.modelId,
      authorizedBy,
      timestamp: new Date().toISOString(),
    });

    await globalStore.save();
    return challenger;
  }
}

export const learningService = new LearningService();
