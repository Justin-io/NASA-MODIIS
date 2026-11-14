import test from 'node:test';
import assert from 'node:assert/strict';
import { communityService } from '../server/services/communityService';
import { globalLedger } from '../server/db/ledger';

test('CommunityService - submits field report and appends to immutable ledger', async () => {
  await globalLedger.init();
  const initialReports = communityService.getFieldReports();
  const initialLen = initialReports.length;

  const newReport = await communityService.submitFieldReport({
    reporterName: 'K. Balaji',
    reporterRole: 'Forest Ranger',
    coordinates: { lat: 11.425, lng: 76.71 },
    nearestLandmark: 'Segur Watchtower Ridge',
    hazardType: 'smoke_column',
    description: 'White smoke plume sighted rising from ravine north of road.',
    verifiedByAuthority: true,
    verifiedByAgency: 'Forest Range Control',
    evidenceAttachments: [],
  });

  assert.ok(newReport.id.startsWith('REP-'));
  assert.equal(newReport.status, 'corroborated');
  assert.equal(communityService.getFieldReports().length, initialLen + 1);
});

test('CommunityService - publishes safety bulletin and records operator action', async () => {
  await globalLedger.init();
  const initialLen = communityService.getSafetyBulletins().length;

  const bulletin = await communityService.publishSafetyBulletin({
    severity: 'preparedness_advisory',
    title: 'Precautionary Firebreak Maintenance',
    message: 'Controlled clearing scheduled along Sigur estate boundary.',
    affectedAdministrativeDistricts: ['The Nilgiris District'],
    recommendedActions: ['Monitor local radio broadcasts'],
    officialSource: 'District Disaster Management Authority',
    consentVerification: true,
  });

  assert.ok(bulletin.id.startsWith('BUL-'));
  assert.equal(bulletin.severity, 'preparedness_advisory');
  assert.equal(communityService.getSafetyBulletins().length, initialLen + 1);
});
