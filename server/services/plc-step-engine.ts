/**
 * PLC Step Execution Engine — Parametric Debugging & Simulation
 *
 * Decomposes PLC programs into executable "action steps" for:
 * 1. Simulation mode — run logic in browser without hardware
 * 2. Step-by-step debugging — pause/resume/skip/rewind
 * 3. Recording & playback — capture best PID params for next machine
 *
 * Architecture:
 *   GIM Logic Model → StepEngine → StepState (observable)
 */

import type { GimStationLogic, GimSequenceStep, GimAction, GimProject } from "./plc-transpiler";

// ═══════════════════════════════════════════════════════════════════════════
// Step Engine State Model
// ═══════════════════════════════════════════════════════════════════════════

export interface StepEngineState {
  mode: "idle" | "running" | "paused" | "stepping" | "completed" | "faulted";
  currentStation: string | null;
  currentStepNumber: number;
  currentStepName: string;
  elapsedMs: number;
  stepElapsedMs: number;
  totalSteps: number;
  completedSteps: number;
  outputs: Record<string, boolean | number | string>;
  motorStates: MotorSimState[];
  sensorValues: SensorSimState[];
  pidStates: PidSimState[];
  alarmActive: string[];
  executionLog: StepLogEntry[];
}

export interface MotorSimState {
  name: string;
  running: boolean;
  speed: number;
  fault: boolean;
  currentDraw: number;  // simulated amps
}

export interface SensorSimState {
  name: string;
  type: string;
  value: number;
  unit: string;
  fault: boolean;
}

export interface PidSimState {
  name: string;
  setpoint: number;
  processValue: number;
  output: number;
  deviation: number;
  autoMode: boolean;
}

export interface StepLogEntry {
  timestamp: number;
  stepNumber: number;
  stepName: string;
  action: string;
  detail: string;
  level: "info" | "action" | "warning" | "fault";
}

// ═══════════════════════════════════════════════════════════════════════════
// Step Execution Engine — Pure Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Decompose a GIM station's sequence into debuggable steps
 * Returns a flat list of executable micro-steps
 */
export function decomposeStationSequence(station: GimStationLogic): DecomposedStep[] {
  const steps: DecomposedStep[] = [];

  for (const seqStep of station.sequence) {
    // Each sequence step becomes multiple micro-steps
    const microSteps: DecomposedStep[] = [];

    // Add entry log
    microSteps.push({
      id: `${station.stationCode}_S${seqStep.stepNumber}_ENTER`,
      stationCode: station.stationCode,
      stepNumber: seqStep.stepNumber,
      nameZh: `▶ 进入: ${seqStep.nameZh}`,
      nameEn: `▶ Enter: ${seqStep.nameEn}`,
      type: "entry",
      duration: 0,
      actions: [],
      parameterizable: false,
    });

    // Each action becomes a micro-step
    for (const action of seqStep.actions) {
      microSteps.push({
        id: `${station.stationCode}_S${seqStep.stepNumber}_${action.type}_${action.target}`,
        stationCode: station.stationCode,
        stepNumber: seqStep.stepNumber,
        nameZh: actionToZhName(action),
        nameEn: actionToEnName(action),
        type: "action",
        duration: 0,
        actions: [action],
        parameterizable: isParameterizable(action),
        adjustableParams: getAdjustableParams(action, station),
      });
    }

    // Wait/timer step
    if (seqStep.duration > 0) {
      microSteps.push({
        id: `${station.stationCode}_S${seqStep.stepNumber}_WAIT`,
        stationCode: station.stationCode,
        stepNumber: seqStep.stepNumber,
        nameZh: `⏱ 等待 ${seqStep.duration}s`,
        nameEn: `⏱ Wait ${seqStep.duration}s`,
        type: "timer",
        duration: seqStep.duration,
        actions: [],
        parameterizable: true,
        adjustableParams: [{
          key: "duration",
          nameZh: "工艺时间",
          nameEn: "Process time",
          unit: "s",
          value: seqStep.duration,
          min: 1,
          max: 600,
          step: 1,
        }],
      });
    }

    steps.push(...microSteps);
  }

  return steps;
}

export interface DecomposedStep {
  id: string;
  stationCode: string;
  stepNumber: number;
  nameZh: string;
  nameEn: string;
  type: "entry" | "action" | "timer" | "condition" | "exit";
  duration: number;       // seconds (0 = instant)
  actions: GimAction[];
  parameterizable: boolean;
  adjustableParams?: AdjustableParam[];
}

export interface AdjustableParam {
  key: string;
  nameZh: string;
  nameEn: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
}

function actionToZhName(action: GimAction): string {
  switch (action.type) {
    case "motor_start": return `启动 ${action.target}${action.comment ? ` (${action.comment})` : ""}`;
    case "motor_stop": return `停止 ${action.target}`;
    case "motor_speed": return `设置 ${action.target} 转速 ${action.value}%`;
    case "valve_open": return `打开 ${action.target}`;
    case "valve_close": return `关闭 ${action.target}`;
    case "heater_on": return `加热器 ${action.target} 启动`;
    case "heater_off": return `加热器 ${action.target} 停止`;
    case "pid_enable": return `PID控制 ${action.target} 使能`;
    case "pid_disable": return `PID控制 ${action.target} 禁用`;
    default: return `${action.type}: ${action.target}`;
  }
}

function actionToEnName(action: GimAction): string {
  switch (action.type) {
    case "motor_start": return `Start ${action.target}`;
    case "motor_stop": return `Stop ${action.target}`;
    case "motor_speed": return `Set ${action.target} speed ${action.value}%`;
    case "valve_open": return `Open ${action.target}`;
    case "valve_close": return `Close ${action.target}`;
    case "heater_on": return `Heater ${action.target} ON`;
    case "heater_off": return `Heater ${action.target} OFF`;
    case "pid_enable": return `Enable PID ${action.target}`;
    case "pid_disable": return `Disable PID ${action.target}`;
    default: return `${action.type}: ${action.target}`;
  }
}

function isParameterizable(action: GimAction): boolean {
  return ["motor_speed", "pid_enable", "heater_on"].includes(action.type);
}

function getAdjustableParams(action: GimAction, station: GimStationLogic): AdjustableParam[] | undefined {
  if (action.type === "motor_speed") {
    const motor = station.motors.find(m => m.name === action.target);
    return [{
      key: "speed",
      nameZh: "转速设定",
      nameEn: "Speed setpoint",
      unit: motor?.driveType === "VFD" ? "Hz" : "%",
      value: (action.value as number) || 50,
      min: 0,
      max: motor?.speedRange?.max || 100,
      step: 1,
    }];
  }
  if (action.type === "heater_on") {
    const heater = station.heaters.find(h => h.name === action.target);
    return [{
      key: "temperature",
      nameZh: "温度设定",
      nameEn: "Temperature setpoint",
      unit: "°C",
      value: heater?.setpoint || 60,
      min: 20,
      max: heater?.maxTemp || 90,
      step: 1,
    }];
  }
  return undefined;
}

/**
 * Initialize step engine state for a station
 */
export function initStepEngine(station: GimStationLogic): StepEngineState {
  return {
    mode: "idle",
    currentStation: station.stationCode,
    currentStepNumber: 0,
    currentStepName: "空闲",
    elapsedMs: 0,
    stepElapsedMs: 0,
    totalSteps: station.sequence.length,
    completedSteps: 0,
    outputs: {},
    motorStates: station.motors.map(m => ({
      name: m.name,
      running: false,
      speed: 0,
      fault: false,
      currentDraw: 0,
    })),
    sensorValues: station.sensors.map(s => ({
      name: s.name,
      type: s.type,
      value: s.range ? (s.range.min + s.range.max) / 2 : 0,
      unit: s.range?.unit || "",
      fault: false,
    })),
    pidStates: station.pidLoops.map(pid => ({
      name: pid.name,
      setpoint: pid.setpoint,
      processValue: 25,
      output: 0,
      deviation: pid.setpoint - 25,
      autoMode: false,
    })),
    alarmActive: [],
    executionLog: [],
  };
}

/**
 * Simulate one tick of the step engine (called every 100ms in simulation mode)
 */
export function tickStepEngine(
  state: StepEngineState,
  steps: DecomposedStep[],
  dt: number = 100,
): StepEngineState {
  if (state.mode !== "running" && state.mode !== "stepping") return state;

  const next = { ...state };
  next.elapsedMs += dt;
  next.stepElapsedMs += dt;
  next.executionLog = [...state.executionLog];
  next.motorStates = state.motorStates.map(m => ({ ...m }));
  next.sensorValues = state.sensorValues.map(s => ({ ...s }));
  next.pidStates = state.pidStates.map(p => ({ ...p }));

  // Find current micro-step
  const currentStep = steps.find(s =>
    s.stationCode === state.currentStation && s.stepNumber === state.currentStepNumber
  );

  if (!currentStep) {
    next.mode = "completed";
    return next;
  }

  // Execute actions
  for (const action of currentStep.actions) {
    executeAction(next, action);
  }

  // Simulate sensor drift (for realistic simulation)
  for (const pid of next.pidStates) {
    if (pid.autoMode) {
      // Simple PID simulation: PV slowly approaches SP
      const error = pid.setpoint - pid.processValue;
      pid.output = Math.max(0, Math.min(100, error * 2));
      pid.processValue += (pid.output / 100) * 0.1 * (dt / 1000);
      pid.deviation = pid.setpoint - pid.processValue;
    }
  }

  // Timer check
  if (currentStep.type === "timer" && currentStep.duration > 0) {
    if (next.stepElapsedMs >= currentStep.duration * 1000) {
      // Advance to next step
      advanceStep(next, steps, currentStep);
    }
  } else if (currentStep.type === "action" || currentStep.type === "entry") {
    // Instant step — advance immediately
    advanceStep(next, steps, currentStep);
  }

  if (state.mode === "stepping") {
    next.mode = "paused";
  }

  return next;
}

function executeAction(state: StepEngineState, action: GimAction): void {
  const motor = state.motorStates.find(m => m.name === action.target);
  if (action.type === "motor_start" && motor) {
    motor.running = true;
    motor.speed = 100;
    motor.currentDraw = 5;
  }
  if (action.type === "motor_stop" && motor) {
    motor.running = false;
    motor.speed = 0;
    motor.currentDraw = 0;
  }
  if (action.type === "motor_speed" && motor) {
    motor.speed = (action.value as number) || 50;
  }
  if (action.type === "heater_on") {
    const pid = state.pidStates.find(p => p.name === "TempPID");
    if (pid) pid.autoMode = true;
  }
  if (action.type === "heater_off") {
    const pid = state.pidStates.find(p => p.name === "TempPID");
    if (pid) { pid.autoMode = false; pid.output = 0; }
  }

  state.executionLog.push({
    timestamp: state.elapsedMs,
    stepNumber: state.currentStepNumber,
    stepName: state.currentStepName,
    action: action.type,
    detail: `${action.target}${action.value !== undefined ? ` = ${action.value}` : ""}`,
    level: "action",
  });
}

function advanceStep(state: StepEngineState, steps: DecomposedStep[], currentStep: DecomposedStep): void {
  const idx = steps.indexOf(currentStep);
  if (idx < steps.length - 1) {
    const nextStep = steps[idx + 1];
    state.currentStepNumber = nextStep.stepNumber;
    state.currentStepName = nextStep.nameZh;
    state.stepElapsedMs = 0;
    if (nextStep.stepNumber !== currentStep.stepNumber) {
      state.completedSteps++;
    }
  } else {
    state.mode = "completed";
    state.completedSteps = state.totalSteps;
  }
}

/**
 * Generate parameter recording snapshot (for "recording & playback" feature)
 * Captures current PID tuning + process times → can be fed back as recipe
 */
export function captureParameterSnapshot(
  state: StepEngineState,
  steps: DecomposedStep[],
): ParameterSnapshot {
  return {
    capturedAt: new Date().toISOString(),
    stationCode: state.currentStation || "",
    processParams: steps
      .filter(s => s.parameterizable && s.adjustableParams)
      .flatMap(s => (s.adjustableParams || []).map(p => ({
        stepId: s.id,
        stepName: s.nameZh,
        paramKey: p.key,
        paramName: p.nameZh,
        value: p.value,
        unit: p.unit,
      }))),
    pidTuning: state.pidStates.map(p => ({
      name: p.name,
      setpoint: p.setpoint,
      lastOutput: p.output,
      processValue: p.processValue,
    })),
    totalCycleTime: state.elapsedMs / 1000,
  };
}

export interface ParameterSnapshot {
  capturedAt: string;
  stationCode: string;
  processParams: Array<{
    stepId: string;
    stepName: string;
    paramKey: string;
    paramName: string;
    value: number;
    unit: string;
  }>;
  pidTuning: Array<{
    name: string;
    setpoint: number;
    lastOutput: number;
    processValue: number;
  }>;
  totalCycleTime: number;
}

/**
 * Decompose an entire GIM project into station debug views
 */
export function decomposeProject(project: GimProject): ProjectDecomposition {
  return {
    projectId: project.projectId,
    projectName: project.projectName,
    stations: project.stations.map(s => ({
      stationCode: s.stationCode,
      stationName: s.stationName,
      stationType: s.stationType,
      steps: decomposeStationSequence(s),
      motorCount: s.motors.length,
      sensorCount: s.sensors.length,
      hasPid: s.pidLoops.length > 0,
      totalDuration: s.sequence.reduce((sum, step) => sum + step.duration, 0),
    })),
  };
}

export interface ProjectDecomposition {
  projectId: number;
  projectName: string;
  stations: Array<{
    stationCode: string;
    stationName: string;
    stationType: string;
    steps: DecomposedStep[];
    motorCount: number;
    sensorCount: number;
    hasPid: boolean;
    totalDuration: number;
  }>;
}
