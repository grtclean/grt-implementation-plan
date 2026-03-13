/**
 * Design Review Service
 *
 * Comprehensive scheme evaluation engine covering:
 * 1. Mechanical design review — parameter completeness, range checks, cross-param consistency
 * 2. Electrical design review — IO balance, power budget, safety compliance
 * 3. Process flow review — station sequence logic, cycle time analysis
 * 4. Historical deviation analysis — compare against similar past projects
 * 5. Commissioning guide generation — production & debug instructions
 *
 * Pure functions where possible; DB access only in findSimilarCases wrapper.
 */

import type { MechanicalParams, ElectricalParams } from "../../drizzle/design-engine-schema";
import { validateAgainstStandards, getStationStandards } from "./design-standards.service";

// ══════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════

export type ReviewSeverity = "pass" | "info" | "warning" | "critical";

export interface ReviewItem {
  id: string;
  category: "mechanical" | "electrical" | "process" | "safety" | "standards" | "historical";
  severity: ReviewSeverity;
  title: string;
  detail: string;
  parameter?: string;      // e.g. "tankVolume"
  currentValue?: string;
  expectedRange?: string;   // e.g. "200-800L"
  standardRef?: string;     // e.g. "GRT-ES-001, GB/T 150"
  suggestion?: string;      // actionable fix
}

export interface StationReview {
  stationCode: string;
  stationType: string;
  stationName: string;
  items: ReviewItem[];
  score: number;            // 0-100
  verdict: "approved" | "conditional" | "rejected";
}

export interface ProjectReviewResult {
  projectId: number;
  reviewDate: string;
  stations: StationReview[];
  overallScore: number;     // 0-100
  overallVerdict: "approved" | "conditional" | "rejected";
  summary: {
    totalChecks: number;
    pass: number;
    info: number;
    warning: number;
    critical: number;
  };
  powerBudget: PowerBudgetReview;
  ioBudget: IoBudgetReview;
  cycleTimeAnalysis: CycleTimeReview;
}

export interface PowerBudgetReview {
  motorKW: number;
  heaterKW: number;
  totalKW: number;
  recommendedTransformerKVA: number;
  recommendedCableEntry: string;
  warnings: string[];
}

export interface IoBudgetReview {
  totalDI: number;
  totalDO: number;
  totalAI: number;
  totalAO: number;
  totalPoints: number;
  diModules: number;
  doModules: number;
  aiModules: number;
  aoModules: number;
  recommendedCPU: string;
  warnings: string[];
}

export interface CycleTimeReview {
  stationTimes: Array<{ code: string; type: string; time: number }>;
  bottleneck: { code: string; time: number };
  totalSequentialTime: number;
  estimatedThroughput: number; // parts per hour
  warnings: string[];
}

// ══════════════════════════════════════════════════════════════════════════
// STATION REVIEW ENGINE
// ══════════════════════════════════════════════════════════════════════════

interface StationData {
  stationCode: string;
  stationType: string;
  stationName: string;
  cycleTime: number | null;
  mechanicalParams: Partial<MechanicalParams>;
  electricalParams: Partial<ElectricalParams>;
}

/**
 * Review a single station across all disciplines.
 */
export function reviewStation(station: StationData): StationReview {
  const items: ReviewItem[] = [];
  const mp = station.mechanicalParams;
  const ep = station.electricalParams;
  const cat = getStationCategory(station.stationType);

  // ── 1. Mechanical completeness ──
  const requiredMech = getRequiredMechParams(station.stationType);
  for (const req of requiredMech) {
    const val = mp[req.key as keyof MechanicalParams];
    if (val == null || val === 0 || val === "") {
      items.push({
        id: `mech-missing-${req.key}`,
        category: "mechanical",
        severity: req.critical ? "critical" : "warning",
        title: `${req.label}未设置`,
        detail: `${station.stationCode} 缺少${req.label}参数`,
        parameter: req.key,
        standardRef: req.standardRef,
        suggestion: req.suggestion,
      });
    }
  }

  // ── 2. Mechanical range validation ──
  if (cat === "tank_cleaning" || cat === "spray") {
    // Tank dimensions
    if (mp.tankLength && mp.tankWidth && mp.tankHeight) {
      const vol = (mp.tankLength * mp.tankWidth * mp.tankHeight) / 1e6;
      if (mp.tankVolume && Math.abs(vol - mp.tankVolume) / mp.tankVolume > 0.15) {
        items.push({
          id: `mech-vol-mismatch`,
          category: "mechanical",
          severity: "warning",
          title: "槽体容积与尺寸不一致",
          detail: `L×W×H计算容积=${vol.toFixed(0)}L, 但设定容积=${mp.tankVolume}L (偏差>${15}%)`,
          parameter: "tankVolume",
          currentValue: `${mp.tankVolume}L`,
          expectedRange: `${(vol * 0.85).toFixed(0)}-${(vol * 1.15).toFixed(0)}L`,
          standardRef: "GRT-ES-001",
          suggestion: "校核槽体尺寸或修正容积参数",
        });
      }
    }

    // Pump flow vs tank volume turnover
    if (mp.tankVolume && mp.pumpFlowRate) {
      const turnoverRate = (mp.pumpFlowRate * 60) / mp.tankVolume; // times per hour
      const expectedMin = cat === "spray" ? 6 : station.stationType.includes("RINSE") ? 4 : 2;
      const expectedMax = cat === "spray" ? 12 : 8;
      if (turnoverRate < expectedMin) {
        items.push({
          id: `mech-pump-low-turnover`,
          category: "mechanical",
          severity: "warning",
          title: "泵流量偏小",
          detail: `换水率=${turnoverRate.toFixed(1)}次/h, 建议≥${expectedMin}次/h`,
          parameter: "pumpFlowRate",
          currentValue: `${mp.pumpFlowRate}L/min`,
          expectedRange: `≥${Math.round(mp.tankVolume * expectedMin / 60)}L/min`,
          standardRef: "GB/T 5657, GRT-ES-002",
          suggestion: `建议泵流量≥${Math.round(mp.tankVolume * expectedMin / 60)}L/min`,
        });
      }
      if (turnoverRate > expectedMax) {
        items.push({
          id: `mech-pump-high-turnover`,
          category: "mechanical",
          severity: "info",
          title: "泵流量偏大",
          detail: `换水率=${turnoverRate.toFixed(1)}次/h, 超出常规范围(${expectedMax}次/h)`,
          parameter: "pumpFlowRate",
          standardRef: "GB/T 5657",
          suggestion: "确认是否工艺需要高换水率, 否则可降低以节能",
        });
      }
    }

    // Heater power vs volume (heat-up time check)
    if (mp.tankVolume && mp.heaterPower && mp.heaterPower > 0) {
      const deltaT = 40; // assume 20→60°C typical
      const heatUpHours = (mp.tankVolume * deltaT) / (860 * mp.heaterPower * 0.85);
      const heatUpMin = heatUpHours * 60;
      if (heatUpMin > 60) {
        items.push({
          id: `mech-heater-slow`,
          category: "mechanical",
          severity: "warning",
          title: "加热升温时间过长",
          detail: `预估升温(20→60°C)需${heatUpMin.toFixed(0)}分钟, 建议≤45分钟`,
          parameter: "heaterPower",
          currentValue: `${mp.heaterPower}kW`,
          standardRef: "GB/T 23150, GRT-ES-005",
          suggestion: `建议加热功率≥${Math.round(mp.tankVolume * deltaT / (860 * 0.75 * 0.85))}kW`,
        });
      }
    }
  }

  // Ultrasonic cross-checks
  if (station.stationType === "ULTRASONIC") {
    if (mp.ultrasonicPower && mp.tankVolume) {
      const density = mp.ultrasonicPower / mp.tankVolume;
      if (density < 8) {
        items.push({
          id: `mech-us-low-density`,
          category: "mechanical",
          severity: "warning",
          title: "超声功率密度偏低",
          detail: `功率密度=${density.toFixed(1)}W/L, 标准要求≥10W/L`,
          parameter: "ultrasonicPower",
          standardRef: "IEC 63218, GRT-ES-003",
          suggestion: `建议总功率≥${mp.tankVolume * 10}W`,
        });
      }
    }
    if (mp.transducerCount && mp.ultrasonicPower) {
      const perUnit = mp.ultrasonicPower / mp.transducerCount;
      if (perUnit > 80) {
        items.push({
          id: `mech-us-high-per-unit`,
          category: "mechanical",
          severity: "info",
          title: "单振子功率偏高",
          detail: `${perUnit.toFixed(0)}W/振子, 常规范围25-60W/振子`,
          parameter: "transducerCount",
          standardRef: "GB/T 32580",
          suggestion: "增加振子数量以提高均匀性",
        });
      }
    }
  }

  // Spray cross-checks
  if (cat === "spray" && mp.nozzleCount && mp.sprayPressure) {
    if (mp.nozzleCount < 4) {
      items.push({
        id: `mech-spray-few-nozzles`,
        category: "mechanical",
        severity: "warning",
        title: "喷嘴数量偏少",
        detail: `仅${mp.nozzleCount}个喷嘴, 可能存在清洗盲区`,
        parameter: "nozzleCount",
        standardRef: "ISO 16232-3, GRT-ES-004",
        suggestion: "建议≥6个喷嘴(两侧+顶部各至少2个)",
      });
    }
  }

  // ── 3. Electrical checks ──
  if (ep.motorCount && ep.motorTotalPower) {
    const avgPower = ep.motorTotalPower / ep.motorCount;
    if (avgPower > 15) {
      items.push({
        id: `elec-motor-high-avg`,
        category: "electrical",
        severity: "info",
        title: "单电机平均功率偏高",
        detail: `平均${avgPower.toFixed(1)}kW/台, 确认VFD/软启动器配置`,
        parameter: "motorTotalPower",
        standardRef: "IEC 60204-1, NFPA 79",
      });
    }
  }

  // IO completeness
  const minDI = cat === "tank_cleaning" ? 8 : cat === "handling" ? 6 : 4;
  if (ep.plcDI != null && ep.plcDI < minDI) {
    items.push({
      id: `elec-io-low-di`,
      category: "electrical",
      severity: "warning",
      title: "DI点数偏少",
      detail: `DI=${ep.plcDI}点, 该类型工位建议≥${minDI}点`,
      parameter: "plcDI",
      standardRef: "IEC 61131-3, GRT-ES-006",
      suggestion: `至少需要: 急停(1)+运行反馈(${ep.motorCount || 1}×2)+传感器`,
    });
  }

  // Safety interlock check
  if (!ep.safetyInterlocks || ep.safetyInterlocks.length === 0) {
    if (cat !== "handling" && cat !== "inspection") {
      items.push({
        id: `safety-no-interlocks`,
        category: "safety",
        severity: "critical",
        title: "未定义安全联锁",
        detail: "该工位无安全联锁清单, 不满足ISO 13849-1/GRT-ES-007要求",
        standardRef: "ISO 13849-1, GRT-ES-007",
        suggestion: "至少需要: emergency_stop. 加热工位需: liquid_level_low + over_temperature",
      });
    }
  }

  // Emergency stop
  if (ep.emergencyStopCount != null && ep.emergencyStopCount < 1) {
    items.push({
      id: `safety-no-estop`,
      category: "safety",
      severity: "critical",
      title: "急停按钮缺失",
      detail: "每个操作面至少1个急停, GRT标准≥2个/设备",
      parameter: "emergencyStopCount",
      standardRef: "ISO 13849-1, IEC 60204-1, OSHA 1910, GRT-ES-007",
      suggestion: "设置至少2个急停(操作侧+电柜侧)",
    });
  }

  // ── 4. Standards validation for each set param ──
  const allParams: Record<string, number | string> = {};
  for (const [k, v] of Object.entries(mp)) {
    if (v != null && v !== "") allParams[k] = v as number | string;
  }
  for (const [k, v] of Object.entries(ep)) {
    if (v != null && v !== "" && typeof v !== "object") allParams[k] = v as number | string;
  }
  for (const [paramKey, value] of Object.entries(allParams)) {
    const result = validateAgainstStandards(station.stationType, paramKey, value);
    for (const warn of result.warnings) {
      items.push({
        id: `std-${paramKey}-${items.length}`,
        category: "standards",
        severity: "warning",
        title: `标准校核: ${paramKey}`,
        detail: warn,
        parameter: paramKey,
        currentValue: String(value),
        standardRef: result.standardRefs.join(", "),
      });
    }
  }

  // ── 5. Cycle time check ──
  if (!station.cycleTime || station.cycleTime <= 0) {
    items.push({
      id: `process-no-cycle`,
      category: "process",
      severity: "warning",
      title: "未设置节拍时间",
      detail: "工位节拍未定义, 无法进行产线平衡分析",
      parameter: "cycleTime",
      suggestion: "根据工艺要求设置合理节拍(通常45-120秒)",
    });
  }

  // ── Add pass items for completed checks ──
  if (items.filter(i => i.severity === "critical").length === 0) {
    if (mp.tankVolume && mp.tankLength && mp.tankWidth && mp.tankHeight) {
      items.push({ id: "pass-tank", category: "mechanical", severity: "pass", title: "槽体参数完整", detail: "尺寸、容积、材质均已配置" });
    }
    if (ep.plcDI && ep.plcDO) {
      items.push({ id: "pass-io", category: "electrical", severity: "pass", title: "IO配置完整", detail: `DI:${ep.plcDI} DO:${ep.plcDO} AI:${ep.plcAI || 0} AO:${ep.plcAO || 0}` });
    }
    if (ep.safetyInterlocks && ep.safetyInterlocks.length > 0) {
      items.push({ id: "pass-safety", category: "safety", severity: "pass", title: "安全联锁已配置", detail: ep.safetyInterlocks.join(", ") });
    }
  }

  // ── Score calculation ──
  const criticals = items.filter(i => i.severity === "critical").length;
  const warns = items.filter(i => i.severity === "warning").length;
  const infos = items.filter(i => i.severity === "info").length;
  const passes = items.filter(i => i.severity === "pass").length;
  const total = criticals + warns + infos + passes;
  const score = total > 0 ? Math.max(0, Math.round(100 - criticals * 25 - warns * 8 - infos * 2)) : 50;

  return {
    stationCode: station.stationCode,
    stationType: station.stationType,
    stationName: station.stationName,
    items,
    score,
    verdict: criticals > 0 ? "rejected" : warns > 2 ? "conditional" : "approved",
  };
}

// ══════════════════════════════════════════════════════════════════════════
// PROJECT-LEVEL REVIEW
// ══════════════════════════════════════════════════════════════════════════

/**
 * Review all stations of a project + project-level cross-checks.
 */
export function reviewProject(
  projectId: number,
  stations: StationData[],
): ProjectReviewResult {
  // Per-station reviews
  const stationReviews = stations.map(s => reviewStation(s));

  // ── Power budget ──
  let motorKW = 0, heaterKW = 0;
  const powerWarnings: string[] = [];
  for (const s of stations) {
    motorKW += (s.electricalParams.motorTotalPower || 0);
    heaterKW += (s.electricalParams.heaterTotalPower || 0);
  }
  const totalKW = motorKW + heaterKW;
  // Transformer: total × 1.25 safety factor, rounded to standard
  const transformerKVA = roundToStandardTransformer(totalKW * 1.25);
  const cableEntry = totalKW < 50 ? "3×35mm² + PE16mm²" :
    totalKW < 100 ? "3×70mm² + PE35mm²" :
    totalKW < 200 ? "3×120mm² + PE70mm²" : "3×185mm² + PE95mm²";

  if (totalKW > 200) powerWarnings.push("总功率>200kW, 建议独立供电变压器 + 功率因数补偿柜");
  if (heaterKW > motorKW * 3) powerWarnings.push("加热功率远大于电机功率, 建议SCR调功错峰启动");
  if (totalKW > 0 && totalKW < 10) powerWarnings.push("总功率<10kW, 小型线可考虑一体式控制柜");

  // ── IO budget ──
  let totalDI = 0, totalDO = 0, totalAI = 0, totalAO = 0;
  for (const s of stations) {
    totalDI += (s.electricalParams.plcDI || 0);
    totalDO += (s.electricalParams.plcDO || 0);
    totalAI += (s.electricalParams.plcAI || 0);
    totalAO += (s.electricalParams.plcAO || 0);
  }
  const totalIO = totalDI + totalDO + totalAI + totalAO;
  const diModules = Math.ceil(totalDI * 1.15 / 16); // +15% spare
  const doModules = Math.ceil(totalDO * 1.15 / 16);
  const aiModules = Math.ceil(totalAI * 1.15 / 8);
  const aoModules = Math.ceil(totalAO * 1.15 / 4);
  const cpuModel = totalIO > 300 ? "S7-1518F-4 PN/DP" :
    totalIO > 200 ? "S7-1517F-3 PN/DP" :
    totalIO > 100 ? "S7-1516F-3 PN/DP" : "S7-1515F-2 PN";

  const ioWarnings: string[] = [];
  if (totalIO > 500) ioWarnings.push("总IO>500点, 建议分布式IO (ET200SP远程站)");
  if (totalAI > 32) ioWarnings.push("AI通道>32, 注意模拟量采集周期对控制精度的影响");

  // ── Cycle time analysis ──
  const stationTimes = stations
    .filter(s => s.cycleTime && s.cycleTime > 0)
    .map(s => ({ code: s.stationCode, type: s.stationType, time: s.cycleTime! }));
  const bottleneck = stationTimes.length > 0
    ? stationTimes.reduce((max, s) => s.time > max.time ? s : max, stationTimes[0])
    : { code: "N/A", time: 0 };
  const totalSequentialTime = stationTimes.reduce((sum, s) => sum + s.time, 0);
  const throughput = bottleneck.time > 0 ? Math.round(3600 / bottleneck.time) : 0;

  const ctWarnings: string[] = [];
  if (stationTimes.length > 0) {
    const avgTime = totalSequentialTime / stationTimes.length;
    const maxDeviation = bottleneck.time / avgTime;
    if (maxDeviation > 1.5) {
      ctWarnings.push(`瓶颈工位${bottleneck.code}(${bottleneck.time}s)远超平均(${avgTime.toFixed(0)}s), 建议并行或工艺优化`);
    }
    if (stationTimes.length < stations.length) {
      ctWarnings.push(`${stations.length - stationTimes.length}个工位未设置节拍, 无法完整分析`);
    }
  }

  // ── Process flow sequence check ──
  const processItems: ReviewItem[] = [];
  const orderCheck = validateStationOrder(stations);
  for (const issue of orderCheck) {
    processItems.push({
      id: `process-order-${processItems.length}`,
      category: "process",
      severity: issue.severity,
      title: issue.title,
      detail: issue.detail,
      suggestion: issue.suggestion,
    });
  }

  // Add process items to first station or create virtual
  if (processItems.length > 0 && stationReviews.length > 0) {
    stationReviews[0].items.push(...processItems);
  }

  // ── Overall summary ──
  const allItems = stationReviews.flatMap(s => s.items);
  const summary = {
    totalChecks: allItems.length,
    pass: allItems.filter(i => i.severity === "pass").length,
    info: allItems.filter(i => i.severity === "info").length,
    warning: allItems.filter(i => i.severity === "warning").length,
    critical: allItems.filter(i => i.severity === "critical").length,
  };

  const overallScore = stationReviews.length > 0
    ? Math.round(stationReviews.reduce((sum, s) => sum + s.score, 0) / stationReviews.length)
    : 0;

  const overallVerdict: "approved" | "conditional" | "rejected" =
    summary.critical > 0 ? "rejected" :
    summary.warning > 5 ? "conditional" : "approved";

  return {
    projectId,
    reviewDate: new Date().toISOString(),
    stations: stationReviews,
    overallScore,
    overallVerdict,
    summary,
    powerBudget: {
      motorKW, heaterKW, totalKW,
      recommendedTransformerKVA: transformerKVA,
      recommendedCableEntry: cableEntry,
      warnings: powerWarnings,
    },
    ioBudget: {
      totalDI, totalDO, totalAI, totalAO, totalPoints: totalIO,
      diModules, doModules, aiModules, aoModules,
      recommendedCPU: cpuModel,
      warnings: ioWarnings,
    },
    cycleTimeAnalysis: {
      stationTimes,
      bottleneck,
      totalSequentialTime,
      estimatedThroughput: throughput,
      warnings: ctWarnings,
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════
// COMMISSIONING GUIDE GENERATOR
// ══════════════════════════════════════════════════════════════════════════

export interface CommissioningGuide {
  projectName: string;
  generatedAt: string;
  sections: CommissioningSection[];
}

export interface CommissioningSection {
  title: string;
  subsections: Array<{
    subtitle: string;
    steps: string[];
    warnings?: string[];
    checkpoints?: string[];
  }>;
}

/**
 * Generate a structured commissioning & production guide document.
 */
export function generateCommissioningGuide(
  projectName: string,
  stations: StationData[],
  review: ProjectReviewResult,
): CommissioningGuide {
  const sections: CommissioningSection[] = [];

  // ── Section 1: Pre-Installation Checklist ──
  sections.push({
    title: "1. 安装前检查清单 (Pre-Installation Checklist)",
    subsections: [
      {
        subtitle: "1.1 现场条件确认",
        steps: [
          `确认电源: ${review.powerBudget.totalKW > 100 ? "380V/3P/50Hz 独立变压器" : "380V/3P/50Hz 车间配电"}, 变压器容量≥${review.powerBudget.recommendedTransformerKVA}KVA`,
          `进线电缆: ${review.powerBudget.recommendedCableEntry}`,
          `接地: 接地电阻≤4Ω, 接地铜排截面≥主线50%`,
          "压缩空气: 0.6-0.8MPa, 干燥无油 (露点≤-20°C)",
          `给排水: 进水DN25 (自来水), 排水DN${stations.length > 8 ? "80" : "50"} (含废液收集)`,
          stations.some(s => s.stationType === "DI_RINSE") ? "纯水供给: DI水 电阻率≥1MΩ·cm (精密级≥10MΩ·cm)" : "",
          `地面承重: ≥${Math.max(500, stations.length * 200)}kg/m² (满液工况)`,
          "环境温度: 5-40°C, 湿度≤85%RH (非凝露)",
        ].filter(Boolean),
        checkpoints: [
          "□ 电源容量核实",
          "□ 接地点位确认",
          "□ 给排水管位确认",
          "□ 地面平整度≤3mm/m",
          "□ 起重设备可及性确认",
        ],
      },
      {
        subtitle: "1.2 设备到货验收",
        steps: [
          "核对装箱清单 vs BOM (每件扫码确认)",
          "外观检查: 运输损伤、焊缝质量、表面光洁度",
          `控制柜: 开门检查元器件紧固、接线端子标号、${review.ioBudget.recommendedCPU} PLC模块就位`,
          "液路: 阀门/泵/管路试压 (1.5倍工作压力, 保压15min无渗漏)",
          stations.some(s => s.stationType === "ULTRASONIC") ? "超声振板: 检查振子粘接质量 (敲击无空响)" : "",
        ].filter(Boolean),
      },
    ],
  });

  // ── Section 2: Mechanical Installation ──
  const mechSteps: Array<{ subtitle: string; steps: string[]; warnings?: string[] }> = [];
  for (const st of stations) {
    const mp = st.mechanicalParams;
    const steps: string[] = [];
    const warns: string[] = [];
    const cat = getStationCategory(st.stationType);

    steps.push(`就位: ${st.stationCode} ${st.stationName} → 按布局图定位, 调节支腿水平 (气泡水平仪, ≤1mm/m)`);

    if (cat === "tank_cleaning" || cat === "spray") {
      if (mp.tankLength) steps.push(`槽体安装: ${mp.tankLength}×${mp.tankWidth || "?"}×${mp.tankHeight || "?"}mm, 材质${mp.tankMaterial || "SUS304"}`);
      if (mp.pumpType) steps.push(`循环泵: ${mp.pumpType} Q=${mp.pumpFlowRate || "?"}L/min H=${mp.pumpHead || "?"}m — 安装减振垫, 进出口软连接`);
      if (mp.heaterPower) {
        steps.push(`加热器: ${mp.heaterPower}kW — 安装前检查绝缘电阻(≥2MΩ@500VDC), 加热管距槽底≥50mm`);
        warns.push("注意: 加热管必须完全浸入液面以下, 严禁干烧");
      }
      if (mp.filtrationMicron) steps.push(`过滤器: ${mp.filtrationMicron}μm — 安装在泵回流管路, 配压差表(ΔP报警=0.5bar)`);
    }
    if (st.stationType === "ULTRASONIC") {
      steps.push(`超声波: ${mp.ultrasonicFrequency || "?"}kHz, ${mp.ultrasonicPower || "?"}W, ${mp.transducerCount || "?"}振子 — 连接发生器, 检查阻抗匹配`);
      warns.push("超声波振板方向不可倒置, 注意UP箭头标识");
    }
    if (cat === "spray") {
      steps.push(`喷嘴: ${mp.nozzleType || "flat-fan"} ×${mp.nozzleCount || "?"} — 按图纸间距安装, 方向对准工件面`);
      steps.push(`管路: 歧管→支管连接, 试压${(mp.sprayPressure || 5) * 1.5}bar/15min`);
    }
    if (cat === "drying") {
      if (mp.dryingAirflow) steps.push(`风机/风刀: ${mp.dryingAirflow}m³/h — 连接风管, 检查旋转方向`);
      if (mp.vacuumLevel != null) steps.push(`真空系统: 目标${mp.vacuumLevel}mbar — 连接真空管路, 泄漏测试<1mbar/min`);
    }
    if (cat === "handling") {
      steps.push(`输送机构: ${mp.conveyorType || "roller"} — 安装导轨, 调节间隙, 速度${mp.conveyorSpeed || 5}m/min`);
    }

    steps.push("管路连接: 进液/排液/溢流管路按P&ID图连接, 阀门开关方向标识");

    mechSteps.push({ subtitle: `2.${stations.indexOf(st) + 1} ${st.stationCode} ${st.stationName}`, steps, warnings: warns.length > 0 ? warns : undefined });
  }
  sections.push({
    title: "2. 机械安装 (Mechanical Installation)",
    subsections: mechSteps,
  });

  // ── Section 3: Electrical Installation ──
  sections.push({
    title: "3. 电气安装 (Electrical Installation)",
    subsections: [
      {
        subtitle: "3.1 控制柜安装",
        steps: [
          `控制柜就位 — CPU: ${review.ioBudget.recommendedCPU}`,
          `IO模块: DI×${review.ioBudget.diModules}(${review.ioBudget.totalDI}点), DO×${review.ioBudget.doModules}(${review.ioBudget.totalDO}点), AI×${review.ioBudget.aiModules}(${review.ioBudget.totalAI}点), AO×${review.ioBudget.aoModules}(${review.ioBudget.totalAO}点)`,
          `主断路器合闸, 测量三相电压: L1-L2, L2-L3, L1-L3 (380V±10%)`,
          "控制变压器检查: 24VDC输出电压 24.0-28.8V",
          "安全回路: 急停按钮测试 (每个按钮按下→PLC安全输入=0→所有输出断电)",
        ],
        warnings: [
          "电气施工前必须确认主断路器OFF + LOTO挂锁",
          `总装机功率${review.powerBudget.totalKW.toFixed(1)}kW, 变压器需≥${review.powerBudget.recommendedTransformerKVA}KVA`,
        ],
      },
      {
        subtitle: "3.2 现场接线",
        steps: [
          "电机接线: 按端子图接线, 检查旋转方向(泵/风机), 相序一致",
          "传感器接线: 温度PT100(三线制), 液位(NAMUR), 压力(4-20mA)",
          "安全设备: 急停(NC常闭→安全继电器), 门磁(NC常闭→F-DI)",
          "接线标号: 每端标识, 对照IO分配表逐点核对",
          "绝缘测试: 动力回路500VDC/≥2MΩ, 控制回路250VDC/≥1MΩ",
        ],
        checkpoints: [
          "□ 电机旋转方向确认",
          "□ 传感器信号在线测试",
          "□ 急停功能测试 (每个按钮)",
          "□ 接地连续性<0.1Ω",
          "□ 绝缘电阻合格",
        ],
      },
    ],
  });

  // ── Section 4: Commissioning (调试) ──
  const commSteps: Array<{ subtitle: string; steps: string[]; checkpoints?: string[] }> = [];

  // 4.1 Dry run
  commSteps.push({
    subtitle: "4.1 空载调试 (Dry Run)",
    steps: [
      "PLC上电, 检查模块状态指示灯(全绿=正常)",
      "HMI启动, 检查画面显示、语言切换、报警历史",
      "单台电机点动测试: 正转/反转/停止, 检查电流≤额定值",
      "阀门动作测试: 手动→自动, 确认开关位置反馈正确",
      "传感器在线校验: 温度(对比手持仪), 液位(注水验证), 压力(压力表对比)",
      "安全功能测试: 急停→全线停机, 门联锁→工位停机, 液位低→加热断电",
    ],
    checkpoints: [
      "□ PLC无报警", "□ 每台电机正常", "□ 传感器读数准确",
      "□ 安全功能100%通过", "□ HMI报警记录正常",
    ],
  });

  // 4.2 Wet run per station
  for (const st of stations) {
    const mp = st.mechanicalParams;
    const cat = getStationCategory(st.stationType);
    const steps: string[] = [];
    const checkpoints: string[] = [];

    if (cat === "tank_cleaning") {
      steps.push(`注水至工作液位(距溢流口50mm), 观察渗漏`);
      steps.push(`启动循环泵, 检查流量(${mp.pumpFlowRate || "?"}L/min)和压力`);
      if (mp.heaterPower) {
        steps.push(`加热: 设定${mp.dryingTemp || 60}°C, 记录升温曲线(目标≤45min至60°C)`);
        checkpoints.push("□ 升温曲线记录");
      }
      if (st.stationType === "ULTRASONIC") {
        steps.push(`超声波: 功率50%→100%渐增, 铝箔测试验证均匀性`);
        steps.push(`脱气: 运行10min后放置铝箔, 穿孔均匀=合格`);
        checkpoints.push("□ 铝箔穿孔测试合格");
      }
      steps.push("溢流/排液测试: 开溢流阀→回收槽, 开排液阀→排空(≤5min)");
      checkpoints.push("□ 泵流量合格", "□ 无渗漏");
    }
    if (cat === "spray") {
      steps.push(`启动高压泵, 检查压力${mp.sprayPressure || 5}bar, 观察喷嘴覆盖pattern`);
      steps.push("放置测试工件, 检查各面是否100%覆盖(无干斑)");
      checkpoints.push("□ 喷淋覆盖100%", "□ 压力稳定");
    }
    if (cat === "drying") {
      steps.push(`启动风机/真空泵, 检查风速/真空度`);
      if (mp.vacuumLevel != null) {
        steps.push(`真空抽气: 目标${mp.vacuumLevel}mbar, 记录抽气时间`);
        checkpoints.push("□ 真空度达标", "□ 泄漏率<1mbar/min");
      }
      if (mp.dryingAirflow) checkpoints.push("□ 风量合格");
    }
    if (cat === "handling") {
      steps.push(`输送测试: 空载运行, 检查速度${mp.conveyorSpeed || 5}m/min, 限位开关`);
      steps.push("负载测试: 放置额定重量工件, 检查稳定性");
      checkpoints.push("□ 速度稳定", "□ 限位正常");
    }

    if (steps.length > 0) {
      commSteps.push({
        subtitle: `4.${commSteps.length + 1} ${st.stationCode} ${st.stationName}`,
        steps,
        checkpoints: checkpoints.length > 0 ? checkpoints : undefined,
      });
    }
  }

  // 4.N Full line test
  commSteps.push({
    subtitle: `4.${commSteps.length + 1} 全线联调 (Full Line Test)`,
    steps: [
      "自动模式运行: 上料→全流程→下料, 运行≥10个循环",
      `验证瓶颈节拍: ${review.cycleTimeAnalysis.bottleneck.code} ≤${review.cycleTimeAnalysis.bottleneck.time}s`,
      `产量验证: 目标≥${review.cycleTimeAnalysis.estimatedThroughput}件/h`,
      "报警/异常处理: 模拟各类故障(缺液/过温/急停), 确认保护动作正确",
      "连续运行8h稳定性测试: 记录温度/压力/液位趋势",
    ],
    checkpoints: [
      "□ 10个循环无故障", "□ 节拍达标", "□ 产量达标",
      "□ 故障保护全部验证", "□ 8h稳定运行",
    ],
  });

  sections.push({
    title: "4. 调试 (Commissioning)",
    subsections: commSteps,
  });

  // ── Section 5: Acceptance & Documentation ──
  sections.push({
    title: "5. 验收与文档 (Acceptance & Documentation)",
    subsections: [
      {
        subtitle: "5.1 出厂检验项目",
        steps: [
          "外观检查: 焊缝质量、表面处理、标识标牌",
          "尺寸检查: 关键尺寸抽检(槽体内径±2mm, 安装孔位±1mm)",
          `电气安全: 绝缘测试(${review.powerBudget.totalKW > 50 ? "2000V" : "1000V"}/1min), 接地(<0.1Ω)`,
          "功能测试: 每个工位单独运行+全线自动运行",
          "清洁度验证: 末站出口工件取样 → 颗粒度分析(ISO 16232)",
        ],
        checkpoints: [
          "□ FAT检验报告签署", "□ IO点检表100%", "□ 安全功能测试报告",
          "□ 清洁度检测报告", "□ 电气绝缘/接地报告",
        ],
      },
      {
        subtitle: "5.2 交付文档清单",
        steps: [
          "机械图纸: 总装图 + 各工位详图 + P&ID (PDF + DWG)",
          "电气图纸: 主回路图 + 控制回路图 + IO分配表 (PDF + EPLAN)",
          "PLC程序: 源代码 + 注释 + 变量表 (TIA Portal项目文件)",
          "HMI画面: 源文件 + 画面说明",
          "操作手册: 日常操作 + 参数设置 + 维护保养 + 故障排除",
          "备件清单: 易损件(过滤器芯/密封件/加热管) + 推荐库存量",
          "材质证书: 不锈钢3.1证书 + 泵/电机合格证",
          "认证文件: CE/UL证书(如适用) + 风险评估报告",
        ],
      },
    ],
  });

  return {
    projectName,
    generatedAt: new Date().toISOString(),
    sections,
  };
}

/**
 * Export commissioning guide as Markdown text.
 */
export function commissioningGuideToMarkdown(guide: CommissioningGuide): string {
  const lines: string[] = [];
  lines.push(`# ${guide.projectName} — 生产调试指导书`);
  lines.push(`**生成时间:** ${guide.generatedAt.slice(0, 16).replace("T", " ")}`);
  lines.push(`**GRT Cleaning Technology — M3 Design Engine**`);
  lines.push("");

  for (const section of guide.sections) {
    lines.push(`## ${section.title}`);
    lines.push("");
    for (const sub of section.subsections) {
      lines.push(`### ${sub.subtitle}`);
      lines.push("");
      for (const step of sub.steps) {
        lines.push(`- ${step}`);
      }
      if (sub.warnings && sub.warnings.length > 0) {
        lines.push("");
        lines.push("**⚠ 注意事项:**");
        for (const w of sub.warnings) {
          lines.push(`- ⚠ ${w}`);
        }
      }
      if (sub.checkpoints && sub.checkpoints.length > 0) {
        lines.push("");
        lines.push("**检查项:**");
        for (const cp of sub.checkpoints) {
          lines.push(`- ${cp}`);
        }
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

// ══════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════

function getStationCategory(stationType: string): string {
  const map: Record<string, string> = {
    ULTRASONIC: "tank_cleaning", PRE_WASH: "tank_cleaning", RINSE: "tank_cleaning",
    DI_RINSE: "tank_cleaning", PASSIVATION: "tank_cleaning", DEGREASING: "tank_cleaning",
    TURBULENCE: "tank_cleaning", SPRAY: "spray", ROBOT_CLEAN: "spray",
    AIR_KNIFE: "drying", HOT_AIR_DRY: "drying", VACUUM_DRY: "drying",
    COOLDOWN: "drying", LOADING: "handling", UNLOADING: "handling",
    TRANSFER: "handling", INSPECTION: "inspection",
  };
  return map[stationType] || "tank_cleaning";
}

function getRequiredMechParams(stationType: string): Array<{ key: string; label: string; critical: boolean; standardRef: string; suggestion: string }> {
  const cat = getStationCategory(stationType);
  const base: Array<{ key: string; label: string; critical: boolean; standardRef: string; suggestion: string }> = [];

  if (cat === "tank_cleaning") {
    base.push(
      { key: "tankLength", label: "槽体长度", critical: true, standardRef: "GRT-ES-001", suggestion: "=工件长×1.5" },
      { key: "tankWidth", label: "槽体宽度", critical: true, standardRef: "GRT-ES-001", suggestion: "=工件宽×1.5" },
      { key: "tankHeight", label: "槽体高度", critical: true, standardRef: "GRT-ES-001", suggestion: "=工件高+180mm" },
      { key: "tankVolume", label: "槽体容积", critical: false, standardRef: "GB/T 150", suggestion: "=L×W×H/10⁶" },
      { key: "tankMaterial", label: "槽体材质", critical: true, standardRef: "DIN 6601, GRT-ES-008", suggestion: "碱性→SUS304, 酸性→SUS316L" },
      { key: "pumpType", label: "泵类型", critical: false, standardRef: "GRT-ES-002", suggestion: "离心泵(标准)/磁力泵(防泄漏)" },
      { key: "pumpFlowRate", label: "泵流量", critical: true, standardRef: "ISO 2858", suggestion: "=容积×换水率/60" },
    );
    if (stationType === "ULTRASONIC") {
      base.push(
        { key: "ultrasonicFrequency", label: "超声频率", critical: true, standardRef: "IEC 63218, GRT-ES-003", suggestion: "按颗粒度选择" },
        { key: "ultrasonicPower", label: "超声功率", critical: true, standardRef: "IEC 63218", suggestion: "=容积×功率密度" },
        { key: "transducerCount", label: "振子数量", critical: false, standardRef: "GB/T 32580", suggestion: "=总功率/单振子功率" },
      );
    }
  }
  if (cat === "spray") {
    base.push(
      { key: "nozzleType", label: "喷嘴类型", critical: true, standardRef: "GRT-ES-004", suggestion: "flat-fan(平面)/full-cone(腔体)" },
      { key: "nozzleCount", label: "喷嘴数量", critical: true, standardRef: "ISO 16232-3", suggestion: "=管数×每管喷嘴数" },
      { key: "sprayPressure", label: "喷淋压力", critical: true, standardRef: "ISO 16232-3, VDA 19.1", suggestion: "标准3bar/精密5bar/超精密8bar" },
      { key: "pumpFlowRate", label: "泵流量", critical: true, standardRef: "GRT-ES-002", suggestion: "=总喷嘴流量×1.1" },
    );
  }
  if (cat === "drying") {
    if (stationType === "VACUUM_DRY") {
      base.push(
        { key: "vacuumLevel", label: "真空度", critical: true, standardRef: "DIN 12880, GRT-ES-009", suggestion: "标准10mbar/精密1mbar" },
      );
    } else {
      base.push(
        { key: "dryingAirflow", label: "风量", critical: true, standardRef: "DIN 12880, GRT-ES-009", suggestion: "=表面积×5-8m³/h/m²" },
      );
    }
    base.push(
      { key: "dryingTemp", label: "干燥温度", critical: false, standardRef: "DIN 12880", suggestion: "热风60-80°C, 真空50°C" },
    );
  }
  if (cat === "handling") {
    base.push(
      { key: "conveyorType", label: "输送类型", critical: false, standardRef: "ISO 5048", suggestion: "roller/chain/hoist" },
      { key: "weightCapacity", label: "承重能力", critical: true, standardRef: "ISO 5048, GB/T 10595", suggestion: "=工件重量×1.5" },
    );
  }

  return base;
}

function validateStationOrder(stations: StationData[]): Array<{ severity: ReviewSeverity; title: string; detail: string; suggestion?: string }> {
  const issues: Array<{ severity: ReviewSeverity; title: string; detail: string; suggestion?: string }> = [];
  if (stations.length < 2) return issues;

  const types = stations.map(s => s.stationType);
  const cats = stations.map(s => getStationCategory(s.stationType));

  // Check: should start with LOADING/handling
  if (cats[0] !== "handling") {
    issues.push({
      severity: "info",
      title: "首工位非上料工位",
      detail: `第一个工位${stations[0].stationCode}(${stations[0].stationType})不是上料工位`,
      suggestion: "考虑在首位添加LOADING上料工位",
    });
  }

  // Check: should end with UNLOADING/handling
  if (cats[cats.length - 1] !== "handling" && cats[cats.length - 1] !== "inspection") {
    issues.push({
      severity: "info",
      title: "末工位非下料/检测工位",
      detail: `最后工位${stations[stations.length - 1].stationCode}(${stations[stations.length - 1].stationType})`,
      suggestion: "考虑在末位添加UNLOADING下料工位或INSPECTION检测工位",
    });
  }

  // Check: drying should come after cleaning
  const lastCleanIdx = types.reduce((last, t, i) => getStationCategory(t) === "tank_cleaning" || getStationCategory(t) === "spray" ? i : last, -1);
  const firstDryIdx = cats.indexOf("drying");
  if (firstDryIdx >= 0 && lastCleanIdx >= 0 && firstDryIdx < lastCleanIdx) {
    issues.push({
      severity: "warning",
      title: "干燥工位在清洗工位之前",
      detail: `干燥${stations[firstDryIdx].stationCode}在清洗${stations[lastCleanIdx].stationCode}之前, 可能导致重复污染`,
      suggestion: "将干燥工位移至所有清洗工位之后",
    });
  }

  // Check: DI_RINSE should be after other rinses
  const diRinseIdx = types.indexOf("DI_RINSE");
  const lastNonDiRinse = types.reduce((last, t, i) => (t === "RINSE" || t === "PRE_WASH" || t === "DEGREASING") ? i : last, -1);
  if (diRinseIdx >= 0 && lastNonDiRinse >= 0 && diRinseIdx < lastNonDiRinse) {
    issues.push({
      severity: "warning",
      title: "纯水漂洗位置不当",
      detail: "DI_RINSE(纯水漂洗)应在普通漂洗之后, 作为末级清洗",
      suggestion: "将纯水漂洗移至普通漂洗之后",
    });
  }

  // Check: PASSIVATION should be near end (after rinse)
  const passIdx = types.indexOf("PASSIVATION");
  if (passIdx >= 0 && passIdx < stations.length - 4) {
    issues.push({
      severity: "info",
      title: "钝化位置偏前",
      detail: "PASSIVATION(钝化/防锈)通常在清洗流程末段, 紧接干燥前",
      suggestion: "考虑将钝化移至最后一级漂洗之后、干燥之前",
    });
  }

  return issues;
}

function roundToStandardTransformer(kva: number): number {
  const standards = [30, 50, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000];
  for (const s of standards) {
    if (s >= kva) return s;
  }
  return 2000;
}
