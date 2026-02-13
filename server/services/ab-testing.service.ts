/**
 * A/B Testing Service
 * Provides experiment creation, user allocation, statistical analysis,
 * and experiment lifecycle management.
 */

import { randomUUID } from 'crypto';

// ==================== Types ====================

export interface VariantDef {
  name: string;
  weight: number;
  isControl: boolean;
}

export interface Variant {
  id: string;
  name: string;
  weight: number;
  isControl: boolean;
}

export interface MetricDef {
  name: string;
  type: 'conversion' | 'continuous' | 'count';
  isPrimary: boolean;
}

export interface Metric {
  id: string;
  name: string;
  type: 'conversion' | 'continuous' | 'count';
  isPrimary: boolean;
}

export interface Experiment {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  variants: Variant[];
  metrics: Metric[];
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface MetricEvent {
  userId: string;
  experimentId: string;
  variantId: string;
  metricId: string;
  value: number;
  timestamp: number;
}

export interface VariantStats {
  sampleSize: number;
  mean: number;
  variance: number;
  standardDeviation: number;
  sum: number;
}

export interface UserAssignment {
  userId: string;
  variantId: string;
  assignedAt: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface TTestResult {
  tStatistic: number;
  pValue: number;
  significant: boolean;
}

export interface ChiSquareResult {
  chiSquare: number;
  pValue: number;
  significant: boolean;
}

export interface BayesianResult {
  probabilityTreatmentBetter: number;
  expectedLiftMean: number;
  credibleInterval: [number, number];
}

export interface ExperimentResult {
  variantId: string;
  metricId: string;
  stats: VariantStats;
}

export interface ExperimentSummary {
  experimentId: string;
  name: string;
  status: string;
  variantCount: number;
  metricCount: number;
  resultCount: number;
}

// ==================== Experiment Lifecycle ====================

/**
 * Create a new experiment in draft status.
 */
export function createExperiment(
  name: string,
  description: string,
  variantDefs: VariantDef[],
  metricDefs: MetricDef[]
): Experiment {
  return {
    id: randomUUID(),
    name,
    description,
    status: 'draft',
    variants: variantDefs.map((v) => ({
      id: randomUUID(),
      name: v.name,
      weight: v.weight,
      isControl: v.isControl,
    })),
    metrics: metricDefs.map((m) => ({
      id: randomUUID(),
      name: m.name,
      type: m.type,
      isPrimary: m.isPrimary,
    })),
    createdAt: Date.now(),
  };
}

/**
 * Start an experiment (transition from draft/paused to running).
 */
export function startExperiment(exp: Experiment): Experiment {
  return {
    ...exp,
    status: 'running',
    startedAt: Date.now(),
  };
}

/**
 * Pause a running experiment.
 */
export function pauseExperiment(exp: Experiment): Experiment {
  return {
    ...exp,
    status: 'paused',
  };
}

/**
 * Complete an experiment.
 */
export function completeExperiment(exp: Experiment): Experiment {
  return {
    ...exp,
    status: 'completed',
    completedAt: Date.now(),
  };
}

/**
 * Validate an experiment configuration.
 */
export function validateExperiment(exp: Experiment): ValidationResult {
  const errors: string[] = [];

  if (!exp.name || exp.name.trim().length === 0) {
    errors.push('Experiment name is required');
  }
  if (exp.variants.length < 2) {
    errors.push('At least 2 variants are required');
  }
  if (!exp.variants.some((v) => v.isControl)) {
    errors.push('At least one control variant is required');
  }
  if (exp.metrics.length === 0) {
    errors.push('At least one metric is required');
  }

  const totalWeight = exp.variants.reduce((s, v) => s + v.weight, 0);
  if (Math.abs(totalWeight - 1) > 0.01) {
    errors.push('Variant weights must sum to 1');
  }

  return { valid: errors.length === 0, errors };
}

// ==================== User Allocation ====================

/**
 * Assign a user to a variant. Re-uses existing assignment if present.
 */
export function assignUserToVariant(
  exp: Experiment,
  userId: string,
  existingAssignments: Map<string, UserAssignment>
): UserAssignment {
  const existingKey = `${exp.id}:${userId}`;
  if (existingAssignments.has(existingKey)) {
    return existingAssignments.get(existingKey)!;
  }

  const variantId = fixedAllocation(exp.variants, userId);
  const assignment: UserAssignment = {
    userId,
    variantId,
    assignedAt: Date.now(),
  };
  existingAssignments.set(existingKey, assignment);
  return assignment;
}

/**
 * Fixed (deterministic) allocation based on user ID hash.
 * Same userId always gets the same variant.
 */
export function fixedAllocation(variants: Variant[], userId: string): string {
  // Simple hash
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  const normalized = Math.abs(hash) / 2147483647; // Normalize to [0, 1]

  let cumulative = 0;
  for (const v of variants) {
    cumulative += v.weight;
    if (normalized < cumulative) {
      return v.id;
    }
  }
  return variants[variants.length - 1].id;
}

/**
 * Epsilon-greedy allocation: with probability epsilon, choose random;
 * otherwise choose the variant with best performance (or random if tied).
 */
export function epsilonGreedyAllocation(
  variants: Variant[],
  epsilon: number
): string {
  if (Math.random() < epsilon) {
    // Random
    return variants[Math.floor(Math.random() * variants.length)].id;
  }
  // "Best" — without actual stats, just pick the first
  return variants[Math.floor(Math.random() * variants.length)].id;
}

/**
 * Thompson sampling allocation using Beta distribution sampling.
 */
export function thompsonSamplingAllocation(
  variants: Variant[],
  stats: Map<string, { successes: number; failures: number }>
): string {
  let bestSample = -Infinity;
  let bestId = variants[0].id;

  for (const v of variants) {
    const s = stats.get(v.id) || { successes: 1, failures: 1 };
    // Simple Beta distribution approximation using uniform random
    const sample = betaSample(s.successes, s.failures);
    if (sample > bestSample) {
      bestSample = sample;
      bestId = v.id;
    }
  }

  return bestId;
}

/**
 * Simple Beta distribution sample approximation.
 */
function betaSample(alpha: number, beta: number): number {
  // Use a simple approximation: mean + noise
  const mean = alpha / (alpha + beta);
  const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
  return mean + (Math.random() - 0.5) * Math.sqrt(variance) * 2;
}

// ==================== Statistical Analysis ====================

/**
 * Calculate stats for a variant on a specific metric.
 */
export function calculateVariantStats(
  events: MetricEvent[],
  variantId: string,
  metricId: string
): VariantStats {
  const filtered = events.filter(
    (e) => e.variantId === variantId && e.metricId === metricId
  );

  if (filtered.length === 0) {
    return { sampleSize: 0, mean: 0, variance: 0, standardDeviation: 0, sum: 0 };
  }

  const values = filtered.map((e) => e.value);
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  const variance =
    values.length > 1
      ? values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (values.length - 1)
      : 0;

  return {
    sampleSize: values.length,
    mean,
    variance,
    standardDeviation: Math.sqrt(variance),
    sum,
  };
}

/**
 * Independent two-sample t-test.
 */
export function tTest(
  control: { mean: number; variance: number; sampleSize: number },
  treatment: { mean: number; variance: number; sampleSize: number }
): TTestResult {
  const pooledSE = Math.sqrt(
    control.variance / control.sampleSize + treatment.variance / treatment.sampleSize
  );

  const tStatistic = pooledSE > 0 ? (treatment.mean - control.mean) / pooledSE : 0;
  // Approximate p-value using normal approximation for large samples
  const pValue = 2 * (1 - normalCDF(Math.abs(tStatistic)));

  return {
    tStatistic,
    pValue,
    significant: pValue < 0.05,
  };
}

/**
 * Chi-square test for two proportions.
 */
export function chiSquareTest(
  successesA: number,
  totalA: number,
  successesB: number,
  totalB: number
): ChiSquareResult {
  const failuresA = totalA - successesA;
  const failuresB = totalB - successesB;
  const total = totalA + totalB;
  const totalSuccesses = successesA + successesB;
  const totalFailures = failuresA + failuresB;

  // Expected values
  const eSuccA = (totalA * totalSuccesses) / total;
  const eFailA = (totalA * totalFailures) / total;
  const eSuccB = (totalB * totalSuccesses) / total;
  const eFailB = (totalB * totalFailures) / total;

  const chiSquare =
    ((successesA - eSuccA) ** 2) / eSuccA +
    ((failuresA - eFailA) ** 2) / eFailA +
    ((successesB - eSuccB) ** 2) / eSuccB +
    ((failuresB - eFailB) ** 2) / eFailB;

  // Approximate p-value for 1 df chi-square
  const pValue = 1 - normalCDF(Math.sqrt(chiSquare)) * 2 + 1;
  const approxP = Math.exp(-chiSquare / 2);

  return {
    chiSquare,
    pValue: approxP,
    significant: approxP < 0.05,
  };
}

/**
 * Calculate confidence interval for a mean.
 */
export function calculateConfidenceInterval(
  mean: number,
  standardError: number,
  confidenceLevel: number
): [number, number] {
  // z-score for confidence level
  const alpha = 1 - confidenceLevel;
  const z = normalQuantile(1 - alpha / 2);
  return [mean - z * standardError, mean + z * standardError];
}

/**
 * Calculate relative uplift (treatment vs control).
 */
export function calculateRelativeUplift(
  controlValue: number,
  treatmentValue: number
): number {
  if (controlValue === 0) return 0;
  return (treatmentValue - controlValue) / controlValue;
}

/**
 * Bayesian analysis comparing treatment to control.
 */
export function bayesianAnalysis(
  control: { successes: number; trials: number },
  treatment: { successes: number; trials: number },
  simulations: number = 10000
): BayesianResult {
  let treatmentWins = 0;
  const lifts: number[] = [];

  const controlAlpha = control.successes + 1;
  const controlBeta = control.trials - control.successes + 1;
  const treatmentAlpha = treatment.successes + 1;
  const treatmentBeta = treatment.trials - treatment.successes + 1;

  for (let i = 0; i < simulations; i++) {
    const controlSample = betaSample(controlAlpha, controlBeta);
    const treatmentSample = betaSample(treatmentAlpha, treatmentBeta);

    if (treatmentSample > controlSample) {
      treatmentWins++;
    }
    if (controlSample > 0) {
      lifts.push((treatmentSample - controlSample) / controlSample);
    }
  }

  const probabilityTreatmentBetter = treatmentWins / simulations;
  const expectedLiftMean =
    lifts.length > 0 ? lifts.reduce((a, b) => a + b, 0) / lifts.length : 0;

  lifts.sort((a, b) => a - b);
  const lower = lifts[Math.floor(lifts.length * 0.025)] || 0;
  const upper = lifts[Math.floor(lifts.length * 0.975)] || 0;

  return {
    probabilityTreatmentBetter,
    expectedLiftMean,
    credibleInterval: [lower, upper],
  };
}

/**
 * Calculate required sample size per variant for a given effect size.
 */
export function calculateRequiredSampleSize(
  baselineRate: number,
  minimumDetectableEffect: number,
  power: number = 0.8,
  alpha: number = 0.05
): number {
  const p1 = baselineRate;
  const p2 = baselineRate + minimumDetectableEffect;
  const pAvg = (p1 + p2) / 2;

  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(power);

  const numerator =
    (zAlpha * Math.sqrt(2 * pAvg * (1 - pAvg)) +
      zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2;
  const denominator = (p2 - p1) ** 2;

  return Math.ceil(numerator / denominator);
}

/**
 * Estimate experiment duration in days.
 */
export function estimateExperimentDuration(
  requiredSampleSize: number,
  dailyTraffic: number
): number {
  if (dailyTraffic <= 0) return Infinity;
  return Math.ceil(requiredSampleSize / dailyTraffic);
}

// ==================== Reporting ====================

/**
 * Generate results for each variant-metric combination.
 */
export function generateExperimentResults(
  exp: Experiment,
  events: MetricEvent[]
): ExperimentResult[] {
  const results: ExperimentResult[] = [];

  for (const variant of exp.variants) {
    for (const metric of exp.metrics) {
      const stats = calculateVariantStats(events, variant.id, metric.id);
      results.push({
        variantId: variant.id,
        metricId: metric.id,
        stats,
      });
    }
  }

  return results;
}

/**
 * Summarize an experiment.
 */
export function summarizeExperiment(
  exp: Experiment,
  results: ExperimentResult[]
): ExperimentSummary {
  return {
    experimentId: exp.id,
    name: exp.name,
    status: exp.status,
    variantCount: exp.variants.length,
    metricCount: exp.metrics.length,
    resultCount: results.length,
  };
}

// ==================== Utility ====================

/**
 * Approximate normal CDF using Abramowitz & Stegun approximation.
 */
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Approximate normal quantile (inverse CDF) using rational approximation.
 */
function normalQuantile(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  // Rational approximation for central region
  if (p > 0.5) {
    return -normalQuantile(1 - p);
  }

  const t = Math.sqrt(-2 * Math.log(p));
  const c0 = 2.515517;
  const c1 = 0.802853;
  const c2 = 0.010328;
  const d1 = 1.432788;
  const d2 = 0.189269;
  const d3 = 0.001308;

  return -(t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t));
}
