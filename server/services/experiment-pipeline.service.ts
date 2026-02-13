/**
 * Experiment Pipeline Service
 * Provides experiment automation pipeline with configuration, execution,
 * data collection, statistical analysis, stop conditions, and reporting.
 */

// ==================== Types ====================

export interface VariantConfig {
  id: string;
  name: string;
  isControl: boolean;
  trafficPercentage: number;
}

export interface ExperimentConfig {
  id: string;
  name: string;
  hypothesis: string;
  primaryMetric: string;
  variants: VariantConfig[];
  options: ExperimentOptions;
}

export interface ExperimentOptions {
  targetSampleSize?: number;
  confidenceLevel?: number;
  minimumDetectableEffect?: number;
}

export interface VariantResult {
  sampleSize: number;
  conversions: number;
  conversionRate: number;
}

export interface ExperimentRun {
  id: string;
  experimentId: string;
  status: 'running' | 'paused' | 'stopped' | 'completed';
  currentPhase: string;
  startTime: number;
  endTime?: number;
  pauseReason?: string;
  stopReason?: string;
  variantResults: Map<string, VariantResult>;
  checkpoints: Checkpoint[];
  phases: string[];
}

export interface Checkpoint {
  id: string;
  runId: string;
  timestamp: number;
  phase: string;
  variantSnapshots: Map<string, VariantResult>;
}

export interface Pipeline {
  id: string;
  name: string;
  experiments: Map<string, ExperimentConfig>;
  runs: Map<string, ExperimentRun>;
}

export interface AnalysisResult {
  tests: AnalysisTest[];
  significant: boolean;
  winner?: string;
  effectSize?: number;
  totalSamples: number;
}

export interface AnalysisTest {
  name: string;
  pValue: number;
  significant: boolean;
  controlRate: number;
  treatmentRate: number;
}

export interface StopConditionResult {
  shouldStop: boolean;
  reason: string;
}

export interface ExperimentReport {
  title: string;
  summary: string;
  methodology: string;
  results: string;
  recommendations: string[];
  generatedAt: number;
}

export interface PipelineStats {
  totalExperiments: number;
  runningExperiments: number;
  completedExperiments: number;
  stoppedExperiments: number;
}

// ==================== Pipeline Management ====================

let idCounter = 0;
function generateId(prefix: string): string {
  return `${prefix}-${++idCounter}-${Date.now().toString(36)}`;
}

export function createPipeline(name: string): Pipeline {
  return {
    id: generateId('pipeline'),
    name,
    experiments: new Map(),
    runs: new Map(),
  };
}

export function createVariantConfig(name: string, isControl: boolean, trafficPercentage: number): VariantConfig {
  return {
    id: generateId('variant'),
    name,
    isControl,
    trafficPercentage,
  };
}

export function createExperimentConfig(
  name: string,
  hypothesis: string,
  primaryMetric: string,
  variants: VariantConfig[],
  options: ExperimentOptions = {}
): ExperimentConfig {
  return {
    id: generateId('exp'),
    name,
    hypothesis,
    primaryMetric,
    variants,
    options,
  };
}

export function addExperiment(pipeline: Pipeline, config: ExperimentConfig): void {
  pipeline.experiments.set(config.id, config);
}

// ==================== Experiment Execution ====================

export function startExperimentRun(pipeline: Pipeline, experimentId: string): ExperimentRun {
  const config = pipeline.experiments.get(experimentId);
  const run: ExperimentRun = {
    id: generateId('run'),
    experimentId,
    status: 'running',
    currentPhase: 'initialization',
    startTime: Date.now(),
    variantResults: new Map(),
    checkpoints: [],
    phases: ['initialization'],
  };

  // Initialize variant results
  if (config) {
    for (const variant of config.variants) {
      run.variantResults.set(variant.id, {
        sampleSize: 0,
        conversions: 0,
        conversionRate: 0,
      });
    }
  }

  pipeline.runs.set(run.id, run);
  return run;
}

export function advancePhase(run: ExperimentRun, phase: string): void {
  run.currentPhase = phase;
  run.phases.push(phase);
}

export function recordDataPoint(run: ExperimentRun, variantId: string, converted: boolean): void {
  let result = run.variantResults.get(variantId);
  if (!result) {
    result = { sampleSize: 0, conversions: 0, conversionRate: 0 };
    run.variantResults.set(variantId, result);
  }

  result.sampleSize++;
  if (converted) {
    result.conversions++;
  }
  result.conversionRate = result.sampleSize > 0 ? result.conversions / result.sampleSize : 0;
}

export function createCheckpoint(run: ExperimentRun): Checkpoint {
  const checkpoint: Checkpoint = {
    id: generateId('checkpoint'),
    runId: run.id,
    timestamp: Date.now(),
    phase: run.currentPhase,
    variantSnapshots: new Map(),
  };

  for (const [variantId, result] of run.variantResults) {
    checkpoint.variantSnapshots.set(variantId, { ...result });
  }

  run.checkpoints.push(checkpoint);
  return checkpoint;
}

export function pauseExperiment(run: ExperimentRun, reason: string): void {
  run.status = 'paused';
  run.pauseReason = reason;
}

export function resumeExperiment(run: ExperimentRun): void {
  run.status = 'running';
  run.pauseReason = undefined;
}

export function stopExperiment(run: ExperimentRun, reason: string): void {
  run.status = 'stopped';
  run.stopReason = reason;
  run.endTime = Date.now();
}

export function completeExperiment(run: ExperimentRun): void {
  run.status = 'completed';
  run.currentPhase = 'cleanup';
  run.endTime = Date.now();
}

// ==================== Statistical Analysis ====================

export function performAnalysis(run: ExperimentRun, config: ExperimentConfig): AnalysisResult {
  const variants = Array.from(run.variantResults.entries());
  const tests: AnalysisTest[] = [];
  let totalSamples = 0;

  // Find control variant
  const controlVariant = config.variants.find((v) => v.isControl);
  const controlResult = controlVariant ? run.variantResults.get(controlVariant.id) : undefined;

  for (const [variantId, result] of variants) {
    totalSamples += result.sampleSize;

    if (controlResult && controlVariant && variantId !== controlVariant.id) {
      // Simple z-test approximation for proportions
      const p1 = controlResult.conversionRate;
      const p2 = result.conversionRate;
      const n1 = controlResult.sampleSize;
      const n2 = result.sampleSize;

      const pooledP = (controlResult.conversions + result.conversions) / (n1 + n2);
      const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2));
      const z = se > 0 ? Math.abs(p2 - p1) / se : 0;
      const pValue = Math.max(0.001, Math.min(1, 2 * (1 - normalCDF(z))));

      tests.push({
        name: `${controlVariant.name} vs ${config.variants.find((v) => v.id === variantId)?.name || variantId}`,
        pValue,
        significant: pValue < 0.05,
        controlRate: p1,
        treatmentRate: p2,
      });
    }
  }

  return {
    tests,
    significant: tests.some((t) => t.significant),
    winner: tests.find((t) => t.significant && t.treatmentRate > t.controlRate)
      ? config.variants.find((v) => !v.isControl)?.id
      : undefined,
    effectSize: tests.length > 0 ? Math.abs(tests[0].treatmentRate - tests[0].controlRate) : 0,
    totalSamples,
  };
}

function normalCDF(z: number): number {
  // Approximation of the standard normal CDF
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * z);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

  return 0.5 * (1.0 + sign * y);
}

export function checkStopConditions(
  run: ExperimentRun,
  config: ExperimentConfig,
  analysisResult: AnalysisResult
): StopConditionResult {
  // Check target sample size
  if (config.options.targetSampleSize && analysisResult.totalSamples >= config.options.targetSampleSize) {
    return { shouldStop: true, reason: 'Target sample size reached' };
  }

  // Check for strong statistical significance
  if (analysisResult.significant && analysisResult.totalSamples > 50) {
    return { shouldStop: true, reason: 'Statistical significance reached' };
  }

  return { shouldStop: false, reason: 'No stop conditions met' };
}

// ==================== Report Generation ====================

export function generateReport(pipeline: Pipeline, run: ExperimentRun): ExperimentReport {
  const config = pipeline.experiments.get(run.experimentId);
  const configName = config?.name || 'Unknown';

  const variantSummaries: string[] = [];
  for (const [variantId, result] of run.variantResults) {
    const variantName = config?.variants.find((v) => v.id === variantId)?.name || variantId;
    variantSummaries.push(
      `${variantName}: ${result.sampleSize} samples, ${result.conversions} conversions (${(result.conversionRate * 100).toFixed(2)}%)`
    );
  }

  return {
    title: `Experiment Report: ${configName}`,
    summary: `Experiment "${configName}" ${run.status}. ${variantSummaries.join('. ')}`,
    methodology: `A/B test with ${config?.variants.length || 0} variants measuring ${config?.primaryMetric || 'N/A'}.`,
    results: variantSummaries.join('\n'),
    recommendations: [
      `Review the results for ${configName}`,
      'Consider running follow-up experiments',
      'Apply learnings to future tests',
    ],
    generatedAt: Date.now(),
  };
}

export function exportReportToMarkdown(report: ExperimentReport): string {
  const lines: string[] = [];
  lines.push(`# ${report.title}`);
  lines.push('');
  lines.push('## 摘要');
  lines.push(report.summary);
  lines.push('');
  lines.push('## 方法论');
  lines.push(report.methodology);
  lines.push('');
  lines.push('## 结果');
  lines.push(report.results);
  lines.push('');
  lines.push('## 建议');
  for (const rec of report.recommendations) {
    lines.push(`- ${rec}`);
  }
  lines.push('');
  lines.push(`*Generated at ${new Date(report.generatedAt).toISOString()}*`);
  return lines.join('\n');
}

// ==================== Pipeline Stats ====================

export function getPipelineStats(pipeline: Pipeline): PipelineStats {
  let runningExperiments = 0;
  let completedExperiments = 0;
  let stoppedExperiments = 0;

  for (const [, run] of pipeline.runs) {
    switch (run.status) {
      case 'running':
        runningExperiments++;
        break;
      case 'completed':
        completedExperiments++;
        break;
      case 'stopped':
        stoppedExperiments++;
        break;
    }
  }

  return {
    totalExperiments: pipeline.experiments.size,
    runningExperiments,
    completedExperiments,
    stoppedExperiments,
  };
}
