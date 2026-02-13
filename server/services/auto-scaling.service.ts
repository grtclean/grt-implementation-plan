/**
 * Auto-Scaling Service
 * Provides load prediction, scaling decisions, resource pool management,
 * auto-scaling orchestration, and cost optimization.
 */

// ==================== Types ====================

export interface ResourceMetrics {
  timestamp: number;
  cpuUsage: number;
  memoryUsage: number;
  gpuUsage: number;
  networkIO: number;
  diskIO: number;
  queueDepth: number;
  activeWorkers: number;
  pendingTasks: number;
  throughput: number;
  latency: number;
}

export interface ScalingPolicy {
  id: string;
  name: string;
  type: string;
  targetMetric: string;
  targetValue: number;
  minCapacity: number;
  maxCapacity: number;
  cooldownPeriod: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  scaleUpIncrement: number;
  scaleDownIncrement: number;
  enabled: boolean;
}

export interface ResourcePool {
  id: string;
  name: string;
  type: string;
  currentCapacity: number;
  minCapacity: number;
  maxCapacity: number;
  utilizationTarget: number;
  instances?: ResourceInstance[];
}

export interface ResourceInstance {
  id: string;
  type: string;
  status: string;
  capacity: number;
  currentLoad: number;
  startTime: number;
  lastHealthCheck: number;
}

export interface LoadPrediction {
  timestamp: number;
  predictedLoad: number;
  confidence: number;
}

export interface ScalingDecision {
  action: 'scale-up' | 'scale-down' | 'no-change';
  targetCapacity: number;
  reason: string;
  timestamp: number;
}

export interface ScaleEvent {
  poolId: string;
  action: string;
  previousCapacity: number;
  newCapacity: number;
  timestamp: number;
  success: boolean;
}

export interface AutoScalerStatus {
  running: boolean;
  pools: string[];
  lastCheck: number;
}

export interface SpotAnalysis {
  savings: number;
  risk: number;
  recommendation: string;
}

// ==================== Load Predictor ====================

export function createLoadPredictor() {
  const metricsHistory: ResourceMetrics[] = [];

  return {
    addMetrics(metrics: ResourceMetrics): void {
      metricsHistory.push({ ...metrics });
    },

    predict(steps: number): LoadPrediction[] {
      const predictions: LoadPrediction[] = [];

      // Simple moving average prediction
      const recentMetrics = metricsHistory.slice(-10);
      const avgLoad = recentMetrics.length > 0
        ? recentMetrics.reduce((sum, m) => sum + m.cpuUsage, 0) / recentMetrics.length
        : 0.5;

      for (let i = 0; i < steps; i++) {
        predictions.push({
          timestamp: Date.now() + (i + 1) * 60000,
          predictedLoad: Math.max(0, Math.min(1, avgLoad + (Math.random() - 0.5) * 0.1)),
          confidence: Math.max(0.5, 0.95 - i * 0.05),
        });
      }

      return predictions;
    },

    detectAnomaly(metrics: ResourceMetrics): boolean {
      if (metricsHistory.length < 10) return false;

      const recentMetrics = metricsHistory.slice(-20);
      const avgCpu = recentMetrics.reduce((sum, m) => sum + m.cpuUsage, 0) / recentMetrics.length;
      const stdDev = Math.sqrt(
        recentMetrics.reduce((sum, m) => sum + Math.pow(m.cpuUsage - avgCpu, 2), 0) / recentMetrics.length
      );

      // Flag if more than 3 standard deviations from mean
      return Math.abs(metrics.cpuUsage - avgCpu) > 3 * (stdDev || 0.1);
    },
  };
}

// ==================== Scaling Decider ====================

export function createScalingDecider(policy: ScalingPolicy) {
  let lastScaleTime = 0;

  return {
    evaluate(metrics: ResourceMetrics, currentCapacity: number): ScalingDecision {
      const now = Date.now();

      // Check cooldown
      if (lastScaleTime > 0 && (now - lastScaleTime) < policy.cooldownPeriod * 1000) {
        return {
          action: 'no-change',
          targetCapacity: currentCapacity,
          reason: 'In cooldown period',
          timestamp: now,
        };
      }

      const metricValue = (metrics as any)[policy.targetMetric] as number;

      // Scale up
      if (metricValue > policy.targetValue + policy.scaleUpThreshold) {
        const newCapacity = Math.min(policy.maxCapacity, currentCapacity + policy.scaleUpIncrement);
        lastScaleTime = now;
        return {
          action: 'scale-up',
          targetCapacity: newCapacity,
          reason: `${policy.targetMetric} (${metricValue.toFixed(2)}) exceeds target (${policy.targetValue})`,
          timestamp: now,
        };
      }

      // Scale down
      if (metricValue < policy.targetValue - policy.scaleDownThreshold) {
        const newCapacity = Math.max(policy.minCapacity, currentCapacity - policy.scaleDownIncrement);
        lastScaleTime = now;
        return {
          action: 'scale-down',
          targetCapacity: newCapacity,
          reason: `${policy.targetMetric} (${metricValue.toFixed(2)}) below target (${policy.targetValue})`,
          timestamp: now,
        };
      }

      return {
        action: 'no-change',
        targetCapacity: currentCapacity,
        reason: 'Metrics within target range',
        timestamp: now,
      };
    },
  };
}

// ==================== Resource Pool Manager ====================

export function createResourcePoolManager() {
  const pools = new Map<string, ResourcePool>();
  const poolInstances = new Map<string, ResourceInstance[]>();

  return {
    createPool(config: ResourcePool): ResourcePool {
      const pool: ResourcePool = { ...config, instances: [] };
      pools.set(config.id, pool);
      poolInstances.set(config.id, []);
      return pool;
    },

    getPool(poolId: string): ResourcePool | undefined {
      return pools.get(poolId);
    },

    addInstance(poolId: string, instance: ResourceInstance): boolean {
      const pool = pools.get(poolId);
      if (!pool) return false;

      const instances = poolInstances.get(poolId) || [];
      instances.push(instance);
      poolInstances.set(poolId, instances);
      pool.currentCapacity = instances.length;
      pool.instances = instances;
      return true;
    },

    removeInstance(poolId: string, instanceId: string): boolean {
      const pool = pools.get(poolId);
      if (!pool) return false;

      const instances = poolInstances.get(poolId) || [];
      const index = instances.findIndex((i) => i.id === instanceId);
      if (index === -1) return false;

      instances.splice(index, 1);
      poolInstances.set(poolId, instances);
      pool.currentCapacity = instances.length;
      pool.instances = instances;
      return true;
    },

    scalePool(poolId: string, targetCapacity: number): ScaleEvent {
      const pool = pools.get(poolId);
      const previousCapacity = pool?.currentCapacity || 0;

      if (pool) {
        const instances = poolInstances.get(poolId) || [];

        // Add instances if scaling up
        while (instances.length < targetCapacity) {
          instances.push({
            id: `auto-instance-${Date.now()}-${instances.length}`,
            type: pool.type,
            status: 'running',
            capacity: 1,
            currentLoad: 0,
            startTime: Date.now(),
            lastHealthCheck: Date.now(),
          });
        }

        // Remove instances if scaling down
        while (instances.length > targetCapacity) {
          instances.pop();
        }

        poolInstances.set(poolId, instances);
        pool.currentCapacity = instances.length;
        pool.instances = instances;
      }

      return {
        poolId,
        action: targetCapacity > previousCapacity ? 'scale-up' : targetCapacity < previousCapacity ? 'scale-down' : 'no-change',
        previousCapacity,
        newCapacity: targetCapacity,
        timestamp: Date.now(),
        success: true,
      };
    },
  };
}

// ==================== Auto Scaler ====================

export function createAutoScaler(config: { checkInterval: number }) {
  const managedPools = new Map<string, { pool: ResourcePool; policy: ScalingPolicy }>();
  let running = false;
  let lastCheck = 0;

  return {
    start(): void {
      running = true;
    },

    stop(): void {
      running = false;
    },

    addPool(pool: ResourcePool, policy: ScalingPolicy): void {
      managedPools.set(pool.id, { pool: { ...pool }, policy });
    },

    removePool(poolId: string): void {
      managedPools.delete(poolId);
    },

    getStatus(): AutoScalerStatus {
      return {
        running,
        pools: Array.from(managedPools.keys()),
        lastCheck,
      };
    },

    forceScale(poolId: string, targetCapacity: number): ScaleEvent | undefined {
      const entry = managedPools.get(poolId);
      if (!entry) return undefined;

      const previousCapacity = entry.pool.currentCapacity;
      entry.pool.currentCapacity = targetCapacity;

      return {
        poolId,
        action: targetCapacity > previousCapacity ? 'scale-up' : 'scale-down',
        previousCapacity,
        newCapacity: targetCapacity,
        timestamp: Date.now(),
        success: true,
      };
    },
  };
}

// ==================== Cost Optimizer ====================

const COST_PER_HOUR: Record<string, number> = {
  cpu: 0.05,
  gpu: 2.0,
  memory: 0.01,
  storage: 0.005,
};

export function createCostOptimizer() {
  return {
    calculateCost(pool: ResourcePool, hours: number): number {
      const rate = COST_PER_HOUR[pool.type] || 0.1;
      return pool.currentCapacity * rate * hours;
    },

    suggestOptimalCapacity(pool: ResourcePool, targetUtilization: number): number {
      const instances = pool.instances || [];
      if (instances.length === 0) {
        return pool.minCapacity;
      }

      const avgLoad = instances.reduce((sum, i) => sum + i.currentLoad, 0) / instances.length;
      const totalLoad = avgLoad * instances.length;
      const optimalCapacity = Math.ceil(totalLoad / targetUtilization);

      return Math.max(pool.minCapacity, Math.min(pool.maxCapacity, optimalCapacity));
    },

    analyzeSpotOpportunity(pool: ResourcePool): SpotAnalysis {
      const onDemandCost = pool.currentCapacity * (COST_PER_HOUR[pool.type] || 0.1);
      const spotCost = onDemandCost * 0.3; // Spot is roughly 70% cheaper
      const savings = onDemandCost - spotCost;

      // Higher capacity = higher interruption risk
      const risk = Math.min(1, pool.currentCapacity / pool.maxCapacity * 0.5);

      return {
        savings,
        risk,
        recommendation: risk < 0.3 ? 'Use spot instances' : 'Mix spot and on-demand',
      };
    },
  };
}
