/**
 * Design AI Suggestion Service
 *
 * Queries historical project stations from DB, finds similar cases by workpiece
 * specs / station type, and returns parameter suggestions with confidence scores.
 *
 * Two modes:
 * 1. Historical case matching — pure DB similarity query
 * 2. LLM-enhanced — optional AI reasoning over matched cases
 */

import { eq, and, sql, desc } from "drizzle-orm";
import { requireDb } from "../db";
import { equipmentStations, type MechanicalParams, type ElectricalParams } from "../../drizzle/design-engine-schema";
import { invokeLLM } from "../_core/llm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("design-ai-suggestion");

// ── Types ───────────────────────────────────────────────────────────────

export interface WorkpieceContext {
  length: number;  // mm
  width: number;   // mm
  height: number;  // mm
  weight: number;  // kg
  material: string;
}

export interface HistoricalCase {
  projectId: number;
  stationCode: string;
  stationType: string;
  stationName: string;
  mechanicalParams: Partial<MechanicalParams>;
  electricalParams: Partial<ElectricalParams>;
  similarity: number;  // 0-1
  matchReasons: string[];
}

export interface ParameterSuggestion {
  paramKey: string;
  paramLabel: string;
  currentValue: number | string | undefined;
  formulaValue: number | string | undefined;   // from engineering sizing
  suggestedValue: number | string | undefined;  // from AI/historical
  confidence: number;                           // 0-1
  source: "historical" | "ai" | "formula";
  sourceDetail: string;                         // e.g. "Project #3 ST04 (85% similar)"
  explanation: string;                          // why this value
}

export interface AiSizingSuggestionResult {
  stationType: string;
  stationCode: string;
  historicalCases: HistoricalCase[];
  suggestions: ParameterSuggestion[];
  aiReasoning?: string;  // optional LLM explanation
}

// ── Similarity Scoring ──────────────────────────────────────────────────

/**
 * Calculate similarity between workpiece context and a historical station's parameters.
 * Score range: 0.0 – 1.0
 */
function calculateSimilarity(
  workpiece: WorkpieceContext,
  stationType: string,
  historicalStation: {
    stationType: string;
    mechanicalParams: Partial<MechanicalParams>;
    weightCapacity?: number;
  },
): { score: number; reasons: string[] } {
  let totalWeight = 0;
  let weightedScore = 0;
  const reasons: string[] = [];

  // Factor 1: Station type match (weight: 40%)
  const typeWeight = 40;
  if (historicalStation.stationType === stationType) {
    weightedScore += typeWeight;
    reasons.push("工位类型完全匹配");
  } else {
    // Partial match for same category
    const sameCategory = getCategory(stationType) === getCategory(historicalStation.stationType);
    if (sameCategory) {
      weightedScore += typeWeight * 0.5;
      reasons.push("工位类别相同");
    }
  }
  totalWeight += typeWeight;

  // Factor 2: Tank volume proximity (weight: 20%)
  const mp = historicalStation.mechanicalParams;
  if (mp.tankVolume && mp.tankVolume > 0) {
    const volumeWeight = 20;
    // Estimate expected tank volume from workpiece
    const expectedVol = (workpiece.length * 1.5 * workpiece.width * 1.5 * (workpiece.height + 180)) / 1e6;
    const ratio = Math.min(mp.tankVolume, expectedVol) / Math.max(mp.tankVolume, expectedVol);
    weightedScore += volumeWeight * ratio;
    if (ratio > 0.7) reasons.push(`槽体容积接近 (${mp.tankVolume}L vs 预期${Math.round(expectedVol)}L)`);
    totalWeight += volumeWeight;
  }

  // Factor 3: Weight capacity proximity (weight: 15%)
  const capacity = mp.weightCapacity || historicalStation.weightCapacity;
  if (capacity && capacity > 0) {
    const capWeight = 15;
    const expectedCap = workpiece.weight * 1.5;
    const ratio = Math.min(capacity, expectedCap) / Math.max(capacity, expectedCap);
    weightedScore += capWeight * ratio;
    if (ratio > 0.6) reasons.push(`承重匹配 (${capacity}kg vs 需求${Math.round(expectedCap)}kg)`);
    totalWeight += capWeight;
  }

  // Factor 4: Material compatibility (weight: 15%)
  const matWeight = 15;
  if (mp.tankMaterial) {
    const materialScore = getMaterialCompatibilityScore(workpiece.material, mp.tankMaterial);
    weightedScore += matWeight * materialScore;
    if (materialScore > 0.7) reasons.push(`材质兼容 (${mp.tankMaterial})`);
  } else {
    weightedScore += matWeight * 0.5; // neutral if unknown
  }
  totalWeight += matWeight;

  // Factor 5: Dimensional scale proximity (weight: 10%)
  if (mp.tankLength && mp.tankWidth) {
    const dimWeight = 10;
    const wpVolume = workpiece.length * workpiece.width * workpiece.height;
    // Estimate historical workpiece volume from tank (tank ≈ wp × 1.5 each dim)
    const histWpVol = (mp.tankLength / 1.5) * (mp.tankWidth / 1.5) * ((mp.tankHeight || 500) / 1.5);
    const ratio = Math.min(wpVolume, histWpVol) / Math.max(wpVolume, histWpVol);
    weightedScore += dimWeight * Math.pow(ratio, 0.5); // sqrt to soften
    totalWeight += dimWeight;
  }

  const finalScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

  return { score: Math.round(finalScore * 100) / 100, reasons };
}

function getCategory(stationType: string): string {
  const categories: Record<string, string> = {
    ULTRASONIC: "cleaning", PRE_WASH: "cleaning", RINSE: "cleaning",
    DI_RINSE: "cleaning", PASSIVATION: "cleaning", DEGREASING: "cleaning",
    TURBULENCE: "cleaning", SPRAY: "spray", ROBOT_CLEAN: "spray",
    AIR_KNIFE: "drying", HOT_AIR_DRY: "drying", VACUUM_DRY: "drying",
    COOLDOWN: "drying", LOADING: "handling", UNLOADING: "handling",
    TRANSFER: "handling", INSPECTION: "inspection",
  };
  return categories[stationType] || "other";
}

function getMaterialCompatibilityScore(workpieceMaterial: string, tankMaterial: string): number {
  // Higher score when tank material is appropriate for the workpiece material
  const compatMap: Record<string, Record<string, number>> = {
    aluminum_alloy: { SUS304: 0.9, SUS316L: 1.0, PP: 0.7, PVDF: 0.6 },
    cast_iron:      { SUS304: 0.8, SUS316L: 0.9, PP: 0.5, PVDF: 0.4 },
    steel:          { SUS304: 0.9, SUS316L: 1.0, PP: 0.5, PVDF: 0.4 },
    brass:          { SUS304: 0.7, SUS316L: 1.0, PP: 0.8, PVDF: 0.7 },
    plastic:        { SUS304: 0.8, SUS316L: 0.8, PP: 1.0, PVDF: 0.9 },
  };
  return compatMap[workpieceMaterial]?.[tankMaterial] ?? 0.5;
}

// ── Historical Case Query ───────────────────────────────────────────────

/**
 * Query historical stations from DB and rank by similarity.
 * Returns top N most similar cases for a given station type + workpiece context.
 */
export async function findSimilarCases(
  stationType: string,
  workpiece: WorkpieceContext,
  limit: number = 5,
  excludeProjectId?: number,
): Promise<HistoricalCase[]> {
  const db = await requireDb();

  // Query stations of same type or same category, ordered by most recent
  const category = getCategory(stationType);
  const sameCategory = Object.entries({
    ULTRASONIC: "cleaning", PRE_WASH: "cleaning", RINSE: "cleaning",
    DI_RINSE: "cleaning", PASSIVATION: "cleaning", DEGREASING: "cleaning",
    TURBULENCE: "cleaning", SPRAY: "spray", ROBOT_CLEAN: "spray",
    AIR_KNIFE: "drying", HOT_AIR_DRY: "drying", VACUUM_DRY: "drying",
    COOLDOWN: "drying", LOADING: "handling", UNLOADING: "handling",
    TRANSFER: "handling", INSPECTION: "inspection",
  }).filter(([, cat]) => cat === category).map(([type]) => type);

  // Build WHERE clause
  const conditions = [];
  if (sameCategory.length > 0) {
    conditions.push(sql`${equipmentStations.stationType} IN (${sql.join(sameCategory.map(t => sql`${t}`), sql`, `)})`);
  }
  if (excludeProjectId) {
    conditions.push(sql`${equipmentStations.projectId} != ${excludeProjectId}`);
  }

  const whereClause = conditions.length > 0
    ? sql`${sql.join(conditions, sql` AND `)}`
    : undefined;

  const rows = await db.select().from(equipmentStations)
    .where(whereClause)
    .orderBy(desc(equipmentStations.createdAt))
    .limit(200); // fetch more to score and filter

  // Score and rank
  const scored = rows.map(row => {
    const mp = (row.mechanicalParams || {}) as Partial<MechanicalParams>;
    const { score, reasons } = calculateSimilarity(workpiece, stationType, {
      stationType: row.stationType,
      mechanicalParams: mp,
      weightCapacity: mp.weightCapacity,
    });
    return {
      projectId: row.projectId,
      stationCode: row.stationCode,
      stationType: row.stationType,
      stationName: row.stationName,
      mechanicalParams: mp,
      electricalParams: (row.electricalParams || {}) as Partial<ElectricalParams>,
      similarity: score,
      matchReasons: reasons,
    };
  });

  // Sort by similarity desc, return top N
  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, limit).filter(c => c.similarity > 0.3); // min 30% similarity
}

// ── Parameter Suggestion Generation ─────────────────────────────────────

const PARAM_LABELS: Record<string, string> = {
  tankLength: "槽体长度(mm)", tankWidth: "槽体宽度(mm)", tankHeight: "槽体高度(mm)",
  tankVolume: "槽体容积(L)", tankMaterial: "槽体材质", pumpType: "泵类型",
  pumpFlowRate: "泵流量(L/min)", pumpHead: "扬程(m)", heaterPower: "加热功率(kW)",
  ultrasonicFrequency: "超声频率(kHz)", ultrasonicPower: "超声功率(W)",
  transducerCount: "振子数量", filtrationMicron: "过滤精度(μm)",
  nozzleType: "喷嘴类型", nozzleCount: "喷嘴数量", sprayPressure: "喷淋压力(bar)",
  conveyorType: "输送类型", conveyorSpeed: "输送速度(m/min)",
  dryingTemp: "干燥温度(°C)", dryingAirflow: "风量(m³/h)", vacuumLevel: "真空度(mbar)",
  weightCapacity: "承重(kg)",
  plcDI: "DI数字输入", plcDO: "DO数字输出", plcAI: "AI模拟输入", plcAO: "AO模拟输出",
  motorCount: "电机数量", motorTotalPower: "电机总功率(kW)", sensorCount: "传感器数量",
  heaterCircuits: "加热回路", heaterTotalPower: "加热总功率(kW)",
};

/**
 * Generate parameter suggestions by aggregating historical cases.
 * For numeric params: weighted average by similarity.
 * For string params: mode (most common value).
 */
export function generateSuggestionsFromCases(
  stationType: string,
  cases: HistoricalCase[],
  currentParams: Partial<MechanicalParams>,
  formulaParams: Partial<MechanicalParams>,
): ParameterSuggestion[] {
  if (cases.length === 0) return [];

  const suggestions: ParameterSuggestion[] = [];
  const allKeys = new Set<string>();

  // Collect all parameter keys from cases
  for (const c of cases) {
    for (const key of Object.keys(c.mechanicalParams)) {
      if (c.mechanicalParams[key as keyof MechanicalParams] != null) allKeys.add(key);
    }
  }

  for (const key of allKeys) {
    const label = PARAM_LABELS[key] || key;
    const currentVal = currentParams[key as keyof MechanicalParams];
    const formulaVal = formulaParams[key as keyof MechanicalParams];

    // Get values from cases
    const caseValues = cases
      .filter(c => c.mechanicalParams[key as keyof MechanicalParams] != null)
      .map(c => ({
        value: c.mechanicalParams[key as keyof MechanicalParams]!,
        similarity: c.similarity,
        source: `项目#${c.projectId} ${c.stationCode}`,
      }));

    if (caseValues.length === 0) continue;

    // Check if numeric or string
    const firstVal = caseValues[0].value;
    if (typeof firstVal === "number") {
      // Weighted average by similarity
      const totalWeight = caseValues.reduce((sum, cv) => sum + cv.similarity, 0);
      const weightedAvg = totalWeight > 0
        ? caseValues.reduce((sum, cv) => sum + (cv.value as number) * cv.similarity, 0) / totalWeight
        : firstVal;
      const roundedAvg = Math.round(weightedAvg * 10) / 10;

      // Confidence = average similarity × case count factor (more cases = higher confidence)
      const countFactor = Math.min(1, caseValues.length / 3); // saturates at 3 cases
      const avgSimilarity = totalWeight / caseValues.length;
      const confidence = Math.round(avgSimilarity * countFactor * 100) / 100;

      // Best matching source
      const bestCase = caseValues.reduce((best, cv) => cv.similarity > best.similarity ? cv : best, caseValues[0]);

      suggestions.push({
        paramKey: key,
        paramLabel: label,
        currentValue: currentVal as number | string | undefined,
        formulaValue: formulaVal as number | string | undefined,
        suggestedValue: roundedAvg,
        confidence,
        source: "historical",
        sourceDetail: `${bestCase.source} (${Math.round(bestCase.similarity * 100)}%相似) 等${caseValues.length}个案例`,
        explanation: `基于${caseValues.length}个历史案例加权平均: ${caseValues.map(cv => `${cv.source}=${cv.value}`).slice(0, 3).join(", ")}`,
      });
    } else {
      // String param: mode (most frequent)
      const freq: Record<string, { count: number; totalSim: number; source: string }> = {};
      for (const cv of caseValues) {
        const v = String(cv.value);
        if (!freq[v]) freq[v] = { count: 0, totalSim: 0, source: cv.source };
        freq[v].count++;
        freq[v].totalSim += cv.similarity;
      }
      const mode = Object.entries(freq).sort((a, b) => b[1].totalSim - a[1].totalSim)[0];

      suggestions.push({
        paramKey: key,
        paramLabel: label,
        currentValue: currentVal as number | string | undefined,
        formulaValue: formulaVal as number | string | undefined,
        suggestedValue: mode[0],
        confidence: Math.round((mode[1].totalSim / caseValues.length) * 100) / 100,
        source: "historical",
        sourceDetail: `${mode[1].source} 等${mode[1].count}个案例一致选用`,
        explanation: `${mode[1].count}/${caseValues.length}个案例选用 "${mode[0]}"`,
      });
    }
  }

  // Sort by confidence desc
  suggestions.sort((a, b) => b.confidence - a.confidence);
  return suggestions;
}

// ── LLM-Enhanced Suggestions ────────────────────────────────────────────

/**
 * Use LLM to analyze historical cases and provide reasoning for parameter choices.
 * This is optional — falls back to pure historical suggestions if LLM fails.
 */
export async function getAiEnhancedSuggestions(
  stationType: string,
  stationName: string,
  workpiece: WorkpieceContext,
  cases: HistoricalCase[],
  currentParams: Partial<MechanicalParams>,
  formulaParams: Partial<MechanicalParams>,
): Promise<{ reasoning: string; adjustments: Record<string, number | string> }> {
  const casesSummary = cases.slice(0, 3).map(c =>
    `项目#${c.projectId} ${c.stationCode} (${c.stationName}, 相似度${Math.round(c.similarity * 100)}%): ` +
    Object.entries(c.mechanicalParams)
      .filter(([, v]) => v != null)
      .map(([k, v]) => `${PARAM_LABELS[k] || k}=${v}`)
      .join(", ")
  ).join("\n");

  const prompt = `你是GRT非标清洗设备总工程师，请根据历史案例和工程公式结果，给出${stationName}(${stationType})的优化参数建议。

## 工件信息
- 尺寸: ${workpiece.length}×${workpiece.width}×${workpiece.height}mm
- 重量: ${workpiece.weight}kg
- 材质: ${workpiece.material}

## 工程公式计算结果
${Object.entries(formulaParams).filter(([, v]) => v != null).map(([k, v]) => `- ${PARAM_LABELS[k] || k}: ${v}`).join("\n")}

## 历史案例
${casesSummary || "无历史案例"}

## 当前参数
${Object.entries(currentParams).filter(([, v]) => v != null).map(([k, v]) => `- ${PARAM_LABELS[k] || k}: ${v}`).join("\n")}

请输出 JSON:
{
  "reasoning": "分析说明（中文，2-3句话，说明参数选择理由和与历史案例的对比）",
  "adjustments": { "参数key": 调整值, ... }  // 仅列出需要调整的参数
}

注意：
1. 如果工程公式结果合理且与历史案例一致，adjustments可以为空
2. 只在有充分理由时才建议调整（如工件特征需要特殊处理）
3. 参数值必须是工程合理的数值`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "你是工业清洗设备总工程师。返回合法JSON。" },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "ai_suggestion",
          strict: true,
          schema: {
            type: "object",
            properties: {
              reasoning: { type: "string" },
              adjustments: { type: "object", additionalProperties: true, properties: {} },
            },
            required: ["reasoning", "adjustments"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return { reasoning: "", adjustments: {} };
    return JSON.parse(content);
  } catch (err: any) {
    log.warn({ err }, "AI suggestion LLM call failed, using historical data only");
    return { reasoning: "AI分析暂不可用，已使用历史案例数据", adjustments: {} };
  }
}
