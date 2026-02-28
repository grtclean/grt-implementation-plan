/**
 * Swarm Coordination Service
 * Swarm coordinator, load balancing, failover management, task assignment algorithms.
 */

// ==================== Types ====================

export interface AgentNode {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'idle' | 'busy' | 'offline' | 'error';
  capabilities: string[];
  currentLoad: number;
  maxLoad: number;
  lastHeartbeat: number;
  metadata: Record<string, unknown>;
}

export interface Task {
  id: string;
  name: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  requiredCapabilities: string[];
  estimatedLoad: number;
  dependencies: string[];
  status: 'pending' | 'assigned' | 'running' | 'completed' | 'failed';
  assignedAgent?: string;
  createdAt: number;
}

interface SwarmConfig {
  loadBalanceStrategy: { type: string };
  failoverConfig: FailoverConfig;
  heartbeatInterval: number;
  taskTimeout: number;
}

interface FailoverConfig {
  enabled: boolean;
  maxRetries: number;
  retryDelay: number;
  healthCheckInterval: number;
  failoverTimeout: number;
  backupAgents: string[];
}

interface SwarmMetrics {
  totalAgents: number;
  onlineAgents: number;
  idleAgents: number;
  busyAgents: number;
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  failedTasks: number;
}

// ==================== Swarm Coordinator ====================

export function createSwarmCoordinator(config: SwarmConfig) {
  const agents = new Map<string, AgentNode>();
  const tasks = new Map<string, Task>();

  return {
    registerAgent(agent: AgentNode): void {
      agents.set(agent.id, { ...agent });
    },

    unregisterAgent(agentId: string): void {
      agents.delete(agentId);
    },

    submitTask(task: Task): { taskId: string; assignedAgent: string | null } {
      tasks.set(task.id, { ...task });

      // Try to find an available agent with matching capabilities
      let bestAgent: AgentNode | null = null;
      for (const agent of agents.values()) {
        if (agent.status === 'idle' || agent.status === 'online') {
          const hasCapabilities = task.requiredCapabilities.every(
            cap => agent.capabilities.includes(cap)
          );
          if (hasCapabilities && agent.currentLoad + task.estimatedLoad <= agent.maxLoad) {
            if (!bestAgent || agent.currentLoad < bestAgent.currentLoad) {
              bestAgent = agent;
            }
          }
        }
      }

      if (bestAgent) {
        const updatedTask = { ...task, status: 'assigned' as const, assignedAgent: bestAgent.id };
        tasks.set(task.id, updatedTask);
        const updatedAgent = { ...bestAgent, currentLoad: bestAgent.currentLoad + task.estimatedLoad, status: 'busy' as const };
        agents.set(bestAgent.id, updatedAgent);
        return { taskId: task.id, assignedAgent: bestAgent.id };
      }

      return { taskId: task.id, assignedAgent: null };
    },

    getMetrics(): SwarmMetrics {
      const agentList = Array.from(agents.values());
      const taskList = Array.from(tasks.values());
      return {
        totalAgents: agentList.length,
        onlineAgents: agentList.filter(a => a.status !== 'offline').length,
        idleAgents: agentList.filter(a => a.status === 'idle').length,
        busyAgents: agentList.filter(a => a.status === 'busy').length,
        totalTasks: taskList.length,
        pendingTasks: taskList.filter(t => t.status === 'pending').length,
        completedTasks: taskList.filter(t => t.status === 'completed').length,
        failedTasks: taskList.filter(t => t.status === 'failed').length,
      };
    },
  };
}

// ==================== Load Balancer ====================

export function createLoadBalancer(config: { type: string }) {
  let roundRobinIndex = 0;

  return {
    selectAgent(agents: AgentNode[], requiredCapabilities: string[] = []): AgentNode | null {
      const eligible = agents.filter(a => {
        if (a.status !== 'idle' && a.status !== 'online') return false;
        return requiredCapabilities.every(cap => a.capabilities.includes(cap));
      });

      if (eligible.length === 0) return null;

      if (config.type === 'least_loaded') {
        return eligible.reduce((min, a) => a.currentLoad < min.currentLoad ? a : min, eligible[0]);
      }

      if (config.type === 'round_robin') {
        const agent = eligible[roundRobinIndex % eligible.length];
        roundRobinIndex++;
        return agent;
      }

      // random
      return eligible[Math.floor(Math.random() * eligible.length)];
    },
  };
}

// ==================== Failover Manager ====================

export function createFailoverManager(config: FailoverConfig) {
  const failureCounts = new Map<string, number>();

  return {
    reportAgentFailure(agentId: string): void {
      const count = failureCounts.get(agentId) || 0;
      failureCounts.set(agentId, count + 1);
    },

    shouldQuarantine(agentId: string): boolean {
      const count = failureCounts.get(agentId) || 0;
      return count >= config.maxRetries;
    },

    attemptFailover(
      task: Task,
      failedAgentId: string,
      availableAgents: AgentNode[]
    ): { success: boolean; newAgentId: string | null } {
      if (!config.enabled) {
        return { success: false, newAgentId: null };
      }

      // Prefer backup agents first
      for (const agent of availableAgents) {
        if (config.backupAgents.includes(agent.id) && agent.status === 'idle') {
          return { success: true, newAgentId: agent.id };
        }
      }

      // Fall back to any available agent
      for (const agent of availableAgents) {
        if (agent.id !== failedAgentId && (agent.status === 'idle' || agent.status === 'online')) {
          return { success: true, newAgentId: agent.id };
        }
      }

      return { success: false, newAgentId: null };
    },
  };
}

// ==================== Task Assignment Algorithms ====================

export function calculateAgentTaskScore(
  agent: AgentNode,
  task: Task
): { score: number; breakdown: Record<string, number> } {
  let capabilityScore = 0;
  const requiredCaps = task.requiredCapabilities;
  if (requiredCaps.length > 0) {
    const matched = requiredCaps.filter(cap => agent.capabilities.includes(cap)).length;
    capabilityScore = matched / requiredCaps.length;
  } else {
    capabilityScore = 1;
  }

  const loadRatio = agent.maxLoad > 0 ? agent.currentLoad / agent.maxLoad : 1;
  const loadScore = 1 - loadRatio;

  const statusScore = agent.status === 'idle' ? 1 : agent.status === 'online' ? 0.8 : 0;

  const score = capabilityScore * 0.4 + loadScore * 0.4 + statusScore * 0.2;

  return {
    score,
    breakdown: {
      capabilityScore,
      loadScore,
      statusScore,
    },
  };
}

export function greedyTaskAssignment(
  agents: AgentNode[],
  tasks: Task[]
): Array<{ taskId: string; agentId: string; score: number }> {
  const assignments: Array<{ taskId: string; agentId: string; score: number }> = [];

  const availableAgents = [...agents];

  for (const task of tasks) {
    let bestAgent: AgentNode | null = null;
    let bestScore = -1;

    for (const agent of availableAgents) {
      const { score } = calculateAgentTaskScore(agent, task);
      if (score > bestScore) {
        bestScore = score;
        bestAgent = agent;
      }
    }

    if (bestAgent && bestScore > 0) {
      assignments.push({ taskId: task.id, agentId: bestAgent.id, score: bestScore });
    }
  }

  return assignments;
}
