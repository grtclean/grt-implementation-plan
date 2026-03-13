/**
 * PLC Architecture Service — Pure Functions
 *
 * Generates the complete PLC program module tree from station data.
 * No DB access — pure deterministic functions only.
 *
 * Architecture follows IEC 61131-3 program organization:
 *   OB1 (Main) calls FB/FC blocks in sequence
 *   FB blocks maintain state (stations, mode manager, safety, etc.)
 *   FC blocks are stateless helpers (motor, valve, sensor, alarm)
 *   DB blocks store data (recipes, diagnostics, HMI interface)
 */

import type { ElectricalParams } from "../../drizzle/design-engine-schema";
import type { PlcBrandAdapter, MotorSpec, ValveSpec, PidSpec, AlarmDef, AccessLevel } from "./plc-brands/types";

// ── Types ────────────────────────────────────────────────────────────────

export interface StationInfo {
  id: number;
  stationCode: string;
  stationName: string;
  stationNameEn: string;
  stationType: string;
  electricalParams: ElectricalParams;
  mechanicalParams?: Record<string, unknown>;
}

export interface IoMappingEntry {
  signalName: string;
  signalNameEn: string;
  address: string;
  ioType: "DI" | "DO" | "AI" | "AO";
  dataType: string;
  moduleRack: number;
  moduleSlot: number;
  moduleChannel: number;
  stationId: number | null;
  stationCode?: string;
  description: string;
  safetyRelevant: boolean;
}

export interface ProgramModule {
  moduleName: string;
  moduleType: "OB" | "FB" | "FC" | "DB" | "UDT" | "SAFETY_FB";
  moduleNumber: string;
  parentModuleId?: string;  // moduleNumber of parent
  sortOrder: number;
  description: string;
  descriptionEn: string;
  category: string;
  parameterInterface: {
    inputs?: Array<{ name: string; type: string; description?: string; address?: string }>;
    outputs?: Array<{ name: string; type: string; description?: string; address?: string }>;
    inouts?: Array<{ name: string; type: string; description?: string }>;
    statics?: Array<{ name: string; type: string; initialValue?: string; description?: string }>;
    temps?: Array<{ name: string; type: string; description?: string }>;
  };
}

export interface ArchitectureResult {
  modules: ProgramModule[];
  ioMappings: IoMappingEntry[];
  ioSummary: { totalDI: number; totalDO: number; totalAI: number; totalAO: number; rackCount: number };
  alarmDefinitions: Array<AlarmDef & { stationCode?: string; stationId?: number }>;
  accessLevels: AccessLevel[];
}

interface ArchitectureOptions {
  eStopCount?: number;
  hmiScreenCount?: number;
  networkProtocol?: string;
  voltageSystem?: string;
  includeRecipeManager?: boolean;
  includeMaintenance?: boolean;
  includeDiagnostic?: boolean;
  includeCommunication?: boolean;
}

// ── Constants ────────────────────────────────────────────────────────────

const STATION_CATEGORY: Record<string, string> = {
  LOADING: "handling", PRE_WASH: "cleaning", ULTRASONIC: "cleaning",
  SPRAY: "cleaning", TURBULENCE: "cleaning", ROBOT_CLEAN: "cleaning",
  RINSE: "cleaning", DI_RINSE: "cleaning", PASSIVATION: "cleaning",
  DEGREASING: "cleaning", AIR_KNIFE: "drying", HOT_AIR_DRY: "drying",
  VACUUM_DRY: "drying", COOLDOWN: "drying", INSPECTION: "inspection",
  UNLOADING: "handling", TRANSFER: "handling",
};

// ── Core Architecture Generator ──────────────────────────────────────────

export function generateProgramArchitecture(
  adapter: PlcBrandAdapter,
  stations: StationInfo[],
  options: ArchitectureOptions = {},
): ArchitectureResult {
  const {
    eStopCount = 4,
    includeRecipeManager = true,
    includeMaintenance = true,
    includeDiagnostic = true,
    includeCommunication = true,
  } = options;

  const modules: ProgramModule[] = [];
  let sortIdx = 0;

  // ─── 1. Organization Blocks ──────────────────────────────────

  // OB1 — Main cyclic
  modules.push({
    moduleName: "Main",
    moduleType: "OB",
    moduleNumber: "OB1",
    sortOrder: sortIdx++,
    description: "主循环程序 — 周期调用所有功能块",
    descriptionEn: "Main cyclic program — calls all function blocks in sequence",
    category: "mode_mgmt",
    parameterInterface: { temps: [{ name: "tempInfo", type: "DINT", description: "OB info" }] },
  });

  // OB100 — Startup
  modules.push({
    moduleName: "Startup",
    moduleType: "OB",
    moduleNumber: "OB100",
    sortOrder: sortIdx++,
    description: "启动初始化 — 清除输出、设置初始模式",
    descriptionEn: "Startup initialization — clear outputs, set INITIALIZING mode",
    category: "mode_mgmt",
    parameterInterface: {},
  });

  // OB82 — Diagnostic interrupt
  modules.push({
    moduleName: "DiagnosticError",
    moduleType: "OB",
    moduleNumber: "OB82",
    sortOrder: sortIdx++,
    description: "诊断中断 — 模块/通道故障检测",
    descriptionEn: "Diagnostic interrupt — module/channel fault detection",
    category: "diagnostic",
    parameterInterface: {},
  });

  // OB86 — Rack failure
  modules.push({
    moduleName: "RackFailure",
    moduleType: "OB",
    moduleNumber: "OB86",
    sortOrder: sortIdx++,
    description: "机架故障 — 通信丢失处理",
    descriptionEn: "Rack failure — communication loss handling, safe state activation",
    category: "diagnostic",
    parameterInterface: {},
  });

  // OB122 — Module access error
  modules.push({
    moduleName: "ModuleAccessError",
    moduleType: "OB",
    moduleNumber: "OB122",
    sortOrder: sortIdx++,
    description: "模块访问错误 — 单个模块故障映射",
    descriptionEn: "Module access error — individual module fault with station mapping",
    category: "diagnostic",
    parameterInterface: {},
  });

  // ─── 2. System Function Blocks ───────────────────────────────

  // FB100 — Mode Manager
  modules.push({
    moduleName: "FB_ModeManager",
    moduleType: "FB",
    moduleNumber: "FB100",
    parentModuleId: "OB1",
    sortOrder: sortIdx++,
    description: "程序模式管理 — 7态有限状态机 (初始化/自动/手动/维修/换型/调试/急停)",
    descriptionEn: "Program Mode Manager — 7-state FSM (init/auto/manual/service/changeover/debug/e_stop)",
    category: "mode_mgmt",
    parameterInterface: {
      inputs: [
        { name: "modeRequest", type: "INT", description: "Requested mode 0-6" },
        { name: "safetyOk", type: "BOOL", description: "Safety chain healthy" },
        { name: "allStationsReady", type: "BOOL", description: "All stations ready" },
        { name: "keySwitch", type: "INT", description: "Key position 0-2" },
        { name: "acknowledgeFault", type: "BOOL", description: "Operator acknowledge" },
      ],
      outputs: [
        { name: "currentMode", type: "INT", description: "Active mode" },
        { name: "modeConfirmed", type: "BOOL", description: "Transition complete" },
        { name: "autoReady", type: "BOOL", description: "Auto mode ready" },
        { name: "manualActive", type: "BOOL", description: "Manual active" },
        { name: "serviceActive", type: "BOOL", description: "Service active" },
        { name: "eStopActive", type: "BOOL", description: "E-stop active" },
        { name: "modeName", type: "STRING[32]", description: "Mode display name" },
      ],
      statics: [
        { name: "state", type: "INT", initialValue: "0" },
        { name: "initTimer", type: "TON" },
        { name: "faultLatched", type: "BOOL", initialValue: "FALSE" },
      ],
    },
  });

  // FB101 — Safety Manager
  const allInterlocks = collectInterlocks(stations);
  modules.push({
    moduleName: "FB_SafetyManager",
    moduleType: "FB",
    moduleNumber: "FB101",
    parentModuleId: "OB1",
    sortOrder: sortIdx++,
    description: `安全管理 — EN 13849-1 Cat.3, ${eStopCount}个急停, ${allInterlocks.length}个联锁`,
    descriptionEn: `Safety Manager — EN 13849-1 Cat.3, ${eStopCount} E-stops, ${allInterlocks.length} interlocks`,
    category: "safety",
    parameterInterface: {
      inputs: [
        ...Array.from({ length: eStopCount }, (_, i) => ({ name: `eStop${i + 1}`, type: "BOOL", description: `E-stop button ${i + 1}` })),
        { name: "guardDoor", type: "BOOL", description: "Guard door closed" },
        { name: "safetyRelayFeedback", type: "BOOL", description: "Safety relay EDM" },
        ...allInterlocks.map((il, i) => ({ name: `interlock_${i}`, type: "BOOL", description: il })),
      ],
      outputs: [
        { name: "safetyChainOk", type: "BOOL", description: "Master safety" },
        { name: "eStopActive", type: "BOOL", description: "Any E-stop" },
        { name: "guardFault", type: "BOOL", description: "Guard open" },
        { name: "safetyRelayCmd", type: "BOOL", description: "Relay command" },
        { name: "faultCode", type: "INT", description: "Diagnostic code" },
      ],
      statics: [
        { name: "edmTimer", type: "TON" },
        { name: "edmFault", type: "BOOL", initialValue: "FALSE" },
      ],
    },
  });

  // FB102 — User Auth
  modules.push({
    moduleName: "FB_UserAuth",
    moduleType: "FB",
    moduleNumber: "FB102",
    parentModuleId: "OB1",
    sortOrder: sortIdx++,
    description: "用户授权管理 — 登录/注销/权限等级/超时自动注销",
    descriptionEn: "User Authentication — Login/logout, access levels, auto-logout on timeout",
    category: "user_auth",
    parameterInterface: {
      inputs: [
        { name: "loginRequest", type: "BOOL" },
        { name: "logoutRequest", type: "BOOL" },
        { name: "enteredPassword", type: "DWORD" },
        { name: "enteredLevel", type: "INT" },
      ],
      outputs: [
        { name: "loggedIn", type: "BOOL" },
        { name: "currentLevel", type: "INT" },
        { name: "loginFailed", type: "BOOL" },
        { name: "lockedOut", type: "BOOL" },
      ],
      statics: [
        { name: "passwordDB", type: "ARRAY[0..9] OF DWORD" },
        { name: "failCount", type: "INT", initialValue: "0" },
        { name: "timeoutTimer", type: "TON" },
      ],
    },
  });

  // ─── 3. Per-Station Function Blocks ──────────────────────────

  stations.forEach((station, idx) => {
    const fbNum = 200 + idx;
    const ep = station.electricalParams || {};
    const motorCount = ep.motorCount || 0;
    const hasHeater = (ep.heaterCircuits || 0) > 0;
    const hasSensors = (ep.sensorCount || 0) > 0;
    const cat = STATION_CATEGORY[station.stationType] || "cleaning";

    modules.push({
      moduleName: `FB_Station_${station.stationCode}`,
      moduleType: "FB",
      moduleNumber: `FB${fbNum}`,
      parentModuleId: "OB1",
      sortOrder: sortIdx++,
      description: `${station.stationName} — ${motorCount}电机, ${ep.plcDI || 0}DI/${ep.plcDO || 0}DO/${ep.plcAI || 0}AI/${ep.plcAO || 0}AO`,
      descriptionEn: `${station.stationNameEn || station.stationCode} — ${motorCount} motors, ${ep.plcDI || 0}DI/${ep.plcDO || 0}DO/${ep.plcAI || 0}AI/${ep.plcAO || 0}AO`,
      category: "station_ctrl",
      parameterInterface: {
        inputs: [
          { name: "mode", type: "INT", description: "Current program mode" },
          { name: "safetyOk", type: "BOOL", description: "Safety chain" },
          { name: "startCmd", type: "BOOL", description: "Station start" },
          { name: "stopCmd", type: "BOOL", description: "Station stop" },
          ...(hasHeater ? [{ name: "tempSetpoint", type: "REAL", description: "Temperature SP °C" }] : []),
        ],
        outputs: [
          { name: "stationReady", type: "BOOL", description: "Ready for auto" },
          { name: "stationRunning", type: "BOOL", description: "In operation" },
          { name: "stationFault", type: "BOOL", description: "Fault active" },
          { name: "cycleComplete", type: "BOOL", description: "Cycle done" },
          ...(hasHeater ? [{ name: "currentTemp", type: "REAL", description: "Current temperature" }] : []),
        ],
        statics: [
          { name: "stepNumber", type: "INT", initialValue: "0", description: "Sequence step" },
          { name: "cycleTimer", type: "TON", description: "Cycle time monitor" },
          ...Array.from({ length: motorCount }, (_, i) => ({
            name: `motor${i + 1}Run`, type: "BOOL", initialValue: "FALSE",
          })),
        ],
      },
    });
  });

  // ─── 4. Common Function Calls (FC) ───────────────────────────

  // FC200 — Valve Control
  modules.push({
    moduleName: "FC_ValveControl",
    moduleType: "FC",
    moduleNumber: "FC200",
    parentModuleId: "OB1",
    sortOrder: sortIdx++,
    description: "阀门控制 — 开/关 + 反馈超时",
    descriptionEn: "Valve Control — open/close with feedback timeout",
    category: "station_ctrl",
    parameterInterface: {
      inputs: [
        { name: "openCmd", type: "BOOL" }, { name: "closeCmd", type: "BOOL" },
        { name: "safetyOk", type: "BOOL" }, { name: "openFeedback", type: "BOOL" },
        { name: "closedFeedback", type: "BOOL" },
      ],
      outputs: [
        { name: "valveOutput", type: "BOOL" }, { name: "valveOpen", type: "BOOL" },
        { name: "valveClosed", type: "BOOL" }, { name: "valveFault", type: "BOOL" },
      ],
    },
  });

  // FC201 — Motor Control
  modules.push({
    moduleName: "FC_MotorControl",
    moduleType: "FC",
    moduleNumber: "FC201",
    parentModuleId: "OB1",
    sortOrder: sortIdx++,
    description: "电机控制 — VFD/DOL 启停 + 过载监测",
    descriptionEn: "Motor Control — VFD/DOL start/stop, overload monitoring",
    category: "station_ctrl",
    parameterInterface: {
      inputs: [
        { name: "startCmd", type: "BOOL" }, { name: "stopCmd", type: "BOOL" },
        { name: "safetyOk", type: "BOOL" }, { name: "mode", type: "INT" },
        { name: "manualStart", type: "BOOL" }, { name: "speedSetpoint", type: "REAL" },
        { name: "overloadTrip", type: "BOOL" }, { name: "runFeedback", type: "BOOL" },
      ],
      outputs: [
        { name: "motorRun", type: "BOOL" }, { name: "speedOutput", type: "REAL" },
        { name: "motorFault", type: "BOOL" }, { name: "motorRunning", type: "BOOL" },
      ],
    },
  });

  // FC202 — Sensor Read
  modules.push({
    moduleName: "FC_SensorRead",
    moduleType: "FC",
    moduleNumber: "FC202",
    parentModuleId: "OB1",
    sortOrder: sortIdx++,
    description: "传感器读取 — 模拟量缩放/数字滤波/故障检测",
    descriptionEn: "Sensor Read — analog scaling, digital filter, fault detection",
    category: "station_ctrl",
    parameterInterface: {
      inputs: [
        { name: "rawValue", type: "INT", description: "Raw analog input 0-27648" },
        { name: "scaleLow", type: "REAL", description: "Engineering low" },
        { name: "scaleHigh", type: "REAL", description: "Engineering high" },
        { name: "filterTime", type: "REAL", description: "Filter time constant ms" },
      ],
      outputs: [
        { name: "scaledValue", type: "REAL", description: "Scaled value" },
        { name: "sensorFault", type: "BOOL", description: "Wire break / overflow" },
      ],
    },
  });

  // FC203 — Temperature Control
  modules.push({
    moduleName: "FC_TemperatureControl",
    moduleType: "FC",
    moduleNumber: "FC203",
    parentModuleId: "OB1",
    sortOrder: sortIdx++,
    description: "温度控制 — PID + 偏差报警",
    descriptionEn: "Temperature Control — PID loop with deviation alarm",
    category: "station_ctrl",
    parameterInterface: {
      inputs: [
        { name: "enable", type: "BOOL" }, { name: "setpoint", type: "REAL" },
        { name: "processValue", type: "REAL" }, { name: "autoMode", type: "BOOL" },
      ],
      outputs: [
        { name: "output", type: "REAL" }, { name: "deviation", type: "REAL" },
        { name: "deviationAlarm", type: "BOOL" },
      ],
    },
  });

  // FC204 — Alarm Check
  modules.push({
    moduleName: "FC_AlarmCheck",
    moduleType: "FC",
    moduleNumber: "FC204",
    parentModuleId: "OB1",
    sortOrder: sortIdx++,
    description: "报警检查 — 工位级报警评估",
    descriptionEn: "Alarm Check — station-level alarm evaluation",
    category: "alarm",
    parameterInterface: {
      inputs: [
        { name: "stationFaults", type: "DWORD", description: "Fault bits" },
        { name: "acknowledge", type: "BOOL" },
      ],
      outputs: [
        { name: "hasAlarm", type: "BOOL" },
        { name: "alarmCode", type: "INT" },
      ],
    },
  });

  // ─── 5. System Function Blocks (Recipe, Maintenance, etc.) ───

  if (includeRecipeManager) {
    modules.push({
      moduleName: "FB_RecipeManager",
      moduleType: "FB",
      moduleNumber: "FB300",
      parentModuleId: "OB1",
      sortOrder: sortIdx++,
      description: `配方管理 — ${stations.length}工位参数集CRUD/下载/换型`,
      descriptionEn: `Recipe Manager — ${stations.length} station parameter sets CRUD, download, changeover`,
      category: "recipe",
      parameterInterface: {
        inputs: [
          { name: "loadRecipe", type: "BOOL" }, { name: "saveRecipe", type: "BOOL" },
          { name: "recipeNumber", type: "INT" }, { name: "downloadToStations", type: "BOOL" },
        ],
        outputs: [
          { name: "recipeLoaded", type: "BOOL" }, { name: "recipeName", type: "STRING[64]" },
          { name: "downloadComplete", type: "BOOL" },
        ],
        statics: [
          { name: "currentRecipe", type: "INT", initialValue: "0" },
          { name: "downloadStep", type: "INT", initialValue: "0" },
        ],
      },
    });
  }

  if (includeMaintenance) {
    modules.push({
      moduleName: "FB_MaintenanceMode",
      moduleType: "FB",
      moduleNumber: "FB301",
      parentModuleId: "OB1",
      sortOrder: sortIdx++,
      description: "维护模式 — 运行小时计数/定期保养提醒",
      descriptionEn: "Maintenance Mode — operating hours counters, scheduled maintenance alerts",
      category: "diagnostic",
      parameterInterface: {
        inputs: [{ name: "autoRunning", type: "BOOL" }, { name: "resetCounter", type: "INT" }],
        outputs: [
          { name: "maintenanceDue", type: "BOOL" }, { name: "nextMaintDate", type: "DATE" },
          { name: "totalRunHours", type: "REAL" },
        ],
        statics: stations.map(s => ({
          name: `station${s.stationCode}_hours`, type: "REAL", initialValue: "0.0",
        })),
      },
    });
  }

  if (includeCommunication) {
    modules.push({
      moduleName: "FB_Communication",
      moduleType: "FB",
      moduleNumber: "FB302",
      parentModuleId: "OB1",
      sortOrder: sortIdx++,
      description: "通信管理 — HMI数据块映射/OPC-UA/MES接口",
      descriptionEn: "Communication — HMI datablock mapping, OPC-UA tags, MES interface",
      category: "comm",
      parameterInterface: {
        inputs: [{ name: "hmiConnected", type: "BOOL" }],
        outputs: [
          { name: "heartbeat", type: "BOOL" }, { name: "commTimeout", type: "BOOL" },
          { name: "commStatus", type: "INT" },
        ],
        statics: [
          { name: "heartbeatTimer", type: "TON" }, { name: "heartbeatState", type: "BOOL", initialValue: "FALSE" },
          { name: "commTimeoutTimer", type: "TON" },
        ],
      },
    });
  }

  if (includeDiagnostic) {
    modules.push({
      moduleName: "FB_DiagnosticLog",
      moduleType: "FB",
      moduleNumber: "FB303",
      parentModuleId: "OB1",
      sortOrder: sortIdx++,
      description: "诊断日志 — 200条环形缓冲区 + 严重等级过滤",
      descriptionEn: "Diagnostic Log — 200-entry ring buffer with severity filtering",
      category: "diagnostic",
      parameterInterface: {
        inputs: [
          { name: "logEntry", type: "BOOL" }, { name: "source", type: "STRING[32]" },
          { name: "code", type: "INT" }, { name: "message", type: "STRING[128]" },
          { name: "severity", type: "INT" }, { name: "value", type: "REAL" },
        ],
        outputs: [
          { name: "totalEntries", type: "INT" }, { name: "errorCount", type: "INT" },
          { name: "lastEntryIndex", type: "INT" },
        ],
        statics: [
          { name: "writePtr", type: "INT", initialValue: "0" },
          { name: "entryCount", type: "INT", initialValue: "0" },
        ],
      },
    });
  }

  // FB_AlarmManager
  modules.push({
    moduleName: "FB_AlarmManager",
    moduleType: "FB",
    moduleNumber: "FB304",
    parentModuleId: "OB1",
    sortOrder: sortIdx++,
    description: "报警管理 — 报警评估/HMI映射/确认处理",
    descriptionEn: "Alarm Manager — alarm evaluation, HMI mapping, acknowledge handling",
    category: "alarm",
    parameterInterface: {
      inputs: [{ name: "acknowledgeAll", type: "BOOL" }],
      outputs: [
        { name: "alarmCount", type: "INT" }, { name: "hasActiveFault", type: "BOOL" },
        { name: "alarmCode", type: "INT" },
      ],
    },
  });

  // ─── 6. Generate I/O Mappings ────────────────────────────────

  const ioMappings = generateIoMappings(adapter, stations, eStopCount);

  // ─── 7. Generate Alarm Definitions ───────────────────────────

  const alarmDefinitions = generateAlarmDefinitions(stations, eStopCount);

  // ─── 8. Default Access Levels ────────────────────────────────

  const accessLevels = generateDefaultAccessLevels();

  // ─── Summary ─────────────────────────────────────────────────

  const ioSummary = {
    totalDI: ioMappings.filter(m => m.ioType === "DI").length,
    totalDO: ioMappings.filter(m => m.ioType === "DO").length,
    totalAI: ioMappings.filter(m => m.ioType === "AI").length,
    totalAO: ioMappings.filter(m => m.ioType === "AO").length,
    rackCount: Math.ceil(ioMappings.length / 128) || 1,
  };

  return { modules, ioMappings, ioSummary, alarmDefinitions, accessLevels };
}

// ── I/O Mapping Generator ────────────────────────────────────────────────

export function generateIoMappings(
  adapter: PlcBrandAdapter,
  stations: StationInfo[],
  eStopCount: number = 4,
): IoMappingEntry[] {
  const mappings: IoMappingEntry[] = [];
  let diByteOfs = 0, diBitOfs = 0;
  let doByteOfs = 0, doBitOfs = 0;
  let aiWordOfs = 256;  // Analog starts at IW256
  let aoWordOfs = 256;  // Analog output at QW256

  function nextDI(): string {
    const addr = adapter.formatIOAddress("DI", diByteOfs, diBitOfs);
    diBitOfs++;
    if (diBitOfs >= 8) { diBitOfs = 0; diByteOfs++; }
    return addr;
  }
  function nextDO(): string {
    const addr = adapter.formatIOAddress("DO", doByteOfs, doBitOfs);
    doBitOfs++;
    if (doBitOfs >= 8) { doBitOfs = 0; doByteOfs++; }
    return addr;
  }
  function nextAI(): string {
    const addr = adapter.formatIOAddress("AI", aiWordOfs);
    aiWordOfs += 2;
    return addr;
  }
  function nextAO(): string {
    const addr = adapter.formatIOAddress("AO", aoWordOfs);
    aoWordOfs += 2;
    return addr;
  }

  // System-level I/O (E-stops, guard doors)
  for (let i = 0; i < eStopCount; i++) {
    mappings.push({
      signalName: `急停按钮${i + 1}`, signalNameEn: `E-Stop ${i + 1}`,
      address: nextDI(), ioType: "DI", dataType: "BOOL",
      moduleRack: 0, moduleSlot: 0, moduleChannel: mappings.length,
      stationId: null, description: `Emergency stop button ${i + 1}`,
      safetyRelevant: true,
    });
  }
  mappings.push({
    signalName: "安全门开关", signalNameEn: "Guard Door Switch",
    address: nextDI(), ioType: "DI", dataType: "BOOL",
    moduleRack: 0, moduleSlot: 0, moduleChannel: mappings.length,
    stationId: null, description: "Guard door interlock",
    safetyRelevant: true,
  });
  mappings.push({
    signalName: "安全继电器反馈", signalNameEn: "Safety Relay Feedback",
    address: nextDI(), ioType: "DI", dataType: "BOOL",
    moduleRack: 0, moduleSlot: 0, moduleChannel: mappings.length,
    stationId: null, description: "Safety relay EDM feedback",
    safetyRelevant: true,
  });
  mappings.push({
    signalName: "安全继电器指令", signalNameEn: "Safety Relay Command",
    address: nextDO(), ioType: "DO", dataType: "BOOL",
    moduleRack: 0, moduleSlot: 1, moduleChannel: 0,
    stationId: null, description: "Safety relay coil",
    safetyRelevant: true,
  });

  // Per-station I/O
  for (const station of stations) {
    const ep = station.electricalParams || {};
    const rackSlot = Math.floor(mappings.length / 32) + 1;

    // Digital inputs per station
    const diCount = ep.plcDI || 4;
    const diSignals = generateStationDISignals(station);
    for (let i = 0; i < diCount; i++) {
      const sig = diSignals[i] || { name: `DI_${i}`, nameEn: `DI_${i}`, desc: "" };
      mappings.push({
        signalName: `${station.stationCode}_${sig.name}`, signalNameEn: `${station.stationCode}_${sig.nameEn}`,
        address: nextDI(), ioType: "DI", dataType: "BOOL",
        moduleRack: 0, moduleSlot: rackSlot, moduleChannel: i,
        stationId: station.id, stationCode: station.stationCode,
        description: sig.desc, safetyRelevant: false,
      });
    }

    // Digital outputs per station
    const doCount = ep.plcDO || 4;
    const doSignals = generateStationDOSignals(station);
    for (let i = 0; i < doCount; i++) {
      const sig = doSignals[i] || { name: `DO_${i}`, nameEn: `DO_${i}`, desc: "" };
      mappings.push({
        signalName: `${station.stationCode}_${sig.name}`, signalNameEn: `${station.stationCode}_${sig.nameEn}`,
        address: nextDO(), ioType: "DO", dataType: "BOOL",
        moduleRack: 0, moduleSlot: rackSlot + 1, moduleChannel: i,
        stationId: station.id, stationCode: station.stationCode,
        description: sig.desc, safetyRelevant: false,
      });
    }

    // Analog inputs per station
    const aiCount = ep.plcAI || 0;
    const aiSignals = generateStationAISignals(station);
    for (let i = 0; i < aiCount; i++) {
      const sig = aiSignals[i] || { name: `AI_${i}`, nameEn: `AI_${i}`, desc: "" };
      mappings.push({
        signalName: `${station.stationCode}_${sig.name}`, signalNameEn: `${station.stationCode}_${sig.nameEn}`,
        address: nextAI(), ioType: "AI", dataType: "INT",
        moduleRack: 0, moduleSlot: rackSlot + 2, moduleChannel: i,
        stationId: station.id, stationCode: station.stationCode,
        description: sig.desc, safetyRelevant: false,
      });
    }

    // Analog outputs per station
    const aoCount = ep.plcAO || 0;
    for (let i = 0; i < aoCount; i++) {
      mappings.push({
        signalName: `${station.stationCode}_AO_${i}`, signalNameEn: `${station.stationCode}_AO_${i}`,
        address: nextAO(), ioType: "AO", dataType: "INT",
        moduleRack: 0, moduleSlot: rackSlot + 3, moduleChannel: i,
        stationId: station.id, stationCode: station.stationCode,
        description: `Analog output ${i}`, safetyRelevant: false,
      });
    }
  }

  return mappings;
}

// ── Signal Name Generators ───────────────────────────────────────────────

interface SignalDef { name: string; nameEn: string; desc: string }

function generateStationDISignals(station: StationInfo): SignalDef[] {
  const ep = station.electricalParams || {};
  const signals: SignalDef[] = [];
  const type = station.stationType;

  // Motor run feedbacks
  for (let i = 0; i < (ep.motorCount || 0); i++) {
    signals.push({ name: `电机${i + 1}反馈`, nameEn: `Motor${i + 1}_FB`, desc: `Motor ${i + 1} run feedback` });
  }
  // Overload trips
  for (let i = 0; i < (ep.motorCount || 0); i++) {
    signals.push({ name: `电机${i + 1}过载`, nameEn: `Motor${i + 1}_OL`, desc: `Motor ${i + 1} overload trip` });
  }
  // Level/temperature sensors (digital)
  if (["PRE_WASH", "ULTRASONIC", "SPRAY", "RINSE", "DI_RINSE", "PASSIVATION", "DEGREASING", "TURBULENCE"].includes(type)) {
    signals.push({ name: "液位高", nameEn: "LevelHigh", desc: "Tank level high" });
    signals.push({ name: "液位低", nameEn: "LevelLow", desc: "Tank level low" });
  }
  // Safety interlocks
  for (const il of (ep.safetyInterlocks || [])) {
    signals.push({ name: il, nameEn: il, desc: `Interlock: ${il}` });
  }

  return signals;
}

function generateStationDOSignals(station: StationInfo): SignalDef[] {
  const ep = station.electricalParams || {};
  const signals: SignalDef[] = [];

  // Motor run commands
  for (let i = 0; i < (ep.motorCount || 0); i++) {
    signals.push({ name: `电机${i + 1}启动`, nameEn: `Motor${i + 1}_Run`, desc: `Motor ${i + 1} run command` });
  }
  // Heater outputs
  for (let i = 0; i < (ep.heaterCircuits || 0); i++) {
    signals.push({ name: `加热器${i + 1}`, nameEn: `Heater${i + 1}`, desc: `Heater circuit ${i + 1}` });
  }
  // Valve outputs (generic)
  if (["PRE_WASH", "SPRAY", "RINSE", "PASSIVATION"].includes(station.stationType)) {
    signals.push({ name: "进水阀", nameEn: "InletValve", desc: "Water inlet valve" });
    signals.push({ name: "排水阀", nameEn: "DrainValve", desc: "Drain valve" });
  }

  return signals;
}

function generateStationAISignals(station: StationInfo): SignalDef[] {
  const signals: SignalDef[] = [];
  const type = station.stationType;
  const ep = station.electricalParams || {};

  if (["PRE_WASH", "ULTRASONIC", "SPRAY", "RINSE", "DI_RINSE", "PASSIVATION", "DEGREASING", "TURBULENCE"].includes(type)) {
    signals.push({ name: "温度", nameEn: "Temperature", desc: "Temperature PT100/PT1000" });
    signals.push({ name: "液位", nameEn: "Level", desc: "Tank level analog" });
  }
  if (["SPRAY", "TURBULENCE"].includes(type)) {
    signals.push({ name: "压力", nameEn: "Pressure", desc: "Process pressure" });
  }
  if (type === "DI_RINSE") {
    signals.push({ name: "电导率", nameEn: "Conductivity", desc: "DI water conductivity" });
  }
  if (type === "HOT_AIR_DRY" || type === "VACUUM_DRY") {
    signals.push({ name: "干燥温度", nameEn: "DryTemp", desc: "Drying temperature" });
  }
  if (type === "VACUUM_DRY") {
    signals.push({ name: "真空度", nameEn: "VacuumLevel", desc: "Vacuum pressure" });
  }

  // VFD speed feedback
  const motorDetails = ep.motorDetails || [];
  for (const m of motorDetails.filter(m => m.type === "VFD")) {
    signals.push({ name: `${m.name}_转速`, nameEn: `${m.name}_Speed`, desc: `VFD speed feedback` });
  }

  return signals;
}

// ── Interlock Collector ──────────────────────────────────────────────────

function collectInterlocks(stations: StationInfo[]): string[] {
  const all: string[] = [];
  for (const s of stations) {
    const ep = s.electricalParams || {};
    for (const il of (ep.safetyInterlocks || [])) {
      const key = `${s.stationCode}_${il}`;
      if (!all.includes(key)) all.push(key);
    }
  }
  return all;
}

// ── Alarm Definition Generator ───────────────────────────────────────────

export function generateAlarmDefinitions(
  stations: StationInfo[],
  eStopCount: number = 4,
): Array<AlarmDef & { stationCode?: string; stationId?: number }> {
  const alarms: Array<AlarmDef & { stationCode?: string; stationId?: number }> = [];
  let code = 1;

  // System alarms
  for (let i = 0; i < eStopCount; i++) {
    alarms.push({
      code: `ALM-${String(code++).padStart(3, "0")}`,
      message: `急停按钮${i + 1}被按下`,
      messageEn: `Emergency Stop ${i + 1} Pressed`,
      triggerCondition: `NOT eStop${i + 1}`,
      interlockAction: "STOP ALL — Category 0",
      resetType: "manual",
      severity: "critical",
    });
  }
  alarms.push({
    code: `ALM-${String(code++).padStart(3, "0")}`,
    message: "安全门打开", messageEn: "Guard Door Open",
    triggerCondition: "NOT guardDoor",
    interlockAction: "STOP ALL — Category 1",
    resetType: "manual", severity: "critical",
  });
  alarms.push({
    code: `ALM-${String(code++).padStart(3, "0")}`,
    message: "安全继电器故障", messageEn: "Safety Relay EDM Fault",
    triggerCondition: "edmTimer.Q",
    interlockAction: "LOCKOUT — requires power cycle",
    resetType: "manual", severity: "critical",
  });

  // Per-station alarms
  for (const station of stations) {
    const ep = station.electricalParams || {};
    const prefix = station.stationCode;

    // Motor overload alarms
    for (let i = 0; i < (ep.motorCount || 0); i++) {
      alarms.push({
        code: `ALM-${String(code++).padStart(3, "0")}`,
        message: `${station.stationName} 电机${i + 1}过载`,
        messageEn: `${prefix} Motor ${i + 1} Overload`,
        triggerCondition: `${prefix}_Motor${i + 1}_OL`,
        interlockAction: `STOP ${prefix} Motor ${i + 1}`,
        resetType: "manual", severity: "high",
        stationCode: prefix, stationId: station.id,
      });
    }

    // Temperature/level alarms for cleaning stations
    const type = station.stationType;
    if (["PRE_WASH", "ULTRASONIC", "SPRAY", "RINSE", "DI_RINSE", "PASSIVATION", "DEGREASING", "TURBULENCE"].includes(type)) {
      if ((ep.heaterCircuits || 0) > 0) {
        alarms.push({
          code: `ALM-${String(code++).padStart(3, "0")}`,
          message: `${station.stationName} 温度偏差过大`,
          messageEn: `${prefix} Temperature Deviation`,
          triggerCondition: `ABS(${prefix}_TempSP - ${prefix}_TempPV) > 5.0`,
          interlockAction: "Warning only",
          resetType: "auto", severity: "medium",
          stationCode: prefix, stationId: station.id,
        });
        alarms.push({
          code: `ALM-${String(code++).padStart(3, "0")}`,
          message: `${station.stationName} 超温保护`,
          messageEn: `${prefix} Over-Temperature`,
          triggerCondition: `${prefix}_TempPV > ${prefix}_TempHighLimit`,
          interlockAction: `STOP ${prefix} Heater`,
          resetType: "manual", severity: "high",
          stationCode: prefix, stationId: station.id,
        });
      }
      alarms.push({
        code: `ALM-${String(code++).padStart(3, "0")}`,
        message: `${station.stationName} 液位低`,
        messageEn: `${prefix} Low Level`,
        triggerCondition: `NOT ${prefix}_LevelLow`,
        interlockAction: `STOP ${prefix} Pump`,
        resetType: "auto", severity: "high",
        stationCode: prefix, stationId: station.id,
      });
    }

    // Safety interlock alarms
    for (const il of (ep.safetyInterlocks || [])) {
      alarms.push({
        code: `ALM-${String(code++).padStart(3, "0")}`,
        message: `${station.stationName} 联锁: ${il}`,
        messageEn: `${prefix} Interlock: ${il}`,
        triggerCondition: `${prefix}_${il}`,
        interlockAction: `Interlock action for ${il}`,
        resetType: "manual", severity: "high",
        stationCode: prefix, stationId: station.id,
      });
    }
  }

  return alarms;
}

// ── Default Access Levels ────────────────────────────────────────────────

export function generateDefaultAccessLevels(): AccessLevel[] {
  return [
    {
      levelNumber: 1, levelName: "操作员", levelNameEn: "Operator",
      permissions: { viewProcess: true, adjustParams: false, changeRecipe: false, manualMode: false, serviceMode: false, systemConfig: false, userAdmin: false },
      timeout: 3600,
    },
    {
      levelNumber: 2, levelName: "维护员", levelNameEn: "Maintenance",
      permissions: { viewProcess: true, adjustParams: true, changeRecipe: false, manualMode: true, serviceMode: false, systemConfig: false, userAdmin: false },
      timeout: 1800,
    },
    {
      levelNumber: 3, levelName: "工程师", levelNameEn: "Engineer",
      permissions: { viewProcess: true, adjustParams: true, changeRecipe: true, manualMode: true, serviceMode: true, systemConfig: false, userAdmin: false },
      timeout: 1800,
    },
    {
      levelNumber: 4, levelName: "管理员", levelNameEn: "Administrator",
      permissions: { viewProcess: true, adjustParams: true, changeRecipe: true, manualMode: true, serviceMode: true, systemConfig: true, userAdmin: true },
      timeout: 900,
    },
  ];
}

// ── Logic Diagram Generator (Mermaid) ────────────────────────────────────

export function generateLogicDiagram(modules: ProgramModule[]): string {
  const lines: string[] = ["graph TD"];

  // Add all modules as nodes
  for (const m of modules) {
    const shape = m.moduleType === "OB" ? `[["${m.moduleNumber}: ${m.moduleName}"]]`
      : m.moduleType === "FB" ? `["${m.moduleNumber}: ${m.moduleName}"]`
      : m.moduleType === "FC" ? `(["${m.moduleNumber}: ${m.moduleName}"])`
      : `[("${m.moduleNumber}: ${m.moduleName}")]`;
    lines.push(`  ${m.moduleNumber}${shape}`);
  }

  // Add edges (parent → child)
  for (const m of modules) {
    if (m.parentModuleId) {
      lines.push(`  ${m.parentModuleId} --> ${m.moduleNumber}`);
    }
  }

  // Style by category
  lines.push("");
  lines.push("  classDef safety fill:#fee,stroke:#c00");
  lines.push("  classDef mode fill:#efe,stroke:#0a0");
  lines.push("  classDef station fill:#eef,stroke:#00c");
  lines.push("  classDef alarm fill:#ffe,stroke:#cc0");

  const safetyNodes = modules.filter(m => m.category === "safety").map(m => m.moduleNumber).join(",");
  const modeNodes = modules.filter(m => m.category === "mode_mgmt").map(m => m.moduleNumber).join(",");
  const stationNodes = modules.filter(m => m.category === "station_ctrl").map(m => m.moduleNumber).join(",");
  const alarmNodes = modules.filter(m => m.category === "alarm").map(m => m.moduleNumber).join(",");

  if (safetyNodes) lines.push(`  class ${safetyNodes} safety`);
  if (modeNodes) lines.push(`  class ${modeNodes} mode`);
  if (stationNodes) lines.push(`  class ${stationNodes} station`);
  if (alarmNodes) lines.push(`  class ${alarmNodes} alarm`);

  return lines.join("\n");
}

// ── Mode State Machine Diagram ───────────────────────────────────────────

export function generateModeStateDiagram(): string {
  return [
    "stateDiagram-v2",
    "  [*] --> INITIALIZING",
    "  INITIALIZING --> MANUAL : initTimer.Q AND safetyOk",
    "  MANUAL --> AUTO : allStationsReady AND safetyOk",
    "  AUTO --> MANUAL : modeRequest=2",
    "  MANUAL --> SERVICE : keySwitch=2",
    "  MANUAL --> CHANGEOVER : modeRequest=4",
    "  MANUAL --> DEBUG : keySwitch=2",
    "  SERVICE --> MANUAL : modeRequest=2",
    "  CHANGEOVER --> MANUAL : modeRequest=2",
    "  DEBUG --> MANUAL : modeRequest=2",
    "  AUTO --> E_STOP : NOT safetyOk",
    "  MANUAL --> E_STOP : NOT safetyOk",
    "  SERVICE --> E_STOP : NOT safetyOk",
    "  CHANGEOVER --> E_STOP : NOT safetyOk",
    "  DEBUG --> E_STOP : NOT safetyOk",
    "  E_STOP --> MANUAL : safetyOk AND acknowledge",
    "",
    "  INITIALIZING : 初始化中...",
    "  AUTO : 自动运行",
    "  MANUAL : 手动模式",
    "  SERVICE : 维修模式",
    "  CHANGEOVER : 换型模式",
    "  DEBUG : 调试模式",
    "  E_STOP : 急停",
  ].join("\n");
}

// ── Troubleshooting Guide Generator ──────────────────────────────────────

export function generateTroubleshootingGuide(
  alarm: AlarmDef & { stationCode?: string },
): string {
  const lines: string[] = [
    "graph TD",
    `  START["报警: ${alarm.code}<br/>${alarm.message}"]`,
  ];

  switch (alarm.severity) {
    case "critical":
      lines.push(`  START --> CHECK1{"检查急停/安全链"}`);
      lines.push(`  CHECK1 -->|正常| CHECK2{"检查安全继电器"}`);
      lines.push(`  CHECK1 -->|异常| ACTION1["复位急停按钮"]`);
      lines.push(`  CHECK2 -->|正常| CHECK3{"检查PLC诊断"}`);
      lines.push(`  CHECK2 -->|异常| ACTION2["更换安全继电器"]`);
      lines.push(`  CHECK3 --> ACTION3["联系电气工程师"]`);
      lines.push(`  ACTION1 --> RESET["按确认键复位"]`);
      lines.push(`  ACTION2 --> RESET`);
      lines.push(`  ACTION3 --> RESET`);
      break;
    case "high":
      lines.push(`  START --> CHECK1{"检查现场设备"}`);
      lines.push(`  CHECK1 -->|电机过载| ACTION1["检查机械负载<br/>检查电流"]`);
      lines.push(`  CHECK1 -->|温度异常| ACTION2["检查加热器<br/>检查传感器"]`);
      lines.push(`  CHECK1 -->|液位低| ACTION3["检查进水<br/>检查管路"]`);
      lines.push(`  ACTION1 --> RESET["排除故障后手动复位"]`);
      lines.push(`  ACTION2 --> RESET`);
      lines.push(`  ACTION3 --> RESET`);
      break;
    default:
      lines.push(`  START --> CHECK1{"确认报警条件"}`);
      lines.push(`  CHECK1 -->|已恢复| ACTION1["等待自动复位"]`);
      lines.push(`  CHECK1 -->|未恢复| ACTION2["检查工艺参数"]`);
      lines.push(`  ACTION2 --> RESET["调整参数后确认"]`);
      lines.push(`  ACTION1 --> DONE["报警自动清除"]`);
      break;
  }

  return lines.join("\n");
}
