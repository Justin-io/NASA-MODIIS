import {
  CommunityFieldReport,
  CommunitySafetyBulletin,
} from '../../src/shared/types';
import { globalLedger } from '../db/ledger';

export class CommunityService {
  private fieldReports: CommunityFieldReport[] = [
    {
      id: 'REP-2026-001',
      timestamp: '2026-10-31T08:15:00Z',
      reporterName: 'M. Selvakumar',
      reporterRole: 'Forest Ranger',
      coordinates: { lat: 11.4185, lng: 76.7042 },
      nearestLandmark: 'Masinagudi Forest Beat #4 / Kallatti Escarpment',
      hazardType: 'active_understory_fire',
      description: 'Lantana camara dense understory ignition advancing up 28° slope towards tea estate perimeter buffer. Wind gusts ~35 km/h ENE.',
      verifiedByAuthority: true,
      verifiedByAgency: 'Tamil Nadu Forest Department (Nilgiris North Range)',
      status: 'corroborated',
      evidenceAttachments: ['/evidence/field_FD882_photo1.jpg', '/evidence/ranger_gps_track.gpx'],
    },
    {
      id: 'REP-2026-002',
      timestamp: '2026-10-31T09:40:00Z',
      reporterName: 'R. Vignesh',
      reporterRole: 'Highway Patrol',
      coordinates: { lat: 11.412, lng: 76.698 },
      nearestLandmark: 'NH-181 Coonoor Ghat Road Km 17',
      hazardType: 'blocked_corridor',
      description: 'Dense smoke blowing across hair-pin bends 14 to 18 reducing visibility below 30 meters. Precautionary traffic diversion enacted.',
      verifiedByAuthority: true,
      verifiedByAgency: 'Nilgiris District Traffic Police',
      status: 'corroborated',
      evidenceAttachments: [],
    },
  ];

  private safetyBulletins: CommunitySafetyBulletin[] = [
    {
      id: 'BUL-2026-01',
      publishedAt: '2026-10-31T09:30:00Z',
      severity: 'official_warning',
      title: 'Smoke Advisory & Ghat Road Restriction: Masinagudi–Coonoor Corridor',
      message: 'Active thermal anomaly under suppression along Coonoor North Slope. Heavy apparatus in transit. Residents in Masinagudi buffer settlements advised to seal doors/windows and restrict outdoor activity.',
      affectedAdministrativeDistricts: ['The Nilgiris District', 'Coonoor Taluk', 'Kotagiri Taluk'],
      recommendedActions: [
        'Avoid non-essential travel along NH-181 km 14–19',
        'Close ventilation dampers in tea processing sheds',
        'Keep livestock in cleared earthen enclosures',
        'Report sudden spot ignitions immediately to Forest Range Control',
      ],
      officialSource: 'Nilgiris District Emergency Operations Centre (Order #TN-NIL-2026-19)',
      consentVerification: true,
    },
  ];

  public getFieldReports(): CommunityFieldReport[] {
    return this.fieldReports;
  }

  public getSafetyBulletins(): CommunitySafetyBulletin[] {
    return this.safetyBulletins;
  }

  public async submitFieldReport(
    report: Omit<CommunityFieldReport, 'id' | 'timestamp' | 'status'>
  ): Promise<CommunityFieldReport> {
    const id = `REP-${Date.now().toString().slice(-6)}`;
    const timestamp = new Date().toISOString();

    const fullReport: CommunityFieldReport = {
      ...report,
      id,
      timestamp,
      status: report.verifiedByAuthority ? 'corroborated' : 'submitted',
    };

    this.fieldReports.unshift(fullReport);

    await globalLedger.appendEvent(
      'observation_ingested',
      `COMMUNITY_${report.reporterRole.toUpperCase().replace(/\s+/g, '_')}`,
      {
        fieldReportId: id,
        reporter: report.reporterName,
        hazardType: report.hazardType,
        coordinates: report.coordinates,
        verifiedByAuthority: report.verifiedByAuthority,
      }
    );

    return fullReport;
  }

  public async publishSafetyBulletin(
    bulletin: Omit<CommunitySafetyBulletin, 'id' | 'publishedAt'>
  ): Promise<CommunitySafetyBulletin> {
    const id = `BUL-${Date.now().toString().slice(-6)}`;
    const publishedAt = new Date().toISOString();

    const fullBulletin: CommunitySafetyBulletin = {
      ...bulletin,
      id,
      publishedAt,
    };

    this.safetyBulletins.unshift(fullBulletin);

    await globalLedger.appendEvent(
      'operator_override',
      'ALEX_COMMUNITY_COORDINATOR',
      {
        bulletinId: id,
        severity: bulletin.severity,
        title: bulletin.title,
        affectedDistricts: bulletin.affectedAdministrativeDistricts,
      }
    );

    return fullBulletin;
  }
}

export const communityService = new CommunityService();
