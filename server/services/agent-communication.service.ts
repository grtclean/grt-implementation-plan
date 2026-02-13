/**
 * Agent Communication Service
 * Agent registry, messaging, channels, queues, routing, task coordination, state sync, load balancing, stats.
 */

// ==================== Types ====================

interface Agent {
  id: string;
  name: string;
  type: string;
  status: 'idle' | 'busy' | 'offline' | 'error';
  capabilities: string[];
  lastHeartbeat: number;
  metadata: Record<string, any>;
}

interface Message {
  id: string;
  type: 'request' | 'response' | 'broadcast' | 'heartbeat' | 'event';
  senderId: string;
  receiverId: string | null;
  payload: any;
  priority: 'low' | 'normal' | 'high' | 'critical';
  correlationId?: string;
  timestamp: number;
  expiresAt?: number;
  topic?: string;
}

interface Channel {
  id: string;
  name: string;
  type: 'topic' | 'queue' | 'broadcast';
  participants: string[];
  createdAt: number;
}

interface MessageQueue {
  channelId: string;
  messages: Message[];
}

interface RoutingRule {
  id: string;
  name: string;
  pattern: string;
  targetType: 'channel' | 'agent';
  targetId: string;
  priority: number;
  enabled: boolean;
  conditions: any[];
}

interface CoordinatedTask {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  createdBy: string;
  assignedTo: string | null;
  progress: number;
  payload: any;
  startedAt: number | null;
  completedAt: number | null;
  result: any;
  error: string | null;
  retryCount: number;
  maxRetries: number;
  deadline: number | null;
  dependencies: string[];
  subtasks: string[];
  createdAt: number;
}

interface StateSyncData {
  agentId: string;
  state: Record<string, any>;
  version: number;
  checksum: string;
  timestamp: number;
}

interface CommunicationStats {
  totalMessagesSent: number;
  totalMessagesReceived: number;
  totalBytesTransferred: number;
  averageLatency: number;
  errorCount: number;
}

interface AgentRegistry {
  agents: Map<string, Agent>;
  channels: Map<string, Channel>;
  routingRules: RoutingRule[];
  config: any;
}

export const DEFAULT_PROTOCOL_CONFIG = {
  maxMessageSize: 1048576,
  messageTimeout: 30000,
  heartbeatInterval: 5000,
  heartbeatTimeout: 15000,
  maxRetries: 3,
  retryDelay: 1000,
};

// ==================== Agent Registry ====================

export function createAgentRegistry(configOverrides?: Partial<typeof DEFAULT_PROTOCOL_CONFIG>): AgentRegistry {
  return {
    agents: new Map(),
    channels: new Map(),
    routingRules: [],
    config: { ...DEFAULT_PROTOCOL_CONFIG, ...configOverrides },
  };
}

export function registerAgent(
  registry: AgentRegistry, id: string, name: string, type: string, capabilities: string[] = []
): { registry: AgentRegistry; agent: Agent } {
  const agent: Agent = { id, name, type, status: 'idle', capabilities, lastHeartbeat: Date.now(), metadata: {} };
  const agents = new Map(registry.agents);
  agents.set(id, agent);
  return { registry: { ...registry, agents }, agent };
}

export function unregisterAgent(registry: AgentRegistry, agentId: string): AgentRegistry {
  const agents = new Map(registry.agents);
  agents.delete(agentId);
  return { ...registry, agents };
}

export function updateAgentStatus(registry: AgentRegistry, agentId: string, status: Agent['status']): AgentRegistry {
  const agents = new Map(registry.agents);
  const agent = agents.get(agentId);
  if (agent) agents.set(agentId, { ...agent, status });
  return { ...registry, agents };
}

export function handleHeartbeat(registry: AgentRegistry, agentId: string): AgentRegistry {
  const agents = new Map(registry.agents);
  const agent = agents.get(agentId);
  if (agent) agents.set(agentId, { ...agent, lastHeartbeat: Date.now() });
  return { ...registry, agents };
}

export function checkOfflineAgents(registry: AgentRegistry): { registry: AgentRegistry; offlineAgents: string[] } {
  const timeout = registry.config.heartbeatTimeout || 15000;
  const now = Date.now();
  const agents = new Map(registry.agents);
  const offlineAgents: string[] = [];
  for (const [id, agent] of agents) {
    if (now - agent.lastHeartbeat > timeout && agent.status !== 'offline') {
      agents.set(id, { ...agent, status: 'offline' });
      offlineAgents.push(id);
    }
  }
  return { registry: { ...registry, agents }, offlineAgents };
}

export function getAvailableAgents(registry: AgentRegistry): Agent[] {
  return Array.from(registry.agents.values()).filter(a => a.status === 'idle');
}

export function findAgentsByCapability(registry: AgentRegistry, capability: string): Agent[] {
  return Array.from(registry.agents.values()).filter(a => a.capabilities.includes(capability));
}

// ==================== Messaging ====================

let _msgCounter = 0;

export function createMessage(
  type: Message['type'], senderId: string, receiverId: string | null, payload: any,
  options?: { priority?: Message['priority']; expiresIn?: number; correlationId?: string; topic?: string }
): Message {
  _msgCounter++;
  return {
    id: `msg_${Date.now()}_${_msgCounter}`,
    type,
    senderId,
    receiverId,
    payload,
    priority: options?.priority || 'normal',
    correlationId: options?.correlationId,
    timestamp: Date.now(),
    expiresAt: options?.expiresIn ? Date.now() + options.expiresIn : undefined,
    topic: options?.topic,
  };
}

export function createRequest(senderId: string, receiverId: string, action: string, data: any): Message {
  return createMessage('request', senderId, receiverId, { action, data });
}

export function createResponse(senderId: string, request: Message, success: boolean, data: any): Message {
  return createMessage('response', senderId, request.senderId, { success, data }, { correlationId: request.id });
}

export function createBroadcast(senderId: string, topic: string, data: any): Message {
  return createMessage('broadcast', senderId, null, data, { topic });
}

export function createHeartbeat(agentId: string): Message {
  return createMessage('heartbeat', agentId, null, { timestamp: Date.now() });
}

export function validateMessage(message: Message, config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!message.id) errors.push('Missing message id');
  if (!message.senderId) errors.push('Missing sender id');
  if (!message.type) errors.push('Missing message type');
  const size = JSON.stringify(message.payload).length;
  if (size > (config.maxMessageSize || 1048576)) errors.push('Message too large');
  return { valid: errors.length === 0, errors };
}

export function isMessageExpired(message: Message): boolean {
  if (!message.expiresAt) return false;
  return Date.now() > message.expiresAt;
}

// ==================== Channels ====================

export function createChannel(registry: AgentRegistry, name: string, type: Channel['type']): { registry: AgentRegistry; channel: Channel } {
  const channel: Channel = {
    id: `ch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    type,
    participants: [],
    createdAt: Date.now(),
  };
  const channels = new Map(registry.channels);
  channels.set(channel.id, channel);
  return { registry: { ...registry, channels }, channel };
}

export function joinChannel(registry: AgentRegistry, channelId: string, agentId: string): AgentRegistry {
  const channels = new Map(registry.channels);
  const channel = channels.get(channelId);
  if (channel) {
    channels.set(channelId, { ...channel, participants: [...channel.participants, agentId] });
  }
  return { ...registry, channels };
}

export function leaveChannel(registry: AgentRegistry, channelId: string, agentId: string): AgentRegistry {
  const channels = new Map(registry.channels);
  const channel = channels.get(channelId);
  if (channel) {
    channels.set(channelId, { ...channel, participants: channel.participants.filter(p => p !== agentId) });
  }
  return { ...registry, channels };
}

export function getChannelParticipants(registry: AgentRegistry, channelId: string): Agent[] {
  const channel = registry.channels.get(channelId);
  if (!channel) return [];
  return channel.participants.map(id => registry.agents.get(id)).filter(Boolean) as Agent[];
}

// ==================== Message Queue ====================

export function createMessageQueue(channelId: string): MessageQueue {
  return { channelId, messages: [] };
}

export function enqueueMessage(queue: MessageQueue, message: Message): MessageQueue {
  return { ...queue, messages: [...queue.messages, message] };
}

export function dequeueMessage(queue: MessageQueue, receiverId: string): { queue: MessageQueue; message: Message | null } {
  const idx = queue.messages.findIndex(m => m.receiverId === receiverId || m.receiverId === null);
  if (idx === -1) return { queue, message: null };
  const message = queue.messages[idx];
  const messages = [...queue.messages];
  messages.splice(idx, 1);
  return { queue: { ...queue, messages }, message };
}

export function getPendingMessageCount(queue: MessageQueue, receiverId?: string): number {
  if (!receiverId) return queue.messages.length;
  return queue.messages.filter(m => m.receiverId === receiverId || m.receiverId === null).length;
}

// ==================== Routing ====================

export function addRoutingRule(registry: AgentRegistry, ruleConfig: Omit<RoutingRule, 'id'>): { registry: AgentRegistry; rule: RoutingRule } {
  const rule: RoutingRule = { ...ruleConfig, id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
  return { registry: { ...registry, routingRules: [...registry.routingRules, rule] }, rule };
}

export function removeRoutingRule(registry: AgentRegistry, ruleId: string): AgentRegistry {
  return { ...registry, routingRules: registry.routingRules.filter(r => r.id !== ruleId) };
}

export function matchRoutingRule(registry: AgentRegistry, message: Message): RoutingRule | null {
  const topic = message.topic || '';
  for (const rule of registry.routingRules.sort((a, b) => b.priority - a.priority)) {
    if (!rule.enabled) continue;
    const regex = new RegExp('^' + rule.pattern.replace(/\*/g, '.*') + '$');
    if (regex.test(topic)) return rule;
  }
  return null;
}

// ==================== Task Coordination ====================

export function createCoordinatedTask(
  name: string, description: string, createdBy: string, payload: any,
  options?: { maxRetries?: number; deadline?: number; dependencies?: string[] }
): CoordinatedTask {
  return {
    id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name, description, status: 'pending', createdBy, assignedTo: null, progress: 0, payload,
    startedAt: null, completedAt: null, result: null, error: null,
    retryCount: 0, maxRetries: options?.maxRetries ?? 0,
    deadline: options?.deadline ?? null,
    dependencies: options?.dependencies ?? [],
    subtasks: [],
    createdAt: Date.now(),
  };
}

export function assignTask(task: CoordinatedTask, agentId: string): CoordinatedTask {
  return { ...task, assignedTo: agentId, status: 'assigned' };
}

export function startTask(task: CoordinatedTask): CoordinatedTask {
  return { ...task, status: 'in_progress', startedAt: Date.now() };
}

export function updateTaskProgress(task: CoordinatedTask, progress: number): CoordinatedTask {
  return { ...task, progress: Math.min(100, Math.max(0, progress)) };
}

export function completeTask(task: CoordinatedTask, result?: any): CoordinatedTask {
  return { ...task, status: 'completed', progress: 100, result, completedAt: Date.now() };
}

export function failTask(task: CoordinatedTask, error: string): CoordinatedTask {
  const retryCount = task.retryCount + 1;
  if (retryCount >= task.maxRetries) {
    return { ...task, status: 'failed', error, retryCount };
  }
  return { ...task, status: 'pending', error, retryCount, assignedTo: null, startedAt: null, progress: 0 };
}

export function cancelTask(task: CoordinatedTask): CoordinatedTask {
  return { ...task, status: 'cancelled', completedAt: Date.now() };
}

export function checkTaskDependencies(task: CoordinatedTask, allTasks: CoordinatedTask[]): { ready: boolean; pendingDependencies: string[] } {
  const pending = task.dependencies.filter(depId => {
    const depTask = allTasks.find(t => t.id === depId);
    return !depTask || depTask.status !== 'completed';
  });
  return { ready: pending.length === 0, pendingDependencies: pending };
}

export function addSubtask(task: CoordinatedTask, subtaskId: string): CoordinatedTask {
  return { ...task, subtasks: [...task.subtasks, subtaskId] };
}

export function isTaskOverdue(task: CoordinatedTask): boolean {
  if (!task.deadline) return false;
  return Date.now() > task.deadline && task.status !== 'completed' && task.status !== 'cancelled';
}

// ==================== State Sync ====================

function computeChecksum(data: any): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export function createStateSyncData(agentId: string, state: Record<string, any>, version: number = 1): StateSyncData {
  return { agentId, state, version, checksum: computeChecksum(state), timestamp: Date.now() };
}

export function mergeState(local: StateSyncData, remote: StateSyncData): { merged: StateSyncData; conflicts: string[] } {
  const merged = { ...local.state };
  const conflicts: string[] = [];
  for (const key of Object.keys(remote.state)) {
    if (key in local.state && JSON.stringify(local.state[key]) !== JSON.stringify(remote.state[key])) {
      conflicts.push(key);
      if (remote.version > local.version) merged[key] = remote.state[key];
    } else {
      merged[key] = remote.state[key];
    }
  }
  return { merged: createStateSyncData(local.agentId, merged, Math.max(local.version, remote.version) + 1), conflicts };
}

export function validateStateIntegrity(syncData: StateSyncData): boolean {
  return computeChecksum(syncData.state) === syncData.checksum;
}

// ==================== Load Balancing ====================

export function selectAgent(
  registry: AgentRegistry, strategy: 'round_robin' | 'random' | 'least_busy' = 'round_robin',
  _capability?: string, options?: { lastSelected?: string }
): Agent | null {
  const available = getAvailableAgents(registry);
  if (available.length === 0) return null;
  if (strategy === 'random') return available[Math.floor(Math.random() * available.length)];
  if (strategy === 'round_robin' && options?.lastSelected) {
    const lastIdx = available.findIndex(a => a.id === options.lastSelected);
    return available[(lastIdx + 1) % available.length] || available[0];
  }
  return available[0];
}

// ==================== Stats ====================

export function createCommunicationStats(): CommunicationStats {
  return { totalMessagesSent: 0, totalMessagesReceived: 0, totalBytesTransferred: 0, averageLatency: 0, errorCount: 0 };
}

export function updateSendStats(stats: CommunicationStats, bytes: number): CommunicationStats {
  return { ...stats, totalMessagesSent: stats.totalMessagesSent + 1, totalBytesTransferred: stats.totalBytesTransferred + bytes };
}

export function updateReceiveStats(stats: CommunicationStats, bytes: number, latency: number): CommunicationStats {
  const total = stats.totalMessagesReceived + 1;
  const avgLatency = (stats.averageLatency * stats.totalMessagesReceived + latency) / total;
  return { ...stats, totalMessagesReceived: total, totalBytesTransferred: stats.totalBytesTransferred + bytes, averageLatency: avgLatency };
}

export function recordError(stats: CommunicationStats): CommunicationStats {
  return { ...stats, errorCount: stats.errorCount + 1 };
}

export function getRegistrySummary(registry: AgentRegistry): {
  totalAgents: number; onlineAgents: number; busyAgents: number; offlineAgents: number; totalChannels: number; totalRoutingRules: number;
} {
  const agents = Array.from(registry.agents.values());
  return {
    totalAgents: agents.length,
    onlineAgents: agents.filter(a => a.status !== 'offline').length,
    busyAgents: agents.filter(a => a.status === 'busy').length,
    offlineAgents: agents.filter(a => a.status === 'offline').length,
    totalChannels: registry.channels.size,
    totalRoutingRules: registry.routingRules.length,
  };
}
