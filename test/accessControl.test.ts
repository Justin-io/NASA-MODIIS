import test from 'node:test';
import assert from 'node:assert/strict';
import { accessControlService } from '../server/services/accessControlService';

test('AccessControlService - enforces role profiles and authorization matrix', () => {
  const admin = accessControlService.getRoleProfile('admin');
  assert.equal(admin.clearanceLevel, 4);
  assert.equal(admin.canApproveDispatch, true);
  assert.equal(admin.canManageAPIKeys, true);

  const commander = accessControlService.getRoleProfile('commander');
  assert.equal(commander.clearanceLevel, 4);
  assert.equal(commander.canApproveDispatch, true);
  assert.equal(commander.canManageAPIKeys, false);

  const scientist = accessControlService.getRoleProfile('scientist');
  assert.equal(scientist.clearanceLevel, 3);
  assert.equal(scientist.canApproveDispatch, false);
  assert.ok(scientist.permittedWorkspaces.includes('orbital'));

  const community = accessControlService.getRoleProfile('community');
  assert.equal(community.clearanceLevel, 0);
  assert.equal(community.canInitiateTelephony, false);
  assert.equal(community.canApproveDispatch, false);
});

test('AccessControlService - canAccessWorkspace evaluates correctly', () => {
  assert.equal(accessControlService.canAccessWorkspace('admin', 'settings'), true);
  assert.equal(accessControlService.canAccessWorkspace('community', 'settings'), false);
  assert.equal(accessControlService.canAccessWorkspace('scientist', 'orbital'), true);
  assert.equal(accessControlService.canAccessWorkspace('field', 'orbital'), false);
});
