/**
 * Heatmap Comparison Service
 * Manages cleaning test history, overlay data generation, comparison analysis, and report export.
 */

export interface HeatmapDataPoint {
  x: number;
  y: number;
  z: number;
  pressure: number;
  intensity: number;
  action: string;
  timestamp: number;
}

export interface CleaningTestRecord {
  id: string;
  testDate: Date;
  featureType: string;
  partNumber: string;
  projectId: string;
  engineerId: string;
  heatmapData: HeatmapDataPoint[];
  avgPressure: number;
  maxPressure: number;
  coveragePercentage: number;
  cleaningResult: string;
}

export interface ComparisonAnalysis {
  testIds: string[];
  pressureDifference: number;
  coverageDifference: number;
  improvementTrend: "improving" | "declining" | "stable";
}

export interface ComparisonReport {
  summary: string;
  details: string;
}

export async function getCleaningTestHistory(params: {
  featureType?: string;
  limit?: number;
}): Promise<CleaningTestRecord[]> {
  return [];
}

export function generateOverlayData(
  records: CleaningTestRecord[],
  options: { mode: string; opacity: number; colorScale: string }
): HeatmapDataPoint[] {
  if (records.length === 0) return [];

  // Average heatmap points from all records
  const allPoints: HeatmapDataPoint[] = [];
  for (const record of records) {
    for (const point of record.heatmapData) {
      allPoints.push({ ...point });
    }
  }
  return allPoints;
}

export function analyzeComparison(records: CleaningTestRecord[]): ComparisonAnalysis {
  const testIds = records.map((r) => r.id);
  let pressureDifference = 0;
  let coverageDifference = 0;
  let improvementTrend: "improving" | "declining" | "stable" = "stable";

  if (records.length >= 2) {
    const first = records[0];
    const last = records[records.length - 1];
    pressureDifference = last.avgPressure - first.avgPressure;
    coverageDifference = last.coveragePercentage - first.coveragePercentage;

    if (coverageDifference > 0) {
      improvementTrend = "improving";
    } else if (coverageDifference < 0) {
      improvementTrend = "declining";
    }
  }

  return {
    testIds,
    pressureDifference,
    coverageDifference,
    improvementTrend,
  };
}

export function exportComparisonReport(
  records: CleaningTestRecord[],
  analysis: ComparisonAnalysis
): ComparisonReport {
  return {
    summary: `比较了 ${records.length} 次测试，压力差异: ${analysis.pressureDifference}，覆盖率差异: ${analysis.coverageDifference}%`,
    details: `趋势: ${analysis.improvementTrend}, 测试ID: ${analysis.testIds.join(", ")}`,
  };
}
