import { UserRole, UserRoleProfile } from '../../src/shared/types';
import {
  getAllRolesData,
  getRoleProfileData,
  USER_ROLE_PROFILES,
} from '../../src/shared/accessControlData';

export class AccessControlService {
  public getRoleProfile(role: UserRole): UserRoleProfile {
    return getRoleProfileData(role);
  }

  public getAllRoles(): UserRoleProfile[] {
    return getAllRolesData();
  }

  public canAccessWorkspace(role: UserRole, workspaceId: string): boolean {
    const profile = this.getRoleProfile(role);
    return profile.permittedWorkspaces.includes(workspaceId);
  }
}

export const accessControlService = new AccessControlService();
