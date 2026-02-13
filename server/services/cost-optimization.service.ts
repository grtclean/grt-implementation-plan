/**
 * Cost Optimization Service
 * Stub implementation for v2.5.3 scaling cost optimization tests
 */

export interface CloudResource {
  id: string;
  type: string;
  provider: string;
  instanceType: string;
  region: string;
  specs: {
    cpu: number;
    memory: number;
    storage: number;
    networkBandwidth: number;
  };
  pricing: {
    onDemandHourly: number;
    spotHourly: number;
    reservedMonthly: number;
    reservedYearly: number;
    dataTransferPerGB: number;
    storagePerGBMonth: number;
  };
  status: string;
  tags: Map<string, string>;
}

export interface CostModel {
  id: string;
  name: string;
  resources: CloudResource[];
  utilizationTargets: {
    cpuMin: number;
    cpuMax: number;
    memoryMin: number;
    memoryMax: number;
    targetUtilization: number;
  };
  constraints: {
    maxHourlyCost: number;
    maxDailyCost: number;
    maxMonthlyCost: number;
    minInstances: number;
    maxInstances: number;
    preferSpot: boolean;
    spotMaxPercentage: number;
  };
  optimizationGoal: string;
}

interface CostBreakdown {
  compute: number;
  storage: number;
  network: number;
  total: number;
}

interface CostCalculator {
  model: CostModel;
  calculateCurrentCost: () => CostBreakdown;
  getRecommendations: () => Array<{ type: string; description: string; savings: number }>;
}

interface ScalingDecision {
  action: 'scale_out' | 'scale_in' | 'no_action';
  reason: string;
  targetInstances?: number;
}

interface Budget {
  id: string;
  name: string;
  amount: number;
  period: string;
  startDate: Date;
  spent: number;
  remaining: number;
}

interface BudgetStatus {
  utilizationPercentage: number;
  status: string;
  alerts: string[];
}

interface CostAnalysis {
  currentCost: CostBreakdown;
  projectedCost: CostBreakdown;
  recommendations: Array<{ type: string; description: string; savings: number }>;
}

interface CostForecast {
  date: Date;
  projected: number;
  confidence: number;
}

export function createCostCalculator(model: CostModel): CostCalculator {
  return {
    model,
    calculateCurrentCost(): CostBreakdown {
      let compute = 0;
      for (const resource of model.resources) {
        compute += resource.pricing.onDemandHourly * 24;
      }
      const storage = model.resources.reduce((sum, r) => sum + r.specs.storage * r.pricing.storagePerGBMonth / 30, 0);
      const network = model.resources.reduce((sum, r) => sum + r.pricing.dataTransferPerGB * 10, 0);
      return {
        compute,
        storage,
        network,
        total: compute + storage + network,
      };
    },
    getRecommendations() {
      const recommendations: Array<{ type: string; description: string; savings: number }> = [];
      for (const resource of model.resources) {
        if (resource.pricing.spotHourly < resource.pricing.onDemandHourly) {
          recommendations.push({
            type: 'spot_instance',
            description: `Consider spot instances for ${resource.id}`,
            savings: (resource.pricing.onDemandHourly - resource.pricing.spotHourly) * 24 * 30,
          });
        }
        if (resource.pricing.reservedMonthly < resource.pricing.onDemandHourly * 24 * 30) {
          recommendations.push({
            type: 'reserved_instance',
            description: `Consider reserved instances for ${resource.id}`,
            savings: resource.pricing.onDemandHourly * 24 * 30 - resource.pricing.reservedMonthly,
          });
        }
      }
      if (recommendations.length === 0) {
        recommendations.push({
          type: 'optimize',
          description: 'Review resource utilization',
          savings: 0,
        });
      }
      return recommendations;
    },
  };
}

export function analyzePerformanceCostBalance(
  model: CostModel,
  metrics: { cpu: number; memory: number; latency: number }
): { score: number; recommendation: string } {
  const utilization = (metrics.cpu + metrics.memory) / 2;
  const target = model.utilizationTargets.targetUtilization;
  const score = 1 - Math.abs(utilization - target) / 100;
  return {
    score,
    recommendation: utilization > target ? 'Scale out to reduce load' : 'Resources adequately utilized',
  };
}

export function makeScalingDecision(
  model: CostModel,
  metrics: { cpu: number; memory: number; latency: number },
  currentInstances: number
): ScalingDecision {
  const { cpuMax, cpuMin, memoryMax, memoryMin } = model.utilizationTargets;

  if (metrics.cpu > cpuMax || metrics.memory > memoryMax) {
    return {
      action: 'scale_out',
      reason: 'Resource utilization exceeds maximum threshold',
      targetInstances: Math.min(currentInstances + 1, model.constraints.maxInstances),
    };
  }

  if (metrics.cpu < cpuMin && metrics.memory < memoryMin && currentInstances > model.constraints.minInstances) {
    return {
      action: 'scale_in',
      reason: 'Resource utilization below minimum threshold',
      targetInstances: Math.max(currentInstances - 1, model.constraints.minInstances),
    };
  }

  return {
    action: 'no_action',
    reason: 'Resource utilization within target range',
  };
}

export function forecastCosts(
  model: CostModel,
  historicalData: Array<{ date: Date; cost: number }>,
  days: number
): CostForecast[] {
  const calculator = createCostCalculator(model);
  const current = calculator.calculateCurrentCost();
  const forecasts: CostForecast[] = [];

  for (let i = 1; i <= days; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    forecasts.push({
      date,
      projected: current.total * (1 + Math.random() * 0.1 - 0.05),
      confidence: Math.max(0.5, 1 - i * 0.05),
    });
  }

  return forecasts;
}

export function createBudget(name: string, amount: number, period: string, startDate: Date): Budget {
  return {
    id: `budget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    amount,
    period,
    startDate,
    spent: 0,
    remaining: amount,
  };
}

export function updateBudgetSpending(budget: Budget, spent: number): Budget {
  return {
    ...budget,
    spent,
    remaining: budget.amount - spent,
  };
}

export function checkBudgetStatus(budget: Budget): BudgetStatus {
  const utilizationPercentage = (budget.spent / budget.amount) * 100;
  const alerts: string[] = [];

  if (utilizationPercentage > 90) {
    alerts.push('Budget nearly exhausted');
  } else if (utilizationPercentage > 75) {
    alerts.push('Budget usage above 75%');
  }

  return {
    utilizationPercentage,
    status: utilizationPercentage > 90 ? 'critical' : utilizationPercentage > 75 ? 'warning' : 'normal',
    alerts,
  };
}

export function performFullCostAnalysis(model: CostModel): CostAnalysis {
  const calculator = createCostCalculator(model);
  const currentCost = calculator.calculateCurrentCost();
  const recommendations = calculator.getRecommendations();

  return {
    currentCost,
    projectedCost: {
      compute: currentCost.compute * 1.1,
      storage: currentCost.storage * 1.05,
      network: currentCost.network * 1.02,
      total: currentCost.total * 1.08,
    },
    recommendations,
  };
}

export function generateCostReport(
  model: CostModel,
  analysis: CostAnalysis,
  forecasts: CostForecast[]
): string {
  const lines: string[] = [
    '# Cost Optimization Report',
    '',
    `## Model: ${model.name}`,
    '',
    '## Current Costs',
    `- Compute: $${analysis.currentCost.compute.toFixed(2)}`,
    `- Storage: $${analysis.currentCost.storage.toFixed(2)}`,
    `- Network: $${analysis.currentCost.network.toFixed(2)}`,
    `- Total: $${analysis.currentCost.total.toFixed(2)}`,
    '',
    '## Projected Costs',
    `- Total: $${analysis.projectedCost.total.toFixed(2)}`,
    '',
    '## Recommendations',
  ];

  for (const rec of analysis.recommendations) {
    lines.push(`- ${rec.description} (Potential savings: $${rec.savings.toFixed(2)})`);
  }

  lines.push('', '## Forecasts');
  for (const forecast of forecasts) {
    lines.push(`- ${forecast.date.toISOString().split('T')[0]}: $${forecast.projected.toFixed(2)} (confidence: ${(forecast.confidence * 100).toFixed(0)}%)`);
  }

  return lines.join('\n');
}
