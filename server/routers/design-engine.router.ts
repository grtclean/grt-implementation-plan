/**
 * M3 Design Automation Engine Router
 *
 * Core capabilities:
 * 1. Station CRUD — manage equipment stations (ST1-ST15) per project
 * 2. AI Station Decomposition — async worker decomposes P2 proposals into stations
 * 3. SolidWorks Bridge — generate VBA macros for parametric CAD modeling
 * 4. EPLAN Bridge — generate XML/Excel for electrical schematic auto-generation
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { eq, and, sql, SQL, desc } from "drizzle-orm";
import {
  equipmentStations, designExportLogs, stationTypeEnum, exportFormatEnum, exportStatusEnum,
  type MechanicalParams, type ElectricalParams,
} from "../../drizzle/design-engine-schema";
import type { AlarmDef } from "../services/plc-brands/types";
import { bomMasters, bomItems } from "../../drizzle/bom-schema";
import { submitTask, getTaskStatus } from "../services/task-worker.service";
import { registerTaskHandler } from "../services/task-worker.service";
import { invokeLLM } from "../_core/llm";
import { createChildLogger } from "../lib/logger";
import { sizeStation, type WorkpieceSpec, type CleanlinessRequirement, type ProcessRequirement } from "../services/engineering-sizing.service";
import { generateSolidWorksVBA as generateEnhancedVBA, type StationData } from "../services/solidworks-vba.service";
import { mapProjectToBom, mapStationToBomComponents } from "../services/station-bom-mapping.service";
import { getStationStandards, getSizingExplanation, validateAgainstStandards } from "../services/design-standards.service";
import { findSimilarCases, generateSuggestionsFromCases, getAiEnhancedSuggestions, type WorkpieceContext } from "../services/design-ai-suggestion.service";
import { reviewProject, generateCommissioningGuide as genGuide, commissioningGuideToMarkdown } from "../services/design-review.service";
import { checkDesignConflicts, assertNoBlockingConflicts } from "../services/design-conflict-check.service";

// PLC Architecture Engine imports
import {
  plcProjects, plcProgramModules, plcIoMappings, plcAlarmDefinitions,
  plcUserAccessLevels, plcVersionHistory, plcEplanSchematics,
  type PlcAccessPermissions, type PlcBrand, type PlcModuleType, type PlcProgramStatus,
} from "../../drizzle/plc-program-schema";
import {
  generateProgramArchitecture, generateIoMappings as genIoMap,
  generateAlarmDefinitions as genAlarms, generateDefaultAccessLevels,
  generateLogicDiagram, generateModeStateDiagram, generateTroubleshootingGuide,
  type StationInfo, type ProgramModule, type IoMappingEntry,
} from "../services/plc-architecture.service";
import { generateModuleCode, generateAllModuleCode } from "../services/plc-code-generator.service";
import { promoteVersion, verifyProductionIntegrity, assertNotFrozen } from "../services/plc-version-promotion.service";
import { generateAllSchematics, generateCableSchedule, type EplanProjectSpec } from "../services/eplan-circuit.service";
import { getAdapter } from "../services/plc-brands/types";
// Ensure brand adapters are registered
import "../services/plc-brands/siemens-s7.adapter";
import "../services/plc-brands/abb-ac500.adapter";
import "../services/plc-brands/inovance.adapter";
import "../services/plc-brands/mitsubishi-iqr.adapter";
import "../services/plc-brands/omron-nj.adapter";

const log = createChildLogger("design-engine");

type StationType = typeof stationTypeEnum.enumValues[number];
type ExportFormat = typeof exportFormatEnum.enumValues[number];
type ExportStatus = typeof exportStatusEnum.enumValues[number];

interface DecomposeTaskInput {
  projectId: number;
  proposalId?: number;
  proposalSummary?: string;
  workpieceInfo?: string;
  cleanlinessRequirement?: string;
  cycleTimeTarget?: number;
  preferredCleaningType?: string;
  buCode?: string;
  createdBy?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Station type metadata (for AI & frontend)
// ═══════════════════════════════════════════════════════════════════════════

const STATION_TYPE_META: Record<string, {
  nameZh: string; nameEn: string; category: "cleaning" | "drying" | "handling" | "inspection";
  defaultMechParams: Partial<MechanicalParams>;
  defaultElecParams: Partial<ElectricalParams>;
}> = {
  LOADING:      { nameZh: "上料工位", nameEn: "Loading Station", category: "handling",
    defaultMechParams: { conveyorType: "roller", conveyorSpeed: 3, weightCapacity: 200 },
    defaultElecParams: { plcDI: 8, plcDO: 6, plcAI: 0, plcAO: 0, motorCount: 1, motorTotalPower: 0.75, sensorCount: 4 } },
  PRE_WASH:     { nameZh: "预清洗", nameEn: "Pre-Wash", category: "cleaning",
    defaultMechParams: { tankLength: 1200, tankWidth: 800, tankHeight: 900, tankVolume: 600, tankMaterial: "SUS304", pumpType: "centrifugal", pumpFlowRate: 200, pumpHead: 15, heaterPower: 12 },
    defaultElecParams: { plcDI: 12, plcDO: 8, plcAI: 4, plcAO: 2, motorCount: 2, motorTotalPower: 5.5, sensorCount: 6, heaterCircuits: 2, heaterTotalPower: 12 } },
  ULTRASONIC:   { nameZh: "超声波清洗", nameEn: "Ultrasonic Cleaning", category: "cleaning",
    defaultMechParams: { tankLength: 1200, tankWidth: 800, tankHeight: 900, tankVolume: 600, tankMaterial: "SUS316L", ultrasonicFrequency: 28, ultrasonicPower: 3000, transducerCount: 24, heaterPower: 18, filtrationMicron: 25 },
    defaultElecParams: { plcDI: 14, plcDO: 10, plcAI: 6, plcAO: 2, motorCount: 1, motorTotalPower: 2.2, sensorCount: 8, heaterCircuits: 3, heaterTotalPower: 18, safetyInterlocks: ["liquid_level_low", "over_temperature"] } },
  SPRAY:        { nameZh: "高压喷淋", nameEn: "High-Pressure Spray", category: "cleaning",
    defaultMechParams: { tankLength: 1000, tankWidth: 800, tankHeight: 1200, tankMaterial: "SUS304", nozzleType: "flat-fan", nozzleCount: 16, sprayPressure: 8, pumpType: "centrifugal", pumpFlowRate: 300, pumpHead: 25 },
    defaultElecParams: { plcDI: 10, plcDO: 8, plcAI: 4, plcAO: 2, motorCount: 2, motorTotalPower: 7.5, sensorCount: 6 } },
  TURBULENCE:   { nameZh: "湍流清洗", nameEn: "Turbulence Wash", category: "cleaning",
    defaultMechParams: { tankLength: 1200, tankWidth: 800, tankHeight: 900, tankVolume: 600, tankMaterial: "SUS316L", pumpType: "centrifugal", pumpFlowRate: 500, pumpHead: 20, agitationType: "mechanical", filtrationMicron: 10 },
    defaultElecParams: { plcDI: 12, plcDO: 8, plcAI: 4, plcAO: 2, motorCount: 3, motorTotalPower: 11, sensorCount: 7 } },
  ROBOT_CLEAN:  { nameZh: "机器人清洗", nameEn: "Robot Cleaning", category: "cleaning",
    defaultMechParams: { nozzleType: "full-cone", nozzleCount: 6, sprayPressure: 12, pumpType: "centrifugal", pumpFlowRate: 150, pumpHead: 30 },
    defaultElecParams: { plcDI: 20, plcDO: 16, plcAI: 8, plcAO: 4, motorCount: 7, motorTotalPower: 15, sensorCount: 12, communicationProtocol: "PROFINET" } },
  RINSE:        { nameZh: "漂洗", nameEn: "Rinse", category: "cleaning",
    defaultMechParams: { tankLength: 1200, tankWidth: 800, tankHeight: 900, tankVolume: 600, tankMaterial: "SUS304", pumpType: "centrifugal", pumpFlowRate: 150, pumpHead: 10 },
    defaultElecParams: { plcDI: 8, plcDO: 6, plcAI: 3, plcAO: 1, motorCount: 1, motorTotalPower: 1.5, sensorCount: 4 } },
  DI_RINSE:     { nameZh: "纯水漂洗", nameEn: "DI Water Rinse", category: "cleaning",
    defaultMechParams: { tankLength: 1200, tankWidth: 800, tankHeight: 900, tankVolume: 600, tankMaterial: "SUS316L", pumpType: "centrifugal", pumpFlowRate: 100, pumpHead: 10, filtrationMicron: 1 },
    defaultElecParams: { plcDI: 10, plcDO: 6, plcAI: 4, plcAO: 1, motorCount: 1, motorTotalPower: 1.5, sensorCount: 6 } },
  PASSIVATION:  { nameZh: "钝化/防锈", nameEn: "Passivation", category: "cleaning",
    defaultMechParams: { tankLength: 1200, tankWidth: 800, tankHeight: 900, tankVolume: 600, tankMaterial: "SUS316L", heaterPower: 9 },
    defaultElecParams: { plcDI: 8, plcDO: 6, plcAI: 3, plcAO: 1, motorCount: 1, motorTotalPower: 1.5, sensorCount: 5, heaterCircuits: 1, heaterTotalPower: 9 } },
  DEGREASING:   { nameZh: "脱脂", nameEn: "Degreasing", category: "cleaning",
    defaultMechParams: { tankLength: 1200, tankWidth: 800, tankHeight: 900, tankVolume: 600, tankMaterial: "SUS304", heaterPower: 18, pumpType: "centrifugal", pumpFlowRate: 200, pumpHead: 12, filtrationMicron: 50 },
    defaultElecParams: { plcDI: 12, plcDO: 8, plcAI: 4, plcAO: 2, motorCount: 2, motorTotalPower: 4.5, sensorCount: 6, heaterCircuits: 3, heaterTotalPower: 18 } },
  AIR_KNIFE:    { nameZh: "切风", nameEn: "Air Knife", category: "drying",
    defaultMechParams: { dryingAirflow: 1500 },
    defaultElecParams: { plcDI: 6, plcDO: 4, plcAI: 2, plcAO: 1, motorCount: 1, motorTotalPower: 5.5, sensorCount: 3 } },
  HOT_AIR_DRY:  { nameZh: "热风干燥", nameEn: "Hot Air Drying", category: "drying",
    defaultMechParams: { dryingTemp: 80, dryingAirflow: 3000, heaterPower: 24 },
    defaultElecParams: { plcDI: 10, plcDO: 6, plcAI: 4, plcAO: 2, motorCount: 2, motorTotalPower: 7.5, sensorCount: 6, heaterCircuits: 4, heaterTotalPower: 24 } },
  VACUUM_DRY:   { nameZh: "真空干燥", nameEn: "Vacuum Drying", category: "drying",
    defaultMechParams: { dryingTemp: 60, vacuumLevel: 50, heaterPower: 12 },
    defaultElecParams: { plcDI: 14, plcDO: 10, plcAI: 6, plcAO: 2, motorCount: 2, motorTotalPower: 11, sensorCount: 8, heaterCircuits: 2, heaterTotalPower: 12, safetyInterlocks: ["vacuum_loss", "over_temperature", "door_open"] } },
  COOLDOWN:     { nameZh: "冷却", nameEn: "Cooldown", category: "drying",
    defaultMechParams: { dryingTemp: 25, dryingAirflow: 2000 },
    defaultElecParams: { plcDI: 6, plcDO: 4, plcAI: 2, plcAO: 1, motorCount: 1, motorTotalPower: 3, sensorCount: 3 } },
  INSPECTION:   { nameZh: "检测工位", nameEn: "Inspection Station", category: "inspection",
    defaultMechParams: {},
    defaultElecParams: { plcDI: 10, plcDO: 6, plcAI: 8, plcAO: 0, sensorCount: 10, communicationProtocol: "PROFINET" } },
  UNLOADING:    { nameZh: "下料工位", nameEn: "Unloading Station", category: "handling",
    defaultMechParams: { conveyorType: "roller", conveyorSpeed: 3, weightCapacity: 200 },
    defaultElecParams: { plcDI: 8, plcDO: 6, plcAI: 0, plcAO: 0, motorCount: 1, motorTotalPower: 0.75, sensorCount: 4 } },
  TRANSFER:     { nameZh: "转运/翻转", nameEn: "Transfer / Rotate", category: "handling",
    defaultMechParams: { conveyorType: "hoist", conveyorSpeed: 5, weightCapacity: 500 },
    defaultElecParams: { plcDI: 12, plcDO: 8, plcAI: 2, plcAO: 2, motorCount: 3, motorTotalPower: 7.5, sensorCount: 8, safetyInterlocks: ["overload", "limit_switch_up", "limit_switch_down"] } },
};

// ═══════════════════════════════════════════════════════════════════════════
// AI Task Handler: M3_STATION_DECOMPOSE
// ═══════════════════════════════════════════════════════════════════════════

registerTaskHandler("M3_STATION_DECOMPOSE", async (_taskId, input) => {
  const { projectId, proposalId, proposalSummary, workpieceInfo, cleanlinessRequirement, cycleTimeTarget, preferredCleaningType } = input as unknown as DecomposeTaskInput;

  const prompt = `你是 GRT 非标清洗设备资深总工程师，拥有20年超声波/高压喷淋/真空干燥清洗线设计经验。

请根据以下 P2 阶段方案摘要，将该清洗设备拆解为具体工位序列（ST01~ST15，不超过15个工位）。

## 客户技术需求
- 工件信息: ${workpieceInfo || "未提供"}
- 清洁度要求: ${cleanlinessRequirement || "未提供"}
- 节拍要求: ${cycleTimeTarget || "未提供"} 秒/件
- 推荐清洗方式: ${preferredCleaningType || "超声波+喷淋"}

## P2 方案摘要
${proposalSummary || "暂无"}

## 输出要求
返回 JSON 数组，每个工位包含：
- stationCode: "ST01"~"ST15"
- stationName: 中文工位名称（如"超声波粗洗"）
- stationNameEn: 英文名称
- stationType: 从以下选择一个: LOADING, PRE_WASH, ULTRASONIC, SPRAY, TURBULENCE, ROBOT_CLEAN, RINSE, DI_RINSE, PASSIVATION, DEGREASING, AIR_KNIFE, HOT_AIR_DRY, VACUUM_DRY, COOLDOWN, INSPECTION, UNLOADING, TRANSFER
- cycleTime: 该工位节拍（秒）
- mechanicalParams: { tankLength(mm), tankWidth(mm), tankHeight(mm), tankVolume(L), tankMaterial, pumpType, pumpFlowRate(L/min), pumpHead(m), heaterPower(kW), ultrasonicFrequency(kHz), ultrasonicPower(W), transducerCount, filtrationMicron, nozzleType, nozzleCount, sprayPressure(bar), conveyorType, conveyorSpeed(m/min), dryingTemp(°C), dryingAirflow(m³/h), vacuumLevel(mbar), weightCapacity(kg) }
- electricalParams: { plcDI, plcDO, plcAI, plcAO, motorCount, motorTotalPower(kW), sensorCount, heaterCircuits, heaterTotalPower(kW), safetyInterlocks[], communicationProtocol }
- description: 设计说明

确保：
1. 工位顺序合理（上料→清洗→干燥→检测→下料）
2. 各工位节拍总和应配合目标节拍
3. 参数数值必须是实际可行的工程数值（非随机数）
4. 材质选择考虑化学兼容性（如强酸环境用SUS316L或PP）`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "你是工业清洗设备总工程师。返回合法 JSON 数组。" },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "station_decomposition",
          strict: true,
          schema: {
            type: "object",
            properties: {
              stations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    stationCode: { type: "string" },
                    stationName: { type: "string" },
                    stationNameEn: { type: "string" },
                    stationType: { type: "string" },
                    cycleTime: { type: "number" },
                    mechanicalParams: { type: "object", additionalProperties: true, properties: {} },
                    electricalParams: { type: "object", additionalProperties: true, properties: {} },
                    description: { type: "string" },
                  },
                  required: ["stationCode", "stationName", "stationNameEn", "stationType", "cycleTime", "mechanicalParams", "electricalParams", "description"],
                  additionalProperties: false,
                },
              },
            },
            required: ["stations"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("LLM returned empty content");
    const parsed = JSON.parse(content);
    const stations = parsed.stations || [];

    // Persist to DB
    const db = await requireDb();
    const savedIds: number[] = [];
    for (let i = 0; i < stations.length; i++) {
      const st = stations[i];
      const [row] = await db.insert(equipmentStations).values({
        projectId,
        proposalId,
        stationCode: st.stationCode,
        stationIndex: i + 1,
        stationName: st.stationName,
        stationNameEn: st.stationNameEn,
        stationType: st.stationType as StationType,
        description: st.description,
        cycleTime: st.cycleTime,
        mechanicalParams: st.mechanicalParams,
        electricalParams: st.electricalParams,
        aiGenerated: true,
        aiConfidence: "0.85",
        buCode: (input as unknown as DecomposeTaskInput).buCode || "BU3",
        createdBy: (input as unknown as DecomposeTaskInput).createdBy || "AI",
      }).returning();
      savedIds.push(row.id);
    }

    return { success: true, stationCount: stations.length, stationIds: savedIds, stations };
  } catch (err: unknown) {
    log.error({ err, projectId }, "M3_STATION_DECOMPOSE failed");
    // Fallback: generate default stations from the preferred cleaning type
    return generateFallbackStations(projectId, proposalId, preferredCleaningType!, input as unknown as DecomposeTaskInput);
  }
});

/** Fallback when LLM fails — use engineering templates */
async function generateFallbackStations(
  projectId: number, proposalId: number | undefined,
  _cleaningType: string, meta: DecomposeTaskInput,
) {
  // Standard ultrasonic + spray cleaning line template
  const template: Array<{ code: string; type: string; name: string; nameEn: string }> = [
    { code: "ST01", type: "LOADING",    name: "上料工位",      nameEn: "Loading" },
    { code: "ST02", type: "DEGREASING", name: "碱液脱脂",      nameEn: "Alkaline Degreasing" },
    { code: "ST03", type: "ULTRASONIC", name: "超声波粗洗",    nameEn: "Ultrasonic Rough Wash" },
    { code: "ST04", type: "ULTRASONIC", name: "超声波精洗",    nameEn: "Ultrasonic Fine Wash" },
    { code: "ST05", type: "SPRAY",      name: "高压喷淋",      nameEn: "High-Pressure Spray" },
    { code: "ST06", type: "RINSE",      name: "自来水漂洗",    nameEn: "Tap Water Rinse" },
    { code: "ST07", type: "DI_RINSE",   name: "纯水漂洗",      nameEn: "DI Water Rinse" },
    { code: "ST08", type: "PASSIVATION",name: "防锈处理",      nameEn: "Passivation" },
    { code: "ST09", type: "AIR_KNIFE",  name: "切风沥水",      nameEn: "Air Knife Blow-off" },
    { code: "ST10", type: "HOT_AIR_DRY",name: "热风干燥",      nameEn: "Hot Air Drying" },
    { code: "ST11", type: "COOLDOWN",   name: "冷却",          nameEn: "Cooldown" },
    { code: "ST12", type: "UNLOADING",  name: "下料工位",      nameEn: "Unloading" },
  ];

  const db = await requireDb();
  const savedIds: number[] = [];
  for (let i = 0; i < template.length; i++) {
    const t = template[i];
    const typeMeta = STATION_TYPE_META[t.type] || STATION_TYPE_META.RINSE;
    const [row] = await db.insert(equipmentStations).values({
      projectId,
      proposalId: proposalId ?? null,
      stationCode: t.code,
      stationIndex: i + 1,
      stationName: t.name,
      stationNameEn: t.nameEn,
      stationType: t.type as StationType,
      description: `${t.name} — 标准模板生成`,
      cycleTime: 60,
      mechanicalParams: typeMeta.defaultMechParams,
      electricalParams: typeMeta.defaultElecParams,
      aiGenerated: true,
      aiConfidence: "0.60",
      buCode: meta?.buCode || "BU3",
      createdBy: meta?.createdBy || "AI-Fallback",
    }).returning();
    savedIds.push(row.id);
  }
  return { success: true, stationCount: template.length, stationIds: savedIds, fallback: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// SolidWorks VBA — delegates to enhanced service
// ═══════════════════════════════════════════════════════════════════════════

function generateSolidWorksVBA(stations: Record<string, unknown>[], projectName: string): string {
  const stationData: StationData[] = stations.map((s: any, i: number) => ({
    stationCode: s.stationCode,
    stationName: s.stationName,
    stationType: s.stationType,
    stationIndex: i,
    mechanicalParams: s.mechanicalParams || {},
    electricalParams: s.electricalParams || {},
  }));
  return generateEnhancedVBA(stationData, projectName);
}

// ═══════════════════════════════════════════════════════════════════════════
// EPLAN XML Generator
// ═══════════════════════════════════════════════════════════════════════════

interface EplanStationRow {
  stationCode: string;
  stationName: string;
  stationNameEn?: string;
  stationType: string;
  mechanicalParams?: Record<string, unknown>;
  electricalParams?: Record<string, unknown>;
}

function generateEplanXML(stations: EplanStationRow[], projectName: string): string {
  const xmlLines: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<!-- GRT Design Engine — EPLAN P8 / Pro Panel Import -->`,
    `<!-- Project: ${projectName} -->`,
    `<!-- Generated: ${new Date().toISOString()} -->`,
    `<EPLAN_PROJECT>`,
    `  <ProjectInfo>`,
    `    <Name>${escXml(projectName)}</Name>`,
    `    <Company>GRT Cleaning Technology</Company>`,
    `    <Standard>IEC 81346</Standard>`,
    `    <Voltage>380V/3P/50Hz</Voltage>`,
    `    <StationCount>${stations.length}</StationCount>`,
    `  </ProjectInfo>`,
    `  <Stations>`,
  ];

  let totalDI = 0, totalDO = 0, totalAI = 0, totalAO = 0, totalMotorPower = 0;

  for (const st of stations) {
    const ep = (st.electricalParams || {}) as any;
    const mp = (st.mechanicalParams || {}) as any;
    const code = st.stationCode;
    const di = ep.plcDI || 0; const dout = ep.plcDO || 0;
    const ai = ep.plcAI || 0; const ao = ep.plcAO || 0;
    totalDI += di; totalDO += dout; totalAI += ai; totalAO += ao;
    totalMotorPower += ep.motorTotalPower || 0;

    xmlLines.push(`    <Station Code="${code}" Type="${st.stationType}">`);
    xmlLines.push(`      <Name>${escXml(st.stationName)}</Name>`);
    xmlLines.push(`      <NameEN>${escXml(st.stationNameEn || "")}</NameEN>`);
    xmlLines.push(`      <FunctionDesignation>=${code}</FunctionDesignation>`);
    xmlLines.push(`      <PlantDesignation>=GRT.${code}</PlantDesignation>`);
    xmlLines.push(`      <IO>`);
    xmlLines.push(`        <DI Count="${di}" StartAddress="I${code.replace("ST", "")}.0" />`);
    xmlLines.push(`        <DO Count="${dout}" StartAddress="Q${code.replace("ST", "")}.0" />`);
    xmlLines.push(`        <AI Count="${ai}" StartAddress="IW${Number(code.replace("ST", "")) * 10}" />`);
    xmlLines.push(`        <AO Count="${ao}" StartAddress="QW${Number(code.replace("ST", "")) * 10}" />`);
    xmlLines.push(`      </IO>`);

    // Motors
    if (ep.motorCount) {
      xmlLines.push(`      <Motors Count="${ep.motorCount}" TotalPower="${ep.motorTotalPower || 0}kW">`);
      if (ep.motorDetails) {
        for (const m of ep.motorDetails) {
          xmlLines.push(`        <Motor Name="${escXml(m.name)}" Power="${m.power}kW" Voltage="${m.voltage}V" Type="${m.type}" />`);
        }
      } else {
        // Generate default motor list
        const perMotor = (ep.motorTotalPower || 1.5) / (ep.motorCount || 1);
        for (let mi = 1; mi <= (ep.motorCount || 0); mi++) {
          xmlLines.push(`        <Motor Name="${code}-M${mi}" Power="${perMotor.toFixed(1)}kW" Voltage="380V" Type="AC" />`);
        }
      }
      xmlLines.push(`      </Motors>`);
    }

    // Sensors
    if (ep.sensorCount) {
      xmlLines.push(`      <Sensors Count="${ep.sensorCount}">`);
      if (ep.sensorTypes) {
        for (const s of ep.sensorTypes) {
          xmlLines.push(`        <Sensor Type="${s.type}" Count="${s.count}" Model="${s.model || ""}" />`);
        }
      } else {
        // Default sensor distribution
        const sensorMap: Record<string, string[]> = {
          ULTRASONIC: ["temperature", "level", "pressure", "frequency"],
          SPRAY: ["pressure", "flow", "temperature"],
          HOT_AIR_DRY: ["temperature", "humidity", "airflow"],
          VACUUM_DRY: ["temperature", "vacuum", "pressure"],
        };
        const defaults = sensorMap[st.stationType] || ["temperature", "level"];
        for (const sType of defaults) {
          xmlLines.push(`        <Sensor Type="${sType}" Count="1" />`);
        }
      }
      xmlLines.push(`      </Sensors>`);
    }

    // Heaters
    if (ep.heaterCircuits) {
      xmlLines.push(`      <Heaters Circuits="${ep.heaterCircuits}" TotalPower="${ep.heaterTotalPower || 0}kW" />`);
    }

    // Safety
    if (ep.safetyInterlocks && (ep as any).safetyInterlocks.length > 0) {
      xmlLines.push(`      <SafetyInterlocks>`);
      for (const si of ep.safetyInterlocks) {
        xmlLines.push(`        <Interlock Type="${si}" />`);
      }
      xmlLines.push(`      </SafetyInterlocks>`);
    }

    xmlLines.push(`    </Station>`);
  }

  xmlLines.push(`  </Stations>`);
  xmlLines.push(`  <Summary>`);
  xmlLines.push(`    <TotalIO DI="${totalDI}" DO="${totalDO}" AI="${totalAI}" AO="${totalAO}" Total="${totalDI + totalDO + totalAI + totalAO}" />`);
  xmlLines.push(`    <TotalMotorPower>${totalMotorPower.toFixed(1)}kW</TotalMotorPower>`);
  xmlLines.push(`    <RecommendedPLC Model="S7-1500" CPU="CPU 1516-3 PN/DP" />`);
  xmlLines.push(`    <RecommendedHMI Model="TP1900 Comfort" Size="19inch" />`);
  xmlLines.push(`    <CommunicationBus>${stations.some(s => s.electricalParams?.communicationProtocol === "PROFINET") ? "PROFINET" : "PROFIBUS"}</CommunicationBus>`);
  xmlLines.push(`  </Summary>`);
  xmlLines.push(`</EPLAN_PROJECT>`);

  return xmlLines.join("\n");
}

function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ═══════════════════════════════════════════════════════════════════════════
// tRPC Router
// ═══════════════════════════════════════════════════════════════════════════

export const designEngineRouter = router({
  // ─── Station metadata ───
  getStationTypes: protectedProcedure.query(() => {
    return Object.entries(STATION_TYPE_META).map(([type, meta]) => ({
      type, nameZh: meta.nameZh, nameEn: meta.nameEn, category: meta.category,
      defaultMechParams: meta.defaultMechParams, defaultElecParams: meta.defaultElecParams,
    }));
  }),

  // ─── List stations for a project ───
  listStations: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select().from(equipmentStations)
        .where(eq(equipmentStations.projectId, input.projectId))
        .orderBy(equipmentStations.stationIndex)
        .limit(50);
      return { stations: rows };
    }),

  // ─── Get single station ───
  getStation: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db.select().from(equipmentStations)
        .where(eq(equipmentStations.id, input.id)).limit(1);
      return row || null;
    }),

  // ─── Create station manually ───
  createStation: requirePermission("rnd:requirements:manage")
    .input(z.object({
      projectId: z.number(),
      stationCode: z.string().min(1),
      stationIndex: z.number(),
      stationName: z.string().min(1),
      stationNameEn: z.string().optional(),
      stationType: z.string(),
      description: z.string().optional(),
      cycleTime: z.number().optional(),
      mechanicalParams: z.record(z.string(), z.unknown()).optional(),
      electricalParams: z.record(z.string(), z.unknown()).optional(),
      buCode: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [row] = await db.insert(equipmentStations).values({
        projectId: input.projectId,
        stationCode: input.stationCode,
        stationIndex: input.stationIndex,
        stationName: input.stationName,
        stationNameEn: input.stationNameEn || "",
        stationType: input.stationType as StationType,
        description: input.description || "",
        cycleTime: input.cycleTime,
        mechanicalParams: (input.mechanicalParams || {}) as MechanicalParams,
        electricalParams: (input.electricalParams || {}) as ElectricalParams,
        aiGenerated: false,
        buCode: input.buCode || "BU3",
        createdBy: ctx.user?.name || `User#${ctx.user?.id}`,
      }).returning();
      return row;
    }),

  // ─── Update station params (engineer override) ───
  updateStation: requirePermission("rnd:requirements:manage")
    .input(z.object({
      id: z.number(),
      stationName: z.string().optional(),
      stationNameEn: z.string().optional(),
      stationType: z.string().optional(),
      description: z.string().optional(),
      cycleTime: z.number().nullable().optional(),
      mechanicalParams: z.record(z.string(), z.unknown()).optional(),
      electricalParams: z.record(z.string(), z.unknown()).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const updates: Record<string, unknown> = { updatedAt: new Date().toISOString(), manualOverride: true };
      if (input.stationName !== undefined) updates.stationName = input.stationName;
      if (input.stationNameEn !== undefined) updates.stationNameEn = input.stationNameEn;
      if (input.stationType !== undefined) updates.stationType = input.stationType;
      if (input.description !== undefined) updates.description = input.description;
      if (input.cycleTime !== undefined) updates.cycleTime = input.cycleTime;
      if (input.mechanicalParams !== undefined) updates.mechanicalParams = input.mechanicalParams;
      if (input.electricalParams !== undefined) updates.electricalParams = input.electricalParams;
      if (input.notes !== undefined) updates.notes = input.notes;
      await db.update(equipmentStations).set(updates).where(eq(equipmentStations.id, input.id));
      return { success: true };
    }),

  // ─── Delete station ───
  deleteStation: requirePermission("rnd:requirements:manage")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.delete(equipmentStations).where(eq(equipmentStations.id, input.id));
      return { success: true };
    }),

  // ─── Reorder stations ───
  reorderStations: requirePermission("rnd:requirements:manage")
    .input(z.object({
      projectId: z.number(),
      orderedIds: z.array(z.number()),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      for (let i = 0; i < input.orderedIds.length; i++) {
        await db.update(equipmentStations)
          .set({ stationIndex: i + 1, stationCode: `ST${String(i + 1).padStart(2, "0")}`, updatedAt: new Date().toISOString() })
          .where(and(eq(equipmentStations.id, input.orderedIds[i]), eq(equipmentStations.projectId, input.projectId)));
      }
      return { success: true };
    }),

  // ─── AI Decomposition (async) ───
  decomposeProposal: requirePermission("rnd:requirements:manage")
    .input(z.object({
      projectId: z.number(),
      proposalId: z.number().optional(),
      proposalSummary: z.string().optional(),
      workpieceInfo: z.string().optional(),
      cleanlinessRequirement: z.string().optional(),
      cycleTimeTarget: z.number().optional(),
      preferredCleaningType: z.string().optional(),
      buCode: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { taskId } = await submitTask(
        "M3_STATION_DECOMPOSE",
        { ...input, createdBy: ctx.user?.name || `User#${ctx.user?.id}` } as Record<string, unknown>,
        ctx.user?.name || `User#${ctx.user?.id}`,
      );
      return { taskId, status: "processing" };
    }),

  // ─── Poll task status ───
  getTaskStatus: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input }) => {
      return await getTaskStatus(input.taskId);
    }),

  // ─── Export to SolidWorks ───
  exportToSolidWorks: requirePermission("rnd:requirements:manage")
    .input(z.object({
      projectId: z.number(),
      projectName: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const startTime = Date.now();
      const db = await requireDb();
      const stations = await db.select().from(equipmentStations)
        .where(eq(equipmentStations.projectId, input.projectId))
        .orderBy(equipmentStations.stationIndex)
        .limit(50);

      if (stations.length === 0) throw new Error("No stations found for this project");

      const projectName = input.projectName || `Project-${input.projectId}`;
      const vbaContent = generateSolidWorksVBA(stations, projectName);
      const fileName = `GRT_${projectName.replace(/\s+/g, "_")}_SolidWorks.bas`;

      const [logRow] = await db.insert(designExportLogs).values({
        projectId: input.projectId,
        exportFormat: "SOLIDWORKS_VBA" as ExportFormat,
        exportStatus: "COMPLETED" as ExportStatus,
        stationIds: stations.map(s => s.id),
        fileContent: vbaContent,
        fileName,
        fileSizeBytes: Buffer.byteLength(vbaContent, "utf-8"),
        generationTimeMs: Date.now() - startTime,
        exportedBy: ctx.user?.name || `User#${ctx.user?.id}`,
      }).returning();

      return { id: logRow.id, fileName, content: vbaContent, format: "SOLIDWORKS_VBA", stationCount: stations.length };
    }),

  // ─── Export to EPLAN ───
  exportToEplan: requirePermission("rnd:requirements:manage")
    .input(z.object({
      projectId: z.number(),
      projectName: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const startTime = Date.now();
      const db = await requireDb();
      const stations = await db.select().from(equipmentStations)
        .where(eq(equipmentStations.projectId, input.projectId))
        .orderBy(equipmentStations.stationIndex)
        .limit(50);

      if (stations.length === 0) throw new Error("No stations found for this project");

      const projectName = input.projectName || `Project-${input.projectId}`;
      const xmlContent = generateEplanXML(stations as any, projectName);
      const fileName = `GRT_${projectName.replace(/\s+/g, "_")}_EPLAN.xml`;

      const [logRow] = await db.insert(designExportLogs).values({
        projectId: input.projectId,
        exportFormat: "EPLAN_XML" as ExportFormat,
        exportStatus: "COMPLETED" as ExportStatus,
        stationIds: stations.map(s => s.id),
        fileContent: xmlContent,
        fileName,
        fileSizeBytes: Buffer.byteLength(xmlContent, "utf-8"),
        generationTimeMs: Date.now() - startTime,
        exportedBy: ctx.user?.name || `User#${ctx.user?.id}`,
      }).returning();

      return { id: logRow.id, fileName, content: xmlContent, format: "EPLAN_XML", stationCount: stations.length };
    }),

  // ─── Export history ───
  getExportHistory: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select({
        id: designExportLogs.id,
        exportFormat: designExportLogs.exportFormat,
        exportStatus: designExportLogs.exportStatus,
        fileName: designExportLogs.fileName,
        fileSizeBytes: designExportLogs.fileSizeBytes,
        generationTimeMs: designExportLogs.generationTimeMs,
        exportedBy: designExportLogs.exportedBy,
        downloadCount: designExportLogs.downloadCount,
        createdAt: designExportLogs.createdAt,
      }).from(designExportLogs)
        .where(eq(designExportLogs.projectId, input.projectId))
        .orderBy(desc(designExportLogs.createdAt))
        .limit(50);
      return { exports: rows };
    }),

  // ─── Download export ───
  getExportContent: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db.select().from(designExportLogs)
        .where(eq(designExportLogs.id, input.id)).limit(1);
      if (!row) return null;
      // Increment download count
      await db.update(designExportLogs)
        .set({ downloadCount: (row.downloadCount || 0) + 1, exportStatus: "DOWNLOADED" as ExportStatus })
        .where(eq(designExportLogs.id, input.id));
      return { fileName: row.fileName, content: row.fileContent, format: row.exportFormat };
    }),

  // ─── Project summary (IO totals, power budget) ───
  getProjectSummary: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const stations = await db.select().from(equipmentStations)
        .where(eq(equipmentStations.projectId, input.projectId))
        .orderBy(equipmentStations.stationIndex)
        .limit(50);

      let totalDI = 0, totalDO = 0, totalAI = 0, totalAO = 0;
      let totalMotorPower = 0, totalHeaterPower = 0, totalSensors = 0, totalMotors = 0;
      let maxCycleTime = 0;

      for (const st of stations) {
        const ep = (st.electricalParams || {}) as ElectricalParams;
        totalDI += ep.plcDI || 0;
        totalDO += ep.plcDO || 0;
        totalAI += ep.plcAI || 0;
        totalAO += ep.plcAO || 0;
        totalMotorPower += ep.motorTotalPower || 0;
        totalHeaterPower += ep.heaterTotalPower || 0;
        totalSensors += ep.sensorCount || 0;
        totalMotors += ep.motorCount || 0;
        if (st.cycleTime && st.cycleTime > maxCycleTime) maxCycleTime = st.cycleTime;
      }

      return {
        stationCount: stations.length,
        io: { DI: totalDI, DO: totalDO, AI: totalAI, AO: totalAO, total: totalDI + totalDO + totalAI + totalAO },
        power: { motorKW: totalMotorPower, heaterKW: totalHeaterPower, totalKW: totalMotorPower + totalHeaterPower },
        components: { motors: totalMotors, sensors: totalSensors },
        bottleneckCycleTime: maxCycleTime,
        recommendedPLC: totalDI + totalDO + totalAI + totalAO > 200 ? "S7-1500 CPU 1517" : totalDI + totalDO + totalAI + totalAO > 100 ? "S7-1500 CPU 1516" : "S7-1500 CPU 1515",
      };
    }),

  // ═══════════════════════════════════════════════════════════════════════
  // Engineering Sizing — apply parametric formulas to all stations
  // ═══════════════════════════════════════════════════════════════════════

  applyEngineeringSizing: requirePermission("rnd:requirements:manage")
    .input(z.object({
      projectId: z.number(),
      workpiece: z.object({
        length: z.number(), width: z.number(), height: z.number(),
        weight: z.number(),
        material: z.enum(["aluminum_alloy", "cast_iron", "steel", "brass", "plastic"]),
      }),
      cleanliness: z.object({
        cleanlinessGrade: z.enum(["standard", "fine", "precision"]),
        maxParticleSize: z.number().optional(),
      }),
      process: z.object({
        targetCycleTime: z.number(),
        cleaningChemistry: z.enum(["alkaline", "neutral", "acid", "solvent"]),
        temperatureTarget: z.number().optional(),
        heatUpTimeMinutes: z.number().optional(),
        features: z.array(z.string()).optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const stations = await db.select().from(equipmentStations)
        .where(eq(equipmentStations.projectId, input.projectId))
        .orderBy(equipmentStations.stationIndex)
        .limit(50);

      if (stations.length === 0) throw new Error("No stations found for this project");

      const updatedStations: Array<{ id: number; code: string; type: string }> = [];

      for (const st of stations) {
        const sizing = sizeStation(
          st.stationType,
          input.workpiece as WorkpieceSpec,
          input.cleanliness as CleanlinessRequirement,
          input.process as ProcessRequirement,
        );

        // Merge with existing params (sizing overrides, but preserves any manual fields)
        const mergedMech = { ...(st.mechanicalParams as MechanicalParams), ...sizing.mechanicalParams };
        const mergedElec = { ...(st.electricalParams as ElectricalParams), ...sizing.electricalParams };

        await db.update(equipmentStations).set({
          mechanicalParams: mergedMech,
          electricalParams: mergedElec,
          manualOverride: false,
          updatedAt: new Date().toISOString(),
        }).where(eq(equipmentStations.id, st.id));

        updatedStations.push({ id: st.id, code: st.stationCode, type: st.stationType });
      }

      return { success: true, updatedCount: updatedStations.length, stations: updatedStations };
    }),

  // ═══════════════════════════════════════════════════════════════════════
  // BOM Preview — preview auto-generated BOM without saving
  // ═══════════════════════════════════════════════════════════════════════

  getBomPreview: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const stations = await db.select().from(equipmentStations)
        .where(eq(equipmentStations.projectId, input.projectId))
        .orderBy(equipmentStations.stationIndex)
        .limit(50);

      if (stations.length === 0) return { stations: [], totalComponents: 0, totalCost: 0, costByCategory: {} };

      const summary = mapProjectToBom(stations.map(s => ({
        stationCode: s.stationCode,
        stationType: s.stationType,
        mechanicalParams: (s.mechanicalParams || {}) as MechanicalParams,
        electricalParams: (s.electricalParams || {}) as ElectricalParams,
      })));

      return summary;
    }),

  // ═══════════════════════════════════════════════════════════════════════
  // BOM Generation — create bomMaster + bomItems from station components
  // ═══════════════════════════════════════════════════════════════════════

  generateProjectBom: requirePermission("rnd:bom:manage")
    .input(z.object({
      projectId: z.number(),
      projectName: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const stations = await db.select().from(equipmentStations)
        .where(eq(equipmentStations.projectId, input.projectId))
        .orderBy(equipmentStations.stationIndex)
        .limit(50);

      if (stations.length === 0) throw new Error("No stations found for this project");

      const projectName = input.projectName || `M3-Project-${input.projectId}`;

      // Generate BOM components
      const summary = mapProjectToBom(stations.map(s => ({
        stationCode: s.stationCode,
        stationType: s.stationType,
        mechanicalParams: (s.mechanicalParams || {}) as MechanicalParams,
        electricalParams: (s.electricalParams || {}) as ElectricalParams,
      })));

      // Create BOM master
      const [master] = await db.insert(bomMasters).values({
        productCode: `BOM-M3-${input.projectId}`,
        productName: `${projectName} 设备BOM`,
        bomType: "engineering",
        currentVersion: "1.0",
        status: "draft",
        maxLevel: 2,
        standardQty: "1",
        standardUnit: "套",
        totalMaterialCost: String(summary.totalCost),
        description: `M3设计引擎自动生成 — ${stations.length}个工位, ${summary.totalComponents}个组件`,
        createdBy: ctx.user?.id ?? 0,
      }).returning();

      // Insert BOM items per station
      let sequence = 0;
      let totalItems = 0;
      for (const stResult of summary.stations) {
        sequence++;
        // Level-1 item: the station itself
        const [stationItem] = await db.insert(bomItems).values({
          bomMasterId: master.id,
          parentItemId: null,
          level: 1,
          sequence,
          materialCode: stResult.stationCode,
          materialName: `${stResult.stationCode} ${stResult.stationType}`,
          materialSpec: stResult.stationType,
          quantity: "1",
          unit: "台",
          sourceType: "manufacture",
          unitCost: String(stResult.subtotal),
          extendedCost: String(stResult.subtotal),
          isCritical: true,
        }).returning();

        // Level-2 items: components
        for (const comp of stResult.components) {
          sequence++;
          totalItems++;
          await db.insert(bomItems).values({
            bomMasterId: master.id,
            parentItemId: stationItem.id,
            level: 2,
            sequence,
            materialCode: comp.materialCode,
            materialName: comp.materialName,
            materialSpec: comp.materialSpec,
            quantity: String(comp.quantity),
            unit: comp.unit,
            sourceType: comp.sourceType,
            unitCost: String(comp.unitCost),
            extendedCost: String(comp.unitCost * comp.quantity),
            isCritical: comp.isCritical,
            leadTimeDays: comp.leadTimeDays,
            remarks: comp.remarks ?? null,
          }).returning();
        }
      }

      return {
        bomMasterId: master.id,
        itemCount: totalItems,
        stationCount: summary.stations.length,
        totalCost: summary.totalCost,
      };
    }),

  // ═══════════════════════════════════════════════════════════════════════
  // Standards Reference — get applicable standards for a station type
  // ═══════════════════════════════════════════════════════════════════════

  getStationStandards: protectedProcedure
    .input(z.object({ stationType: z.string() }))
    .query(({ input }) => {
      return getStationStandards(input.stationType);
    }),

  // ═══════════════════════════════════════════════════════════════════════
  // AI Parameter Suggestions — historical case matching + LLM reasoning
  // ═══════════════════════════════════════════════════════════════════════

  getAiSuggestions: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      stationId: z.number(),
      workpiece: z.object({
        length: z.number(), width: z.number(), height: z.number(),
        weight: z.number(), material: z.string(),
      }),
      formulaParams: z.record(z.string(), z.unknown()).optional(),
      enableLlm: z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();

      // Get current station
      const [station] = await db.select().from(equipmentStations)
        .where(eq(equipmentStations.id, input.stationId)).limit(1);
      if (!station) return { historicalCases: [], suggestions: [], aiReasoning: null, standards: null };

      const currentMech = (station.mechanicalParams || {}) as Partial<MechanicalParams>;
      const formulaMech = (input.formulaParams || {}) as Partial<MechanicalParams>;
      const wpCtx: WorkpieceContext = input.workpiece;

      // Find similar historical cases
      const cases = await findSimilarCases(
        station.stationType,
        wpCtx,
        5,
        input.projectId,
      );

      // Generate parameter suggestions from cases
      const suggestions = generateSuggestionsFromCases(
        station.stationType,
        cases,
        currentMech,
        formulaMech,
      );

      // Add formula-based suggestions for params not covered by history
      const formulaKeys = Object.keys(formulaMech).filter(k => formulaMech[k as keyof MechanicalParams] != null);
      for (const key of formulaKeys) {
        if (!suggestions.find(s => s.paramKey === key)) {
          const val = formulaMech[key as keyof MechanicalParams];
          const explanation = getSizingExplanation(key, val as number | string);
          suggestions.push({
            paramKey: key,
            paramLabel: key,
            currentValue: currentMech[key as keyof MechanicalParams] as number | string | undefined,
            formulaValue: val as number | string | undefined,
            suggestedValue: val as number | string | undefined,
            confidence: 0.9,
            source: "formula",
            sourceDetail: "工程公式计算",
            explanation: explanation || "基于工程公式计算",
          });
        }
      }

      // Validate each suggestion against standards
      const validatedSuggestions = suggestions.map(s => {
        const finalVal = s.suggestedValue ?? s.formulaValue;
        if (finalVal != null) {
          const validation = validateAgainstStandards(station.stationType, s.paramKey, finalVal);
          return { ...s, warnings: validation.warnings, standardRefs: validation.standardRefs };
        }
        return { ...s, warnings: [] as string[], standardRefs: [] as string[] };
      });

      // Get standards for this station type
      const standards = getStationStandards(station.stationType);

      // Optional: LLM enhanced reasoning
      let aiReasoning: string | null = null;
      if (input.enableLlm && cases.length > 0) {
        try {
          const aiResult = await getAiEnhancedSuggestions(
            station.stationType,
            station.stationName,
            wpCtx,
            cases,
            currentMech,
            formulaMech,
          );
          aiReasoning = aiResult.reasoning;

          // Apply AI adjustments to suggestions
          for (const [key, val] of Object.entries(aiResult.adjustments)) {
            const existing = validatedSuggestions.find(s => s.paramKey === key);
            if (existing) {
              existing.suggestedValue = val;
              existing.source = "ai";
              existing.sourceDetail = "AI工程师建议";
              existing.confidence = Math.min(1, existing.confidence + 0.1);
            }
          }
        } catch {
          aiReasoning = "AI分析暂不可用";
        }
      }

      return {
        historicalCases: cases,
        suggestions: validatedSuggestions,
        aiReasoning,
        standards: {
          applicable: standards.applicableStandards,
          perParameter: standards.parameterStandards,
        },
      };
    }),

  // ═══════════════════════════════════════════════════════════════════════
  // Apply AI Suggestions — merge selected suggestions into station params
  // ═══════════════════════════════════════════════════════════════════════

  applyAiSuggestions: requirePermission("rnd:requirements:manage")
    .input(z.object({
      stationId: z.number(),
      selectedParams: z.record(z.string(), z.union([z.number(), z.string()])),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();

      const [station] = await db.select().from(equipmentStations)
        .where(eq(equipmentStations.id, input.stationId)).limit(1);
      if (!station) throw new Error("Station not found");

      const currentMech = (station.mechanicalParams || {}) as Record<string, unknown>;
      const mergedMech = { ...currentMech, ...input.selectedParams };

      await db.update(equipmentStations).set({
        mechanicalParams: mergedMech as MechanicalParams,
        manualOverride: true,
        updatedAt: new Date().toISOString(),
        notes: (station.notes || "") + `\n[${new Date().toISOString().slice(0, 16)}] AI建议已应用: ${Object.keys(input.selectedParams).join(", ")}`,
      }).where(eq(equipmentStations.id, input.stationId));

      return { success: true, appliedKeys: Object.keys(input.selectedParams) };
    }),

  // ═══════════════════════════════════════════════════════════════════════
  // Design Review — comprehensive scheme evaluation
  // ═══════════════════════════════════════════════════════════════════════

  getDesignReview: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const stations = await db.select().from(equipmentStations)
        .where(eq(equipmentStations.projectId, input.projectId))
        .orderBy(equipmentStations.stationIndex)
        .limit(50);

      if (stations.length === 0) return null;

      const stationData = stations.map(s => ({
        stationCode: s.stationCode,
        stationType: s.stationType,
        stationName: s.stationName,
        cycleTime: s.cycleTime,
        mechanicalParams: (s.mechanicalParams || {}) as Partial<MechanicalParams>,
        electricalParams: (s.electricalParams || {}) as Partial<ElectricalParams>,
      }));

      return reviewProject(input.projectId, stationData);
    }),

  generateCommissioningGuide: requirePermission("rnd:requirements:manage")
    .input(z.object({
      projectId: z.number(),
      projectName: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const stations = await db.select().from(equipmentStations)
        .where(eq(equipmentStations.projectId, input.projectId))
        .orderBy(equipmentStations.stationIndex)
        .limit(50);

      if (stations.length === 0) throw new Error("No stations found for this project");

      const projectName = input.projectName || `M3-Project-${input.projectId}`;
      const stationData = stations.map(s => ({
        stationCode: s.stationCode,
        stationType: s.stationType,
        stationName: s.stationName,
        cycleTime: s.cycleTime,
        mechanicalParams: (s.mechanicalParams || {}) as Partial<MechanicalParams>,
        electricalParams: (s.electricalParams || {}) as Partial<ElectricalParams>,
      }));

      const review = reviewProject(input.projectId, stationData);
      const guide = genGuide(projectName, stationData, review);
      const markdown = commissioningGuideToMarkdown(guide);

      // Log export (using EPLAN_EXCEL format as closest match for doc export)
      await db.insert(designExportLogs).values({
        projectId: input.projectId,
        exportFormat: "EPLAN_EXCEL",
        exportedBy: ctx.user?.name || "system",
        exportStatus: "COMPLETED",
        fileName: `${projectName}-commissioning-guide.md`,
        fileContent: markdown,
        generationTimeMs: 0,
      }).returning();

      return { guide, markdown, stationCount: stations.length, reviewScore: review.overallScore };
    }),

  submitReviewApproval: requirePermission("rnd:requirements:manage")
    .input(z.object({
      projectId: z.number(),
      verdict: z.enum(["approved", "conditional", "rejected"]),
      reviewerComments: z.string().optional(),
      conditionItems: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();

      // Log the review decision as an export event
      await db.insert(designExportLogs).values({
        projectId: input.projectId,
        exportFormat: "EPLAN_EXCEL",
        exportedBy: ctx.user?.name || "system",
        exportStatus: "COMPLETED",
        fileName: `review-decision-${input.verdict}.json`,
        fileContent: JSON.stringify({
          verdict: input.verdict,
          reviewerComments: input.reviewerComments || "",
          conditionItems: input.conditionItems || [],
          reviewedAt: new Date().toISOString(),
        }),
        generationTimeMs: 0,
      }).returning();

      log.info({ projectId: input.projectId, verdict: input.verdict }, "Design review submitted");
      return { success: true, verdict: input.verdict };
    }),

  // ═══════════════════════════════════════════════════════════════════════
  // PLC Program Architecture Engine — Sub-procedures
  // ═══════════════════════════════════════════════════════════════════════

  // ─── PLC Project Management ──────────────────────────────────────────

  plcCreateProject: requirePermission("rnd:requirements:manage")
    .input(z.object({
      projectId: z.number(),
      projectName: z.string(),
      plcBrand: z.string().default("SIEMENS_S7_1500"),
      plcModel: z.string().optional(),
      networkProtocol: z.string().default("PROFINET"),
      hmiModel: z.string().default("TP1500 Comfort"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      // Aggregate I/O from stations
      const stations = await db.select().from(equipmentStations)
        .where(eq(equipmentStations.projectId, input.projectId)).limit(100);

      let totalDI = 0, totalDO = 0, totalAI = 0, totalAO = 0;
      for (const s of stations) {
        const ep = (s.electricalParams || {}) as ElectricalParams;
        totalDI += ep.plcDI || 0;
        totalDO += ep.plcDO || 0;
        totalAI += ep.plcAI || 0;
        totalAO += ep.plcAO || 0;
      }

      const [project] = await db.insert(plcProjects).values({
        projectId: input.projectId,
        projectName: input.projectName,
        plcBrand: input.plcBrand as PlcBrand,
        plcModel: input.plcModel || "CPU 1516-3 PN/DP",
        networkProtocol: input.networkProtocol,
        hmiModel: input.hmiModel,
        ioTotalDI: totalDI + 8, // +system I/O
        ioTotalDO: totalDO + 4,
        ioTotalAI: totalAI,
        ioTotalAO: totalAO,
        rackCount: Math.ceil((totalDI + totalDO + totalAI + totalAO) / 128) || 1,
        createdBy: ctx.user?.name || "",
        buCode: (ctx as unknown as { bu?: { code: string } }).bu?.code || "BU3",
      }).returning();

      log.info({ plcProjectId: project.id, brand: input.plcBrand }, "PLC project created");
      return project;
    }),

  plcGetProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [project] = await db.select().from(plcProjects)
        .where(eq(plcProjects.projectId, input.projectId)).limit(1);
      return project || null;
    }),

  plcUpdateProject: requirePermission("rnd:requirements:manage")
    .input(z.object({
      id: z.number(),
      plcBrand: z.string().optional(),
      plcModel: z.string().optional(),
      networkProtocol: z.string().optional(),
      hmiModel: z.string().optional(),
      hmiScreenCount: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...updates } = input;
      const values: Record<string, unknown> = {};
      if (updates.plcBrand) values.plcBrand = updates.plcBrand;
      if (updates.plcModel) values.plcModel = updates.plcModel;
      if (updates.networkProtocol) values.networkProtocol = updates.networkProtocol;
      if (updates.hmiModel) values.hmiModel = updates.hmiModel;
      if (updates.hmiScreenCount !== undefined) values.hmiScreenCount = updates.hmiScreenCount;

      await db.update(plcProjects).set(values).where(eq(plcProjects.id, id));
      return { success: true };
    }),

  plcDeleteProject: requirePermission("rnd:requirements:manage")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.delete(plcProgramModules).where(eq(plcProgramModules.plcProjectId, input.id));
      await db.delete(plcIoMappings).where(eq(plcIoMappings.plcProjectId, input.id));
      await db.delete(plcAlarmDefinitions).where(eq(plcAlarmDefinitions.plcProjectId, input.id));
      await db.delete(plcUserAccessLevels).where(eq(plcUserAccessLevels.plcProjectId, input.id));
      await db.delete(plcVersionHistory).where(eq(plcVersionHistory.plcProjectId, input.id));
      await db.delete(plcEplanSchematics).where(eq(plcEplanSchematics.plcProjectId, input.id));
      await db.delete(plcProjects).where(eq(plcProjects.id, input.id));
      return { success: true };
    }),

  // ─── Program Architecture ──────────────────────────────────────────────

  plcGenerateArchitecture: requirePermission("rnd:requirements:manage")
    .input(z.object({ plcProjectId: z.number(), eStopCount: z.number().default(4) }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await assertNotFrozen(input.plcProjectId);
      const [project] = await db.select().from(plcProjects)
        .where(eq(plcProjects.id, input.plcProjectId)).limit(1);
      if (!project) throw new Error("PLC project not found");
      await assertNoBlockingConflicts(project.projectId);

      let adapter;
      try {
        adapter = getAdapter(project.plcBrand);
      } catch {
        throw new Error(`不支持的PLC品牌: ${project.plcBrand}。请检查PLC项目配置。`);
      }

      const stationRows = await db.select().from(equipmentStations)
        .where(eq(equipmentStations.projectId, project.projectId)).limit(100);

      const stations: StationInfo[] = stationRows.map(s => ({
        id: s.id,
        stationCode: s.stationCode,
        stationName: s.stationName,
        stationNameEn: s.stationNameEn || "",
        stationType: s.stationType,
        electricalParams: (s.electricalParams || {}) as ElectricalParams,
      }));

      const arch = generateProgramArchitecture(adapter, stations, { eStopCount: input.eStopCount });

      // ── Transaction: clear old data + insert new ──
      // Clear old modules + I/O + alarms
      await db.delete(plcProgramModules).where(eq(plcProgramModules.plcProjectId, input.plcProjectId));
      await db.delete(plcIoMappings).where(eq(plcIoMappings.plcProjectId, input.plcProjectId));
      await db.delete(plcAlarmDefinitions).where(eq(plcAlarmDefinitions.plcProjectId, input.plcProjectId));
      await db.delete(plcUserAccessLevels).where(eq(plcUserAccessLevels.plcProjectId, input.plcProjectId));

      // ── Pass 1: Insert all modules (without parentModuleId) ──
      const moduleNumberToDbId = new Map<string, number>();
      for (const m of arch.modules) {
        const code = generateModuleCode(adapter, m, {
          stations, ioMappings: arch.ioMappings, alarms: arch.alarmDefinitions, accessLevels: arch.accessLevels,
        });
        const [inserted] = await db.insert(plcProgramModules).values({
          plcProjectId: input.plcProjectId,
          moduleName: m.moduleName,
          moduleType: m.moduleType as typeof plcProgramModules.moduleType.enumValues[number],
          moduleNumber: m.moduleNumber,
          sortOrder: m.sortOrder,
          description: m.description,
          descriptionEn: m.descriptionEn,
          sourceCode: code,
          language: adapter.getFileExtension() === ".scl" ? "SCL" : "ST",
          parameterInterface: m.parameterInterface,
          category: m.category,
          isGenerated: true,
        }).returning();
        moduleNumberToDbId.set(m.moduleNumber, inserted.id);
      }

      // ── Pass 2: Resolve parentModuleId string→integer ──
      for (const m of arch.modules) {
        if (m.parentModuleId) {
          const parentDbId = moduleNumberToDbId.get(m.parentModuleId);
          const selfDbId = moduleNumberToDbId.get(m.moduleNumber);
          if (parentDbId && selfDbId) {
            await db.update(plcProgramModules)
              .set({ parentModuleId: parentDbId })
              .where(eq(plcProgramModules.id, selfDbId));
          }
        }
      }

      // Insert I/O mappings
      for (const io of arch.ioMappings) {
        await db.insert(plcIoMappings).values({
          plcProjectId: input.plcProjectId,
          stationId: io.stationId,
          signalName: io.signalName,
          signalNameEn: io.signalNameEn,
          address: io.address,
          ioType: io.ioType,
          dataType: io.dataType,
          moduleRack: io.moduleRack,
          moduleSlot: io.moduleSlot,
          moduleChannel: io.moduleChannel,
          description: io.description,
          safetyRelevant: io.safetyRelevant,
        });
      }

      // Insert alarms
      for (const a of arch.alarmDefinitions) {
        await db.insert(plcAlarmDefinitions).values({
          plcProjectId: input.plcProjectId,
          alarmCode: a.code,
          alarmClass: a.severity === "critical" ? "A" : a.severity === "high" ? "B" : a.severity === "medium" ? "C" : "W",
          messageZh: a.message,
          messageEn: a.messageEn,
          stationId: a.stationId || null,
          triggerCondition: a.triggerCondition,
          interlockAction: a.interlockAction,
          resetType: a.resetType,
          severity: a.severity,
          category: "process",
        });
      }

      // Insert access levels
      for (const al of arch.accessLevels) {
        await db.insert(plcUserAccessLevels).values({
          plcProjectId: input.plcProjectId,
          levelNumber: al.levelNumber,
          levelName: al.levelName,
          levelNameEn: al.levelNameEn,
          permissions: al.permissions as PlcAccessPermissions,
          timeout: al.timeout,
        });
      }

      // Update project I/O summary
      await db.update(plcProjects).set({
        ioTotalDI: arch.ioSummary.totalDI,
        ioTotalDO: arch.ioSummary.totalDO,
        ioTotalAI: arch.ioSummary.totalAI,
        ioTotalAO: arch.ioSummary.totalAO,
        rackCount: arch.ioSummary.rackCount,
      }).where(eq(plcProjects.id, input.plcProjectId));

      log.info({ plcProjectId: input.plcProjectId, modules: arch.modules.length, io: arch.ioMappings.length, alarms: arch.alarmDefinitions.length }, "PLC architecture generated");

      return {
        moduleCount: arch.modules.length,
        ioCount: arch.ioMappings.length,
        alarmCount: arch.alarmDefinitions.length,
        ioSummary: arch.ioSummary,
      };
    }),

  plcGetModules: protectedProcedure
    .input(z.object({ plcProjectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db.select().from(plcProgramModules)
        .where(eq(plcProgramModules.plcProjectId, input.plcProjectId))
        .orderBy(plcProgramModules.sortOrder).limit(200);
    }),

  plcGetModuleCode: requirePermission("rnd:plc:source:view")
    .input(z.object({ moduleId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [mod] = await db.select().from(plcProgramModules)
        .where(eq(plcProgramModules.id, input.moduleId)).limit(1);
      return mod || null;
    }),

  plcRegenerateModule: requirePermission("rnd:requirements:manage")
    .input(z.object({ moduleId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [mod] = await db.select().from(plcProgramModules)
        .where(eq(plcProgramModules.id, input.moduleId)).limit(1);
      if (!mod) throw new Error("Module not found");
      await assertNotFrozen(mod.plcProjectId);

      const [project] = await db.select().from(plcProjects)
        .where(eq(plcProjects.id, mod.plcProjectId)).limit(1);
      if (!project) throw new Error("PLC project not found");

      const adapter = getAdapter(project.plcBrand);
      const stationRows = await db.select().from(equipmentStations)
        .where(eq(equipmentStations.projectId, project.projectId)).limit(100);
      const stations: StationInfo[] = stationRows.map(s => ({
        id: s.id, stationCode: s.stationCode, stationName: s.stationName,
        stationNameEn: s.stationNameEn || "", stationType: s.stationType,
        electricalParams: (s.electricalParams || {}) as ElectricalParams,
      }));
      const ioRows = await db.select().from(plcIoMappings).where(eq(plcIoMappings.plcProjectId, mod.plcProjectId)).limit(1000);
      const alarmRows = await db.select().from(plcAlarmDefinitions).where(eq(plcAlarmDefinitions.plcProjectId, mod.plcProjectId)).limit(500);
      const accessRows = await db.select().from(plcUserAccessLevels).where(eq(plcUserAccessLevels.plcProjectId, mod.plcProjectId)).limit(20);

      const code = generateModuleCode(adapter, {
        moduleName: mod.moduleName, moduleType: mod.moduleType as ProgramModule["moduleType"],
        moduleNumber: mod.moduleNumber, sortOrder: mod.sortOrder || 0,
        description: mod.description || "", descriptionEn: mod.descriptionEn || "",
        category: mod.category || "", parameterInterface: (mod.parameterInterface || {}) as ProgramModule["parameterInterface"],
      }, {
        stations,
        ioMappings: ioRows.map(r => ({ ...r, stationId: r.stationId, signalName: r.signalName, signalNameEn: r.signalNameEn || "", address: r.address, ioType: r.ioType as IoMappingEntry["ioType"], dataType: r.dataType, moduleRack: r.moduleRack || 0, moduleSlot: r.moduleSlot || 0, moduleChannel: r.moduleChannel || 0, description: r.description || "", safetyRelevant: r.safetyRelevant || false })),
        alarms: alarmRows.map(a => ({ code: a.alarmCode, message: a.messageZh || "", messageEn: a.messageEn || "", triggerCondition: a.triggerCondition || "", interlockAction: a.interlockAction || "", resetType: (a.resetType || "manual") as AlarmDef["resetType"], severity: (a.severity || "medium") as AlarmDef["severity"] })),
        accessLevels: accessRows.map(a => ({ levelNumber: a.levelNumber, levelName: a.levelName, levelNameEn: a.levelNameEn || "", permissions: (a.permissions || {}) as Record<string, boolean>, timeout: a.timeout || 1800 })),
      });

      await db.update(plcProgramModules).set({ sourceCode: code }).where(eq(plcProgramModules.id, input.moduleId));
      return { success: true, codeLength: code.length };
    }),

  // ─── I/O Mapping ───────────────────────────────────────────────────────

  plcGetIoMapping: protectedProcedure
    .input(z.object({ plcProjectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db.select().from(plcIoMappings)
        .where(eq(plcIoMappings.plcProjectId, input.plcProjectId)).limit(1000);
    }),

  plcUpdateIoMapping: requirePermission("rnd:requirements:manage")
    .input(z.object({ id: z.number(), address: z.string().optional(), description: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const values: Record<string, unknown> = {};
      if (input.address) values.address = input.address;
      if (input.description !== undefined) values.description = input.description;
      await db.update(plcIoMappings).set(values).where(eq(plcIoMappings.id, input.id));
      return { success: true };
    }),

  // ─── Alarm System ──────────────────────────────────────────────────────

  plcGetAlarms: protectedProcedure
    .input(z.object({ plcProjectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db.select().from(plcAlarmDefinitions)
        .where(eq(plcAlarmDefinitions.plcProjectId, input.plcProjectId)).limit(500);
    }),

  plcUpdateAlarm: requirePermission("rnd:requirements:manage")
    .input(z.object({
      id: z.number(),
      messageZh: z.string().optional(),
      messageEn: z.string().optional(),
      resetType: z.string().optional(),
      severity: z.string().optional(),
      troubleshootingSteps: z.array(z.object({
        stepNumber: z.number(),
        action: z.string(),
        actionEn: z.string().optional(),
        expectedResult: z.string().optional(),
        ifFail: z.string().optional(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [alarm] = await db.select({ plcProjectId: plcAlarmDefinitions.plcProjectId }).from(plcAlarmDefinitions).where(eq(plcAlarmDefinitions.id, input.id)).limit(1);
      if (alarm) await assertNotFrozen(alarm.plcProjectId);
      const { id, ...updates } = input;
      const values: Record<string, unknown> = {};
      if (updates.messageZh) values.messageZh = updates.messageZh;
      if (updates.messageEn) values.messageEn = updates.messageEn;
      if (updates.resetType) values.resetType = updates.resetType;
      if (updates.severity) values.severity = updates.severity;
      if (updates.troubleshootingSteps) values.troubleshootingSteps = updates.troubleshootingSteps;
      await db.update(plcAlarmDefinitions).set(values).where(eq(plcAlarmDefinitions.id, id));
      return { success: true };
    }),

  plcExportAlarmList: protectedProcedure
    .input(z.object({ plcProjectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const alarms = await db.select().from(plcAlarmDefinitions)
        .where(eq(plcAlarmDefinitions.plcProjectId, input.plcProjectId)).limit(500);
      // CSV format for HMI import
      const header = "AlarmCode,Class,MessageZh,MessageEn,TriggerCondition,InterlockAction,ResetType,Severity";
      const rows = alarms.map(a =>
        `"${a.alarmCode}","${a.alarmClass}","${a.messageZh}","${a.messageEn}","${a.triggerCondition}","${a.interlockAction}","${a.resetType}","${a.severity}"`
      );
      return { csv: [header, ...rows].join("\n"), count: alarms.length };
    }),

  // ─── User Access Levels ────────────────────────────────────────────────

  plcGetAccessLevels: protectedProcedure
    .input(z.object({ plcProjectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db.select().from(plcUserAccessLevels)
        .where(eq(plcUserAccessLevels.plcProjectId, input.plcProjectId)).limit(20);
    }),

  plcUpdateAccessLevel: requirePermission("rnd:requirements:manage")
    .input(z.object({
      id: z.number(),
      levelName: z.string().optional(),
      levelNameEn: z.string().optional(),
      permissions: z.record(z.string(), z.boolean()).optional(),
      timeout: z.number().optional(),
      passwordPolicy: z.object({
        minLength: z.number().optional(),
        requireDigit: z.boolean().optional(),
        expireDays: z.number().optional(),
        maxAttempts: z.number().optional(),
        lockoutMinutes: z.number().optional(),
      }).optional(),
      defaultUsers: z.array(z.object({
        username: z.string(),
        realName: z.string(),
        role: z.string(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [accessLevel] = await db.select({ plcProjectId: plcUserAccessLevels.plcProjectId }).from(plcUserAccessLevels).where(eq(plcUserAccessLevels.id, input.id)).limit(1);
      if (accessLevel) await assertNotFrozen(accessLevel.plcProjectId);
      const { id, ...updates } = input;
      const values: Record<string, unknown> = {};
      if (updates.levelName) values.levelName = updates.levelName;
      if (updates.levelNameEn) values.levelNameEn = updates.levelNameEn;
      if (updates.permissions) values.permissions = updates.permissions;
      if (updates.timeout !== undefined) values.timeout = updates.timeout;
      if (updates.passwordPolicy) values.passwordPolicy = updates.passwordPolicy;
      if (updates.defaultUsers) values.defaultUsers = updates.defaultUsers;
      await db.update(plcUserAccessLevels).set(values).where(eq(plcUserAccessLevels.id, id));
      return { success: true };
    }),

  // ─── EPLAN Schematics ──────────────────────────────────────────────────

  plcGenerateSchematics: requirePermission("rnd:requirements:manage")
    .input(z.object({ plcProjectId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [project] = await db.select().from(plcProjects)
        .where(eq(plcProjects.id, input.plcProjectId)).limit(1);
      if (!project) throw new Error("PLC project not found");
      await assertNoBlockingConflicts(project.projectId);

      const stationRows = await db.select().from(equipmentStations)
        .where(eq(equipmentStations.projectId, project.projectId)).limit(100);
      const ioRows = await db.select().from(plcIoMappings)
        .where(eq(plcIoMappings.plcProjectId, input.plcProjectId)).limit(1000);

      const stations: StationInfo[] = stationRows.map(s => ({
        id: s.id, stationCode: s.stationCode, stationName: s.stationName,
        stationNameEn: s.stationNameEn || "", stationType: s.stationType,
        electricalParams: (s.electricalParams || {}) as ElectricalParams,
      }));

      const totalPower = stationRows.reduce((sum, s) => {
        const ep = (s.electricalParams || {}) as ElectricalParams;
        return sum + (ep.motorTotalPower || 0) + (ep.heaterTotalPower || 0);
      }, 0);

      const spec: EplanProjectSpec = {
        projectName: project.projectName,
        voltageSystem: "380V/3P/50Hz",
        totalPower,
        stations,
        ioMappings: ioRows.map(r => ({
          signalName: r.signalName, signalNameEn: r.signalNameEn || "",
          address: r.address, ioType: r.ioType as IoMappingEntry["ioType"], dataType: r.dataType,
          moduleRack: r.moduleRack || 0, moduleSlot: r.moduleSlot || 0, moduleChannel: r.moduleChannel || 0,
          stationId: r.stationId, stationCode: stationRows.find(s => s.id === r.stationId)?.stationCode,
          description: r.description || "", safetyRelevant: r.safetyRelevant || false,
        })),
        eStopCount: 4,
        plcModel: project.plcModel || "CPU 1516-3 PN/DP",
        hmiModel: project.hmiModel || "TP1500 Comfort",
      };

      const pages = generateAllSchematics(spec);

      // Clear old schematics
      await db.delete(plcEplanSchematics).where(eq(plcEplanSchematics.plcProjectId, input.plcProjectId));

      for (const page of pages) {
        await db.insert(plcEplanSchematics).values({
          plcProjectId: input.plcProjectId,
          pageNumber: page.pageNumber,
          pageTitle: page.pageTitle,
          pageCategory: page.pageCategory,
          xmlContent: page.xmlContent,
          svgPreview: page.svgPreview,
          stationIds: page.stationIds,
        });
      }

      log.info({ plcProjectId: input.plcProjectId, pages: pages.length }, "EPLAN schematics generated");
      return { pageCount: pages.length };
    }),

  plcGetSchematics: protectedProcedure
    .input(z.object({ plcProjectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db.select().from(plcEplanSchematics)
        .where(eq(plcEplanSchematics.plcProjectId, input.plcProjectId))
        .orderBy(plcEplanSchematics.pageNumber).limit(50);
    }),

  plcExportSchematic: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [page] = await db.select().from(plcEplanSchematics)
        .where(eq(plcEplanSchematics.id, input.id)).limit(1);
      if (!page) throw new Error("Schematic page not found");
      return { xmlContent: page.xmlContent, fileName: `${page.pageCategory}_P${page.pageNumber}.xml` };
    }),

  // ─── Version Management ────────────────────────────────────────────────

  plcCreateVersion: requirePermission("rnd:requirements:manage")
    .input(z.object({
      plcProjectId: z.number(),
      versionString: z.string(),
      changeLog: z.string().default(""),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      // Get changed module IDs
      const modules = await db.select({ id: plcProgramModules.id }).from(plcProgramModules)
        .where(eq(plcProgramModules.plcProjectId, input.plcProjectId)).limit(200);

      const [version] = await db.insert(plcVersionHistory).values({
        plcProjectId: input.plcProjectId,
        versionString: input.versionString,
        versionType: "dev",
        changeLog: input.changeLog,
        changedModules: modules.map(m => m.id),
        promotedBy: ctx.user?.name || "",
        isActive: true,
      }).returning();

      await db.update(plcProjects).set({
        currentVersion: input.versionString,
        currentStatus: "dev",
      }).where(eq(plcProjects.id, input.plcProjectId));

      return version;
    }),

  plcGetVersionHistory: protectedProcedure
    .input(z.object({ plcProjectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db.select().from(plcVersionHistory)
        .where(eq(plcVersionHistory.plcProjectId, input.plcProjectId))
        .orderBy(desc(plcVersionHistory.createdAt)).limit(50);
    }),

  plcRollbackVersion: requirePermission("rnd:requirements:manage")
    .input(z.object({ plcProjectId: z.number(), targetVersionId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [target] = await db.select().from(plcVersionHistory)
        .where(eq(plcVersionHistory.id, input.targetVersionId)).limit(1);
      if (!target) throw new Error("Target version not found");

      // Deactivate current, activate target
      await db.update(plcVersionHistory)
        .set({ isActive: false })
        .where(and(eq(plcVersionHistory.plcProjectId, input.plcProjectId), eq(plcVersionHistory.isActive, true)));

      await db.update(plcVersionHistory)
        .set({ isActive: true })
        .where(eq(plcVersionHistory.id, input.targetVersionId));

      await db.update(plcProjects).set({
        currentVersion: target.versionString,
        currentStatus: target.versionType as PlcProgramStatus,
      }).where(eq(plcProjects.id, input.plcProjectId));

      return { success: true, rolledBackTo: target.versionString };
    }),

  plcCompareVersions: protectedProcedure
    .input(z.object({ versionIdA: z.number(), versionIdB: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [a] = await db.select().from(plcVersionHistory).where(eq(plcVersionHistory.id, input.versionIdA)).limit(1);
      const [b] = await db.select().from(plcVersionHistory).where(eq(plcVersionHistory.id, input.versionIdB)).limit(1);
      if (!a || !b) throw new Error("Version not found");

      const changedA = new Set((a.changedModules || []) as number[]);
      const changedB = new Set((b.changedModules || []) as number[]);
      const onlyInA = [...changedA].filter(id => !changedB.has(id));
      const onlyInB = [...changedB].filter(id => !changedA.has(id));
      const common = [...changedA].filter(id => changedB.has(id));

      return {
        versionA: { id: a.id, version: a.versionString, type: a.versionType },
        versionB: { id: b.id, version: b.versionString, type: b.versionType },
        onlyInA, onlyInB, common,
      };
    }),

  // ─── Logic Diagram & Troubleshooting ───────────────────────────────────

  plcGenerateLogicDiagram: protectedProcedure
    .input(z.object({ plcProjectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const modules = await db.select().from(plcProgramModules)
        .where(eq(plcProgramModules.plcProjectId, input.plcProjectId))
        .orderBy(plcProgramModules.sortOrder).limit(200);

      const programModules = modules.map(m => ({
        moduleName: m.moduleName, moduleType: m.moduleType as ProgramModule["moduleType"],
        moduleNumber: m.moduleNumber, sortOrder: m.sortOrder || 0,
        description: m.description || "", descriptionEn: m.descriptionEn || "",
        category: m.category || "", parameterInterface: (m.parameterInterface || {}) as ProgramModule["parameterInterface"],
      }));

      return {
        programDiagram: generateLogicDiagram(programModules),
        modeDiagram: generateModeStateDiagram(),
      };
    }),

  plcGenerateTroubleshootingGuide: protectedProcedure
    .input(z.object({ alarmId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [alarm] = await db.select().from(plcAlarmDefinitions)
        .where(eq(plcAlarmDefinitions.id, input.alarmId)).limit(1);
      if (!alarm) throw new Error("Alarm not found");

      return {
        alarmCode: alarm.alarmCode,
        message: alarm.messageZh,
        diagram: generateTroubleshootingGuide({
          code: alarm.alarmCode,
          message: alarm.messageZh || "",
          messageEn: alarm.messageEn || "",
          triggerCondition: alarm.triggerCondition || "",
          interlockAction: alarm.interlockAction || "",
          resetType: (alarm.resetType || "manual") as AlarmDef["resetType"],
          severity: (alarm.severity || "medium") as AlarmDef["severity"],
        }),
        steps: alarm.troubleshootingSteps || [],
      };
    }),

  // ─── Brand Info ────────────────────────────────────────────────────────

  plcGetBrands: protectedProcedure
    .query(async () => {
      // Import adapters registry
      const { brandAdapters } = await import("../services/plc-brands/types");
      return Object.values(brandAdapters).map(a => ({
        key: a.brandKey,
        name: a.brandName,
        nameZh: a.brandNameZh,
        models: a.models,
        fileExtension: a.getFileExtension(),
        projectInfo: a.getProjectStructureInfo(),
      }));
    }),

  // ═══════════════════════════════════════════════════════════════════════
  // GIM Transpiler — Multi-Platform Logic-to-Code Engine
  // ═══════════════════════════════════════════════════════════════════════

  gimGenerateLogicModel: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [project] = await db.select().from(plcProjects)
        .where(eq(plcProjects.projectId, input.projectId)).limit(1);

      const stationRows = await db.select().from(equipmentStations)
        .where(eq(equipmentStations.projectId, input.projectId)).limit(100);
      const stations: StationInfo[] = stationRows.map(s => ({
        id: s.id, stationCode: s.stationCode, stationName: s.stationName,
        stationNameEn: s.stationNameEn || "", stationType: s.stationType,
        electricalParams: (s.electricalParams || {}) as ElectricalParams,
      }));

      const { generateGimProject } = await import("../services/plc-transpiler");
      return generateGimProject(
        input.projectId,
        project?.projectName || `Project-${input.projectId}`,
        project?.plcBrand || "SIEMENS_S7_1500",
        stations,
      );
    }),

  gimTranspile: requirePermission("rnd:requirements:manage")
    .input(z.object({
      projectId: z.number(),
      platform: z.enum(["SIEMENS_SCL", "INOVANCE_ST", "FANUC_LAD"]),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await assertNoBlockingConflicts(input.projectId);
      const [project] = await db.select().from(plcProjects)
        .where(eq(plcProjects.projectId, input.projectId)).limit(1);

      const stationRows = await db.select().from(equipmentStations)
        .where(eq(equipmentStations.projectId, input.projectId)).limit(100);
      const stations: StationInfo[] = stationRows.map(s => ({
        id: s.id, stationCode: s.stationCode, stationName: s.stationName,
        stationNameEn: s.stationNameEn || "", stationType: s.stationType,
        electricalParams: (s.electricalParams || {}) as ElectricalParams,
      }));

      const { generateGimProject, getTranspiler } = await import("../services/plc-transpiler");
      const gimProject = generateGimProject(
        input.projectId,
        project?.projectName || `Project-${input.projectId}`,
        project?.plcBrand || "SIEMENS_S7_1500",
        stations,
      );

      const transpiler = getTranspiler(input.platform);
      const result = transpiler.transpile(gimProject);

      log.info({ projectId: input.projectId, platform: input.platform, files: result.files.length }, "GIM transpile completed");
      return result;
    }),

  gimGetHmiLayout: requirePermission("rnd:hmi:view")
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const stationRows = await db.select().from(equipmentStations)
        .where(eq(equipmentStations.projectId, input.projectId)).limit(100);
      const stations: StationInfo[] = stationRows.map(s => ({
        id: s.id, stationCode: s.stationCode, stationName: s.stationName,
        stationNameEn: s.stationNameEn || "", stationType: s.stationType,
        electricalParams: (s.electricalParams || {}) as ElectricalParams,
      }));

      const { generateGimProject } = await import("../services/plc-transpiler");
      const gim = generateGimProject(input.projectId, `Project-${input.projectId}`, "SIEMENS_S7_1500", stations);
      return gim.hmiLayout;
    }),

  gimGetAvailablePlatforms: protectedProcedure
    .query(async () => {
      const { transpilerRegistry } = await import("../services/plc-transpiler");
      return Object.values(transpilerRegistry).map(t => ({
        key: t.platformKey,
        name: t.platformName,
        language: t.language,
        extension: t.getFileExtension(),
      }));
    }),

  // ═══════════════════════════════════════════════════════════════════════
  // Step Execution Engine — Parametric Debugging & Simulation
  // ═══════════════════════════════════════════════════════════════════════

  stepDecomposeProject: requirePermission("rnd:requirements:manage")
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const stationRows = await db.select().from(equipmentStations)
        .where(eq(equipmentStations.projectId, input.projectId)).limit(100);
      const stations: StationInfo[] = stationRows.map(s => ({
        id: s.id, stationCode: s.stationCode, stationName: s.stationName,
        stationNameEn: s.stationNameEn || "", stationType: s.stationType,
        electricalParams: (s.electricalParams || {}) as ElectricalParams,
      }));

      const { generateGimProject } = await import("../services/plc-transpiler");
      const { decomposeProject } = await import("../services/plc-step-engine");

      const gim = generateGimProject(input.projectId, `Project-${input.projectId}`, "SIEMENS_S7_1500", stations);
      return decomposeProject(gim);
    }),

  stepInitEngine: protectedProcedure
    .input(z.object({ projectId: z.number(), stationCode: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const stationRows = await db.select().from(equipmentStations)
        .where(eq(equipmentStations.projectId, input.projectId)).limit(100);
      const stations: StationInfo[] = stationRows.map(s => ({
        id: s.id, stationCode: s.stationCode, stationName: s.stationName,
        stationNameEn: s.stationNameEn || "", stationType: s.stationType,
        electricalParams: (s.electricalParams || {}) as ElectricalParams,
      }));

      const { generateGimProject } = await import("../services/plc-transpiler");
      const { initStepEngine, decomposeStationSequence } = await import("../services/plc-step-engine");

      const gim = generateGimProject(input.projectId, `Project-${input.projectId}`, "SIEMENS_S7_1500", stations);
      const station = gim.stations.find(s => s.stationCode === input.stationCode);
      if (!station) throw new Error(`Station ${input.stationCode} not found`);

      return {
        state: initStepEngine(station),
        steps: decomposeStationSequence(station),
      };
    }),

  // ─── Version Promotion ──────────────────────────────────────────────

  plcPromoteVersion: requirePermission("rnd:requirements:manage")
    .input(z.object({
      plcProjectId: z.number(),
      from: z.enum(["dev", "test"]),
      to: z.enum(["test", "production"]),
      changeLog: z.string().min(1),
      testResults: z.object({
        fatPassed: z.boolean().optional(),
        satPassed: z.boolean().optional(),
        notes: z.string().optional(),
      }).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return promoteVersion({
        ...input,
        promotedBy: ctx.user?.name || "unknown",
      });
    }),

  plcVerifyIntegrity: protectedProcedure
    .input(z.object({ versionId: z.number() }))
    .query(async ({ input }) => {
      return verifyProductionIntegrity(input.versionId);
    }),

  plcGetFullVersionHistory: protectedProcedure
    .input(z.object({ plcProjectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const versions = await db.select().from(plcVersionHistory)
        .where(eq(plcVersionHistory.plcProjectId, input.plcProjectId))
        .orderBy(desc(plcVersionHistory.createdAt))
        .limit(100);
      return versions;
    }),

  // ─── Commissioning CSV Feedback ──────────────────────────────────────

  parseCommissioningCsv: requirePermission("rnd:requirements:manage")
    .input(z.object({
      projectId: z.number(),
      csvContent: z.string().min(10),
    }))
    .mutation(async ({ input }) => {
      const { parseCsvContent, compareWithBaseline } = await import("../services/commissioning-csv-feedback.service");
      const rows = parseCsvContent(input.csvContent);
      if (rows.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No valid CSV rows found" });
      }
      return compareWithBaseline(input.projectId, rows);
    }),

  // ─── Mechanical-Electrical Conflict Check ─────────────────────────────

  checkMechElecConflicts: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return checkDesignConflicts(input.projectId);
    }),
});
