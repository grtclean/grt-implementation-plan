/**
 * Root Cause Analysis Service
 * Provides anomaly detection, causal graph construction, root cause tracing,
 * and report generation for multi-parameter root cause analysis.
 */

export interface ParameterDataPoint {
  timestamp: number;
  value: number;
  parameterId: string;
  parameterName: string;
}

export interface AnomalyEvent {
  id: string;
  parameterId: string;
  parameterName: string;
  timestamp: number;
  value: number;
  expectedValue: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
}

export interface CausalRelation {
  sourceParameter: string;
  targetParameter: string;
  correlation: number;
  lagTime: number;
  confidence: number;
}

export interface RootCause {
  parameterName: string;
  probability: number;
  evidence: string[];
  timeOffset: number;
  contributionScore: number;
}

export interface RootCauseResult {
  anomalyId: string;
  rootCauses: RootCause[];
  causalChain: string[];
  confidence: number;
  recommendations: string[];
}

export interface RootCauseReport {
  summary: string;
  statistics: {
    totalAnomalies: number;
    identifiedRootCauses: number;
    avgConfidence: number;
  };
  results: RootCauseResult[];
  generatedAt: number;
}

let anomalyCounter = 0;

/**
 * Detect anomalies in a parameter data series using z-score.
 * threshold controls sensitivity (number of standard deviations).
 */
export function detectAnomalies(
  data: ParameterDataPoint[],
  threshold: number = 2.0
): AnomalyEvent[] {
  if (data.length < 3) return [];

  const values = data.map((d) => d.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(
    values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length
  );

  if (stdDev === 0) return [];

  const anomalies: AnomalyEvent[] = [];
  for (const dp of data) {
    const zScore = Math.abs((dp.value - mean) / stdDev);
    if (zScore > threshold) {
      anomalyCounter++;
      anomalies.push({
        id: `anomaly_${anomalyCounter}`,
        parameterId: dp.parameterId,
        parameterName: dp.parameterName,
        timestamp: dp.timestamp,
        value: dp.value,
        expectedValue: mean,
        deviation: dp.value - mean,
        severity: zScore > 3 ? 'high' : zScore > 2 ? 'medium' : 'low',
        type: dp.value > mean ? 'spike' : 'dip',
      });
    }
  }

  return anomalies;
}

/**
 * Build a causal graph from multi-parameter data.
 * Returns an array of CausalRelation representing pairwise relationships.
 */
export function buildCausalGraph(
  data: Map<string, ParameterDataPoint[]>
): CausalRelation[] {
  const paramNames = Array.from(data.keys());
  const relations: CausalRelation[] = [];

  for (let i = 0; i < paramNames.length; i++) {
    for (let j = i + 1; j < paramNames.length; j++) {
      const dataA = data.get(paramNames[i])!;
      const dataB = data.get(paramNames[j])!;

      if (dataA.length < 2 || dataB.length < 2) continue;

      // Simple correlation approximation
      const minLen = Math.min(dataA.length, dataB.length);
      const valsA = dataA.slice(0, minLen).map((d) => d.value);
      const valsB = dataB.slice(0, minLen).map((d) => d.value);

      const meanA = valsA.reduce((a, b) => a + b, 0) / minLen;
      const meanB = valsB.reduce((a, b) => a + b, 0) / minLen;

      let cov = 0;
      let varA = 0;
      let varB = 0;
      for (let k = 0; k < minLen; k++) {
        cov += (valsA[k] - meanA) * (valsB[k] - meanB);
        varA += (valsA[k] - meanA) ** 2;
        varB += (valsB[k] - meanB) ** 2;
      }

      const denom = Math.sqrt(varA * varB);
      const correlation = denom === 0 ? 0 : Math.abs(cov / denom);

      if (correlation > 0.3) {
        relations.push({
          sourceParameter: paramNames[i],
          targetParameter: paramNames[j],
          correlation,
          lagTime: Math.abs(
            (dataA[0]?.timestamp ?? 0) - (dataB[0]?.timestamp ?? 0)
          ),
          confidence: Math.min(correlation + 0.1, 1),
        });
      }
    }
  }

  return relations;
}

/**
 * Trace the root cause of a specific anomaly event using causal relations.
 */
export function traceRootCause(
  anomaly: AnomalyEvent,
  data: Map<string, ParameterDataPoint[]>,
  relations: CausalRelation[]
): RootCauseResult {
  const rootCauses: RootCause[] = [];
  const causalChain: string[] = [anomaly.parameterName];

  // Walk backwards through relations to find potential root causes
  const visited = new Set<string>([anomaly.parameterName]);
  let frontier = [anomaly.parameterName];

  while (frontier.length > 0) {
    const nextFrontier: string[] = [];
    for (const current of frontier) {
      for (const rel of relations) {
        const upstream =
          rel.targetParameter === current
            ? rel.sourceParameter
            : rel.sourceParameter === current
              ? rel.targetParameter
              : null;

        if (upstream && !visited.has(upstream)) {
          visited.add(upstream);
          nextFrontier.push(upstream);
          causalChain.push(upstream);

          rootCauses.push({
            parameterName: upstream,
            probability: rel.correlation,
            evidence: ['时间序列相关性', '因果链追溯'],
            timeOffset: rel.lagTime,
            contributionScore: rel.confidence,
          });
        }
      }
    }
    frontier = nextFrontier;
  }

  // Sort root causes by probability descending
  rootCauses.sort((a, b) => b.probability - a.probability);

  const avgConfidence =
    rootCauses.length > 0
      ? rootCauses.reduce((acc, rc) => acc + rc.probability, 0) /
        rootCauses.length
      : 0;

  return {
    anomalyId: anomaly.id,
    rootCauses,
    causalChain,
    confidence: avgConfidence,
    recommendations: rootCauses.map(
      (rc) => `检查${rc.parameterName}相关设备`
    ),
  };
}

/**
 * Generate a root cause analysis report from a list of trace results.
 */
export function generateRootCauseReport(
  results: RootCauseResult[]
): RootCauseReport {
  const totalAnomalies = results.length;
  const identifiedRootCauses = results.reduce(
    (acc, r) => acc + r.rootCauses.length,
    0
  );
  const avgConfidence =
    totalAnomalies > 0
      ? results.reduce((acc, r) => acc + r.confidence, 0) / totalAnomalies
      : 0;

  return {
    summary: `共分析 ${totalAnomalies} 个异常事件，识别 ${identifiedRootCauses} 个潜在根因`,
    statistics: {
      totalAnomalies,
      identifiedRootCauses,
      avgConfidence,
    },
    results,
    generatedAt: Date.now(),
  };
}
