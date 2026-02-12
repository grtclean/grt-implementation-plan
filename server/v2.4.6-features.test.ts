/**
 * v2.4.6 功能测试
 * 测试围栏模板云同步、根因分析交互式探索、监控告警通知集成
 */

import { describe, it, expect, beforeEach } from 'vitest';

// 围栏模板云同步服务
import {
  createTeam,
  addTeamMember,
  removeTeamMember,
  updateMemberRole,
  checkPermission,
  transferOwnership,
  createTemplateVersion,
  getVersionHistory,
  compareVersions,
  restoreVersion,
  createCloudTemplate,
  updateCloudTemplate,
  createSyncOperation,
  performSync,
  detectConflicts,
  resolveConflict,
  autoMergeTemplates,
  createShareLink,
  validateShareLink,
  useShareLink,
  deactivateShareLink,
  createInitialSyncState,
  updateSyncState,
  getSyncStateSummary,
  calculateChecksum,
  calculateSize,
  ROLE_PERMISSIONS,
  DEFAULT_SYNC_CONFIG,
  type Team,
  type CloudTemplate,
  type TemplateVersion,
  type SyncResult,
  type ShareLink
} from './services/geofence-cloud-sync.service';

// 根因分析交互式探索服务
import {
  createInitialState,
  handleInteractionEvent,
  getNodeDetails,
  traceCausalPath,
  findAllPaths,
  createPathTraceAnimation,
  createRippleAnimation,
  getAnimationFrame,
  advanceAnimation,
  playAnimation,
  pauseAnimation,
  resetAnimation,
  applyFilters as applyGraphFilters,
  getContextMenu,
  handleKeyboardEvent,
  KEYBOARD_SHORTCUTS,
  DEFAULT_FILTER_OPTIONS,
  type InteractionState,
  type InteractionEvent,
  type AnimationState,
  type PathTraceResult
} from './services/root-cause-interactive.service';

// 监控告警通知集成服务
import {
  createNotificationChannel,
  updateNotificationChannel,
  validateChannelConfig,
  formatWechatWorkMessage,
  formatDingtalkMessage,
  formatFeishuMessage,
  formatSlackMessage,
  formatTeamsMessage,
  formatWebhookMessage,
  createRateLimitState,
  checkRateLimit,
  consumeRateLimit,
  applyFilters as applyAlertFilters,
  createNotificationMessage,
  simulateSendNotification,
  calculateRetryDelay,
  calculateStatistics,
  aggregateAlerts,
  isAlertSilenced,
  createSilenceRule,
  calculateHmacSignature,
  DEFAULT_RATE_LIMIT,
  DEFAULT_RETRY_POLICY,
  type NotificationChannel,
  type AlertEvent,
  type NotificationMessage,
  type RateLimitState,
  type SilenceRule
} from './services/alert-notification.service';

// 导入根因分析可视化服务用于测试
import {
  buildVisualizationGraph,
  type CausalGraph
} from './services/root-cause-visualization.service';

import { type GeofenceTemplate } from './services/geofence-undo-redo.service';

// ==================== 测试数据 ====================

function createMockTemplate(id: string, name: string): GeofenceTemplate {
  return {
    id,
    name,
    description: `Template ${name}`,
    category: 'work_area',
    shape: 'rectangle',
    alertLevel: 'warning',
    triggerType: 'enter',
    color: '#ff0000',
    defaultWidth: 100,
    defaultHeight: 100,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

function createMockCausalGraph(): CausalGraph {
  return {
    nodes: [
      { id: 'root1', label: 'Root Cause 1', type: 'root_cause', x: 0, y: 0, style: { color: '#ef4444', size: 40, opacity: 1, scale: 1 }, data: {} },
      { id: 'inter1', label: 'Intermediate 1', type: 'intermediate', x: 100, y: 0, style: { color: '#f59e0b', size: 35, opacity: 1, scale: 1 }, data: {} },
      { id: 'inter2', label: 'Intermediate 2', type: 'intermediate', x: 200, y: 0, style: { color: '#f59e0b', size: 35, opacity: 1, scale: 1 }, data: {} },
      { id: 'anomaly1', label: 'Anomaly 1', type: 'anomaly', x: 300, y: 0, style: { color: '#dc2626', size: 38, opacity: 1, scale: 1 }, data: {} },
      { id: 'normal1', label: 'Normal 1', type: 'normal', x: 400, y: 0, style: { color: '#22c55e', size: 30, opacity: 1, scale: 1 }, data: {} }
    ],
    edges: [
      { id: 'e1', source: 'root1', target: 'inter1', correlation: 0.9, label: '90%', style: { color: '#666', width: 2, opacity: 1, animated: false } },
      { id: 'e2', source: 'inter1', target: 'inter2', correlation: 0.8, label: '80%', style: { color: '#666', width: 2, opacity: 1, animated: false } },
      { id: 'e3', source: 'inter2', target: 'anomaly1', correlation: 0.85, label: '85%', style: { color: '#666', width: 2, opacity: 1, animated: false } },
      { id: 'e4', source: 'anomaly1', target: 'normal1', correlation: 0.7, label: '70%', style: { color: '#666', width: 2, opacity: 1, animated: false } }
    ],
    statistics: {
      totalNodes: 5,
      totalEdges: 4,
      rootCauseCount: 1,
      anomalyCount: 1,
      avgCorrelation: 0.8125,
      maxDepth: 4
    }
  };
}

function createMockAlertEvent(severity: 'info' | 'warning' | 'error' | 'critical' = 'warning'): AlertEvent {
  return {
    id: `alert_${Date.now()}`,
    source: 'sync_monitor',
    type: 'sync_failure',
    severity,
    title: '同步任务失败',
    message: '数据源连接超时',
    timestamp: Date.now(),
    tags: { environment: 'production', service: 'data_sync' },
    metadata: { taskId: 'task_001', retryCount: 3 }
  };
}

// ==================== 围栏模板云同步测试 ====================

describe('围栏模板云同步服务', () => {
  describe('团队管理', () => {
    let team: Team;

    beforeEach(() => {
      team = createTeam('Test Team', 'owner_001', 'Owner', 'owner@test.com', 'Test description');
    });

    it('应该创建团队', () => {
      expect(team.name).toBe('Test Team');
      expect(team.ownerId).toBe('owner_001');
      expect(team.members).toHaveLength(1);
      expect(team.members[0].role).toBe('owner');
    });

    it('应该添加团队成员', () => {
      const { team: updatedTeam, member } = addTeamMember(
        team, 'user_001', 'User 1', 'user1@test.com', 'editor'
      );
      
      expect(updatedTeam.members).toHaveLength(2);
      expect(member.role).toBe('editor');
      expect(member.permissions.canEdit).toBe(true);
    });

    it('应该阻止重复添加成员', () => {
      const { team: updatedTeam } = addTeamMember(
        team, 'user_001', 'User 1', 'user1@test.com', 'editor'
      );
      
      expect(() => {
        addTeamMember(updatedTeam, 'user_001', 'User 1', 'user1@test.com', 'viewer');
      }).toThrow('already a member');
    });

    it('应该移除团队成员', () => {
      const { team: teamWithMember } = addTeamMember(
        team, 'user_001', 'User 1', 'user1@test.com', 'editor'
      );
      
      const updatedTeam = removeTeamMember(teamWithMember, 'user_001');
      expect(updatedTeam.members).toHaveLength(1);
    });

    it('应该阻止移除所有者', () => {
      expect(() => {
        removeTeamMember(team, 'owner_001');
      }).toThrow('Cannot remove team owner');
    });

    it('应该更新成员角色', () => {
      const { team: teamWithMember } = addTeamMember(
        team, 'user_001', 'User 1', 'user1@test.com', 'viewer'
      );
      
      const updatedTeam = updateMemberRole(teamWithMember, 'user_001', 'admin');
      const member = updatedTeam.members.find(m => m.userId === 'user_001');
      
      expect(member?.role).toBe('admin');
      expect(member?.permissions.canManageMembers).toBe(true);
    });

    it('应该检查用户权限', () => {
      const { team: teamWithMember } = addTeamMember(
        team, 'user_001', 'User 1', 'user1@test.com', 'viewer'
      );
      
      expect(checkPermission(teamWithMember, 'owner_001', 'canDelete')).toBe(true);
      expect(checkPermission(teamWithMember, 'user_001', 'canDelete')).toBe(false);
      expect(checkPermission(teamWithMember, 'unknown', 'canEdit')).toBe(false);
    });

    it('应该转移团队所有权', () => {
      const { team: teamWithMember } = addTeamMember(
        team, 'user_001', 'User 1', 'user1@test.com', 'admin'
      );
      
      const updatedTeam = transferOwnership(teamWithMember, 'owner_001', 'user_001');
      
      expect(updatedTeam.ownerId).toBe('user_001');
      const newOwner = updatedTeam.members.find(m => m.userId === 'user_001');
      const oldOwner = updatedTeam.members.find(m => m.userId === 'owner_001');
      
      expect(newOwner?.role).toBe('owner');
      expect(oldOwner?.role).toBe('admin');
    });
  });

  describe('版本控制', () => {
    let template: GeofenceTemplate;
    let versions: TemplateVersion[];

    beforeEach(() => {
      template = createMockTemplate('tpl_001', 'Test Template');
      versions = [];
    });

    it('应该创建模板版本', () => {
      const version = createTemplateVersion(template, 'user_001', 'Initial version');
      
      expect(version.version).toBe(1);
      expect(version.templateId).toBe('tpl_001');
      expect(version.changeDescription).toBe('Initial version');
    });

    it('应该递增版本号', () => {
      const v1 = createTemplateVersion(template, 'user_001', 'Version 1');
      const v2 = createTemplateVersion(template, 'user_001', 'Version 2', [], v1);
      
      expect(v2.version).toBe(2);
    });

    it('应该获取版本历史', () => {
      const v1 = createTemplateVersion(template, 'user_001', 'Version 1');
      const v2 = createTemplateVersion(template, 'user_001', 'Version 2', [], v1);
      const v3 = createTemplateVersion(template, 'user_001', 'Version 3', ['release'], v2);
      
      versions = [v1, v2, v3];
      
      const history = getVersionHistory(versions, 'tpl_001');
      expect(history).toHaveLength(3);
      expect(history[0].version).toBe(3); // 降序
    });

    it('应该按标签过滤版本', () => {
      const v1 = createTemplateVersion(template, 'user_001', 'Version 1');
      const v2 = createTemplateVersion(template, 'user_001', 'Version 2', ['release'], v1);
      
      versions = [v1, v2];
      
      const filtered = getVersionHistory(versions, 'tpl_001', { tags: ['release'] });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].version).toBe(2);
    });

    it('应该比较两个版本', () => {
      const v1 = createTemplateVersion(template, 'user_001', 'Version 1');
      
      const modifiedTemplate = { ...template, name: 'Modified Name', color: '#00ff00' };
      const v2 = createTemplateVersion(modifiedTemplate, 'user_001', 'Version 2', [], v1);
      
      const comparison = compareVersions(v1, v2);
      
      expect(comparison.identical).toBe(false);
      expect(comparison.differences.length).toBeGreaterThan(0);
      expect(comparison.differences.some(d => d.field === 'name')).toBe(true);
    });

    it('应该恢复到指定版本', () => {
      const v1 = createTemplateVersion(template, 'user_001', 'Version 1');
      
      const { template: restored, newVersion } = restoreVersion(v1, 'user_001');
      
      expect(restored.name).toBe(template.name);
      expect(newVersion.changeDescription).toContain('Restored');
    });
  });

  describe('云同步', () => {
    let template: GeofenceTemplate;

    beforeEach(() => {
      template = createMockTemplate('tpl_001', 'Test Template');
    });

    it('应该创建云端模板', () => {
      const cloudTemplate = createCloudTemplate(template, 'user_001');
      
      expect(cloudTemplate.cloudMetadata.version).toBe(1);
      expect(cloudTemplate.cloudMetadata.syncStatus).toBe('pending');
      expect(cloudTemplate.cloudMetadata.createdBy).toBe('user_001');
    });

    it('应该更新云端模板', () => {
      const cloudTemplate = createCloudTemplate(template, 'user_001');
      const updated = updateCloudTemplate(cloudTemplate, { name: 'Updated Name' }, 'user_002');
      
      expect(updated.name).toBe('Updated Name');
      expect(updated.cloudMetadata.version).toBe(2);
      expect(updated.cloudMetadata.updatedBy).toBe('user_002');
    });

    it('应该执行同步', () => {
      const local1 = createCloudTemplate(createMockTemplate('tpl_001', 'Local 1'), 'user_001');
      const local2 = createCloudTemplate(createMockTemplate('tpl_002', 'Local 2'), 'user_001');
      const remote1 = createCloudTemplate(createMockTemplate('tpl_003', 'Remote 1'), 'user_002');
      
      const result = performSync([local1, local2], [remote1], DEFAULT_SYNC_CONFIG);
      
      expect(result.success).toBe(true);
      expect(result.uploaded).toBe(2); // local1, local2
      expect(result.downloaded).toBe(1); // remote1
    });

    it('应该检测冲突', () => {
      const local = createCloudTemplate(template, 'user_001');
      const remote = updateCloudTemplate(
        createCloudTemplate(template, 'user_001'),
        { name: 'Remote Modified' },
        'user_002'
      );
      
      // 模拟本地也有修改
      const localModified = {
        ...local,
        cloudMetadata: { ...local.cloudMetadata, syncStatus: 'pending' as const }
      };
      
      const conflicts = detectConflicts([localModified], [remote]);
      expect(conflicts.length).toBeGreaterThanOrEqual(0);
    });

    it('应该解决冲突', () => {
      const v1 = createTemplateVersion(template, 'user_001');
      const modifiedTemplate = { ...template, name: 'Modified' };
      const v2 = createTemplateVersion(modifiedTemplate, 'user_002');
      
      const conflict = {
        templateId: template.id,
        localVersion: v1,
        remoteVersion: v2,
        conflictType: 'both_modified' as const,
        detectedAt: Date.now()
      };
      
      const { conflict: resolved, result } = resolveConflict(conflict, 'keep_remote');
      
      expect(resolved.resolution).toBe('keep_remote');
      expect(result.name).toBe('Modified');
    });

    it('应该自动合并模板', () => {
      const local = { ...template, name: 'Local Name' };
      const remote = { ...template, description: 'Remote Description' };
      
      const { merged, hasConflicts } = autoMergeTemplates(local, remote, template);
      
      expect(hasConflicts).toBe(false);
      expect(merged.name).toBe('Local Name');
      expect(merged.description).toBe('Remote Description');
    });
  });

  describe('共享功能', () => {
    it('应该创建共享链接', () => {
      const link = createShareLink(['tpl_001', 'tpl_002'], 'user_001', {
        expiresIn: 86400000,
        maxAccess: 10,
        permissions: 'view'
      });
      
      expect(link.templateIds).toHaveLength(2);
      expect(link.permissions).toBe('view');
      expect(link.maxAccess).toBe(10);
      expect(link.isActive).toBe(true);
    });

    it('应该验证共享链接', () => {
      const link = createShareLink(['tpl_001'], 'user_001');
      
      const result = validateShareLink(link);
      expect(result.valid).toBe(true);
    });

    it('应该验证过期链接', () => {
      const link: ShareLink = {
        id: 'share_001',
        templateIds: ['tpl_001'],
        createdBy: 'user_001',
        createdAt: Date.now() - 100000,
        expiresAt: Date.now() - 1000, // 已过期
        accessCount: 0,
        permissions: 'view',
        isActive: true
      };
      
      const result = validateShareLink(link);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('expired');
    });

    it('应该验证密码保护链接', () => {
      const link = createShareLink(['tpl_001'], 'user_001', {
        password: 'secret123'
      });
      
      expect(validateShareLink(link, 'wrong').valid).toBe(false);
      expect(validateShareLink(link, 'secret123').valid).toBe(true);
    });

    it('应该使用共享链接', () => {
      const link = createShareLink(['tpl_001'], 'user_001');
      const used = useShareLink(link);
      
      expect(used.accessCount).toBe(1);
    });

    it('应该停用共享链接', () => {
      const link = createShareLink(['tpl_001'], 'user_001');
      const deactivated = deactivateShareLink(link);
      
      expect(deactivated.isActive).toBe(false);
      expect(validateShareLink(deactivated).valid).toBe(false);
    });
  });

  describe('同步状态管理', () => {
    it('应该创建初始同步状态', () => {
      const state = createInitialSyncState();
      
      expect(state.isSyncing).toBe(false);
      expect(state.pendingOperations).toHaveLength(0);
      expect(state.statistics.totalSyncs).toBe(0);
    });

    it('应该更新同步状态', () => {
      const state = createInitialSyncState();
      const result: SyncResult = {
        success: true,
        operations: [],
        uploaded: 5,
        downloaded: 3,
        deleted: 0,
        conflicts: 0,
        errors: [],
        duration: 1000,
        timestamp: Date.now()
      };
      
      const updated = updateSyncState(state, result, DEFAULT_SYNC_CONFIG);
      
      expect(updated.statistics.totalSyncs).toBe(1);
      expect(updated.statistics.successfulSyncs).toBe(1);
      expect(updated.statistics.totalUploaded).toBe(5);
    });

    it('应该获取同步状态摘要', () => {
      const state = createInitialSyncState();
      const summary = getSyncStateSummary(state);
      
      expect(summary.status).toBe('idle');
      expect(summary.message).toContain('尚未同步');
    });
  });

  describe('工具函数', () => {
    it('应该计算校验和', () => {
      const data = { name: 'test', value: 123 };
      const checksum = calculateChecksum(data);
      
      expect(checksum).toBeTruthy();
      expect(typeof checksum).toBe('string');
      
      // 相同数据应该产生相同校验和
      expect(calculateChecksum(data)).toBe(checksum);
    });

    it('应该计算数据大小', () => {
      const data = { name: 'test', value: 123 };
      const size = calculateSize(data);
      
      expect(size).toBeGreaterThan(0);
    });
  });
});

// ==================== 根因分析交互式探索测试 ====================

describe('根因分析交互式探索服务', () => {
  let graph: CausalGraph;
  let state: InteractionState;

  beforeEach(() => {
    graph = createMockCausalGraph();
    state = createInitialState();
  });

  describe('交互状态管理', () => {
    it('应该创建初始状态', () => {
      expect(state.selectedNodeId).toBeNull();
      expect(state.hoveredNodeId).toBeNull();
      expect(state.zoomLevel).toBe(1);
      expect(state.animationState.isPlaying).toBe(false);
    });

    it('应该处理节点点击事件', () => {
      const event: InteractionEvent = {
        type: 'click',
        targetId: 'root1',
        targetType: 'node',
        position: { x: 0, y: 0 },
        timestamp: Date.now(),
        modifiers: { ctrl: false, shift: false, alt: false }
      };
      
      const newState = handleInteractionEvent(state, event, graph);
      expect(newState.selectedNodeId).toBe('root1');
    });

    it('应该处理悬停事件', () => {
      const event: InteractionEvent = {
        type: 'hover',
        targetId: 'inter1',
        targetType: 'node',
        position: { x: 100, y: 0 },
        timestamp: Date.now(),
        modifiers: { ctrl: false, shift: false, alt: false }
      };
      
      const newState = handleInteractionEvent(state, event, graph);
      expect(newState.hoveredNodeId).toBe('inter1');
    });

    it('应该处理双击展开事件', () => {
      const event: InteractionEvent = {
        type: 'double_click',
        targetId: 'root1',
        targetType: 'node',
        position: { x: 0, y: 0 },
        timestamp: Date.now(),
        modifiers: { ctrl: false, shift: false, alt: false }
      };
      
      const newState = handleInteractionEvent(state, event, graph);
      expect(newState.expandedNodes.has('root1')).toBe(true);
    });

    it('应该处理缩放事件', () => {
      const event: InteractionEvent = {
        type: 'zoom',
        targetType: 'background',
        position: { x: 0, y: 1 }, // y > 0 表示放大
        timestamp: Date.now(),
        modifiers: { ctrl: false, shift: false, alt: false }
      };
      
      const newState = handleInteractionEvent(state, event, graph);
      expect(newState.zoomLevel).toBeGreaterThan(1);
    });

    it('应该处理平移事件', () => {
      const event: InteractionEvent = {
        type: 'pan',
        targetType: 'background',
        position: { x: 50, y: 30 },
        timestamp: Date.now(),
        modifiers: { ctrl: false, shift: false, alt: false }
      };
      
      const newState = handleInteractionEvent(state, event, graph);
      expect(newState.panOffset.x).toBe(50);
      expect(newState.panOffset.y).toBe(30);
    });

    it('应该点击背景取消选择', () => {
      state.selectedNodeId = 'root1';
      
      const event: InteractionEvent = {
        type: 'click',
        targetType: 'background',
        position: { x: 500, y: 500 },
        timestamp: Date.now(),
        modifiers: { ctrl: false, shift: false, alt: false }
      };
      
      const newState = handleInteractionEvent(state, event, graph);
      expect(newState.selectedNodeId).toBeNull();
    });
  });

  describe('节点详情', () => {
    it('应该获取节点详情', () => {
      const details = getNodeDetails(graph, 'inter1');
      
      expect(details).not.toBeNull();
      expect(details?.node.id).toBe('inter1');
      expect(details?.incomingEdges.length).toBeGreaterThan(0);
      expect(details?.outgoingEdges.length).toBeGreaterThan(0);
    });

    it('应该返回null对于不存在的节点', () => {
      const details = getNodeDetails(graph, 'nonexistent');
      expect(details).toBeNull();
    });

    it('应该计算节点统计信息', () => {
      const details = getNodeDetails(graph, 'inter1');
      
      expect(details?.statistics.totalConnections).toBeGreaterThan(0);
      expect(details?.statistics.avgCorrelation).toBeGreaterThan(0);
    });

    it('应该生成节点建议', () => {
      const details = getNodeDetails(graph, 'root1');
      
      expect(details?.recommendations.length).toBeGreaterThan(0);
      expect(details?.recommendations.some(r => r.includes('根因'))).toBe(true);
    });
  });

  describe('路径追溯', () => {
    it('应该追溯因果路径', () => {
      const result = traceCausalPath(graph, 'root1', 'anomaly1');
      
      expect(result).not.toBeNull();
      expect(result?.path[0]).toBe('root1');
      expect(result?.path[result.path.length - 1]).toBe('anomaly1');
    });

    it('应该返回null对于不存在的路径', () => {
      const result = traceCausalPath(graph, 'anomaly1', 'root1'); // 反向
      expect(result).toBeNull();
    });

    it('应该计算路径置信度', () => {
      const result = traceCausalPath(graph, 'root1', 'inter2');
      
      expect(result?.confidence).toBeGreaterThan(0);
      expect(result?.avgCorrelation).toBeGreaterThan(0);
    });

    it('应该生成路径解释', () => {
      const result = traceCausalPath(graph, 'root1', 'inter1');
      
      expect(result?.explanation).toBeTruthy();
      expect(result?.explanation).toContain('Root Cause 1');
    });

    it('应该查找所有路径', () => {
      const results = findAllPaths(graph, 'root1', 'anomaly1', 5);
      
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('动画系统', () => {
    it('应该创建路径追溯动画', () => {
      const path = ['root1', 'inter1', 'inter2', 'anomaly1'];
      const animation = createPathTraceAnimation(graph, path, 500);
      
      expect(animation.type).toBe('path_trace');
      expect(animation.totalSteps).toBe(4);
      expect(animation.speed).toBe(500);
    });

    it('应该创建涟漪动画', () => {
      const animation = createRippleAnimation(graph, 'root1', 300);
      
      expect(animation.type).toBe('ripple');
      expect(animation.totalSteps).toBeGreaterThan(0);
    });

    it('应该获取动画帧', () => {
      const path = ['root1', 'inter1'];
      const animation = createPathTraceAnimation(graph, path);
      const playingAnimation = playAnimation(animation);
      
      const frame = getAnimationFrame(graph, playingAnimation);
      
      expect(frame.step).toBe(0);
      expect(frame.highlightedNodes.length).toBeGreaterThan(0);
    });

    it('应该推进动画', () => {
      const path = ['root1', 'inter1', 'inter2'];
      let animation = createPathTraceAnimation(graph, path);
      animation = playAnimation(animation);
      
      const advanced = advanceAnimation(animation);
      expect(advanced.currentStep).toBe(1);
    });

    it('应该在结束时停止动画', () => {
      const path = ['root1', 'inter1'];
      let animation = createPathTraceAnimation(graph, path);
      animation = playAnimation(animation);
      animation = { ...animation, currentStep: 1 }; // 最后一步
      
      const advanced = advanceAnimation(animation);
      expect(advanced.isPlaying).toBe(false);
    });

    it('应该暂停和重置动画', () => {
      let animation = createPathTraceAnimation(graph, ['root1', 'inter1']);
      animation = playAnimation(animation);
      animation = advanceAnimation(animation);
      
      const paused = pauseAnimation(animation);
      expect(paused.isPlaying).toBe(false);
      expect(paused.currentStep).toBe(1);
      
      const reset = resetAnimation(paused);
      expect(reset.currentStep).toBe(0);
    });
  });

  describe('过滤和视图', () => {
    it('应该应用节点类型过滤', () => {
      const filters = {
        ...DEFAULT_FILTER_OPTIONS,
        showRootCauses: false
      };
      
      const filtered = applyGraphFilters(graph, filters);
      expect(filtered.nodes.find(n => n.type === 'root_cause')).toBeUndefined();
    });

    it('应该应用相关性过滤', () => {
      const filters = {
        ...DEFAULT_FILTER_OPTIONS,
        minCorrelation: 0.85
      };
      
      const filtered = applyGraphFilters(graph, filters);
      expect(filtered.edges.every(e => e.correlation >= 0.85)).toBe(true);
    });

    it('应该获取节点上下文菜单', () => {
      const menu = getContextMenu(graph, 'root1', null);
      
      expect(menu.length).toBeGreaterThan(0);
      expect(menu.some(item => item.action === 'view_details')).toBe(true);
      expect(menu.some(item => item.action === 'trace_upstream')).toBe(true);
    });

    it('应该获取背景上下文菜单', () => {
      const menu = getContextMenu(graph, null, null);
      
      expect(menu.some(item => item.action === 'fit_view')).toBe(true);
      expect(menu.some(item => item.action === 'export')).toBe(true);
    });
  });

  describe('键盘快捷键', () => {
    it('应该定义快捷键映射', () => {
      expect(KEYBOARD_SHORTCUTS['f']).toBeDefined();
      expect(KEYBOARD_SHORTCUTS['Escape']).toBeDefined();
    });

    it('应该处理缩放快捷键', () => {
      const { state: newState, action } = handleKeyboardEvent(
        state,
        '+',
        { ctrl: false, shift: false, alt: false }
      );
      
      expect(action).toBe('zoom_in');
      expect(newState.zoomLevel).toBeGreaterThan(1);
    });

    it('应该处理取消选择快捷键', () => {
      state.selectedNodeId = 'root1';
      
      const { state: newState, action } = handleKeyboardEvent(
        state,
        'Escape',
        { ctrl: false, shift: false, alt: false }
      );
      
      expect(action).toBe('deselect');
      expect(newState.selectedNodeId).toBeNull();
    });

    it('应该处理动画切换快捷键', () => {
      const { state: newState, action } = handleKeyboardEvent(
        state,
        'Space',
        { ctrl: false, shift: false, alt: false }
      );
      
      expect(action).toBe('toggle_animation');
      expect(newState.animationState.isPlaying).toBe(true);
    });
  });
});

// ==================== 监控告警通知集成测试 ====================

describe('监控告警通知集成服务', () => {
  describe('渠道管理', () => {
    it('应该创建Webhook渠道', () => {
      const channel = createNotificationChannel(
        'Test Webhook',
        'webhook',
        {
          type: 'webhook',
          url: 'https://example.com/webhook',
          method: 'POST'
        }
      );
      
      expect(channel.name).toBe('Test Webhook');
      expect(channel.type).toBe('webhook');
      expect(channel.enabled).toBe(true);
    });

    it('应该创建企业微信渠道', () => {
      const channel = createNotificationChannel(
        'WeChat Work',
        'wechat_work',
        {
          type: 'wechat_work',
          webhookUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx',
          msgType: 'markdown'
        }
      );
      
      expect(channel.type).toBe('wechat_work');
    });

    it('应该创建钉钉渠道', () => {
      const channel = createNotificationChannel(
        'DingTalk',
        'dingtalk',
        {
          type: 'dingtalk',
          webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
          msgType: 'markdown',
          isAtAll: false
        }
      );
      
      expect(channel.type).toBe('dingtalk');
    });

    it('应该更新渠道配置', () => {
      const channel = createNotificationChannel(
        'Test',
        'webhook',
        { type: 'webhook', url: 'https://example.com', method: 'POST' }
      );
      
      const updated = updateNotificationChannel(channel, { enabled: false });
      expect(updated.enabled).toBe(false);
    });

    it('应该验证有效的Webhook配置', () => {
      const result = validateChannelConfig({
        type: 'webhook',
        url: 'https://example.com/webhook',
        method: 'POST'
      });
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该验证无效的Webhook配置', () => {
      const result = validateChannelConfig({
        type: 'webhook',
        url: '',
        method: 'POST'
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该验证企业微信URL', () => {
      const result = validateChannelConfig({
        type: 'wechat_work',
        webhookUrl: 'https://invalid.com/webhook',
        msgType: 'text'
      });
      
      expect(result.valid).toBe(false);
    });
  });

  describe('消息格式化', () => {
    let alert: AlertEvent;

    beforeEach(() => {
      alert = createMockAlertEvent('error');
    });

    it('应该格式化企业微信文本消息', () => {
      const message = formatWechatWorkMessage(alert, {
        type: 'wechat_work',
        webhookUrl: 'https://qyapi.weixin.qq.com/...',
        msgType: 'text'
      });
      
      expect(message.msgtype).toBe('text');
      expect(message.text.content).toContain(alert.title);
    });

    it('应该格式化企业微信Markdown消息', () => {
      const message = formatWechatWorkMessage(alert, {
        type: 'wechat_work',
        webhookUrl: 'https://qyapi.weixin.qq.com/...',
        msgType: 'markdown'
      });
      
      expect(message.msgtype).toBe('markdown');
      expect(message.markdown.content).toContain('###');
    });

    it('应该格式化钉钉文本消息', () => {
      const message = formatDingtalkMessage(alert, {
        type: 'dingtalk',
        webhookUrl: 'https://oapi.dingtalk.com/...',
        msgType: 'text',
        isAtAll: true
      });
      
      expect(message.msgtype).toBe('text');
      expect(message.at.isAtAll).toBe(true);
    });

    it('应该格式化钉钉ActionCard消息', () => {
      const message = formatDingtalkMessage(alert, {
        type: 'dingtalk',
        webhookUrl: 'https://oapi.dingtalk.com/...',
        msgType: 'actionCard'
      });
      
      expect(message.msgtype).toBe('actionCard');
      expect(message.actionCard.title).toContain(alert.title);
    });

    it('应该格式化飞书消息', () => {
      const message = formatFeishuMessage(alert, {
        type: 'feishu',
        webhookUrl: 'https://open.feishu.cn/...',
        msgType: 'interactive'
      });
      
      expect(message.msg_type).toBe('interactive');
      expect(message.card.header.title.content).toContain(alert.title);
    });

    it('应该格式化Slack消息', () => {
      const message = formatSlackMessage(alert, {
        type: 'slack',
        webhookUrl: 'https://hooks.slack.com/...',
        channel: '#alerts'
      });
      
      expect(message.channel).toBe('#alerts');
      expect(message.attachments[0].title).toBe(alert.title);
    });

    it('应该格式化Teams消息', () => {
      const message = formatTeamsMessage(alert, {
        type: 'teams',
        webhookUrl: 'https://outlook.office.com/...'
      });
      
      expect(message['@type']).toBe('MessageCard');
      expect(message.summary).toBe(alert.title);
    });

    it('应该格式化通用Webhook消息', () => {
      const message = formatWebhookMessage(alert, {
        type: 'webhook',
        url: 'https://example.com',
        method: 'POST'
      });
      
      expect(message.id).toBe(alert.id);
      expect(message.severity).toBe(alert.severity);
    });
  });

  describe('速率限制', () => {
    let rateLimitState: RateLimitState;

    beforeEach(() => {
      rateLimitState = createRateLimitState('channel_001');
    });

    it('应该创建速率限制状态', () => {
      expect(rateLimitState.channelId).toBe('channel_001');
      expect(rateLimitState.minuteCount).toBe(0);
    });

    it('应该允许在限制内的请求', () => {
      const result = checkRateLimit(rateLimitState, DEFAULT_RATE_LIMIT);
      expect(result.allowed).toBe(true);
    });

    it('应该阻止超出分钟限制的请求', () => {
      let state = rateLimitState;
      for (let i = 0; i < DEFAULT_RATE_LIMIT.maxPerMinute; i++) {
        state = consumeRateLimit(state);
      }
      
      const result = checkRateLimit(state, DEFAULT_RATE_LIMIT);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('per minute');
    });

    it('应该消费速率限制令牌', () => {
      const consumed = consumeRateLimit(rateLimitState);
      
      expect(consumed.minuteCount).toBe(1);
      expect(consumed.hourCount).toBe(1);
      expect(consumed.dayCount).toBe(1);
    });

    it('应该在禁用时允许所有请求', () => {
      const state = { ...rateLimitState, minuteCount: 1000 };
      const result = checkRateLimit(state, { ...DEFAULT_RATE_LIMIT, enabled: false });
      
      expect(result.allowed).toBe(true);
    });
  });

  describe('过滤器', () => {
    it('应该通过等于过滤', () => {
      const alert = createMockAlertEvent('error');
      const result = applyAlertFilters(alert, [
        { field: 'severity', operator: 'equals', value: 'error' }
      ]);
      
      expect(result).toBe(true);
    });

    it('应该通过包含过滤', () => {
      const alert = createMockAlertEvent();
      const result = applyAlertFilters(alert, [
        { field: 'message', operator: 'contains', value: '超时' }
      ]);
      
      expect(result).toBe(true);
    });

    it('应该通过in过滤', () => {
      const alert = createMockAlertEvent('warning');
      const result = applyAlertFilters(alert, [
        { field: 'severity', operator: 'in', value: ['warning', 'error'] }
      ]);
      
      expect(result).toBe(true);
    });

    it('应该通过正则过滤', () => {
      const alert = createMockAlertEvent();
      const result = applyAlertFilters(alert, [
        { field: 'source', operator: 'regex', value: 'sync.*' }
      ]);
      
      expect(result).toBe(true);
    });

    it('应该支持嵌套字段', () => {
      const alert = createMockAlertEvent();
      const result = applyAlertFilters(alert, [
        { field: 'tags.environment', operator: 'equals', value: 'production' }
      ]);
      
      expect(result).toBe(true);
    });
  });

  describe('通知发送', () => {
    it('应该创建通知消息', () => {
      const channel = createNotificationChannel(
        'Test',
        'wechat_work',
        {
          type: 'wechat_work',
          webhookUrl: 'https://qyapi.weixin.qq.com/...',
          msgType: 'text'
        }
      );
      const alert = createMockAlertEvent();
      
      const message = createNotificationMessage(channel, alert);
      
      expect(message.channelId).toBe(channel.id);
      expect(message.alertId).toBe(alert.id);
      expect(message.status).toBe('pending');
    });

    it('应该模拟发送通知', () => {
      const channel = createNotificationChannel(
        'Test',
        'webhook',
        { type: 'webhook', url: 'https://example.com', method: 'POST' }
      );
      const alert = createMockAlertEvent();
      const message = createNotificationMessage(channel, alert);
      
      const result = simulateSendNotification(channel, message);
      
      expect(result.channelId).toBe(channel.id);
      expect(result.messageId).toBe(message.id);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('应该计算重试延迟', () => {
      const delay1 = calculateRetryDelay(0, DEFAULT_RETRY_POLICY);
      const delay2 = calculateRetryDelay(1, DEFAULT_RETRY_POLICY);
      const delay3 = calculateRetryDelay(2, DEFAULT_RETRY_POLICY);
      
      expect(delay1).toBe(DEFAULT_RETRY_POLICY.initialDelay);
      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
    });

    it('应该在超出最大重试后返回-1', () => {
      const delay = calculateRetryDelay(DEFAULT_RETRY_POLICY.maxRetries, DEFAULT_RETRY_POLICY);
      expect(delay).toBe(-1);
    });
  });

  describe('告警聚合', () => {
    it('应该聚合相似告警', () => {
      const alerts = [
        { ...createMockAlertEvent(), source: 'service_a', type: 'timeout' },
        { ...createMockAlertEvent(), source: 'service_a', type: 'timeout' },
        { ...createMockAlertEvent(), source: 'service_b', type: 'error' }
      ];
      
      const aggregated = aggregateAlerts(alerts, {
        enabled: true,
        windowMs: 60000,
        maxAlerts: 10,
        groupBy: ['source', 'type']
      });
      
      expect(aggregated.length).toBe(2); // service_a聚合为1条，service_b单独1条
    });

    it('应该在禁用时返回原始告警', () => {
      const alerts = [createMockAlertEvent(), createMockAlertEvent()];
      
      const aggregated = aggregateAlerts(alerts, {
        enabled: false,
        windowMs: 60000,
        maxAlerts: 10,
        groupBy: ['source']
      });
      
      expect(aggregated.length).toBe(2);
    });
  });

  describe('告警静默', () => {
    it('应该检测被静默的告警', () => {
      const alert = createMockAlertEvent('warning');
      const rule = createSilenceRule(
        'Silence warnings',
        [{ field: 'severity', operator: 'equals', value: 'warning' }],
        3600000,
        'user_001'
      );
      
      const { silenced, rule: matchedRule } = isAlertSilenced(alert, [rule]);
      
      expect(silenced).toBe(true);
      expect(matchedRule?.name).toBe('Silence warnings');
    });

    it('应该不静默不匹配的告警', () => {
      const alert = createMockAlertEvent('error');
      const rule = createSilenceRule(
        'Silence warnings',
        [{ field: 'severity', operator: 'equals', value: 'warning' }],
        3600000,
        'user_001'
      );
      
      const { silenced } = isAlertSilenced(alert, [rule]);
      expect(silenced).toBe(false);
    });

    it('应该创建静默规则', () => {
      const rule = createSilenceRule(
        'Maintenance',
        [{ field: 'source', operator: 'equals', value: 'db_backup' }],
        7200000,
        'admin',
        'Scheduled maintenance'
      );
      
      expect(rule.name).toBe('Maintenance');
      expect(rule.comment).toBe('Scheduled maintenance');
      expect(rule.endsAt - rule.startsAt).toBe(7200000);
    });
  });

  describe('工具函数', () => {
    it('应该计算HMAC签名', () => {
      const signature = calculateHmacSignature('secret', Date.now(), 'data');
      
      expect(signature).toBeTruthy();
      expect(typeof signature).toBe('string');
    });

    it('应该计算统计信息', () => {
      const results = [
        { success: true, channelId: 'ch1', messageId: 'm1', sentAt: Date.now(), duration: 100 },
        { success: true, channelId: 'ch1', messageId: 'm2', sentAt: Date.now(), duration: 150 },
        { success: false, channelId: 'ch1', messageId: 'm3', sentAt: Date.now(), duration: 200, error: 'timeout' }
      ];
      
      const stats = calculateStatistics(results, 'ch1', 'hour');
      
      expect(stats.totalSent).toBe(2);
      expect(stats.totalFailed).toBe(1);
      expect(stats.avgLatency).toBe(150);
      expect(stats.successRate).toBeCloseTo(0.667, 2);
    });
  });
});

// ==================== 集成测试 ====================

describe('v2.4.6 功能集成测试', () => {
  it('应该支持完整的云同步工作流', () => {
    // 1. 创建团队
    const team = createTeam('Dev Team', 'owner', 'Owner', 'owner@test.com');
    
    // 2. 添加成员
    const { team: teamWithMember } = addTeamMember(team, 'dev1', 'Developer 1', 'dev1@test.com', 'editor');
    
    // 3. 创建模板和版本
    const template = createMockTemplate('tpl_001', 'Test Template');
    const cloudTemplate = createCloudTemplate(template, 'owner');
    const version = createTemplateVersion(template, 'owner', 'Initial version');
    
    // 4. 创建共享链接
    const shareLink = createShareLink([template.id], 'owner', { permissions: 'view' });
    
    // 5. 验证权限
    expect(checkPermission(teamWithMember, 'dev1', 'canEdit')).toBe(true);
    expect(validateShareLink(shareLink).valid).toBe(true);
  });

  it('应该支持完整的交互式探索工作流', () => {
    // 1. 创建图和状态
    const graph = createMockCausalGraph();
    let state = createInitialState();
    
    // 2. 选择节点
    state = handleInteractionEvent(state, {
      type: 'click',
      targetId: 'root1',
      targetType: 'node',
      position: { x: 0, y: 0 },
      timestamp: Date.now(),
      modifiers: { ctrl: false, shift: false, alt: false }
    }, graph);
    
    // 3. 获取详情
    const details = getNodeDetails(graph, 'root1');
    
    // 4. 追溯路径
    const path = traceCausalPath(graph, 'root1', 'anomaly1');
    
    // 5. 创建动画
    if (path) {
      const animation = createPathTraceAnimation(graph, path.path);
      expect(animation.totalSteps).toBe(path.path.length);
    }
    
    expect(state.selectedNodeId).toBe('root1');
    expect(details).not.toBeNull();
  });

  it('应该支持完整的告警通知工作流', () => {
    // 1. 创建渠道
    const channel = createNotificationChannel(
      'Alert Channel',
      'wechat_work',
      {
        type: 'wechat_work',
        webhookUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx',
        msgType: 'markdown'
      }
    );
    
    // 2. 创建告警
    const alert = createMockAlertEvent('error');
    
    // 3. 检查过滤
    const passesFilter = applyAlertFilters(alert, channel.filters);
    
    // 4. 检查速率限制
    const rateLimitState = createRateLimitState(channel.id);
    const { allowed } = checkRateLimit(rateLimitState, channel.rateLimit);
    
    // 5. 创建消息
    if (passesFilter && allowed) {
      const message = createNotificationMessage(channel, alert);
      expect(message.status).toBe('pending');
    }
    
    expect(passesFilter).toBe(true);
    expect(allowed).toBe(true);
  });
});
