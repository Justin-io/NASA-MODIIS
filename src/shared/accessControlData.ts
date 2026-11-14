import { UserRole, UserRoleProfile } from './types';

export const USER_ROLE_PROFILES: Record<UserRole, UserRoleProfile> = {
  admin: {
    role: 'admin',
    title: 'System Administrator & Security Lead',
    description: 'Unrestricted administrative clearance across all platform subsystems, cryptographic ledgers, and API configurations.',
    clearanceLevel: 4,
    permittedWorkspaces: [
      'overview', 'earth', 'fire', 'orbital', 'environment',
      'investigation', 'response', 'community', 'voice',
      'reports', 'catalogue', 'cognition', 'health', 'settings'
    ],
    canApproveDispatch: true,
    canInitiateTelephony: true,
    canPublishAdvisories: true,
    canManageAPIKeys: true,
  },
  commander: {
    role: 'commander',
    title: 'Incident Commander / District EOC Director',
    description: 'Authorized executive command clearance for emergency declarations, hospital alerts, and resource dispatch.',
    clearanceLevel: 4,
    permittedWorkspaces: [
      'overview', 'earth', 'fire', 'orbital', 'environment',
      'investigation', 'response', 'community', 'voice',
      'reports', 'catalogue', 'cognition', 'health'
    ],
    canApproveDispatch: true,
    canInitiateTelephony: true,
    canPublishAdvisories: true,
    canManageAPIKeys: false,
  },
  scientist: {
    role: 'scientist',
    title: 'Earth Observation & Orbital Scientist',
    description: 'Specialist access to multi-satellite calibration, orbital dynamics, viewing geometry, and multi-year burning activity models.',
    clearanceLevel: 3,
    permittedWorkspaces: [
      'overview', 'earth', 'fire', 'orbital', 'environment',
      'investigation', 'reports', 'catalogue', 'cognition'
    ],
    canApproveDispatch: false,
    canInitiateTelephony: false,
    canPublishAdvisories: false,
    canManageAPIKeys: false,
  },
  analyst: {
    role: 'analyst',
    title: 'Geospatial Intelligence Analyst',
    description: 'Access to evidence harmonization, anomaly detection, claim verification, and situation reporting.',
    clearanceLevel: 2,
    permittedWorkspaces: [
      'overview', 'earth', 'fire', 'orbital', 'environment',
      'investigation', 'reports', 'catalogue'
    ],
    canApproveDispatch: false,
    canInitiateTelephony: false,
    canPublishAdvisories: false,
    canManageAPIKeys: false,
  },
  operator: {
    role: 'operator',
    title: 'Emergency Operations Dispatcher',
    description: 'Operational tracking of road corridors, staging facilities, telephony status, and field units.',
    clearanceLevel: 2,
    permittedWorkspaces: [
      'overview', 'earth', 'response', 'community', 'voice', 'reports'
    ],
    canApproveDispatch: false,
    canInitiateTelephony: true,
    canPublishAdvisories: false,
    canManageAPIKeys: false,
  },
  field: {
    role: 'field',
    title: 'Forest Ranger & In-Situ Spotter',
    description: 'Field telemetry access: GPS coordinate reporting, ground fire confirmation, and tactical briefing ingestion.',
    clearanceLevel: 1,
    permittedWorkspaces: [
      'overview', 'earth', 'community'
    ],
    canApproveDispatch: false,
    canInitiateTelephony: false,
    canPublishAdvisories: false,
    canManageAPIKeys: false,
  },
  community: {
    role: 'community',
    title: 'Local Resident & Landowner',
    description: 'Public environmental awareness, local safety advisories, and emergency evacuation notices.',
    clearanceLevel: 0,
    permittedWorkspaces: [
      'overview', 'earth', 'community'
    ],
    canApproveDispatch: false,
    canInitiateTelephony: false,
    canPublishAdvisories: false,
    canManageAPIKeys: false,
  },
};

export function getRoleProfileData(role: UserRole): UserRoleProfile {
  return USER_ROLE_PROFILES[role] || USER_ROLE_PROFILES.operator;
}

export function getAllRolesData(): UserRoleProfile[] {
  return Object.values(USER_ROLE_PROFILES);
}
