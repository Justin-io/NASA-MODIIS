/**
 * Ground Verification & CAD Dispatch Service — v2.7.0
 *
 * Provides authenticated field ranger initial attack size-ups (ICS-201 standard),
 * Computer-Aided Dispatch (CAD 112/911) incident telemetry, and multi-source
 * corroboration matrices that eliminate satellite false positives.
 */

import {
  CadDispatchEvent,
  AuthenticatedRangerReport,
  MultiSourceCorroborationMatrix,
  CAD_DISPATCH_EVENTS,
  AUTHENTICATED_RANGER_REPORTS,
  CORROBORATION_MATRICES,
  getCadEventsForRegion,
  getRangerReportsForIncident,
  getCorroborationMatrix,
} from '../../src/shared/groundVerificationData';

export class GroundVerificationService {
  public getCadDispatches(regionId?: string): CadDispatchEvent[] {
    if (!regionId) return CAD_DISPATCH_EVENTS;
    return getCadEventsForRegion(regionId);
  }

  public getRangerReports(incidentId?: string): AuthenticatedRangerReport[] {
    if (!incidentId) return AUTHENTICATED_RANGER_REPORTS;
    return getRangerReportsForIncident(incidentId);
  }

  public getCorroboration(incidentId?: string): MultiSourceCorroborationMatrix[] {
    if (!incidentId) return CORROBORATION_MATRICES;
    const match = getCorroborationMatrix(incidentId);
    return match ? [match] : [];
  }

  public getVerificationPackage(incidentId: string) {
    const rangerReports = getRangerReportsForIncident(incidentId);
    const corroboration = getCorroborationMatrix(incidentId);
    const relatedCad = CAD_DISPATCH_EVENTS.filter((e) => e.incidentId === incidentId);

    return {
      incidentId,
      rangerReports,
      corroboration,
      cadEvents: relatedCad,
      isVerified: rangerReports.length > 0 || (corroboration?.overallCorroborationScorePct ?? 0) >= 80,
    };
  }
}

export const groundVerificationService = new GroundVerificationService();
