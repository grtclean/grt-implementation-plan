/**
 * GRT Industrial Middleware (GIM) — Logic-to-Code Transpiler
 *
 * Architecture:
 *   M3 Station Parameters → GIM Logic JSON → PLCTranspiler → Platform Code
 *
 * The GIM Logic Model is the core intellectual property:
 * - Platform-agnostic intermediate representation
 * - Preserves process logic regardless of PLC brand changes
 * - Enables simulation without hardware
 *
 * Supported platforms:
 *   1. Siemens SCL (TIA Portal V17+ / S7-1500 / S7-1200)
 *   2. Inovance/Mitsubishi ST (IEC 61131-3 Structured Text)
 *   3. Fanuc/ABB LAD (Ladder Diagram description)
 */

import type { StationInfo, IoMappingEntry } from "./plc-architecture.service";

// ═══════════════════════════════════════════════════════════════════════════
// GIM Logic Model — Platform-Agnostic Intermediate Representation
// ═══════════════════════════════════════════════════════════════════════════

/** Top-level project logic model */
export interface GimProject {
  projectId: number;
  projectName: string;
  brand: string;
  stations: GimStationLogic[];
  systemLogic: GimSystemLogic;
  hmiLayout: GimHmiLayout;
  metadata: {
    generatedAt: string;
    gimVersion: string;
    iecStandard: "IEC 61131-3";
  };
}

/** System-level logic (mode manager, safety, alarms) */
export interface GimSystemLogic {
  modeManager: GimStateMachine;
  safetyChain: GimSafetyChain;
  alarms: GimAlarmRule[];
  communication: GimCommConfig;
}

/** 7-state mode FSM */
export interface GimStateMachine {
  states: GimState[];
  transitions: GimTransition[];
  initialState: string;
}

export interface GimState {
  id: string;   // "INIT" | "AUTO" | "MANUAL" | "SERVICE" | "CHANGEOVER" | "DEBUG" | "E_STOP"
  nameZh: string;
  nameEn: string;
  outputs: Record<string, boolean | number | string>;
}

export interface GimTransition {
  from: string;
  to: string;
  condition: GimCondition;
  priority: number;
}

/** Safety chain */
export interface GimSafetyChain {
  eStopCount: number;
  guardDoors: number;
  safetyRelayEdm: boolean;
  interlocks: Array<{ stationCode: string; name: string }>;
  category: "PLd_Cat3" | "PLe_Cat4";
}

/** Per-station logic */
export interface GimStationLogic {
  stationCode: string;
  stationName: string;
  stationNameEn: string;
  stationType: string;
  axes: GimAxis[];
  motors: GimMotor[];
  valves: GimValve[];
  sensors: GimSensor[];
  heaters: GimHeater[];
  sequence: GimSequenceStep[];
  pidLoops: GimPidLoop[];
}

export interface GimAxis {
  name: string;
  type: "linear" | "rotary" | "articulated";
  stroke?: number;  // mm
  speed?: number;    // mm/s or rpm
  driveType: "servo" | "stepper" | "vfd" | "pneumatic";
}

export interface GimMotor {
  name: string;
  nameEn: string;
  power: number;      // kW
  voltage: number;     // V
  driveType: "DOL" | "VFD";
  speedRange?: { min: number; max: number }; // Hz or rpm
  safetyCategory?: string;
}

export interface GimValve {
  name: string;
  nameEn: string;
  type: "solenoid_2way" | "solenoid_3way" | "proportional" | "pneumatic_5_2";
  feedback: "none" | "limit_switch" | "proximity";
  safeState: "open" | "closed";
}

export interface GimSensor {
  name: string;
  nameEn: string;
  type: "proximity" | "level" | "temperature" | "pressure" | "flow" | "conductivity" | "vacuum" | "force";
  signalType: "digital" | "analog_4_20mA" | "analog_0_10V" | "pt100" | "thermocouple";
  range?: { min: number; max: number; unit: string };
}

export interface GimHeater {
  name: string;
  power: number;    // kW
  maxTemp: number;  // °C
  controlType: "on_off" | "pid";
  setpoint: number; // °C
}

export interface GimPidLoop {
  name: string;
  processVariable: string;
  setpoint: number;
  kp: number;
  ki: number;
  kd: number;
  outputMin: number;
  outputMax: number;
  deviationAlarm: number;
}

/** Sequence step — the core cleaning logic */
export interface GimSequenceStep {
  stepNumber: number;
  nameZh: string;
  nameEn: string;
  actions: GimAction[];
  duration: number;         // seconds (0 = wait for condition)
  exitCondition?: GimCondition;
  nextStep: number;
  faultStep?: number;       // step to goto on fault
}

export interface GimAction {
  type: "motor_start" | "motor_stop" | "motor_speed" | "valve_open" | "valve_close"
    | "heater_on" | "heater_off" | "wait" | "pid_enable" | "pid_disable"
    | "sensor_check" | "alarm_trigger" | "alarm_clear";
  target: string;           // motor/valve/sensor name
  value?: number | boolean; // speed %, temperature, etc.
  comment?: string;
}

export interface GimCondition {
  type: "and" | "or" | "not" | "timer" | "signal" | "comparison";
  operands?: GimCondition[];
  signal?: string;
  operator?: "==" | "!=" | ">" | "<" | ">=" | "<=";
  value?: number | boolean | string;
  timerSeconds?: number;
}

/** Alarm rule */
export interface GimAlarmRule {
  code: string;
  messageZh: string;
  messageEn: string;
  severity: "critical" | "high" | "medium" | "low";
  trigger: GimCondition;
  interlock: string;
  resetType: "auto" | "manual";
  stationCode?: string;
}

/** HMI auto-layout */
export interface GimHmiLayout {
  screens: GimHmiScreen[];
  symbolTable: GimHmiSymbol[];
}

export interface GimHmiScreen {
  id: string;
  nameZh: string;
  nameEn: string;
  type: "overview" | "station_detail" | "manual_control" | "recipe" | "alarm" | "trending" | "maintenance";
  widgets: GimHmiWidget[];
}

export interface GimHmiWidget {
  type: "motor_faceplate" | "valve_indicator" | "pid_faceplate" | "trend_chart"
    | "alarm_banner" | "axis_jog" | "digital_indicator" | "analog_gauge"
    | "recipe_table" | "step_indicator" | "button";
  binding: string;  // GIM variable path
  position: { x: number; y: number; w: number; h: number };
  label?: string;
}

export interface GimHmiSymbol {
  name: string;
  nameEn: string;
  dataType: "BOOL" | "INT" | "REAL" | "STRING" | "TIME";
  address?: string;
  direction: "input" | "output" | "internal";
  group: string;   // station code or "SYSTEM"
  hmiAccess: "read" | "write" | "readwrite";
}

/** Communication config */
export interface GimCommConfig {
  protocol: "PROFINET" | "EtherNet_IP" | "MODBUS_TCP" | "OPC_UA";
  hmiCount: number;
  mesInterface: boolean;
  opcUaTags: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// PLCTranspiler Interface — Multi-Platform Code Generation
// ═══════════════════════════════════════════════════════════════════════════

export interface TranspileResult {
  files: TranspiledFile[];
  symbolTable: GimHmiSymbol[];
  summary: {
    platform: string;
    language: string;
    moduleCount: number;
    ioCount: number;
    alarmCount: number;
  };
}

export interface TranspiledFile {
  fileName: string;
  content: string;
  moduleType: string;
  language: "SCL" | "ST" | "LAD" | "FBD" | "IL";
}

export interface PLCTranspiler {
  /** Platform identifier */
  platformKey: string;
  platformName: string;
  language: "SCL" | "ST" | "LAD" | "FBD";

  /** Transpile entire GIM project to platform-specific files */
  transpile(project: GimProject): TranspileResult;

  /** Transpile a single station's sequence logic */
  transpileStation(station: GimStationLogic, ioMappings: IoMappingEntry[]): TranspiledFile;

  /** Generate platform-specific mode manager */
  transpileModeManager(fsm: GimStateMachine, stationCount: number): TranspiledFile;

  /** Generate safety block */
  transpileSafety(chain: GimSafetyChain): TranspiledFile;

  /** Generate alarm block */
  transpileAlarms(alarms: GimAlarmRule[]): TranspiledFile;

  /** Get file extension for this platform */
  getFileExtension(): string;
}

// ═══════════════════════════════════════════════════════════════════════════
// GIM Logic Model Generator — Station Parameters → GIM JSON
// ═══════════════════════════════════════════════════════════════════════════

const STATION_SEQUENCES: Record<string, Array<{ nameZh: string; nameEn: string; duration: number; actions: GimAction[] }>> = {
  LOADING: [
    { nameZh: "等待工件", nameEn: "Wait for workpiece", duration: 0, actions: [] },
    { nameZh: "定位工件", nameEn: "Position workpiece", duration: 10, actions: [{ type: "motor_start", target: "transfer", value: true }] },
    { nameZh: "完成", nameEn: "Complete", duration: 0, actions: [{ type: "motor_stop", target: "transfer" }] },
  ],
  PRE_WASH: [
    { nameZh: "等待", nameEn: "Idle", duration: 0, actions: [] },
    { nameZh: "工件下降入槽", nameEn: "Lower into tank", duration: 5, actions: [{ type: "motor_start", target: "lift", comment: "升降电机下行" }] },
    { nameZh: "循环泵启动清洗", nameEn: "Pump circulation", duration: 60, actions: [{ type: "motor_start", target: "pump" }, { type: "heater_on", target: "heater1" }] },
    { nameZh: "工件提升", nameEn: "Lift workpiece", duration: 5, actions: [{ type: "motor_stop", target: "pump" }, { type: "motor_start", target: "lift", comment: "升降电机上行" }] },
    { nameZh: "沥水", nameEn: "Drip dry", duration: 3, actions: [{ type: "motor_stop", target: "lift" }] },
  ],
  ULTRASONIC: [
    { nameZh: "等待", nameEn: "Idle", duration: 0, actions: [] },
    { nameZh: "工件下降", nameEn: "Lower into US tank", duration: 5, actions: [{ type: "motor_start", target: "lift" }] },
    { nameZh: "超声波清洗", nameEn: "Ultrasonic cleaning", duration: 120, actions: [{ type: "motor_start", target: "ultrasonic" }, { type: "motor_start", target: "pump" }] },
    { nameZh: "提升沥水", nameEn: "Lift and drip", duration: 5, actions: [{ type: "motor_stop", target: "ultrasonic" }, { type: "motor_stop", target: "pump" }] },
  ],
  SPRAY: [
    { nameZh: "等待", nameEn: "Idle", duration: 0, actions: [] },
    { nameZh: "定位", nameEn: "Position", duration: 3, actions: [{ type: "motor_start", target: "rotation" }] },
    { nameZh: "高压喷淋", nameEn: "High-pressure spray", duration: 90, actions: [{ type: "motor_start", target: "pump" }, { type: "valve_open", target: "sprayValve" }] },
    { nameZh: "停止喷淋", nameEn: "Stop spray", duration: 3, actions: [{ type: "motor_stop", target: "pump" }, { type: "valve_close", target: "sprayValve" }] },
  ],
  RINSE: [
    { nameZh: "等待", nameEn: "Idle", duration: 0, actions: [] },
    { nameZh: "工件入槽", nameEn: "Submerge", duration: 5, actions: [{ type: "motor_start", target: "lift" }] },
    { nameZh: "漂洗循环", nameEn: "Rinse circulation", duration: 60, actions: [{ type: "motor_start", target: "pump" }] },
    { nameZh: "提升沥水", nameEn: "Lift and drip", duration: 5, actions: [{ type: "motor_stop", target: "pump" }] },
  ],
  HOT_AIR_DRY: [
    { nameZh: "等待", nameEn: "Idle", duration: 0, actions: [] },
    { nameZh: "热风启动", nameEn: "Start hot air", duration: 180, actions: [{ type: "motor_start", target: "blower" }, { type: "heater_on", target: "heater1" }] },
    { nameZh: "冷却", nameEn: "Cool down", duration: 30, actions: [{ type: "heater_off", target: "heater1" }] },
  ],
  VACUUM_DRY: [
    { nameZh: "等待", nameEn: "Idle", duration: 0, actions: [] },
    { nameZh: "抽真空", nameEn: "Evacuate chamber", duration: 30, actions: [{ type: "motor_start", target: "vacuumPump" }, { type: "valve_close", target: "ventValve" }] },
    { nameZh: "真空干燥", nameEn: "Vacuum drying", duration: 300, actions: [{ type: "heater_on", target: "heater1" }] },
    { nameZh: "破真空", nameEn: "Vent chamber", duration: 10, actions: [{ type: "motor_stop", target: "vacuumPump" }, { type: "valve_open", target: "ventValve" }, { type: "heater_off", target: "heater1" }] },
  ],
};

/**
 * Generate GIM Logic Model from station parameters
 * This is the core "M3 Parameters → Logic" transform
 */
export function generateGimProject(
  projectId: number,
  projectName: string,
  brand: string,
  stations: StationInfo[],
  options: { eStopCount?: number; networkProtocol?: string; hmiCount?: number } = {},
): GimProject {
  const { eStopCount = 4, networkProtocol = "PROFINET", hmiCount = 1 } = options;

  const stationLogics: GimStationLogic[] = stations.map(s => generateStationLogic(s));

  const allInterlocks: Array<{ stationCode: string; name: string }> = [];
  for (const s of stations) {
    for (const il of (s.electricalParams?.safetyInterlocks || [])) {
      allInterlocks.push({ stationCode: s.stationCode, name: il });
    }
  }

  const alarms = generateGimAlarms(stations, eStopCount);

  return {
    projectId,
    projectName,
    brand,
    stations: stationLogics,
    systemLogic: {
      modeManager: {
        initialState: "INIT",
        states: [
          { id: "INIT", nameZh: "初始化", nameEn: "Initializing", outputs: { autoReady: false, manualActive: false } },
          { id: "AUTO", nameZh: "自动运行", nameEn: "Automatic", outputs: { autoReady: true, manualActive: false } },
          { id: "MANUAL", nameZh: "手动模式", nameEn: "Manual", outputs: { autoReady: false, manualActive: true } },
          { id: "SERVICE", nameZh: "维修模式", nameEn: "Service", outputs: { autoReady: false, serviceActive: true } },
          { id: "CHANGEOVER", nameZh: "换型", nameEn: "Changeover", outputs: { autoReady: false } },
          { id: "DEBUG", nameZh: "调试", nameEn: "Debug", outputs: { autoReady: false } },
          { id: "E_STOP", nameZh: "急停", nameEn: "Emergency Stop", outputs: { autoReady: false, eStopActive: true } },
        ],
        transitions: [
          { from: "INIT", to: "MANUAL", condition: { type: "and", operands: [{ type: "timer", timerSeconds: 3 }, { type: "signal", signal: "safetyOk" }] }, priority: 1 },
          { from: "MANUAL", to: "AUTO", condition: { type: "and", operands: [{ type: "signal", signal: "allStationsReady" }, { type: "signal", signal: "safetyOk" }] }, priority: 1 },
          { from: "AUTO", to: "MANUAL", condition: { type: "signal", signal: "modeRequest_manual" }, priority: 2 },
          { from: "MANUAL", to: "SERVICE", condition: { type: "and", operands: [{ type: "signal", signal: "keySwitch_maint" }, { type: "signal", signal: "modeRequest_service" }] }, priority: 3 },
          { from: "MANUAL", to: "CHANGEOVER", condition: { type: "signal", signal: "modeRequest_changeover" }, priority: 3 },
          { from: "MANUAL", to: "DEBUG", condition: { type: "and", operands: [{ type: "signal", signal: "keySwitch_maint" }, { type: "signal", signal: "modeRequest_debug" }] }, priority: 3 },
          { from: "*", to: "E_STOP", condition: { type: "not", operands: [{ type: "signal", signal: "safetyOk" }] }, priority: 0 },
          { from: "E_STOP", to: "MANUAL", condition: { type: "and", operands: [{ type: "signal", signal: "safetyOk" }, { type: "signal", signal: "acknowledge" }] }, priority: 1 },
        ],
      },
      safetyChain: {
        eStopCount,
        guardDoors: 1,
        safetyRelayEdm: true,
        interlocks: allInterlocks,
        category: "PLd_Cat3",
      },
      alarms,
      communication: {
        protocol: networkProtocol as GimCommConfig["protocol"],
        hmiCount,
        mesInterface: true,
        opcUaTags: true,
      },
    },
    hmiLayout: generateHmiLayout(stationLogics),
    metadata: {
      generatedAt: new Date().toISOString(),
      gimVersion: "2.0.0",
      iecStandard: "IEC 61131-3",
    },
  };
}

function generateStationLogic(station: StationInfo): GimStationLogic {
  const ep = station.electricalParams || {};
  const motorCount = ep.motorCount || 0;
  const motorDetails = ep.motorDetails || [];

  const motors: GimMotor[] = Array.from({ length: motorCount }, (_, i) => ({
    name: motorDetails[i]?.name || `Motor${i + 1}`,
    nameEn: motorDetails[i]?.name || `Motor${i + 1}`,
    power: motorDetails[i]?.power || 0,
    voltage: 380,
    driveType: (motorDetails[i]?.type === "VFD" ? "VFD" : "DOL") as "DOL" | "VFD",
    speedRange: motorDetails[i]?.type === "VFD" ? { min: 0, max: 50 } : undefined,
  }));

  const valves: GimValve[] = [];
  if (["PRE_WASH", "SPRAY", "RINSE", "PASSIVATION"].includes(station.stationType)) {
    valves.push({ name: "进水阀", nameEn: "InletValve", type: "solenoid_2way", feedback: "none", safeState: "closed" });
    valves.push({ name: "排水阀", nameEn: "DrainValve", type: "solenoid_2way", feedback: "none", safeState: "closed" });
  }
  if (station.stationType === "VACUUM_DRY") {
    valves.push({ name: "放气阀", nameEn: "VentValve", type: "solenoid_2way", feedback: "none", safeState: "open" });
  }

  const sensors: GimSensor[] = [];
  if (["PRE_WASH", "ULTRASONIC", "SPRAY", "RINSE", "DI_RINSE", "PASSIVATION", "DEGREASING"].includes(station.stationType)) {
    sensors.push({ name: "温度", nameEn: "Temperature", type: "temperature", signalType: "pt100", range: { min: 0, max: 100, unit: "°C" } });
    sensors.push({ name: "液位高", nameEn: "LevelHigh", type: "level", signalType: "digital" });
    sensors.push({ name: "液位低", nameEn: "LevelLow", type: "level", signalType: "digital" });
  }
  if (["SPRAY", "TURBULENCE"].includes(station.stationType)) {
    sensors.push({ name: "压力", nameEn: "Pressure", type: "pressure", signalType: "analog_4_20mA", range: { min: 0, max: 16, unit: "bar" } });
  }
  if (station.stationType === "DI_RINSE") {
    sensors.push({ name: "电导率", nameEn: "Conductivity", type: "conductivity", signalType: "analog_4_20mA", range: { min: 0, max: 20, unit: "μS/cm" } });
  }
  if (station.stationType === "VACUUM_DRY") {
    sensors.push({ name: "真空度", nameEn: "VacuumLevel", type: "vacuum", signalType: "analog_4_20mA", range: { min: 0, max: 1013, unit: "mbar" } });
  }

  const heaters: GimHeater[] = Array.from({ length: ep.heaterCircuits || 0 }, (_, i) => ({
    name: `heater${i + 1}`,
    power: ep.heaterTotalPower ? (ep.heaterTotalPower / (ep.heaterCircuits || 1)) : 3,
    maxTemp: 90,
    controlType: "pid" as const,
    setpoint: 60,
  }));

  // Generate sequence from station type
  const seqTemplate = STATION_SEQUENCES[station.stationType] || STATION_SEQUENCES.RINSE || [];
  const sequence: GimSequenceStep[] = seqTemplate.map((step, i) => ({
    stepNumber: i === 0 ? 0 : (i === seqTemplate.length - 1 ? 90 : i * 10),
    nameZh: step.nameZh,
    nameEn: step.nameEn,
    actions: step.actions,
    duration: step.duration,
    nextStep: i < seqTemplate.length - 1 ? (i + 1 === seqTemplate.length - 1 ? 90 : (i + 1) * 10) : 0,
  }));

  const pidLoops: GimPidLoop[] = heaters.length > 0 ? [{
    name: "TempPID",
    processVariable: "Temperature",
    setpoint: 60,
    kp: 2.0,
    ki: 0.5,
    kd: 0.1,
    outputMin: 0,
    outputMax: 100,
    deviationAlarm: 5.0,
  }] : [];

  return {
    stationCode: station.stationCode,
    stationName: station.stationName,
    stationNameEn: station.stationNameEn || station.stationCode,
    stationType: station.stationType,
    axes: [],
    motors,
    valves,
    sensors,
    heaters,
    sequence,
    pidLoops,
  };
}

function generateGimAlarms(stations: StationInfo[], eStopCount: number): GimAlarmRule[] {
  const alarms: GimAlarmRule[] = [];
  let code = 1;

  for (let i = 0; i < eStopCount; i++) {
    alarms.push({
      code: `ALM-${String(code++).padStart(3, "0")}`,
      messageZh: `急停按钮${i + 1}被按下`,
      messageEn: `E-Stop ${i + 1} Pressed`,
      severity: "critical",
      trigger: { type: "not", operands: [{ type: "signal", signal: `eStop${i + 1}` }] },
      interlock: "STOP_ALL_CATEGORY_0",
      resetType: "manual",
    });
  }
  alarms.push({
    code: `ALM-${String(code++).padStart(3, "0")}`,
    messageZh: "安全门打开", messageEn: "Guard Door Open",
    severity: "critical",
    trigger: { type: "not", operands: [{ type: "signal", signal: "guardDoor" }] },
    interlock: "STOP_ALL_CATEGORY_1",
    resetType: "manual",
  });

  for (const station of stations) {
    const ep = station.electricalParams || {};
    for (let i = 0; i < (ep.motorCount || 0); i++) {
      alarms.push({
        code: `ALM-${String(code++).padStart(3, "0")}`,
        messageZh: `${station.stationName} 电机${i + 1}过载`,
        messageEn: `${station.stationCode} Motor ${i + 1} Overload`,
        severity: "high",
        trigger: { type: "signal", signal: `${station.stationCode}_Motor${i + 1}_OL` },
        interlock: `STOP_${station.stationCode}_Motor${i + 1}`,
        resetType: "manual",
        stationCode: station.stationCode,
      });
    }
    if ((ep.heaterCircuits || 0) > 0) {
      alarms.push({
        code: `ALM-${String(code++).padStart(3, "0")}`,
        messageZh: `${station.stationName} 超温保护`,
        messageEn: `${station.stationCode} Over-Temperature`,
        severity: "high",
        trigger: { type: "comparison", signal: `${station.stationCode}_Temp`, operator: ">", value: 90 },
        interlock: `STOP_${station.stationCode}_Heater`,
        resetType: "manual",
        stationCode: station.stationCode,
      });
    }
  }

  return alarms;
}

function generateHmiLayout(stations: GimStationLogic[]): GimHmiLayout {
  const screens: GimHmiScreen[] = [];
  const symbolTable: GimHmiSymbol[] = [];
  let yPos = 0;

  // Overview screen
  const overviewWidgets: GimHmiWidget[] = stations.map((s, i) => ({
    type: "step_indicator" as const,
    binding: `${s.stationCode}.stepNumber`,
    position: { x: 10 + (i % 5) * 180, y: 80 + Math.floor(i / 5) * 120, w: 170, h: 100 },
    label: s.stationName,
  }));
  screens.push({ id: "OVERVIEW", nameZh: "总览", nameEn: "Overview", type: "overview", widgets: overviewWidgets });

  // Per-station detail screens
  for (const s of stations) {
    const widgets: GimHmiWidget[] = [];
    let wx = 10;

    // Motor faceplates — auto-generated based on motor count
    for (const m of s.motors) {
      widgets.push({ type: "motor_faceplate", binding: `${s.stationCode}.${m.name}`, position: { x: wx, y: 80, w: 120, h: 180 }, label: m.name });
      wx += 130;
    }
    // PID faceplates
    for (const pid of s.pidLoops) {
      widgets.push({ type: "pid_faceplate", binding: `${s.stationCode}.${pid.name}`, position: { x: wx, y: 80, w: 200, h: 180 }, label: pid.name });
      wx += 210;
    }
    // Valve indicators
    for (const v of s.valves) {
      widgets.push({ type: "valve_indicator", binding: `${s.stationCode}.${v.name}`, position: { x: wx, y: 80, w: 80, h: 80 }, label: v.name });
      wx += 90;
    }
    // Step indicator
    widgets.push({ type: "step_indicator", binding: `${s.stationCode}.stepNumber`, position: { x: 10, y: 280, w: 400, h: 60 } });
    // Axis jog panels — auto-generated per axis count
    for (const axis of s.axes) {
      widgets.push({ type: "axis_jog", binding: `${s.stationCode}.${axis.name}`, position: { x: wx, y: 280, w: 200, h: 120 }, label: axis.name });
      wx += 210;
    }

    screens.push({ id: `ST_${s.stationCode}`, nameZh: `${s.stationName} 详情`, nameEn: `${s.stationNameEn} Detail`, type: "station_detail", widgets });

    // Symbol table entries
    symbolTable.push(
      { name: `${s.stationCode}_stationReady`, nameEn: `${s.stationCode} Ready`, dataType: "BOOL", direction: "output", group: s.stationCode, hmiAccess: "read" },
      { name: `${s.stationCode}_stationRunning`, nameEn: `${s.stationCode} Running`, dataType: "BOOL", direction: "output", group: s.stationCode, hmiAccess: "read" },
      { name: `${s.stationCode}_stationFault`, nameEn: `${s.stationCode} Fault`, dataType: "BOOL", direction: "output", group: s.stationCode, hmiAccess: "read" },
      { name: `${s.stationCode}_stepNumber`, nameEn: `${s.stationCode} Step`, dataType: "INT", direction: "output", group: s.stationCode, hmiAccess: "read" },
      { name: `${s.stationCode}_startCmd`, nameEn: `${s.stationCode} Start`, dataType: "BOOL", direction: "input", group: s.stationCode, hmiAccess: "write" },
      { name: `${s.stationCode}_stopCmd`, nameEn: `${s.stationCode} Stop`, dataType: "BOOL", direction: "input", group: s.stationCode, hmiAccess: "write" },
    );
    for (const m of s.motors) {
      symbolTable.push(
        { name: `${s.stationCode}_${m.name}_run`, nameEn: `${m.nameEn} Run`, dataType: "BOOL", direction: "output", group: s.stationCode, hmiAccess: "read" },
        { name: `${s.stationCode}_${m.name}_fault`, nameEn: `${m.nameEn} Fault`, dataType: "BOOL", direction: "output", group: s.stationCode, hmiAccess: "read" },
      );
      if (m.driveType === "VFD") {
        symbolTable.push(
          { name: `${s.stationCode}_${m.name}_speed`, nameEn: `${m.nameEn} Speed`, dataType: "REAL", direction: "output", group: s.stationCode, hmiAccess: "readwrite" },
        );
      }
    }
    for (const sensor of s.sensors) {
      symbolTable.push({
        name: `${s.stationCode}_${sensor.nameEn}`,
        nameEn: `${s.stationCode} ${sensor.nameEn}`,
        dataType: sensor.signalType === "digital" ? "BOOL" : "REAL",
        direction: "input",
        group: s.stationCode,
        hmiAccess: "read",
      });
    }
  }

  // Standard screens
  screens.push({ id: "ALARM", nameZh: "报警列表", nameEn: "Alarm List", type: "alarm", widgets: [{ type: "alarm_banner", binding: "SYSTEM.alarms", position: { x: 0, y: 0, w: 1024, h: 600 } }] });
  screens.push({ id: "RECIPE", nameZh: "配方管理", nameEn: "Recipe Manager", type: "recipe", widgets: [{ type: "recipe_table", binding: "SYSTEM.recipes", position: { x: 0, y: 0, w: 1024, h: 600 } }] });
  screens.push({ id: "MAINTENANCE", nameZh: "维护保养", nameEn: "Maintenance", type: "maintenance", widgets: [] });

  // System symbols
  symbolTable.push(
    { name: "SYS_currentMode", nameEn: "Current Mode", dataType: "INT", direction: "output", group: "SYSTEM", hmiAccess: "read" },
    { name: "SYS_modeName", nameEn: "Mode Name", dataType: "STRING", direction: "output", group: "SYSTEM", hmiAccess: "read" },
    { name: "SYS_modeRequest", nameEn: "Mode Request", dataType: "INT", direction: "input", group: "SYSTEM", hmiAccess: "write" },
    { name: "SYS_safetyChainOk", nameEn: "Safety OK", dataType: "BOOL", direction: "output", group: "SYSTEM", hmiAccess: "read" },
    { name: "SYS_eStopActive", nameEn: "E-Stop Active", dataType: "BOOL", direction: "output", group: "SYSTEM", hmiAccess: "read" },
    { name: "SYS_alarmCount", nameEn: "Alarm Count", dataType: "INT", direction: "output", group: "SYSTEM", hmiAccess: "read" },
  );

  return { screens, symbolTable };
}

// ═══════════════════════════════════════════════════════════════════════════
// Siemens SCL Transpiler — Primary Implementation
// ═══════════════════════════════════════════════════════════════════════════

export const siemensSclTranspiler: PLCTranspiler = {
  platformKey: "SIEMENS_SCL",
  platformName: "Siemens S7-1500 SCL",
  language: "SCL",

  transpile(project: GimProject): TranspileResult {
    const files: TranspiledFile[] = [];

    // Mode Manager
    files.push(this.transpileModeManager(project.systemLogic.modeManager, project.stations.length));
    // Safety
    files.push(this.transpileSafety(project.systemLogic.safetyChain));
    // Alarms
    files.push(this.transpileAlarms(project.systemLogic.alarms));
    // Station FBs
    for (const station of project.stations) {
      files.push(this.transpileStation(station, []));
    }

    return {
      files,
      symbolTable: project.hmiLayout.symbolTable,
      summary: {
        platform: this.platformName,
        language: "SCL",
        moduleCount: files.length,
        ioCount: project.hmiLayout.symbolTable.length,
        alarmCount: project.systemLogic.alarms.length,
      },
    };
  },

  transpileStation(station: GimStationLogic): TranspiledFile {
    const sc = station.stationCode;
    const motorVars = station.motors.map((m, i) => [
      `    ${m.name}_run : BOOL;`,
      `    ${m.name}_fault : BOOL;`,
      `    ${m.name}_start : BOOL;`,
      m.driveType === "VFD" ? `    ${m.name}_speed : REAL := 50.0;` : "",
    ].filter(Boolean).join("\n")).join("\n");

    const motorCalls = station.motors.map(m => [
      `  // Motor: ${m.name} (${m.driveType}, ${m.power}kW)`,
      `  "FC_MotorControl"(`,
      `    startCmd := #${m.name}_start,`,
      `    stopCmd := #stopCmd OR NOT #safetyOk,`,
      `    safetyOk := #safetyOk,`,
      `    mode := #mode,`,
      m.driveType === "VFD" ? `    speedSetpoint := #${m.name}_speed,` : "",
      `    motorRun => #${m.name}_run,`,
      `    motorFault => #${m.name}_fault`,
      `  );`,
    ].filter(Boolean).join("\n")).join("\n\n");

    // Generate sequence CASE from GIM steps
    const sequenceCases = station.sequence.map(step => {
      const actionLines = step.actions.map(a => {
        switch (a.type) {
          case "motor_start": return `        #${a.target}_start := TRUE;${a.comment ? `  // ${a.comment}` : ""}`;
          case "motor_stop": return `        #${a.target}_start := FALSE;`;
          case "valve_open": return `        // ${a.target} OPEN`;
          case "valve_close": return `        // ${a.target} CLOSE`;
          case "heater_on": return `        // ${a.target} ON — PID enable`;
          case "heater_off": return `        // ${a.target} OFF`;
          default: return `        // ${a.type}: ${a.target}`;
        }
      });
      const timerLine = step.duration > 0
        ? `        #stepTimer(IN := TRUE, PT := T#${step.duration}s);\n        IF #stepTimer.Q THEN #stepNumber := ${step.nextStep}; #stepTimer(IN := FALSE); END_IF;`
        : step.stepNumber === 0
          ? `        IF #startCmd THEN #stepNumber := ${step.nextStep}; #stationRunning := TRUE; #cycleComplete := FALSE; END_IF;`
          : `        #cycleComplete := TRUE; #stationRunning := FALSE; #stepNumber := 0;`;

      return [
        `      ${step.stepNumber}:  // ${step.nameZh} (${step.nameEn})`,
        ...actionLines,
        timerLine,
      ].join("\n");
    }).join("\n\n");

    const hasPid = station.pidLoops.length > 0;
    const pidSection = hasPid ? [
      ``,
      `  // ── Temperature PID Control ──`,
      ...station.pidLoops.map(pid => [
        `  "FC_TemperatureControl"(`,
        `    enable := (#mode = 1),`,
        `    setpoint := #tempSetpoint,`,
        `    processValue := "${sc}_Temperature",`,
        `    autoMode := (#mode = 1),`,
        `    output => #heaterOutput,`,
        `    deviation => #tempDeviation,`,
        `    deviationAlarm => #tempAlarm`,
        `  );`,
      ].join("\n")),
    ].join("\n") : "";

    const faultAgg = station.motors.map(m => `#${m.name}_fault`).join(" OR ") || "FALSE";

    const content = [
      `FUNCTION_BLOCK "FB_Station_${sc}"`,
      `{ S7_Optimized_Access := 'TRUE' }`,
      `VERSION : 1.0`,
      `// ${station.stationName} (${station.stationNameEn})`,
      `// GIM Transpiled — ${station.motors.length} motors, ${station.valves.length} valves, ${station.sensors.length} sensors`,
      `// Sequence: ${station.sequence.length} steps`,
      ``,
      `  VAR_INPUT`,
      `    mode : INT;              // Current program mode`,
      `    safetyOk : BOOL;         // Safety chain OK`,
      `    startCmd : BOOL;         // Station start command`,
      `    stopCmd : BOOL;          // Station stop command`,
      hasPid ? `    tempSetpoint : REAL;     // Temperature setpoint °C` : "",
      `  END_VAR`,
      ``,
      `  VAR_OUTPUT`,
      `    stationReady : BOOL;`,
      `    stationRunning : BOOL;`,
      `    stationFault : BOOL;`,
      `    cycleComplete : BOOL;`,
      hasPid ? `    currentTemp : REAL;` : "",
      `  END_VAR`,
      ``,
      `  VAR`,
      `    stepNumber : INT := 0;`,
      `    cycleTimer : TON;`,
      `    stepTimer : TON;`,
      motorVars,
      hasPid ? `    heaterOutput : REAL;\n    tempDeviation : REAL;\n    tempAlarm : BOOL;` : "",
      `  END_VAR`,
      ``,
      `BEGIN`,
      `  // ── Fault aggregation ──`,
      `  #stationFault := ${faultAgg};`,
      ``,
      `  // ── Safety stop ──`,
      `  IF NOT #safetyOk OR #stopCmd THEN`,
      `    #stepNumber := 0;`,
      `    #stationRunning := FALSE;`,
      ...station.motors.map(m => `    #${m.name}_start := FALSE;`),
      `    RETURN;`,
      `  END_IF;`,
      ``,
      motorCalls,
      pidSection,
      ``,
      `  // ── Auto sequence (GIM-generated ${station.sequence.length} steps) ──`,
      `  IF #mode = 1 THEN`,
      `    CASE #stepNumber OF`,
      sequenceCases,
      `    END_CASE;`,
      `  END_IF;`,
      ``,
      `  #stationReady := NOT #stationFault AND (#stepNumber = 0);`,
      ``,
      `END_FUNCTION_BLOCK`,
    ].filter(l => l !== "").join("\n");

    return { fileName: `FB_Station_${sc}.scl`, content, moduleType: "FB", language: "SCL" };
  },

  transpileModeManager(fsm: GimStateMachine, stationCount: number): TranspiledFile {
    // Reuse the existing Siemens adapter template (already well-implemented)
    const { getAdapter } = require("./plc-brands/types");
    let adapter;
    try { adapter = getAdapter("SIEMENS_S7_1500"); } catch { adapter = null; }
    const content = adapter ? adapter.getModeManagerTemplate(stationCount) : `// Mode Manager — ${fsm.states.length} states`;
    return { fileName: "FB100_ModeManager.scl", content, moduleType: "FB", language: "SCL" };
  },

  transpileSafety(chain: GimSafetyChain): TranspiledFile {
    const { getAdapter } = require("./plc-brands/types");
    let adapter;
    try { adapter = getAdapter("SIEMENS_S7_1500"); } catch { adapter = null; }
    const interlocks = chain.interlocks.map(il => `${il.stationCode}_${il.name}`);
    const content = adapter ? adapter.getSafetyTemplate(interlocks, chain.eStopCount) : `// Safety Manager`;
    return { fileName: "FB101_SafetyManager.scl", content, moduleType: "FB", language: "SCL" };
  },

  transpileAlarms(alarms: GimAlarmRule[]): TranspiledFile {
    const { getAdapter } = require("./plc-brands/types");
    let adapter;
    try { adapter = getAdapter("SIEMENS_S7_1500"); } catch { adapter = null; }
    const converted = alarms.map(a => ({
      code: a.code,
      message: a.messageZh,
      messageEn: a.messageEn,
      triggerCondition: "",
      interlockAction: a.interlock,
      resetType: a.resetType as "auto" | "manual" | "acknowledge",
      severity: a.severity as "critical" | "high" | "medium" | "low",
    }));
    const content = adapter ? adapter.getAlarmBlockTemplate(converted) : `// Alarm Manager`;
    return { fileName: "FB304_AlarmManager.scl", content, moduleType: "FB", language: "SCL" };
  },

  getFileExtension() { return ".scl"; },
};

// ═══════════════════════════════════════════════════════════════════════════
// Inovance/Mitsubishi ST Transpiler
// ═══════════════════════════════════════════════════════════════════════════

export const inovanceStTranspiler: PLCTranspiler = {
  platformKey: "INOVANCE_ST",
  platformName: "Inovance AM600 / Mitsubishi IQ-R ST",
  language: "ST",

  transpile(project: GimProject): TranspileResult {
    const files: TranspiledFile[] = [];
    for (const station of project.stations) {
      files.push(this.transpileStation(station, []));
    }
    files.push(this.transpileModeManager(project.systemLogic.modeManager, project.stations.length));
    files.push(this.transpileSafety(project.systemLogic.safetyChain));
    files.push(this.transpileAlarms(project.systemLogic.alarms));
    return {
      files,
      symbolTable: project.hmiLayout.symbolTable,
      summary: { platform: this.platformName, language: "ST", moduleCount: files.length, ioCount: project.hmiLayout.symbolTable.length, alarmCount: project.systemLogic.alarms.length },
    };
  },

  transpileStation(station: GimStationLogic): TranspiledFile {
    const sc = station.stationCode;
    const sequenceSteps = station.sequence.map(step => {
      const actionLines = step.actions.map(a => {
        if (a.type === "motor_start") return `        ${a.target}_start := TRUE;`;
        if (a.type === "motor_stop") return `        ${a.target}_start := FALSE;`;
        return `        (* ${a.type}: ${a.target} *)`;
      });
      const timerLine = step.duration > 0
        ? `        stepTimer(IN := TRUE, PT := T#${step.duration}s);\n        IF stepTimer.Q THEN stepNumber := ${step.nextStep}; stepTimer(IN := FALSE); END_IF;`
        : step.stepNumber === 0
          ? `        IF startCmd THEN stepNumber := ${step.nextStep}; stationRunning := TRUE; END_IF;`
          : `        cycleComplete := TRUE; stationRunning := FALSE; stepNumber := 0;`;
      return [`      ${step.stepNumber}: (* ${step.nameEn} *)`, ...actionLines, timerLine].join("\n");
    }).join("\n\n");

    const content = [
      `(* FB_Station_${sc} — ${station.stationName} *)`,
      `(* IEC 61131-3 Structured Text — Inovance/Mitsubishi compatible *)`,
      `FUNCTION_BLOCK FB_Station_${sc}`,
      `VAR_INPUT`,
      `  mode : INT;`,
      `  safetyOk : BOOL;`,
      `  startCmd : BOOL;`,
      `  stopCmd : BOOL;`,
      `END_VAR`,
      `VAR_OUTPUT`,
      `  stationReady : BOOL;`,
      `  stationRunning : BOOL;`,
      `  stationFault : BOOL;`,
      `  cycleComplete : BOOL;`,
      `END_VAR`,
      `VAR`,
      `  stepNumber : INT := 0;`,
      `  stepTimer : TON;`,
      ...station.motors.map(m => `  ${m.name}_start : BOOL;\n  ${m.name}_run : BOOL;\n  ${m.name}_fault : BOOL;`),
      `END_VAR`,
      ``,
      `(* Safety interlock *)`,
      `IF NOT safetyOk OR stopCmd THEN`,
      `  stepNumber := 0;`,
      `  stationRunning := FALSE;`,
      ...station.motors.map(m => `  ${m.name}_start := FALSE;`),
      `  RETURN;`,
      `END_IF;`,
      ``,
      `(* Auto sequence *)`,
      `IF mode = 1 THEN`,
      `  CASE stepNumber OF`,
      sequenceSteps,
      `  END_CASE;`,
      `END_IF;`,
      ``,
      `stationReady := NOT stationFault AND (stepNumber = 0);`,
      ``,
      `END_FUNCTION_BLOCK`,
    ].join("\n");

    return { fileName: `FB_Station_${sc}.st`, content, moduleType: "FB", language: "ST" };
  },

  transpileModeManager(): TranspiledFile {
    return { fileName: "FB_ModeManager.st", content: "(* Mode Manager — IEC 61131-3 ST *)\n(* See GIM Logic Model for state definitions *)", moduleType: "FB", language: "ST" };
  },

  transpileSafety(): TranspiledFile {
    return { fileName: "FB_SafetyManager.st", content: "(* Safety Manager — IEC 61131-3 ST *)", moduleType: "FB", language: "ST" };
  },

  transpileAlarms(): TranspiledFile {
    return { fileName: "FB_AlarmManager.st", content: "(* Alarm Manager — IEC 61131-3 ST *)", moduleType: "FB", language: "ST" };
  },

  getFileExtension() { return ".st"; },
};

// ═══════════════════════════════════════════════════════════════════════════
// Fanuc/ABB LAD Description Transpiler
// ═══════════════════════════════════════════════════════════════════════════

export const fanucLadTranspiler: PLCTranspiler = {
  platformKey: "FANUC_LAD",
  platformName: "Fanuc / ABB Ladder Diagram",
  language: "LAD",

  transpile(project: GimProject): TranspileResult {
    const files: TranspiledFile[] = [];
    for (const station of project.stations) {
      files.push(this.transpileStation(station, []));
    }
    return {
      files,
      symbolTable: project.hmiLayout.symbolTable,
      summary: { platform: this.platformName, language: "LAD", moduleCount: files.length, ioCount: project.hmiLayout.symbolTable.length, alarmCount: project.systemLogic.alarms.length },
    };
  },

  transpileStation(station: GimStationLogic): TranspiledFile {
    const sc = station.stationCode;
    // LAD is visual — generate a structured text description of ladder rungs
    const rungs: string[] = [];

    // Safety rung
    rungs.push(`RUNG 001: SAFETY INTERLOCK`);
    rungs.push(`  |---[/]safetyOk---[/]stopCmd---( )run_enable---|`);
    rungs.push(``);

    // Motor control rungs
    station.motors.forEach((m, i) => {
      rungs.push(`RUNG ${String(i + 2).padStart(3, "0")}: MOTOR ${m.name} (${m.driveType})`);
      rungs.push(`  |---[ ]run_enable---[ ]${m.name}_start---[/]${m.name}_fault---( )${m.name}_run---|`);
      rungs.push(`  |---[ ]${m.name}_OL-------------------------------------------(S)${m.name}_fault---|`);
      rungs.push(``);
    });

    // Sequence step timer rung
    station.sequence.forEach(step => {
      if (step.duration > 0) {
        rungs.push(`RUNG: STEP ${step.stepNumber} — ${step.nameEn} (T=${step.duration}s)`);
        rungs.push(`  |---[==]stepNumber=${step.stepNumber}---[TON T#${step.duration}s]---( )next_step_${step.nextStep}---|`);
        rungs.push(``);
      }
    });

    const content = [
      `; ═══════════════════════════════════════════════`,
      `; Station ${sc} — ${station.stationName}`,
      `; Fanuc/ABB Ladder Diagram Description`,
      `; Generated by GIM Transpiler`,
      `; ═══════════════════════════════════════════════`,
      ``,
      ...rungs,
    ].join("\n");

    return { fileName: `LAD_Station_${sc}.lad`, content, moduleType: "FB", language: "LAD" };
  },

  transpileModeManager(): TranspiledFile {
    return { fileName: "LAD_ModeManager.lad", content: "; Mode Manager — Ladder Description", moduleType: "FB", language: "LAD" };
  },

  transpileSafety(): TranspiledFile {
    return { fileName: "LAD_SafetyManager.lad", content: "; Safety Manager — Ladder Description", moduleType: "FB", language: "LAD" };
  },

  transpileAlarms(): TranspiledFile {
    return { fileName: "LAD_AlarmManager.lad", content: "; Alarm Manager — Ladder Description", moduleType: "FB", language: "LAD" };
  },

  getFileExtension() { return ".lad"; },
};

// ═══════════════════════════════════════════════════════════════════════════
// Transpiler Registry
// ═══════════════════════════════════════════════════════════════════════════

export const transpilerRegistry: Record<string, PLCTranspiler> = {
  SIEMENS_SCL: siemensSclTranspiler,
  INOVANCE_ST: inovanceStTranspiler,
  FANUC_LAD: fanucLadTranspiler,
};

export function getTranspiler(platformKey: string): PLCTranspiler {
  const t = transpilerRegistry[platformKey];
  if (!t) throw new Error(`No transpiler registered for "${platformKey}". Available: ${Object.keys(transpilerRegistry).join(", ")}`);
  return t;
}
