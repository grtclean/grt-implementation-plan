/**
 * Station BOM Mapping Service
 *
 * Maps station mechanical/electrical parameters to concrete BOM components.
 * Uses internal lookup catalogs to select parts by spec range.
 * Output aligns with bomItems schema for direct DB insertion.
 */
import type { MechanicalParams, ElectricalParams } from "../../drizzle/design-engine-schema";

// ── Output Types ────────────────────────────────────────────────────────

export interface BomComponent {
  materialCode: string;
  materialName: string;
  materialSpec: string;
  quantity: number;
  unit: string;
  category: "mechanical" | "electrical" | "piping" | "sensor" | "safety" | "consumable";
  sourceType: "purchase" | "manufacture" | "outsource";
  unitCost: number;       // CNY
  isCritical: boolean;
  leadTimeDays: number;
  remarks?: string;
}

export interface StationBomResult {
  stationCode: string;
  stationType: string;
  components: BomComponent[];
  subtotal: number;        // CNY
}

export interface ProjectBomSummary {
  stations: StationBomResult[];
  totalComponents: number;
  totalCost: number;
  costByCategory: Record<string, number>;
}

// ── Component Catalogs ──────────────────────────────────────────────────

interface CatalogEntry {
  minVal: number;
  maxVal: number;
  code: string;
  name: string;
  spec: string;
  cost: number;
  leadDays: number;
}

const PUMP_CATALOG: CatalogEntry[] = [
  { minVal: 0, maxVal: 30, code: "PMP-MG-001", name: "磁力泵", spec: "MD-16R 0.37kW", cost: 2800, leadDays: 7 },
  { minVal: 0, maxVal: 60, code: "PMP-CF-001", name: "离心泵", spec: "ISW25 1.1kW", cost: 3200, leadDays: 7 },
  { minVal: 60, maxVal: 120, code: "PMP-CF-002", name: "离心泵", spec: "ISW40 1.5kW", cost: 3800, leadDays: 7 },
  { minVal: 120, maxVal: 200, code: "PMP-CF-003", name: "离心泵", spec: "ISW50 2.2kW", cost: 5200, leadDays: 10 },
  { minVal: 200, maxVal: 400, code: "PMP-CF-004", name: "离心泵", spec: "ISW65 3kW", cost: 6800, leadDays: 10 },
  { minVal: 400, maxVal: 800, code: "PMP-CF-005", name: "离心泵", spec: "ISW80 5.5kW", cost: 9500, leadDays: 14 },
];

const HEATER_CATALOG: CatalogEntry[] = [
  { minVal: 0, maxVal: 3.1, code: "HTR-IM-001", name: "浸入式加热器", spec: "3kW SUS316L", cost: 1200, leadDays: 5 },
  { minVal: 3.1, maxVal: 6.1, code: "HTR-IM-002", name: "浸入式加热器", spec: "6kW SUS316L", cost: 1800, leadDays: 5 },
  { minVal: 6.1, maxVal: 12.1, code: "HTR-PL-001", name: "板式加热器", spec: "12kW SUS316L", cost: 3500, leadDays: 10 },
  { minVal: 12.1, maxVal: 25, code: "HTR-PL-002", name: "板式加热器", spec: "24kW SUS316L", cost: 5500, leadDays: 10 },
];

const NOZZLE_CATALOG: CatalogEntry[] = [
  { minVal: 0, maxVal: 4, code: "NZL-FF-001", name: "扁平扇形喷嘴", spec: "1/4\" BSPT 3bar", cost: 45, leadDays: 3 },
  { minVal: 4, maxVal: 6, code: "NZL-FF-002", name: "扁平扇形喷嘴", spec: "3/8\" BSPT 5bar", cost: 65, leadDays: 3 },
  { minVal: 6, maxVal: 10, code: "NZL-FC-001", name: "全锥形喷嘴", spec: "3/8\" BSPT 8bar", cost: 85, leadDays: 5 },
];

const PLC_DI_MODULE: CatalogEntry[] = [
  { minVal: 0, maxVal: 16, code: "PLC-DI-016", name: "PLC DI模块", spec: "S7-1200 SM1221 16DI", cost: 1800, leadDays: 14 },
  { minVal: 16, maxVal: 32, code: "PLC-DI-032", name: "PLC DI模块", spec: "S7-1500 DI32×24V", cost: 3200, leadDays: 14 },
];

const PLC_DO_MODULE: CatalogEntry[] = [
  { minVal: 0, maxVal: 16, code: "PLC-DO-016", name: "PLC DO模块", spec: "S7-1200 SM1222 16DO", cost: 2000, leadDays: 14 },
  { minVal: 16, maxVal: 32, code: "PLC-DO-032", name: "PLC DO模块", spec: "S7-1500 DQ32×24V", cost: 3500, leadDays: 14 },
];

const PLC_AI_MODULE: CatalogEntry[] = [
  { minVal: 0, maxVal: 8, code: "PLC-AI-008", name: "PLC AI模块", spec: "S7-1200 SM1231 8AI", cost: 2800, leadDays: 14 },
];

function lookupCatalog(catalog: CatalogEntry[], value: number): CatalogEntry | undefined {
  return catalog.find(e => value >= e.minVal && value < e.maxVal) ?? catalog[catalog.length - 1];
}

// ── Fixed Components ────────────────────────────────────────────────────

const COMMON_COMPONENTS: Record<string, Omit<BomComponent, "quantity">> = {
  DRAIN_VALVE_25: {
    materialCode: "VLV-BV-025", materialName: "球阀", materialSpec: "DN25 SUS304",
    unit: "个", category: "piping", sourceType: "purchase", unitCost: 120, isCritical: false, leadTimeDays: 3,
  },
  DRAIN_VALVE_40: {
    materialCode: "VLV-BV-040", materialName: "球阀", materialSpec: "DN40 SUS304",
    unit: "个", category: "piping", sourceType: "purchase", unitCost: 180, isCritical: false, leadTimeDays: 3,
  },
  DRAIN_VALVE_50: {
    materialCode: "VLV-BV-050", materialName: "球阀", materialSpec: "DN50 SUS304",
    unit: "个", category: "piping", sourceType: "purchase", unitCost: 260, isCritical: false, leadTimeDays: 3,
  },
  LEVEL_SENSOR: {
    materialCode: "SEN-LV-001", materialName: "液位传感器", materialSpec: "导波雷达 4-20mA",
    unit: "个", category: "sensor", sourceType: "purchase", unitCost: 680, isCritical: true, leadTimeDays: 7,
  },
  TEMP_SENSOR_PT100: {
    materialCode: "SEN-TP-001", materialName: "温度传感器", materialSpec: "PT100 SUS316L 150mm",
    unit: "个", category: "sensor", sourceType: "purchase", unitCost: 320, isCritical: false, leadTimeDays: 5,
  },
  TEMP_SENSOR_KTYPE: {
    materialCode: "SEN-TP-002", materialName: "温度传感器", materialSpec: "K型热电偶 SUS316L",
    unit: "个", category: "sensor", sourceType: "purchase", unitCost: 280, isCritical: false, leadTimeDays: 5,
  },
  PRESSURE_SENSOR: {
    materialCode: "SEN-PR-001", materialName: "压力传感器", materialSpec: "0-10bar 4-20mA",
    unit: "个", category: "sensor", sourceType: "purchase", unitCost: 450, isCritical: false, leadTimeDays: 5,
  },
  FLOW_METER: {
    materialCode: "SEN-FL-001", materialName: "流量计", materialSpec: "电磁流量计 DN25",
    unit: "个", category: "sensor", sourceType: "purchase", unitCost: 2800, isCritical: true, leadTimeDays: 14,
  },
  CONDUCTIVITY_METER: {
    materialCode: "SEN-CD-001", materialName: "电导率仪", materialSpec: "0-200μS/cm",
    unit: "个", category: "sensor", sourceType: "purchase", unitCost: 1500, isCritical: true, leadTimeDays: 10,
  },
  VACUUM_SENSOR: {
    materialCode: "SEN-VC-001", materialName: "真空度传感器", materialSpec: "0-1013mbar",
    unit: "个", category: "sensor", sourceType: "purchase", unitCost: 960, isCritical: true, leadTimeDays: 10,
  },
  ESTOP_BUTTON: {
    materialCode: "SAF-ES-001", materialName: "急停按钮", materialSpec: "φ40 旋转复位 1NC+1NO",
    unit: "个", category: "safety", sourceType: "purchase", unitCost: 85, isCritical: true, leadTimeDays: 3,
  },
  MOTOR_STARTER: {
    materialCode: "ELC-MS-001", materialName: "电机启动器", materialSpec: "接触器+热继 ≤7.5kW",
    unit: "套", category: "electrical", sourceType: "purchase", unitCost: 450, isCritical: false, leadTimeDays: 7,
  },
  TERMINAL_BLOCK: {
    materialCode: "ELC-TB-001", materialName: "接线端子排", materialSpec: "UK2.5B 组合",
    unit: "组", category: "electrical", sourceType: "purchase", unitCost: 15, isCritical: false, leadTimeDays: 3,
  },
  CABLE_PER_METER: {
    materialCode: "ELC-CB-001", materialName: "控制电缆", materialSpec: "RVVP 4×1.5mm²",
    unit: "米", category: "electrical", sourceType: "purchase", unitCost: 12, isCritical: false, leadTimeDays: 3,
  },
  FILTER_HOUSING: {
    materialCode: "FLT-HS-001", materialName: "过滤器壳体", materialSpec: "DN50 SUS304 袋式",
    unit: "个", category: "mechanical", sourceType: "purchase", unitCost: 2200, isCritical: false, leadTimeDays: 7,
  },
  FILTER_BAG_25: {
    materialCode: "FLT-BG-025", materialName: "过滤袋", materialSpec: "25μm PP 7\"×32\"",
    unit: "个", category: "consumable", sourceType: "purchase", unitCost: 35, isCritical: false, leadTimeDays: 3,
    remarks: "消耗品，建议库存10个",
  },
  FILTER_BAG_50: {
    materialCode: "FLT-BG-050", materialName: "过滤袋", materialSpec: "50μm PP 7\"×32\"",
    unit: "个", category: "consumable", sourceType: "purchase", unitCost: 28, isCritical: false, leadTimeDays: 3,
    remarks: "消耗品，建议库存10个",
  },
  FILTER_BAG_5: {
    materialCode: "FLT-BG-005", materialName: "过滤袋", materialSpec: "5μm PP 7\"×32\"",
    unit: "个", category: "consumable", sourceType: "purchase", unitCost: 55, isCritical: false, leadTimeDays: 5,
    remarks: "消耗品，建议库存10个",
  },
  SUCTION_STRAINER: {
    materialCode: "PMP-ST-001", materialName: "吸入口过滤器", materialSpec: "Y型 DN50 SUS304",
    unit: "个", category: "piping", sourceType: "purchase", unitCost: 380, isCritical: false, leadTimeDays: 5,
  },
  CHECK_VALVE: {
    materialCode: "VLV-CK-001", materialName: "止回阀", materialSpec: "DN50 SUS304",
    unit: "个", category: "piping", sourceType: "purchase", unitCost: 220, isCritical: false, leadTimeDays: 5,
  },
};

// ── Mapping Functions ───────────────────────────────────────────────────

function mapTankComponents(
  mech: MechanicalParams,
  stationCode: string,
): BomComponent[] {
  const components: BomComponent[] = [];
  if (!mech.tankVolume) return components;

  // Tank body (manufactured)
  const tankMaterial = mech.tankMaterial ?? "SUS304";
  const vol = mech.tankVolume;
  // Rough cost: ¥50/L for SUS304, ¥80/L for SUS316L, ¥30/L for PP
  const costPerL = tankMaterial.includes("316") ? 80 : tankMaterial.includes("PP") ? 30 : 50;
  components.push({
    materialCode: `TNK-${stationCode}`,
    materialName: "清洗槽体",
    materialSpec: `${mech.tankLength}×${mech.tankWidth}×${mech.tankHeight}mm ${tankMaterial} ${vol}L`,
    quantity: 1,
    unit: "台",
    category: "mechanical",
    sourceType: "manufacture",
    unitCost: Math.round(vol * costPerL),
    isCritical: true,
    leadTimeDays: 21,
  });

  // Tank legs
  components.push({
    materialCode: "TNK-LG-001",
    materialName: "槽体支腿",
    materialSpec: "SUS304 方管 50×50×3 H=150mm",
    quantity: vol > 300 ? 6 : 4,
    unit: "根",
    category: "mechanical",
    sourceType: "manufacture",
    unitCost: 120,
    isCritical: false,
    leadTimeDays: 7,
  });

  // Drain valve
  const drainKey = vol < 100 ? "DRAIN_VALVE_25" : vol < 300 ? "DRAIN_VALVE_40" : "DRAIN_VALVE_50";
  components.push({ ...COMMON_COMPONENTS[drainKey], quantity: 1 });

  // Overflow pipe
  components.push({
    materialCode: "PIP-OF-001",
    materialName: "溢流管",
    materialSpec: `DN${vol < 100 ? 25 : vol < 300 ? 40 : 50} SUS304`,
    quantity: 1,
    unit: "根",
    category: "piping",
    sourceType: "manufacture",
    unitCost: 280,
    isCritical: false,
    leadTimeDays: 7,
  });

  // Level sensors (2 per tank)
  components.push({ ...COMMON_COMPONENTS.LEVEL_SENSOR, quantity: 2 });

  return components;
}

function mapPumpComponents(mech: MechanicalParams): BomComponent[] {
  const components: BomComponent[] = [];
  if (!mech.pumpFlowRate) return components;

  const pumpEntry = lookupCatalog(
    mech.pumpType === "magnetic" ? PUMP_CATALOG.slice(0, 1) : PUMP_CATALOG,
    mech.pumpFlowRate,
  );
  if (pumpEntry) {
    components.push({
      materialCode: pumpEntry.code,
      materialName: pumpEntry.name,
      materialSpec: pumpEntry.spec,
      quantity: 1,
      unit: "台",
      category: "mechanical",
      sourceType: "purchase",
      unitCost: pumpEntry.cost,
      isCritical: true,
      leadTimeDays: pumpEntry.leadDays,
    });
  }

  // Suction strainer
  components.push({ ...COMMON_COMPONENTS.SUCTION_STRAINER, quantity: 1 });
  // Check valve
  components.push({ ...COMMON_COMPONENTS.CHECK_VALVE, quantity: 1 });
  // Isolation ball valves (suction + discharge)
  const valveKey = (mech.pumpFlowRate ?? 0) < 100 ? "DRAIN_VALVE_40" : "DRAIN_VALVE_50";
  components.push({ ...COMMON_COMPONENTS[valveKey], quantity: 2, remarks: "泵进出口隔离阀" });

  return components;
}

function mapUltrasonicComponents(mech: MechanicalParams): BomComponent[] {
  const components: BomComponent[] = [];
  if (!mech.ultrasonicPower) return components;

  const count = mech.transducerCount ?? Math.ceil(mech.ultrasonicPower / 60);
  const genCount = Math.max(1, Math.ceil(mech.ultrasonicPower / 1200));

  // Transducer set
  components.push({
    materialCode: `US-TR-${mech.ultrasonicFrequency ?? 40}`,
    materialName: "超声波振子组",
    materialSpec: `${mech.ultrasonicFrequency ?? 40}kHz ×${count}只 ${mech.ultrasonicPower}W`,
    quantity: 1,
    unit: "套",
    category: "mechanical",
    sourceType: "purchase",
    unitCost: count * 180,
    isCritical: true,
    leadTimeDays: 14,
  });

  // Generators
  components.push({
    materialCode: `US-GN-${mech.ultrasonicFrequency ?? 40}`,
    materialName: "超声波发生器",
    materialSpec: `${mech.ultrasonicFrequency ?? 40}kHz 1200W`,
    quantity: genCount,
    unit: "台",
    category: "electrical",
    sourceType: "purchase",
    unitCost: 3800,
    isCritical: true,
    leadTimeDays: 14,
  });

  return components;
}

function mapSprayComponents(mech: MechanicalParams): BomComponent[] {
  const components: BomComponent[] = [];
  if (!mech.nozzleCount) return components;

  const nozzleEntry = lookupCatalog(NOZZLE_CATALOG, mech.sprayPressure ?? 3);
  if (nozzleEntry) {
    components.push({
      materialCode: nozzleEntry.code,
      materialName: nozzleEntry.name,
      materialSpec: nozzleEntry.spec,
      quantity: mech.nozzleCount,
      unit: "个",
      category: "mechanical",
      sourceType: "purchase",
      unitCost: nozzleEntry.cost,
      isCritical: false,
      leadTimeDays: nozzleEntry.leadDays,
    });
  }

  // Spray pipes (manufactured)
  const pipeCount = mech.nozzleType === "full-cone" ? 4 : 3;
  components.push({
    materialCode: "PIP-SP-001",
    materialName: "喷淋管",
    materialSpec: "SUS304 DN25 带喷嘴座",
    quantity: pipeCount,
    unit: "根",
    category: "piping",
    sourceType: "manufacture",
    unitCost: 650,
    isCritical: false,
    leadTimeDays: 10,
  });

  // Manifold
  components.push({
    materialCode: "PIP-MF-001",
    materialName: "汇流管",
    materialSpec: "SUS304 DN50",
    quantity: 1,
    unit: "根",
    category: "piping",
    sourceType: "manufacture",
    unitCost: 480,
    isCritical: false,
    leadTimeDays: 10,
  });

  // Pressure gauge
  components.push({ ...COMMON_COMPONENTS.PRESSURE_SENSOR, quantity: 1 });

  return components;
}

function mapHeaterComponents(mech: MechanicalParams): BomComponent[] {
  const components: BomComponent[] = [];
  if (!mech.heaterPower || mech.heaterPower <= 0) return components;

  const circuits = Math.max(1, Math.ceil(mech.heaterPower / 6));
  const powerPerCircuit = mech.heaterPower / circuits;

  const heaterEntry = lookupCatalog(HEATER_CATALOG, powerPerCircuit);
  if (heaterEntry) {
    components.push({
      materialCode: heaterEntry.code,
      materialName: heaterEntry.name,
      materialSpec: heaterEntry.spec,
      quantity: circuits,
      unit: "根",
      category: "mechanical",
      sourceType: "purchase",
      unitCost: heaterEntry.cost,
      isCritical: true,
      leadTimeDays: heaterEntry.leadDays,
    });
  }

  // Temperature sensor
  components.push({ ...COMMON_COMPONENTS.TEMP_SENSOR_PT100, quantity: 2 });

  return components;
}

function mapFiltrationComponents(mech: MechanicalParams): BomComponent[] {
  const components: BomComponent[] = [];
  if (!mech.filtrationMicron) return components;

  // Filter housing
  components.push({ ...COMMON_COMPONENTS.FILTER_HOUSING, quantity: 1 });

  // Filter bags (consumable)
  const bagKey = mech.filtrationMicron <= 5 ? "FILTER_BAG_5" :
    mech.filtrationMicron <= 25 ? "FILTER_BAG_25" : "FILTER_BAG_50";
  components.push({ ...COMMON_COMPONENTS[bagKey], quantity: 5 });

  return components;
}

function mapConveyorComponents(mech: MechanicalParams, stationCode: string): BomComponent[] {
  const components: BomComponent[] = [];
  if (!mech.conveyorType) return components;

  const isChain = mech.conveyorType === "chain";

  // Frame (manufactured weldment)
  components.push({
    materialCode: `CVR-FR-${stationCode}`,
    materialName: "输送机架",
    materialSpec: isChain ? "Q235B 60×60×3 焊接件" : "Q235B 40×40×3 焊接件",
    quantity: 1,
    unit: "台",
    category: "mechanical",
    sourceType: "manufacture",
    unitCost: isChain ? 4500 : 3200,
    isCritical: false,
    leadTimeDays: 14,
  });

  // Drive motor
  components.push({
    materialCode: "MTR-GR-001",
    materialName: "减速电机",
    materialSpec: isChain ? "0.75kW i=30 三相" : "0.37kW i=50 三相",
    quantity: 1,
    unit: "台",
    category: "mechanical",
    sourceType: "purchase",
    unitCost: isChain ? 2200 : 1600,
    isCritical: true,
    leadTimeDays: 10,
  });

  // Rollers or chain
  if (isChain) {
    components.push({
      materialCode: "CVR-CH-001",
      materialName: "输送链条",
      materialSpec: "双排16A 含附件",
      quantity: 1,
      unit: "套",
      category: "mechanical",
      sourceType: "purchase",
      unitCost: 2800,
      isCritical: false,
      leadTimeDays: 7,
    });
  } else {
    components.push({
      materialCode: "CVR-RL-001",
      materialName: "输送辊筒",
      materialSpec: "φ50×400 SUS304 轴承座",
      quantity: 8,
      unit: "根",
      category: "mechanical",
      sourceType: "purchase",
      unitCost: 180,
      isCritical: false,
      leadTimeDays: 7,
    });
  }

  return components;
}

function mapDryingComponents(mech: MechanicalParams, stationType: string): BomComponent[] {
  const components: BomComponent[] = [];

  if (stationType === "VACUUM_DRY") {
    components.push({
      materialCode: "DRY-VP-001",
      materialName: "真空泵",
      materialSpec: "旋片式 10m³/h",
      quantity: 1,
      unit: "台",
      category: "mechanical",
      sourceType: "purchase",
      unitCost: 8500,
      isCritical: true,
      leadTimeDays: 14,
    });
    components.push({ ...COMMON_COMPONENTS.VACUUM_SENSOR, quantity: 1 });
  } else if (stationType === "AIR_KNIFE") {
    const slots = Math.max(2, Math.ceil((mech.dryingAirflow ?? 200) / 80));
    components.push({
      materialCode: "DRY-AK-001",
      materialName: "风刀",
      materialSpec: "SUS304 L=500mm 含风嘴",
      quantity: slots,
      unit: "套",
      category: "mechanical",
      sourceType: "purchase",
      unitCost: 1200,
      isCritical: false,
      leadTimeDays: 7,
    });
    components.push({
      materialCode: "DRY-BL-001",
      materialName: "高压风机",
      materialSpec: `${mech.dryingAirflow ?? 200}m³/h 漩涡式`,
      quantity: 1,
      unit: "台",
      category: "mechanical",
      sourceType: "purchase",
      unitCost: 3500,
      isCritical: true,
      leadTimeDays: 10,
    });
  } else if (stationType === "HOT_AIR_DRY") {
    components.push({
      materialCode: "DRY-BL-002",
      materialName: "热风循环风机",
      materialSpec: `${mech.dryingAirflow ?? 200}m³/h 含加热器`,
      quantity: 1,
      unit: "台",
      category: "mechanical",
      sourceType: "purchase",
      unitCost: 4800,
      isCritical: true,
      leadTimeDays: 10,
    });
    components.push({ ...COMMON_COMPONENTS.TEMP_SENSOR_PT100, quantity: 1 });
  }

  return components;
}

function mapElectricalComponents(elec: ElectricalParams): BomComponent[] {
  const components: BomComponent[] = [];

  // PLC DI modules
  const diCount = Math.ceil((elec.plcDI ?? 0) / 16);
  if (diCount > 0) {
    const diEntry = lookupCatalog(PLC_DI_MODULE, elec.plcDI ?? 0);
    if (diEntry) {
      components.push({
        materialCode: diEntry.code,
        materialName: diEntry.name,
        materialSpec: diEntry.spec,
        quantity: diCount,
        unit: "块",
        category: "electrical",
        sourceType: "purchase",
        unitCost: diEntry.cost,
        isCritical: true,
        leadTimeDays: diEntry.leadDays,
      });
    }
  }

  // PLC DO modules
  const doCount = Math.ceil((elec.plcDO ?? 0) / 16);
  if (doCount > 0) {
    const doEntry = lookupCatalog(PLC_DO_MODULE, elec.plcDO ?? 0);
    if (doEntry) {
      components.push({
        materialCode: doEntry.code,
        materialName: doEntry.name,
        materialSpec: doEntry.spec,
        quantity: doCount,
        unit: "块",
        category: "electrical",
        sourceType: "purchase",
        unitCost: doEntry.cost,
        isCritical: true,
        leadTimeDays: doEntry.leadDays,
      });
    }
  }

  // PLC AI modules
  const aiCount = Math.ceil((elec.plcAI ?? 0) / 8);
  if (aiCount > 0) {
    const aiEntry = lookupCatalog(PLC_AI_MODULE, elec.plcAI ?? 0);
    if (aiEntry) {
      components.push({
        materialCode: aiEntry.code,
        materialName: aiEntry.name,
        materialSpec: aiEntry.spec,
        quantity: aiCount,
        unit: "块",
        category: "electrical",
        sourceType: "purchase",
        unitCost: aiEntry.cost,
        isCritical: true,
        leadTimeDays: aiEntry.leadDays,
      });
    }
  }

  // Motor starters
  const motorCount = elec.motorCount ?? 0;
  if (motorCount > 0) {
    components.push({ ...COMMON_COMPONENTS.MOTOR_STARTER, quantity: motorCount });
  }

  // Terminal blocks: IO points + motors × 4 + sensors × 2
  const terminalCount = (elec.totalIoPoints ?? 0) + motorCount * 4 + (elec.sensorCount ?? 0) * 2;
  if (terminalCount > 0) {
    components.push({
      ...COMMON_COMPONENTS.TERMINAL_BLOCK,
      quantity: Math.ceil(terminalCount / 10), // 10 terminals per group
    });
  }

  // Cable: ~15m per station
  components.push({ ...COMMON_COMPONENTS.CABLE_PER_METER, quantity: 15 });

  // E-stop
  components.push({ ...COMMON_COMPONENTS.ESTOP_BUTTON, quantity: elec.emergencyStopCount ?? 1 });

  return components;
}

// ── Main Mapping Function ───────────────────────────────────────────────

/**
 * Map a single station's parameters to BOM components.
 */
export function mapStationToBomComponents(
  stationType: string,
  mechParams: MechanicalParams,
  elecParams: ElectricalParams,
  stationCode: string,
): BomComponent[] {
  const components: BomComponent[] = [];

  // Mechanical components based on station type
  const tankTypes = ["ULTRASONIC", "PRE_WASH", "RINSE", "DI_RINSE", "PASSIVATION", "DEGREASING", "TURBULENCE"];
  const dryingTypes = ["HOT_AIR_DRY", "VACUUM_DRY", "AIR_KNIFE", "COOLDOWN"];
  const handlingTypes = ["LOADING", "UNLOADING", "TRANSFER"];

  if (tankTypes.includes(stationType)) {
    components.push(...mapTankComponents(mechParams, stationCode));
    components.push(...mapPumpComponents(mechParams));
    if (stationType === "ULTRASONIC") {
      components.push(...mapUltrasonicComponents(mechParams));
    }
    components.push(...mapHeaterComponents(mechParams));
    components.push(...mapFiltrationComponents(mechParams));
  }

  if (stationType === "SPRAY" || stationType === "ROBOT_CLEAN") {
    components.push(...mapTankComponents(mechParams, stationCode)); // sump tank
    components.push(...mapPumpComponents(mechParams));
    components.push(...mapSprayComponents(mechParams));
    components.push(...mapFiltrationComponents(mechParams));
  }

  if (dryingTypes.includes(stationType)) {
    components.push(...mapDryingComponents(mechParams, stationType));
  }

  if (handlingTypes.includes(stationType)) {
    components.push(...mapConveyorComponents(mechParams, stationCode));
  }

  // Electrical components (all stations)
  components.push(...mapElectricalComponents(elecParams));

  // Add rinse-specific sensors
  if (stationType === "RINSE" || stationType === "DI_RINSE") {
    components.push({ ...COMMON_COMPONENTS.CONDUCTIVITY_METER, quantity: 1 });
  }

  // Add spray-specific sensors
  if (stationType === "SPRAY" || stationType === "ROBOT_CLEAN") {
    components.push({ ...COMMON_COMPONENTS.FLOW_METER, quantity: 1 });
  }

  return components;
}

/**
 * Map all stations in a project to BOM components and produce a summary.
 */
export function mapProjectToBom(
  stations: Array<{
    stationCode: string;
    stationType: string;
    mechanicalParams: MechanicalParams;
    electricalParams: ElectricalParams;
  }>,
): ProjectBomSummary {
  const stationResults: StationBomResult[] = stations.map(s => {
    const components = mapStationToBomComponents(
      s.stationType, s.mechanicalParams, s.electricalParams, s.stationCode,
    );
    const subtotal = components.reduce((sum, c) => sum + c.unitCost * c.quantity, 0);
    return {
      stationCode: s.stationCode,
      stationType: s.stationType,
      components,
      subtotal,
    };
  });

  const totalComponents = stationResults.reduce((sum, s) => sum + s.components.length, 0);
  const totalCost = stationResults.reduce((sum, s) => sum + s.subtotal, 0);

  const costByCategory: Record<string, number> = {};
  for (const sr of stationResults) {
    for (const c of sr.components) {
      costByCategory[c.category] = (costByCategory[c.category] ?? 0) + c.unitCost * c.quantity;
    }
  }

  return {
    stations: stationResults,
    totalComponents,
    totalCost,
    costByCategory,
  };
}
