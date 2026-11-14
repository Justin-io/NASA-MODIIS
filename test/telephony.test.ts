import test from 'node:test';
import assert from 'node:assert/strict';
import { TelephonyService } from '../server/services/telephonyService';

test('TelephonyService - enforces AI identity announcement and valid progression', async () => {
  const service = new TelephonyService();

  const call = await service.initiateCall({
    recipientName: 'Dr. S. Ramanathan',
    recipientAgency: 'Nilgiris District Headquarters Hospital',
    phoneNumber: '+91-423-2444108',
    role: 'Hospital Chief of Trauma',
    incidentId: 'INC-2026-0842',
    initialMessage: 'Emergency hospital bed inquiry.',
    autoAdvance: false,
  });

  assert.ok(call.id.startsWith('CALL-'));
  assert.equal(call.aiIdentityAnnounced, true);
  assert.equal(call.state, 'call_initiated');
  assert.ok(call.transcript[0].text.includes('Identifying as ALEX Emergency Intelligence'));
});
