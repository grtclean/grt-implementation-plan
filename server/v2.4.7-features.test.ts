/**
 * v2.4.7 功能测试
 * 测试智能体协同通信协议、设备数字孪生3D可视化、预测性维护AI模型
 */

import { describe, it, expect } from 'vitest';

// ==================== 智能体协同通信协议测试 ====================
import {
  createAgentRegistry,
  registerAgent,
  unregisterAgent,
  updateAgentStatus,
  handleHeartbeat,
  checkOfflineAgents,
  getAvailableAgents,
  findAgentsByCapability,
  createMessage,
  createRequest,
  createResponse,
  createBroadcast,
  createHeartbeat,
  validateMessage,
  isMessageExpired,
  createChannel,
  joinChannel,
  leaveChannel,
  getChannelParticipants,
  createMessageQueue,
  enqueueMessage,
  dequeueMessage,
  getPendingMessageCount,
  addRoutingRule,
  removeRoutingRule,
  matchRoutingRule,
  createCoordinatedTask,
  assignTask,
  startTask,
  updateTaskProgress,
  completeTask,
  failTask,
  cancelTask,
  checkTaskDependencies,
  addSubtask,
  isTaskOverdue,
  createStateSyncData,
  mergeState,
  validateStateIntegrity,
  selectAgent,
  createCommunicationStats,
  updateSendStats,
  updateReceiveStats,
  recordError,
  getRegistrySummary,
  DEFAULT_PROTOCOL_CONFIG
} from './services/agent-communication.service';

describe('智能体协同通信协议', () => {
  describe('智能体注册管理', () => {
    it('应该创建智能体注册表', () => {
      const registry = createAgentRegistry();
      expect(registry.agents.size).toBe(0);
      expect(registry.channels.size).toBe(0);
      expect(registry.routingRules.length).toBe(0);
      expect(registry.config).toEqual(DEFAULT_PROTOCOL_CONFIG);
    });

    it('应该注册智能体', () => {
      const registry = createAgentRegistry();
      const { registry: newRegistry, agent } = registerAgent(
        registry,
        'agent_001',
        'Test Agent',
        'grt_atom',
        ['data_collection', 'analysis']
      );

      expect(newRegistry.agents.size).toBe(1);
      expect(agent.id).toBe('agent_001');
      expect(agent.name).toBe('Test Agent');
      expect(agent.type).toBe('grt_atom');
      expect(agent.status).toBe('idle');
      expect(agent.capabilities).toContain('data_collection');
    });

    it('应该注销智能体', () => {
      let registry = createAgentRegistry();
      const { registry: r1 } = registerAgent(registry, 'agent_001', 'Agent 1', 'grt_atom');
      const { registry: r2 } = registerAgent(r1, 'agent_002', 'Agent 2', 'worker');
      
      const newRegistry = unregisterAgent(r2, 'agent_001');
      expect(newRegistry.agents.size).toBe(1);
      expect(newRegistry.agents.has('agent_001')).toBe(false);
      expect(newRegistry.agents.has('agent_002')).toBe(true);
    });

    it('应该更新智能体状态', () => {
      let registry = createAgentRegistry();
      const { registry: r1 } = registerAgent(registry, 'agent_001', 'Agent 1', 'grt_atom');
      
      const newRegistry = updateAgentStatus(r1, 'agent_001', 'busy');
      expect(newRegistry.agents.get('agent_001')?.status).toBe('busy');
    });

    it('应该处理心跳', () => {
      let registry = createAgentRegistry();
      const { registry: r1 } = registerAgent(registry, 'agent_001', 'Agent 1', 'grt_atom');
      
      const newRegistry = handleHeartbeat(r1, 'agent_001');
      expect(newRegistry.agents.get('agent_001')?.lastHeartbeat).toBeGreaterThan(0);
    });

    it('应该检查离线智能体', () => {
      let registry = createAgentRegistry({ heartbeatTimeout: 100 });
      const { registry: r1, agent } = registerAgent(registry, 'agent_001', 'Agent 1', 'grt_atom');
      
      // 模拟超时
      const agents = new Map(r1.agents);
      agents.set('agent_001', { ...agent, lastHeartbeat: Date.now() - 200 });
      const modifiedRegistry = { ...r1, agents };
      
      const { registry: newRegistry, offlineAgents } = checkOfflineAgents(modifiedRegistry);
      expect(offlineAgents).toContain('agent_001');
      expect(newRegistry.agents.get('agent_001')?.status).toBe('offline');
    });

    it('应该获取可用智能体', () => {
      let registry = createAgentRegistry();
      const { registry: r1 } = registerAgent(registry, 'agent_001', 'Agent 1', 'grt_atom', ['analysis']);
      const { registry: r2 } = registerAgent(r1, 'agent_002', 'Agent 2', 'worker', ['data_collection']);
      const r3 = updateAgentStatus(r2, 'agent_002', 'busy');
      
      const available = getAvailableAgents(r3);
      expect(available.length).toBe(1);
      expect(available[0].id).toBe('agent_001');
    });

    it('应该按能力查找智能体', () => {
      let registry = createAgentRegistry();
      const { registry: r1 } = registerAgent(registry, 'agent_001', 'Agent 1', 'grt_atom', ['analysis']);
      const { registry: r2 } = registerAgent(r1, 'agent_002', 'Agent 2', 'worker', ['data_collection']);
      
      const agents = findAgentsByCapability(r2, 'analysis');
      expect(agents.length).toBe(1);
      expect(agents[0].id).toBe('agent_001');
    });
  });

  describe('消息传递', () => {
    it('应该创建消息', () => {
      const message = createMessage('request', 'sender_001', 'receiver_001', { action: 'test' });
      
      expect(message.id).toBeDefined();
      expect(message.type).toBe('request');
      expect(message.senderId).toBe('sender_001');
      expect(message.receiverId).toBe('receiver_001');
      expect(message.priority).toBe('normal');
    });

    it('应该创建请求消息', () => {
      const request = createRequest('sender_001', 'receiver_001', 'getData', { id: 123 });
      
      expect(request.type).toBe('request');
      expect((request.payload as any).action).toBe('getData');
    });

    it('应该创建响应消息', () => {
      const request = createRequest('sender_001', 'receiver_001', 'getData', {});
      const response = createResponse('receiver_001', request, true, { result: 'ok' });
      
      expect(response.type).toBe('response');
      expect(response.correlationId).toBe(request.id);
      expect((response.payload as any).success).toBe(true);
    });

    it('应该创建广播消息', () => {
      const broadcast = createBroadcast('sender_001', 'status_update', { status: 'online' });
      
      expect(broadcast.type).toBe('broadcast');
      expect(broadcast.receiverId).toBeNull();
    });

    it('应该创建心跳消息', () => {
      const heartbeat = createHeartbeat('agent_001');
      
      expect(heartbeat.type).toBe('heartbeat');
      expect(heartbeat.senderId).toBe('agent_001');
    });

    it('应该验证消息', () => {
      const validMessage = createMessage('request', 'sender_001', 'receiver_001', {});
      const result = validateMessage(validMessage, DEFAULT_PROTOCOL_CONFIG);
      
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('应该检测过期消息', () => {
      const expiredMessage = createMessage('request', 'sender_001', 'receiver_001', {}, {
        expiresIn: -1000
      });
      
      expect(isMessageExpired(expiredMessage)).toBe(true);
    });
  });

  describe('通道管理', () => {
    it('应该创建通道', () => {
      const registry = createAgentRegistry();
      const { registry: newRegistry, channel } = createChannel(registry, 'test_channel', 'topic');
      
      expect(newRegistry.channels.size).toBe(1);
      expect(channel.name).toBe('test_channel');
      expect(channel.type).toBe('topic');
    });

    it('应该加入和离开通道', () => {
      let registry = createAgentRegistry();
      const { registry: r1 } = registerAgent(registry, 'agent_001', 'Agent 1', 'grt_atom');
      const { registry: r2, channel } = createChannel(r1, 'test_channel', 'topic');
      
      const r3 = joinChannel(r2, channel.id, 'agent_001');
      expect(r3.channels.get(channel.id)?.participants).toContain('agent_001');
      
      const r4 = leaveChannel(r3, channel.id, 'agent_001');
      expect(r4.channels.get(channel.id)?.participants).not.toContain('agent_001');
    });

    it('应该获取通道参与者', () => {
      let registry = createAgentRegistry();
      const { registry: r1, agent } = registerAgent(registry, 'agent_001', 'Agent 1', 'grt_atom');
      const { registry: r2, channel } = createChannel(r1, 'test_channel', 'topic');
      const r3 = joinChannel(r2, channel.id, 'agent_001');
      
      const participants = getChannelParticipants(r3, channel.id);
      expect(participants.length).toBe(1);
      expect(participants[0].id).toBe('agent_001');
    });
  });

  describe('消息队列', () => {
    it('应该创建消息队列', () => {
      const queue = createMessageQueue('channel_001');
      
      expect(queue.channelId).toBe('channel_001');
      expect(queue.messages.length).toBe(0);
    });

    it('应该入队和出队消息', () => {
      let queue = createMessageQueue('channel_001');
      const message = createMessage('request', 'sender_001', 'receiver_001', {});
      
      queue = enqueueMessage(queue, message);
      expect(queue.messages.length).toBe(1);
      
      const { queue: newQueue, message: dequeued } = dequeueMessage(queue, 'receiver_001');
      expect(newQueue.messages.length).toBe(0);
      expect(dequeued?.id).toBe(message.id);
    });

    it('应该获取待处理消息数', () => {
      let queue = createMessageQueue('channel_001');
      queue = enqueueMessage(queue, createMessage('request', 's1', 'r1', {}));
      queue = enqueueMessage(queue, createMessage('request', 's2', 'r1', {}));
      queue = enqueueMessage(queue, createMessage('request', 's3', 'r2', {}));
      
      expect(getPendingMessageCount(queue)).toBe(3);
      expect(getPendingMessageCount(queue, 'r1')).toBe(2);
    });
  });

  describe('路由管理', () => {
    it('应该添加和移除路由规则', () => {
      let registry = createAgentRegistry();
      
      const { registry: r1, rule } = addRoutingRule(registry, {
        name: 'test_rule',
        pattern: 'status.*',
        targetType: 'channel',
        targetId: 'channel_001',
        priority: 10,
        enabled: true,
        conditions: []
      });
      
      expect(r1.routingRules.length).toBe(1);
      
      const r2 = removeRoutingRule(r1, rule.id);
      expect(r2.routingRules.length).toBe(0);
    });

    it('应该匹配路由规则', () => {
      let registry = createAgentRegistry();
      const { registry: r1 } = addRoutingRule(registry, {
        name: 'status_rule',
        pattern: 'status.*',
        targetType: 'channel',
        targetId: 'channel_001',
        priority: 10,
        enabled: true,
        conditions: []
      });
      
      const message = createBroadcast('sender_001', 'status.update', {});
      const matched = matchRoutingRule(r1, message);
      
      expect(matched).not.toBeNull();
      expect(matched?.name).toBe('status_rule');
    });
  });

  describe('任务协调', () => {
    it('应该创建协同任务', () => {
      const task = createCoordinatedTask('Test Task', 'A test task', 'agent_001', { data: 'test' });
      
      expect(task.name).toBe('Test Task');
      expect(task.status).toBe('pending');
      expect(task.createdBy).toBe('agent_001');
    });

    it('应该分配和开始任务', () => {
      let task = createCoordinatedTask('Test Task', 'A test task', 'agent_001', {});
      
      task = assignTask(task, 'agent_002');
      expect(task.status).toBe('assigned');
      expect(task.assignedTo).toBe('agent_002');
      
      task = startTask(task);
      expect(task.status).toBe('in_progress');
      expect(task.startedAt).not.toBeNull();
    });

    it('应该更新任务进度', () => {
      let task = createCoordinatedTask('Test Task', 'A test task', 'agent_001', {});
      task = assignTask(task, 'agent_002');
      task = startTask(task);
      
      task = updateTaskProgress(task, 50);
      expect(task.progress).toBe(50);
    });

    it('应该完成任务', () => {
      let task = createCoordinatedTask('Test Task', 'A test task', 'agent_001', {});
      task = assignTask(task, 'agent_002');
      task = startTask(task);
      
      task = completeTask(task, { result: 'success' });
      expect(task.status).toBe('completed');
      expect(task.progress).toBe(100);
    });

    it('应该处理任务失败和重试', () => {
      let task = createCoordinatedTask('Test Task', 'A test task', 'agent_001', {}, { maxRetries: 3 });
      task = assignTask(task, 'agent_002');
      task = startTask(task);
      
      task = failTask(task, 'Error occurred');
      expect(task.status).toBe('pending'); // 可以重试
      expect(task.retryCount).toBe(1);
      
      // 继续失败直到达到最大重试次数
      task = assignTask(task, 'agent_002');
      task = startTask(task);
      task = failTask(task, 'Error 2');
      task = assignTask(task, 'agent_002');
      task = startTask(task);
      task = failTask(task, 'Error 3');
      
      expect(task.status).toBe('failed');
    });

    it('应该取消任务', () => {
      let task = createCoordinatedTask('Test Task', 'A test task', 'agent_001', {});
      
      task = cancelTask(task);
      expect(task.status).toBe('cancelled');
    });

    it('应该检查任务依赖', () => {
      const task1 = createCoordinatedTask('Task 1', 'First task', 'agent_001', {});
      const task2 = createCoordinatedTask('Task 2', 'Second task', 'agent_001', {}, { dependencies: [task1.id] });
      
      const { ready, pendingDependencies } = checkTaskDependencies(task2, [task1]);
      expect(ready).toBe(false);
      expect(pendingDependencies).toContain(task1.id);
    });

    it('应该添加子任务', () => {
      let task = createCoordinatedTask('Parent Task', 'A parent task', 'agent_001', {});
      
      task = addSubtask(task, 'subtask_001');
      expect(task.subtasks).toContain('subtask_001');
    });

    it('应该检测超时任务', () => {
      const task = createCoordinatedTask('Test Task', 'A test task', 'agent_001', {}, {
        deadline: Date.now() - 1000
      });
      
      expect(isTaskOverdue(task)).toBe(true);
    });
  });

  describe('状态同步', () => {
    it('应该创建状态同步数据', () => {
      const syncData = createStateSyncData('agent_001', { key: 'value' });
      
      expect(syncData.agentId).toBe('agent_001');
      expect(syncData.state.key).toBe('value');
      expect(syncData.checksum).toBeDefined();
    });

    it('应该合并状态', () => {
      const local = createStateSyncData('agent_001', { a: 1, b: 2 }, 1);
      const remote = createStateSyncData('agent_001', { b: 3, c: 4 }, 2);
      
      const { merged, conflicts } = mergeState(local, remote);
      
      expect(merged.state.a).toBe(1);
      expect(merged.state.b).toBe(3); // 远程版本更高
      expect(merged.state.c).toBe(4);
      expect(conflicts).toContain('b');
    });

    it('应该验证状态完整性', () => {
      const syncData = createStateSyncData('agent_001', { key: 'value' });
      
      expect(validateStateIntegrity(syncData)).toBe(true);
      
      // 篡改数据
      const tampered = { ...syncData, state: { key: 'modified' } };
      expect(validateStateIntegrity(tampered)).toBe(false);
    });
  });

  describe('负载均衡', () => {
    it('应该使用轮询策略选择智能体', () => {
      let registry = createAgentRegistry();
      const { registry: r1 } = registerAgent(registry, 'agent_001', 'Agent 1', 'grt_atom');
      const { registry: r2 } = registerAgent(r1, 'agent_002', 'Agent 2', 'grt_atom');
      
      const first = selectAgent(r2, 'round_robin');
      const second = selectAgent(r2, 'round_robin', undefined, { lastSelected: first?.id });
      
      expect(first?.id).not.toBe(second?.id);
    });

    it('应该使用随机策略选择智能体', () => {
      let registry = createAgentRegistry();
      const { registry: r1 } = registerAgent(registry, 'agent_001', 'Agent 1', 'grt_atom');
      const { registry: r2 } = registerAgent(r1, 'agent_002', 'Agent 2', 'grt_atom');
      
      const selected = selectAgent(r2, 'random');
      expect(selected).not.toBeNull();
    });
  });

  describe('统计和监控', () => {
    it('应该创建通信统计', () => {
      const stats = createCommunicationStats();
      
      expect(stats.totalMessagesSent).toBe(0);
      expect(stats.totalMessagesReceived).toBe(0);
    });

    it('应该更新发送统计', () => {
      let stats = createCommunicationStats();
      stats = updateSendStats(stats, 1024);
      
      expect(stats.totalMessagesSent).toBe(1);
      expect(stats.totalBytesTransferred).toBe(1024);
    });

    it('应该更新接收统计', () => {
      let stats = createCommunicationStats();
      stats = updateReceiveStats(stats, 512, 50);
      
      expect(stats.totalMessagesReceived).toBe(1);
      expect(stats.averageLatency).toBe(50);
    });

    it('应该记录错误', () => {
      let stats = createCommunicationStats();
      stats = recordError(stats);
      
      expect(stats.errorCount).toBe(1);
    });

    it('应该获取注册表摘要', () => {
      let registry = createAgentRegistry();
      const { registry: r1 } = registerAgent(registry, 'agent_001', 'Agent 1', 'grt_atom');
      const { registry: r2 } = registerAgent(r1, 'agent_002', 'Agent 2', 'worker');
      const r3 = updateAgentStatus(r2, 'agent_002', 'busy');
      
      const summary = getRegistrySummary(r3);
      
      expect(summary.totalAgents).toBe(2);
      expect(summary.onlineAgents).toBe(2);
      expect(summary.busyAgents).toBe(1);
    });
  });
});

// ==================== 设备数字孪生3D可视化测试 ====================
import {
  addVectors,
  subtractVectors,
  scaleVector,
  vectorLength,
  normalizeVector,
  dotProduct,
  crossProduct,
  vectorDistance,
  lerpVector,
  multiplyQuaternions,
  eulerToQuaternion,
  quaternionToEuler,
  slerpQuaternion,
  createDigitalTwin,
  addComponent,
  removeComponent,
  updateComponentTransform,
  setComponentVisibility,
  addMaterial,
  updateMaterial,
  addSensor,
  updateSensorValue,
  batchUpdateSensors,
  getSensorStatistics,
  createStateMappingRule,
  applyStateMapping,
  createViewState,
  handleInteraction,
  focusOnComponent,
  resetView,
  highlightComponents,
  clearHighlights,
  createAnimationClip,
  addKeyframe,
  evaluateAnimation,
  createSnapshot,
  restoreSnapshot,
  calculateBoundingBox,
  getComponentPath,
  getAllDescendants,
  exportSceneData,
  DEFAULT_TRANSFORM,
  DEFAULT_SCENE_CONFIG,
  DEFAULT_VIEW_STATE
} from './services/digital-twin-3d.service';

describe('设备数字孪生3D可视化', () => {
  describe('向量运算', () => {
    it('应该执行向量加法', () => {
      const result = addVectors({ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 });
      expect(result).toEqual({ x: 5, y: 7, z: 9 });
    });

    it('应该执行向量减法', () => {
      const result = subtractVectors({ x: 5, y: 7, z: 9 }, { x: 1, y: 2, z: 3 });
      expect(result).toEqual({ x: 4, y: 5, z: 6 });
    });

    it('应该执行向量缩放', () => {
      const result = scaleVector({ x: 1, y: 2, z: 3 }, 2);
      expect(result).toEqual({ x: 2, y: 4, z: 6 });
    });

    it('应该计算向量长度', () => {
      const length = vectorLength({ x: 3, y: 4, z: 0 });
      expect(length).toBe(5);
    });

    it('应该归一化向量', () => {
      const result = normalizeVector({ x: 3, y: 4, z: 0 });
      expect(result.x).toBeCloseTo(0.6);
      expect(result.y).toBeCloseTo(0.8);
      expect(result.z).toBe(0);
    });

    it('应该计算点积', () => {
      const result = dotProduct({ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 });
      expect(result).toBe(32);
    });

    it('应该计算叉积', () => {
      const result = crossProduct({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });
      expect(result).toEqual({ x: 0, y: 0, z: 1 });
    });

    it('应该计算向量距离', () => {
      const distance = vectorDistance({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 });
      expect(distance).toBe(5);
    });

    it('应该执行向量插值', () => {
      const result = lerpVector({ x: 0, y: 0, z: 0 }, { x: 10, y: 10, z: 10 }, 0.5);
      expect(result).toEqual({ x: 5, y: 5, z: 5 });
    });
  });

  describe('四元数运算', () => {
    it('应该执行四元数乘法', () => {
      const q1 = { x: 0, y: 0, z: 0, w: 1 };
      const q2 = { x: 0, y: 0, z: 0, w: 1 };
      const result = multiplyQuaternions(q1, q2);
      expect(result.w).toBeCloseTo(1);
    });

    it('应该转换欧拉角到四元数', () => {
      const euler = { x: 0, y: 0, z: 0 };
      const quaternion = eulerToQuaternion(euler);
      expect(quaternion.w).toBeCloseTo(1);
      expect(quaternion.x).toBeCloseTo(0);
    });

    it('应该转换四元数到欧拉角', () => {
      const quaternion = { x: 0, y: 0, z: 0, w: 1 };
      const euler = quaternionToEuler(quaternion);
      expect(euler.x).toBeCloseTo(0);
      expect(euler.y).toBeCloseTo(0);
      expect(euler.z).toBeCloseTo(0);
    });

    it('应该执行四元数球面插值', () => {
      const q1 = { x: 0, y: 0, z: 0, w: 1 };
      const q2 = { x: 0, y: 0, z: 0, w: 1 };
      const result = slerpQuaternion(q1, q2, 0.5);
      expect(result.w).toBeCloseTo(1);
    });
  });

  describe('数字孪生管理', () => {
    it('应该创建数字孪生', () => {
      const twin = createDigitalTwin('Test Device', 'cleaning_machine', 'A test device');
      
      expect(twin.name).toBe('Test Device');
      expect(twin.deviceType).toBe('cleaning_machine');
      expect(twin.status).toBe('offline');
      expect(twin.components.size).toBe(0);
    });

    it('应该添加组件', () => {
      let twin = createDigitalTwin('Test Device', 'cleaning_machine');
      
      const { twin: newTwin, component } = addComponent(
        twin,
        'Main Body',
        { type: 'box', parameters: { width: 1, height: 1, depth: 1 } },
        'mat_001'
      );
      
      expect(newTwin.components.size).toBe(1);
      expect(component.name).toBe('Main Body');
    });

    it('应该移除组件', () => {
      let twin = createDigitalTwin('Test Device', 'cleaning_machine');
      const { twin: t1, component } = addComponent(twin, 'Main Body', { type: 'box', parameters: {} }, 'mat_001');
      
      const newTwin = removeComponent(t1, component.id);
      expect(newTwin.components.size).toBe(0);
    });

    it('应该更新组件变换', () => {
      let twin = createDigitalTwin('Test Device', 'cleaning_machine');
      const { twin: t1, component } = addComponent(twin, 'Main Body', { type: 'box', parameters: {} }, 'mat_001');
      
      const newTwin = updateComponentTransform(t1, component.id, {
        position: { x: 10, y: 0, z: 0 }
      });
      
      expect(newTwin.components.get(component.id)?.transform.position.x).toBe(10);
    });

    it('应该设置组件可见性', () => {
      let twin = createDigitalTwin('Test Device', 'cleaning_machine');
      const { twin: t1, component } = addComponent(twin, 'Main Body', { type: 'box', parameters: {} }, 'mat_001');
      
      const newTwin = setComponentVisibility(t1, component.id, false);
      expect(newTwin.components.get(component.id)?.visible).toBe(false);
    });
  });

  describe('材质管理', () => {
    it('应该添加材质', () => {
      let twin = createDigitalTwin('Test Device', 'cleaning_machine');
      
      const { twin: newTwin, material } = addMaterial(twin, 'Metal', 'metallic', '#888888');
      
      expect(newTwin.materials.size).toBe(1);
      expect(material.name).toBe('Metal');
      expect(material.type).toBe('metallic');
    });

    it('应该更新材质', () => {
      let twin = createDigitalTwin('Test Device', 'cleaning_machine');
      const { twin: t1, material } = addMaterial(twin, 'Metal', 'metallic', '#888888');
      
      const newTwin = updateMaterial(t1, material.id, { color: '#ff0000' });
      expect(newTwin.materials.get(material.id)?.color).toBe('#ff0000');
    });
  });

  describe('传感器管理', () => {
    it('应该添加传感器', () => {
      let twin = createDigitalTwin('Test Device', 'cleaning_machine');
      
      const { twin: newTwin, sensor } = addSensor(
        twin,
        'temperature',
        'Main Temperature',
        '°C',
        { min: 0, max: 100 },
        { warning: 70, critical: 90 }
      );
      
      expect(newTwin.sensors.size).toBe(1);
      expect(sensor.type).toBe('temperature');
      expect(sensor.status).toBe('normal');
    });

    it('应该更新传感器值', () => {
      let twin = createDigitalTwin('Test Device', 'cleaning_machine');
      const { twin: t1, sensor } = addSensor(twin, 'temperature', 'Temp', '°C', { min: 0, max: 100 }, { warning: 70, critical: 90 });
      
      const newTwin = updateSensorValue(t1, sensor.id, 75);
      expect(newTwin.sensors.get(sensor.id)?.value).toBe(75);
      expect(newTwin.sensors.get(sensor.id)?.status).toBe('warning');
    });

    it('应该批量更新传感器', () => {
      let twin = createDigitalTwin('Test Device', 'cleaning_machine');
      const { twin: t1, sensor: s1 } = addSensor(twin, 'temperature', 'Temp1', '°C', { min: 0, max: 100 }, { warning: 70, critical: 90 });
      const { twin: t2, sensor: s2 } = addSensor(t1, 'pressure', 'Pressure1', 'bar', { min: 0, max: 10 }, { warning: 7, critical: 9 });
      
      const newTwin = batchUpdateSensors(t2, [
        { sensorId: s1.id, value: 50 },
        { sensorId: s2.id, value: 5 }
      ]);
      
      expect(newTwin.sensors.get(s1.id)?.value).toBe(50);
      expect(newTwin.sensors.get(s2.id)?.value).toBe(5);
    });

    it('应该获取传感器统计', () => {
      let twin = createDigitalTwin('Test Device', 'cleaning_machine');
      const { twin: t1 } = addSensor(twin, 'temperature', 'Temp1', '°C', { min: 0, max: 100 }, { warning: 70, critical: 90 });
      const { twin: t2 } = addSensor(t1, 'temperature', 'Temp2', '°C', { min: 0, max: 100 }, { warning: 70, critical: 90 });
      const { twin: t3 } = addSensor(t2, 'pressure', 'Pressure1', 'bar', { min: 0, max: 10 }, { warning: 7, critical: 9 });
      
      const stats = getSensorStatistics(t3);
      
      expect(stats.total).toBe(3);
      expect(stats.byType.temperature).toBe(2);
      expect(stats.byType.pressure).toBe(1);
    });
  });

  describe('状态映射', () => {
    it('应该创建状态映射规则', () => {
      const rule = createStateMappingRule(
        'sensor_001',
        'component_001',
        'color',
        'linear',
        [0, 100],
        ['#00ff00', '#ff0000']
      );
      
      expect(rule.sensorId).toBe('sensor_001');
      expect(rule.targetProperty).toBe('color');
    });
  });

  describe('视图控制', () => {
    it('应该创建初始视图状态', () => {
      const viewState = createViewState();
      
      expect(viewState.selectedComponentId).toBeNull();
      expect(viewState.zoom).toBe(1);
    });

    it('应该处理点击交互', () => {
      const viewState = createViewState();
      const twin = createDigitalTwin('Test Device', 'cleaning_machine');
      
      const event = {
        type: 'click' as const,
        targetId: 'component_001',
        position: { x: 0, y: 0, z: 0 },
        screenPosition: { x: 100, y: 100 },
        timestamp: Date.now(),
        modifiers: { ctrl: false, shift: false, alt: false }
      };
      
      const newState = handleInteraction(viewState, event, twin);
      expect(newState.selectedComponentId).toBe('component_001');
    });

    it('应该重置视图', () => {
      let viewState = createViewState();
      viewState = { ...viewState, zoom: 5, selectedComponentId: 'comp_001' };
      
      const resetState = resetView(viewState);
      expect(resetState.zoom).toBe(1);
      expect(resetState.selectedComponentId).toBeNull();
    });

    it('应该高亮组件', () => {
      const viewState = createViewState();
      
      const newState = highlightComponents(viewState, ['comp_001', 'comp_002']);
      expect(newState.highlightedComponents.size).toBe(2);
      
      const clearedState = clearHighlights(newState);
      expect(clearedState.highlightedComponents.size).toBe(0);
    });
  });

  describe('动画系统', () => {
    it('应该创建动画剪辑', () => {
      const clip = createAnimationClip('Rotate', 2000, true);
      
      expect(clip.name).toBe('Rotate');
      expect(clip.duration).toBe(2000);
      expect(clip.loop).toBe(true);
    });

    it('应该添加关键帧', () => {
      let clip = createAnimationClip('Move', 1000);
      
      clip = addKeyframe(clip, 0, 'position', { x: 0, y: 0, z: 0 });
      clip = addKeyframe(clip, 1000, 'position', { x: 10, y: 0, z: 0 });
      
      expect(clip.keyframes.length).toBe(2);
    });

    it('应该评估动画', () => {
      let clip = createAnimationClip('Move', 1000);
      clip = addKeyframe(clip, 0, 'opacity', 0);
      clip = addKeyframe(clip, 1000, 'opacity', 1);
      
      const result = evaluateAnimation(clip, 500);
      expect(result.opacity).toBeCloseTo(0.5);
    });
  });

  describe('快照管理', () => {
    it('应该创建快照', () => {
      let twin = createDigitalTwin('Test Device', 'cleaning_machine');
      const { twin: t1, sensor } = addSensor(twin, 'temperature', 'Temp', '°C', { min: 0, max: 100 }, { warning: 70, critical: 90 });
      const t2 = updateSensorValue(t1, sensor.id, 50);
      const viewState = createViewState();
      
      const snapshot = createSnapshot(t2, viewState, 'Test Snapshot');
      
      expect(snapshot.name).toBe('Test Snapshot');
      expect(snapshot.sensorValues[sensor.id]).toBe(50);
    });

    it('应该恢复快照', () => {
      let twin = createDigitalTwin('Test Device', 'cleaning_machine');
      const { twin: t1, sensor } = addSensor(twin, 'temperature', 'Temp', '°C', { min: 0, max: 100 }, { warning: 70, critical: 90 });
      const t2 = updateSensorValue(t1, sensor.id, 50);
      const viewState = createViewState();
      
      const snapshot = createSnapshot(t2, viewState, 'Test Snapshot');
      
      // 修改值
      const t3 = updateSensorValue(t2, sensor.id, 80);
      
      // 恢复快照
      const { twin: restored } = restoreSnapshot(t3, snapshot);
      expect(restored.sensors.get(sensor.id)?.value).toBe(50);
    });
  });

  describe('工具函数', () => {
    it('应该计算包围盒', () => {
      let twin = createDigitalTwin('Test Device', 'cleaning_machine');
      const { twin: t1 } = addComponent(twin, 'Body', { type: 'box', parameters: {} }, 'mat_001', null, {
        position: { x: 5, y: 0, z: 0 },
        scale: { x: 2, y: 2, z: 2 }
      });
      
      const bbox = calculateBoundingBox(t1);
      expect(bbox.min.x).toBeLessThan(bbox.max.x);
    });

    it('应该获取组件层级路径', () => {
      let twin = createDigitalTwin('Test Device', 'cleaning_machine');
      const { twin: t1, component: parent } = addComponent(twin, 'Parent', { type: 'box', parameters: {} }, 'mat_001');
      const { twin: t2, component: child } = addComponent(t1, 'Child', { type: 'box', parameters: {} }, 'mat_001', parent.id);
      
      const path = getComponentPath(t2, child.id);
      expect(path).toEqual(['Parent', 'Child']);
    });

    it('应该获取所有子组件', () => {
      let twin = createDigitalTwin('Test Device', 'cleaning_machine');
      const { twin: t1, component: parent } = addComponent(twin, 'Parent', { type: 'box', parameters: {} }, 'mat_001');
      const { twin: t2, component: child1 } = addComponent(t1, 'Child1', { type: 'box', parameters: {} }, 'mat_001', parent.id);
      const { twin: t3, component: child2 } = addComponent(t2, 'Child2', { type: 'box', parameters: {} }, 'mat_001', parent.id);
      
      const descendants = getAllDescendants(t3, parent.id);
      expect(descendants.length).toBe(2);
    });

    it('应该导出场景数据', () => {
      let twin = createDigitalTwin('Test Device', 'cleaning_machine');
      const { twin: t1 } = addComponent(twin, 'Body', { type: 'box', parameters: {} }, 'mat_001');
      const { twin: t2 } = addMaterial(t1, 'Metal', 'metallic', '#888888');
      const { twin: t3 } = addSensor(t2, 'temperature', 'Temp', '°C', { min: 0, max: 100 }, { warning: 70, critical: 90 });
      
      const data = exportSceneData(t3);
      expect(data.components.length).toBe(1);
      expect(data.materials.length).toBe(1);
      expect(data.sensors.length).toBe(1);
    });
  });
});

// ==================== 预测性维护AI模型测试 ====================
import {
  extractFeatures,
  calculateStatisticalFeatures,
  normalizeFeatures,
  calculateFeatureStats,
  createPredictionModel,
  trainModel,
  predict,
  batchPredict,
  generateFailurePrediction,
  assessDeviceHealth,
  generateMaintenanceRecommendation,
  predictRemainingUsefulLife,
  detectAnomalies,
  serializeModel,
  deserializeModel,
  exportModelReport,
  DEFAULT_TRAINING_CONFIG,
  HEALTH_THRESHOLDS
} from './services/predictive-maintenance.service';

describe('预测性维护AI模型', () => {
  describe('特征工程', () => {
    it('应该提取特征', () => {
      const dataPoints = [{
        deviceId: 'device_001',
        timestamp: Date.now(),
        readings: [
          { sensorId: 's1', sensorType: 'temperature', value: 50, unit: '°C', timestamp: Date.now(), quality: 'good' as const },
          { sensorId: 's2', sensorType: 'pressure', value: 5, unit: 'bar', timestamp: Date.now(), quality: 'good' as const }
        ],
        operatingMode: 'normal',
        runningHours: 1000,
        cycleCount: 5000
      }];
      
      const features = extractFeatures(dataPoints);
      
      expect(features.length).toBe(1);
      expect(features[0].features.running_hours).toBe(1000);
      expect(features[0].features.cycle_count).toBe(5000);
    });

    it('应该计算统计特征', () => {
      const readings = [
        { sensorId: 's1', sensorType: 'temperature', value: 50, unit: '°C', timestamp: Date.now(), quality: 'good' as const },
        { sensorId: 's1', sensorType: 'temperature', value: 52, unit: '°C', timestamp: Date.now(), quality: 'good' as const },
        { sensorId: 's1', sensorType: 'temperature', value: 48, unit: '°C', timestamp: Date.now(), quality: 'good' as const },
        { sensorId: 's1', sensorType: 'temperature', value: 51, unit: '°C', timestamp: Date.now(), quality: 'good' as const }
      ];
      
      const stats = calculateStatisticalFeatures(readings);
      
      expect(stats.temperature_mean).toBeCloseTo(50.25);
      expect(stats.temperature_max).toBe(52);
      expect(stats.temperature_min).toBe(48);
    });

    it('应该归一化特征', () => {
      const features = { a: 10, b: 20 };
      const stats = { mean: { a: 5, b: 10 }, std: { a: 2, b: 5 } };
      
      const normalized = normalizeFeatures(features, stats);
      
      expect(normalized.a).toBeCloseTo(2.5);
      expect(normalized.b).toBeCloseTo(2);
    });

    it('应该计算特征统计', () => {
      const featureVectors = [
        { deviceId: 'd1', timestamp: 1, features: { a: 10, b: 20 } },
        { deviceId: 'd1', timestamp: 2, features: { a: 20, b: 30 } },
        { deviceId: 'd1', timestamp: 3, features: { a: 30, b: 40 } }
      ];
      
      const stats = calculateFeatureStats(featureVectors);
      
      expect(stats.mean.a).toBe(20);
      expect(stats.mean.b).toBe(30);
    });
  });

  describe('模型训练', () => {
    it('应该创建预测模型', () => {
      const model = createPredictionModel('Failure Predictor', 'classification', 'failure', ['temp', 'pressure']);
      
      expect(model.name).toBe('Failure Predictor');
      expect(model.type).toBe('classification');
      expect(model.features.length).toBe(2);
    });

    it('应该训练模型', () => {
      const model = createPredictionModel('Test Model', 'classification', 'failure', ['feature1']);
      
      const trainingData = [
        { deviceId: 'd1', timestamp: 1, features: { feature1: 0.1 }, labels: { failure: 0 } },
        { deviceId: 'd1', timestamp: 2, features: { feature1: 0.2 }, labels: { failure: 0 } },
        { deviceId: 'd1', timestamp: 3, features: { feature1: 0.8 }, labels: { failure: 1 } },
        { deviceId: 'd1', timestamp: 4, features: { feature1: 0.9 }, labels: { failure: 1 } },
        { deviceId: 'd1', timestamp: 5, features: { feature1: 0.15 }, labels: { failure: 0 } }
      ];
      
      const { model: trainedModel, metrics, history } = trainModel(model, trainingData, {
        ...DEFAULT_TRAINING_CONFIG,
        epochs: 10
      });
      
      expect(trainedModel.trainedAt).toBeGreaterThan(0);
      expect(trainedModel.trainingDataSize).toBe(5);
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('预测引擎', () => {
    it('应该执行预测', () => {
      const model = createPredictionModel('Test Model', 'classification', 'failure', ['feature1']);
      model.weights = [2];
      model.bias = -1;
      
      const featureVector = { deviceId: 'd1', timestamp: 1, features: { feature1: 1 } };
      const prediction = predict(model, featureVector);
      
      expect(prediction).toBeGreaterThan(0);
      expect(prediction).toBeLessThan(1);
    });

    it('应该批量预测', () => {
      const model = createPredictionModel('Test Model', 'classification', 'failure', ['feature1']);
      model.weights = [1];
      model.bias = 0;
      
      const featureVectors = [
        { deviceId: 'd1', timestamp: 1, features: { feature1: 0 } },
        { deviceId: 'd1', timestamp: 2, features: { feature1: 1 } },
        { deviceId: 'd1', timestamp: 3, features: { feature1: 2 } }
      ];
      
      const predictions = batchPredict(model, featureVectors);
      
      expect(predictions.length).toBe(3);
      expect(predictions[0]).toBeLessThan(predictions[1]);
      expect(predictions[1]).toBeLessThan(predictions[2]);
    });

    it('应该生成故障预测', () => {
      const model = createPredictionModel('Test Model', 'classification', 'failure', ['temperature_value']);
      model.weights = [0.5];
      model.bias = -25;
      model.accuracy = 0.85;
      
      const featureVector = { deviceId: 'd1', timestamp: Date.now(), features: { temperature_value: 80 } };
      const historicalData = [
        {
          deviceId: 'd1',
          timestamp: Date.now() - 3600000,
          readings: [{ sensorId: 's1', sensorType: 'temperature', value: 50, unit: '°C', timestamp: Date.now(), quality: 'good' as const }],
          operatingMode: 'normal',
          runningHours: 1000,
          cycleCount: 5000
        }
      ];
      
      const prediction = generateFailurePrediction(model, featureVector, 'thermal', historicalData);
      
      expect(prediction.failureType).toBe('thermal');
      expect(prediction.probability).toBeGreaterThan(0);
      expect(prediction.recommendedActions.length).toBeGreaterThan(0);
    });
  });

  describe('健康评估', () => {
    it('应该评估设备健康', () => {
      const currentData = {
        deviceId: 'device_001',
        timestamp: Date.now(),
        readings: [
          { sensorId: 's1', sensorType: 'temperature', value: 50, unit: '°C', timestamp: Date.now(), quality: 'good' as const }
        ],
        operatingMode: 'normal',
        runningHours: 1000,
        cycleCount: 5000
      };
      
      const historicalData = Array.from({ length: 20 }, (_, i) => ({
        deviceId: 'device_001',
        timestamp: Date.now() - (20 - i) * 3600000,
        readings: [
          { sensorId: 's1', sensorType: 'temperature', value: 45 + Math.random() * 10, unit: '°C', timestamp: Date.now(), quality: 'good' as const }
        ],
        operatingMode: 'normal',
        runningHours: 980 + i,
        cycleCount: 4900 + i * 5
      }));
      
      const assessment = assessDeviceHealth('device_001', currentData, historicalData, []);
      
      expect(assessment.deviceId).toBe('device_001');
      expect(assessment.overallScore).toBeGreaterThanOrEqual(0);
      expect(assessment.overallScore).toBeLessThanOrEqual(100);
      expect(['excellent', 'good', 'fair', 'poor', 'critical']).toContain(assessment.status);
    });
  });

  describe('维护建议', () => {
    it('应该生成维护建议', () => {
      const prediction = {
        failureType: 'mechanical' as const,
        probability: 0.7,
        estimatedTimeToFailure: 7 * 24 * 60 * 60 * 1000,
        confidence: 0.85,
        contributingFactors: [],
        recommendedActions: ['检查轴承', '润滑运动部件']
      };
      
      const healthAssessment = {
        deviceId: 'device_001',
        timestamp: Date.now(),
        overallScore: 60,
        status: 'fair' as const,
        componentScores: [],
        trends: [],
        alerts: []
      };
      
      const recommendation = generateMaintenanceRecommendation('device_001', prediction, healthAssessment);
      
      expect(recommendation.deviceId).toBe('device_001');
      expect(recommendation.type).toBe('corrective');
      expect(recommendation.priority).toBe('high');
      expect(recommendation.requiredParts.length).toBeGreaterThan(0);
    });
  });

  describe('剩余使用寿命预测', () => {
    it('应该预测剩余使用寿命', () => {
      const model = createPredictionModel('Degradation Model', 'regression', 'degradation', ['running_hours']);
      model.weights = [0.0001];
      model.bias = 0;
      model.accuracy = 0.8;
      
      const historicalData = Array.from({ length: 20 }, (_, i) => ({
        deviceId: 'device_001',
        timestamp: Date.now() - (20 - i) * 24 * 60 * 60 * 1000,
        readings: [],
        operatingMode: 'normal',
        runningHours: 1000 + i * 10,
        cycleCount: 5000 + i * 50
      }));
      
      const { rul, confidence, degradationCurve } = predictRemainingUsefulLife('device_001', historicalData, model);
      
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(degradationCurve.length).toBeGreaterThan(0);
    });
  });

  describe('异常检测', () => {
    it('应该检测异常', () => {
      const currentData = {
        deviceId: 'device_001',
        timestamp: Date.now(),
        readings: [
          { sensorId: 's1', sensorType: 'temperature', value: 100, unit: '°C', timestamp: Date.now(), quality: 'good' as const }
        ],
        operatingMode: 'normal',
        runningHours: 1000,
        cycleCount: 5000
      };
      
      const historicalData = Array.from({ length: 20 }, (_, i) => ({
        deviceId: 'device_001',
        timestamp: Date.now() - (20 - i) * 3600000,
        readings: [
          { sensorId: 's1', sensorType: 'temperature', value: 50 + Math.random() * 5, unit: '°C', timestamp: Date.now(), quality: 'good' as const }
        ],
        operatingMode: 'normal',
        runningHours: 980 + i,
        cycleCount: 4900 + i * 5
      }));
      
      const { isAnomaly, anomalyScore, anomalousFeatures } = detectAnomalies(currentData, historicalData);
      
      expect(isAnomaly).toBe(true);
      expect(anomalyScore).toBeGreaterThan(0);
    });
  });

  describe('模型持久化', () => {
    it('应该序列化和反序列化模型', () => {
      const model = createPredictionModel('Test Model', 'classification', 'failure', ['feature1']);
      model.weights = [0.5];
      model.bias = -0.25;
      model.accuracy = 0.9;
      
      const serialized = serializeModel(model);
      const deserialized = deserializeModel(serialized);
      
      expect(deserialized.name).toBe(model.name);
      expect(deserialized.weights).toEqual(model.weights);
      expect(deserialized.accuracy).toBe(model.accuracy);
    });

    it('应该导出模型报告', () => {
      const model = createPredictionModel('Test Model', 'classification', 'failure', ['feature1']);
      model.weights = [0.5];
      model.trainedAt = Date.now();
      model.trainingDataSize = 1000;
      
      const metrics = {
        accuracy: 0.9,
        precision: 0.85,
        recall: 0.88,
        f1Score: 0.865,
        auc: 0.92,
        mse: 0.05,
        mae: 0.1,
        confusionMatrix: [[90, 10], [12, 88]]
      };
      
      const report = exportModelReport(model, metrics);
      
      expect(report).toContain('Test Model');
      expect(report).toContain('90.00%');
      expect(report).toContain('混淆矩阵');
    });
  });
});
