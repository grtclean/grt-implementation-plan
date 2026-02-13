/**
 * Toothpaste Test Report Service
 * Analyzes cleaning test results and generates improvement suggestions.
 */

export interface InspectionArea {
  areaId: string;
  areaName: string;
  featureType: string;
  position: { x: number; y: number };
  beforeCleaning: { coverage: number };
  afterCleaning: { residueRate: number };
  result: "pass" | "fail";
  threshold: number;
}

export interface Suggestion {
  areaId: string;
  areaName: string;
  suggestion: string;
  residueRate: number;
  threshold: number;
}

export function calculateOverallPassRate(areas: InspectionArea[]): number {
  if (areas.length === 0) return 0;
  const passedCount = areas.filter((a) => a.result === "pass").length;
  return Math.round((passedCount / areas.length) * 10000) / 100;
}

export function determineOverallResult(
  passRate: number,
  areas: InspectionArea[]
): "pass" | "fail" {
  if (areas.every((a) => a.result === "pass")) {
    return "pass";
  }
  return "fail";
}

export function analyzeTestResultsAndGenerateSuggestions(
  areas: InspectionArea[]
): Suggestion[] {
  const failedAreas = areas.filter((a) => a.result === "fail");
  return failedAreas.map((area) => ({
    areaId: area.areaId,
    areaName: area.areaName,
    suggestion: `调整${area.areaName}的清洗参数，当前残留率${area.afterCleaning.residueRate}%超过阈值${area.threshold}%`,
    residueRate: area.afterCleaning.residueRate,
    threshold: area.threshold,
  }));
}
