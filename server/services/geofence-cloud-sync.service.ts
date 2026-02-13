/**
 * Geofence Cloud Sync Service
 * Team management, version control, cloud sync, sharing, sync state management.
 */

import type { GeofenceTemplate } from './geofence-undo-redo.service';

// ==================== Types ====================

interface TeamMemberPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canShare: boolean;
  canManageMembers: boolean;
}

interface TeamMember {
  userId: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  permissions: TeamMemberPermissions;
  joinedAt: number;
}

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  description?: string;
  members: TeamMember[];
  createdAt: number;
  updatedAt: number;
}

export interface TemplateVersion {
  id: string;
  templateId: string;
  version: number;
  snapshot: GeofenceTemplate;
  createdBy: string;
  changeDescription: string;
  tags: string[];
  createdAt: number;
}

export interface CloudTemplate extends GeofenceTemplate {
  cloudMetadata: {
    version: number;
    syncStatus: 'synced' | 'pending' | 'conflict';
    createdBy: string;
    updatedBy?: string;
    lastSyncedAt?: number;
  };
}

export interface SyncResult {
  success: boolean;
  operations: any[];
  uploaded: number;
  downloaded: number;
  deleted: number;
  conflicts: number;
  errors: string[];
  duration: number;
  timestamp: number;
}

export interface ShareLink {
  id: string;
  templateIds: string[];
  createdBy: string;
  createdAt: number;
  expiresAt?: number;
  maxAccess?: number;
  accessCount: number;
  permissions: 'view' | 'edit';
  password?: string;
  isActive: boolean;
}

interface SyncState {
  isSyncing: boolean;
  lastSyncAt: number | null;
  pendingOperations: any[];
  statistics: {
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    totalUploaded: number;
    totalDownloaded: number;
  };
  nextSyncAt: number | null;
}

export const ROLE_PERMISSIONS: Record<string, TeamMemberPermissions> = {
  owner: { canView: true, canEdit: true, canDelete: true, canShare: true, canManageMembers: true },
  admin: { canView: true, canEdit: true, canDelete: true, canShare: true, canManageMembers: true },
  editor: { canView: true, canEdit: true, canDelete: false, canShare: true, canManageMembers: false },
  viewer: { canView: true, canEdit: false, canDelete: false, canShare: false, canManageMembers: false },
};

export const DEFAULT_SYNC_CONFIG = {
  autoSync: true,
  syncInterval: 300000,
  conflictResolution: 'ask' as const,
  maxRetries: 3,
};

// ==================== Team Management ====================

export function createTeam(name: string, ownerId: string, ownerName: string, ownerEmail: string, description?: string): Team {
  return {
    id: `team_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    ownerId,
    description,
    members: [{
      userId: ownerId,
      name: ownerName,
      email: ownerEmail,
      role: 'owner',
      permissions: ROLE_PERMISSIONS.owner,
      joinedAt: Date.now(),
    }],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function addTeamMember(
  team: Team, userId: string, name: string, email: string, role: 'admin' | 'editor' | 'viewer'
): { team: Team; member: TeamMember } {
  if (team.members.some(m => m.userId === userId)) {
    throw new Error('User is already a member');
  }
  const member: TeamMember = {
    userId, name, email, role,
    permissions: ROLE_PERMISSIONS[role],
    joinedAt: Date.now(),
  };
  const updatedTeam = { ...team, members: [...team.members, member], updatedAt: Date.now() };
  return { team: updatedTeam, member };
}

export function removeTeamMember(team: Team, userId: string): Team {
  if (team.ownerId === userId) throw new Error('Cannot remove team owner');
  return { ...team, members: team.members.filter(m => m.userId !== userId), updatedAt: Date.now() };
}

export function updateMemberRole(team: Team, userId: string, newRole: 'admin' | 'editor' | 'viewer'): Team {
  return {
    ...team,
    members: team.members.map(m =>
      m.userId === userId ? { ...m, role: newRole, permissions: ROLE_PERMISSIONS[newRole] } : m
    ),
    updatedAt: Date.now(),
  };
}

export function checkPermission(team: Team, userId: string, permission: keyof TeamMemberPermissions): boolean {
  const member = team.members.find(m => m.userId === userId);
  if (!member) return false;
  return member.permissions[permission] ?? false;
}

export function transferOwnership(team: Team, currentOwnerId: string, newOwnerId: string): Team {
  return {
    ...team,
    ownerId: newOwnerId,
    members: team.members.map(m => {
      if (m.userId === newOwnerId) return { ...m, role: 'owner' as const, permissions: ROLE_PERMISSIONS.owner };
      if (m.userId === currentOwnerId) return { ...m, role: 'admin' as const, permissions: ROLE_PERMISSIONS.admin };
      return m;
    }),
    updatedAt: Date.now(),
  };
}

// ==================== Version Control ====================

export function createTemplateVersion(
  template: GeofenceTemplate, userId: string, description: string, tags: string[] = [], previousVersion?: TemplateVersion
): TemplateVersion {
  return {
    id: `ver_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    templateId: template.id,
    version: previousVersion ? previousVersion.version + 1 : 1,
    snapshot: { ...template },
    createdBy: userId,
    changeDescription: description,
    tags,
    createdAt: Date.now(),
  };
}

export function getVersionHistory(
  versions: TemplateVersion[], templateId: string, options?: { tags?: string[] }
): TemplateVersion[] {
  let filtered = versions.filter(v => v.templateId === templateId);
  if (options?.tags && options.tags.length > 0) {
    filtered = filtered.filter(v => v.tags.some(t => options.tags!.includes(t)));
  }
  return filtered.sort((a, b) => b.version - a.version);
}

export function compareVersions(v1: TemplateVersion, v2: TemplateVersion): {
  identical: boolean;
  differences: Array<{ field: string; oldValue: any; newValue: any }>;
} {
  const diffs: Array<{ field: string; oldValue: any; newValue: any }> = [];
  const s1 = v1.snapshot as any;
  const s2 = v2.snapshot as any;
  const keys = new Set([...Object.keys(s1), ...Object.keys(s2)]);
  for (const key of keys) {
    if (key === 'updatedAt' || key === 'createdAt') continue;
    if (JSON.stringify(s1[key]) !== JSON.stringify(s2[key])) {
      diffs.push({ field: key, oldValue: s1[key], newValue: s2[key] });
    }
  }
  return { identical: diffs.length === 0, differences: diffs };
}

export function restoreVersion(version: TemplateVersion, userId: string): {
  template: GeofenceTemplate;
  newVersion: TemplateVersion;
} {
  const template = { ...version.snapshot, updatedAt: Date.now() };
  const newVersion = createTemplateVersion(template, userId, `Restored from version ${version.version}`, [], version);
  return { template, newVersion };
}

// ==================== Cloud Sync ====================

export function createCloudTemplate(template: GeofenceTemplate, userId: string): CloudTemplate {
  return {
    ...template,
    cloudMetadata: {
      version: 1,
      syncStatus: 'pending',
      createdBy: userId,
    },
  };
}

export function updateCloudTemplate(
  cloudTemplate: CloudTemplate, updates: Partial<GeofenceTemplate>, userId: string
): CloudTemplate {
  return {
    ...cloudTemplate,
    ...updates,
    cloudMetadata: {
      ...cloudTemplate.cloudMetadata,
      version: cloudTemplate.cloudMetadata.version + 1,
      syncStatus: 'pending',
      updatedBy: userId,
    },
    updatedAt: Date.now(),
  };
}

export function createSyncOperation(type: string, templateId: string, data: any): any {
  return { id: `op_${Date.now()}`, type, templateId, data, createdAt: Date.now() };
}

export function performSync(
  localTemplates: CloudTemplate[], remoteTemplates: CloudTemplate[], config: any
): SyncResult {
  const localIds = new Set(localTemplates.map(t => t.id));
  const remoteIds = new Set(remoteTemplates.map(t => t.id));
  const uploaded = localTemplates.filter(t => !remoteIds.has(t.id)).length;
  const downloaded = remoteTemplates.filter(t => !localIds.has(t.id)).length;
  return {
    success: true,
    operations: [],
    uploaded,
    downloaded,
    deleted: 0,
    conflicts: 0,
    errors: [],
    duration: 100,
    timestamp: Date.now(),
  };
}

export function detectConflicts(localTemplates: CloudTemplate[], remoteTemplates: CloudTemplate[]): any[] {
  const conflicts: any[] = [];
  for (const local of localTemplates) {
    const remote = remoteTemplates.find(r => r.id === local.id);
    if (remote && local.cloudMetadata.syncStatus === 'pending' && remote.cloudMetadata.version > local.cloudMetadata.version) {
      conflicts.push({ templateId: local.id, local, remote });
    }
  }
  return conflicts;
}

export function resolveConflict(
  conflict: any, strategy: 'keep_local' | 'keep_remote' | 'merge'
): { conflict: any; result: GeofenceTemplate } {
  const resolved = { ...conflict, resolution: strategy, resolvedAt: Date.now() };
  let result: GeofenceTemplate;
  if (strategy === 'keep_remote') {
    result = conflict.remoteVersion?.snapshot ?? conflict.remote ?? {};
  } else {
    result = conflict.localVersion?.snapshot ?? conflict.local ?? {};
  }
  return { conflict: resolved, result };
}

export function autoMergeTemplates(
  local: GeofenceTemplate, remote: GeofenceTemplate, base: GeofenceTemplate
): { merged: GeofenceTemplate; hasConflicts: boolean } {
  const merged = { ...base };
  let hasConflicts = false;
  const keys = new Set([...Object.keys(local), ...Object.keys(remote)]) as Set<keyof GeofenceTemplate>;
  for (const key of keys) {
    if (key === 'updatedAt' || key === 'createdAt') continue;
    const baseVal = JSON.stringify((base as any)[key]);
    const localVal = JSON.stringify((local as any)[key]);
    const remoteVal = JSON.stringify((remote as any)[key]);
    if (localVal !== baseVal && remoteVal === baseVal) {
      (merged as any)[key] = (local as any)[key];
    } else if (remoteVal !== baseVal && localVal === baseVal) {
      (merged as any)[key] = (remote as any)[key];
    } else if (localVal !== remoteVal && localVal !== baseVal && remoteVal !== baseVal) {
      hasConflicts = true;
      (merged as any)[key] = (local as any)[key];
    }
  }
  return { merged: merged as GeofenceTemplate, hasConflicts };
}

// ==================== Share Links ====================

export function createShareLink(
  templateIds: string[], userId: string,
  options?: { expiresIn?: number; maxAccess?: number; permissions?: 'view' | 'edit'; password?: string }
): ShareLink {
  return {
    id: `share_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    templateIds,
    createdBy: userId,
    createdAt: Date.now(),
    expiresAt: options?.expiresIn ? Date.now() + options.expiresIn : undefined,
    maxAccess: options?.maxAccess,
    accessCount: 0,
    permissions: options?.permissions || 'view',
    password: options?.password,
    isActive: true,
  };
}

export function validateShareLink(link: ShareLink, password?: string): { valid: boolean; reason?: string } {
  if (!link.isActive) return { valid: false, reason: 'Link has been deactivated' };
  if (link.expiresAt && Date.now() > link.expiresAt) return { valid: false, reason: 'Link has expired' };
  if (link.maxAccess && link.accessCount >= link.maxAccess) return { valid: false, reason: 'Max access reached' };
  if (link.password && password !== link.password) return { valid: false, reason: 'Invalid password' };
  return { valid: true };
}

export function useShareLink(link: ShareLink): ShareLink {
  return { ...link, accessCount: link.accessCount + 1 };
}

export function deactivateShareLink(link: ShareLink): ShareLink {
  return { ...link, isActive: false };
}

// ==================== Sync State ====================

export function createInitialSyncState(): SyncState {
  return {
    isSyncing: false,
    lastSyncAt: null,
    pendingOperations: [],
    statistics: { totalSyncs: 0, successfulSyncs: 0, failedSyncs: 0, totalUploaded: 0, totalDownloaded: 0 },
    nextSyncAt: null,
  };
}

export function updateSyncState(state: SyncState, result: SyncResult, config: any): SyncState {
  return {
    ...state,
    isSyncing: false,
    lastSyncAt: result.timestamp,
    statistics: {
      totalSyncs: state.statistics.totalSyncs + 1,
      successfulSyncs: state.statistics.successfulSyncs + (result.success ? 1 : 0),
      failedSyncs: state.statistics.failedSyncs + (result.success ? 0 : 1),
      totalUploaded: state.statistics.totalUploaded + result.uploaded,
      totalDownloaded: state.statistics.totalDownloaded + result.downloaded,
    },
    nextSyncAt: config.autoSync ? Date.now() + (config.syncInterval || 300000) : null,
  };
}

export function getSyncStateSummary(state: SyncState): { status: string; message: string } {
  if (state.isSyncing) return { status: 'syncing', message: '正在同步...' };
  if (!state.lastSyncAt) return { status: 'idle', message: '尚未同步' };
  return { status: 'synced', message: `上次同步: ${new Date(state.lastSyncAt).toLocaleString()}` };
}

// ==================== Utilities ====================

export function calculateChecksum(data: any): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export function calculateSize(data: any): number {
  return JSON.stringify(data).length;
}
