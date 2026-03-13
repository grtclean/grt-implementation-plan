/**
 * Engineering Sizing Service — Pure deterministic functions
 *
 * Derives mechanical/electrical parameters from workpiece specifications,
 * cleanliness requirements, and process parameters using GRT engineering formulas.
 *
 * No DB, no side effects — pure functions only.
 */
import type { MechanicalParams, ElectricalParams } from "../../drizzle/design-engine-schema";

// ── Input Types ─────────────────────────────────────────────────────────

export interface WorkpieceSpec {
  length: number;   // mm
  width: number;    // mm
  height: number;   // mm
  weight: number;   // kg
  material: "aluminum_alloy" | "cast_iron" | "steel" | "brass" | "plastic";
}

export interface CleanlinessRequirement {
  cleanlinessGrade: "standard" | "fine" | "precision";
  maxParticleSize?: number; // μm
}

export interface ProcessRequirement {
  targetCycleTime: number;      // seconds
  cleaningChemistry: "alkaline" | "neutral" | "acid" | "solvent";
  temperatureTarget?: number;   // °C
  heatUpTimeMinutes?: number;
  features?: string[];          // "blind_hole", "thread", "deep_cavity"
}

// ── Result Types ────────────────────────────────────────────────────────

export interface TankSizingResult {
  innerLength: number;   // mm
  innerWidth: number;    // mm
  innerHeight: number;   // mm
  wallThickness: number; // mm
  volume: number;        // liters
  material: string;      // SUS304 | SUS316L | PP
  outerLength: number;
  outerWidth: number;
  outerHeight: number;
  legHeight: number;     // mm — standard 150mm
  drainDN: number;       // mm — drain pipe diameter
  overflowDN: number;    // mm — overflow pipe diameter
}

export interface PumpSizingResult {
  flowRate: number;     // L/min
  head: number;         // meters
  motorPower: number;   // kW (rounded to standard)
  pumpType: string;     // centrifugal | magnetic | diaphragm
  suctionDN: number;    // mm
  dischargeDN: number;  // mm
}

export interface UltrasonicSizingResult {
  frequency: number;         // kHz
  totalPower: number;        // W
  powerDensity: number;      // W/L
  transducerCount: number;
  generatorCount: number;
  transducerLayout: { rows: number; cols: number };
}

export interface SprayLayoutResult {
  nozzleType: string;         // flat-fan | full-cone | hollow-cone
  nozzlesPerPipe: number;
  pipeCount: number;          // 2 sides + 1 top typically
  totalNozzles: number;
  nozzleSpacing: number;      // mm
  pipeDN: number;             // mm
  manifoldDN: number;         // mm
  sprayPressure: number;      // bar
  flowPerNozzle: number;      // L/min
  totalFlow: number;          // L/min
}

export interface HeaterSizingResult {
  totalPower: number;         // kW
  heaterCircuits: number;
  powerPerCircuit: number;    // kW
  elementType: string;        // immersion | plate
  thermocouple: string;       // PT100 | K-type
}

export interface DryingSizingResult {
  method: "hot_air" | "vacuum" | "air_knife";
  airflow?: number;           // m³/h (hot_air)
  blowerPower?: number;       // kW
  vacuumPumpCapacity?: number;// m³/h (vacuum)
  vacuumLevel?: number;       // mbar
  dryingTemp?: number;        // °C
  airKnifeSlots?: number;     // air_knife
}

export interface CycleTimeOptimizationResult {
  bottleneckStation: string;
  bottleneckTime: number;     // seconds
  totalLineTime: number;      // seconds
  suggestParallel: boolean;
  recommendations: string[];
}

export interface SizingOutput {
  mechanicalParams: Partial<MechanicalParams>;
  electricalParams: Partial<ElectricalParams>;
}

// ── Constants ───────────────────────────────────────────────────────────

const STANDARD_MOTOR_POWERS = [0.37, 0.55, 0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5, 11, 15, 18.5, 22, 30];

/** Round up to nearest standard motor power (kW) */
function roundToStandardPower(kw: number): number {
  for (const std of STANDARD_MOTOR_POWERS) {
    if (std >= kw) return std;
  }
  return STANDARD_MOTOR_POWERS[STANDARD_MOTOR_POWERS.length - 1];
}

/** Standard pipe DN from flow rate (L/min), targeting ~2 m/s velocity */
function selectPipeDN(flowLpm: number): number {
  // Q = A × v → d = sqrt(4Q / πv)
  // flow in m³/s, velocity 2 m/s
  const flowM3s = flowLpm / 60000;
  const dMeters = Math.sqrt((4 * flowM3s) / (Math.PI * 2));
  const dMm = dMeters * 1000;
  const DNS = [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200];
  for (const dn of DNS) {
    if (dn >= dMm) return dn;
  }
  return 200;
}

// ── Tank Sizing ─────────────────────────────────────────────────────────

export function calculateTankSize(
  workpiece: WorkpieceSpec,
  chemistry: ProcessRequirement["cleaningChemistry"],
): TankSizingResult {
  // Inner dims = workpiece × 1.5, min 100mm clearance each side
  const clearance = Math.max(100, workpiece.length * 0.25);
  const innerLength = Math.max(workpiece.length + 2 * clearance, workpiece.length * 1.5);
  const innerWidth = Math.max(workpiece.width + 2 * clearance, workpiece.width * 1.5);
  // Height: workpiece height + 100mm submerge margin + 80mm freeboard
  const innerHeight = workpiece.height + 100 + 80;

  const volumeL = (innerLength * innerWidth * innerHeight) / 1e6; // mm³ → L

  // Wall thickness from volume: <200L→3mm, <500L→4mm, ≥500L→5mm
  const wallThickness = volumeL < 200 ? 3 : volumeL < 500 ? 4 : 5;

  // Material from chemistry
  let material: string;
  switch (chemistry) {
    case "acid":
      material = "SUS316L";
      break;
    case "solvent":
      material = "PP";
      break;
    default:
      material = "SUS304";
  }

  const outerLength = innerLength + 2 * wallThickness;
  const outerWidth = innerWidth + 2 * wallThickness;
  const outerHeight = innerHeight + 2 * wallThickness;

  // Drain & overflow DN from volume
  const drainDN = volumeL < 100 ? 25 : volumeL < 300 ? 40 : volumeL < 800 ? 50 : 80;
  const overflowDN = drainDN; // same size typically

  return {
    innerLength: Math.round(innerLength),
    innerWidth: Math.round(innerWidth),
    innerHeight: Math.round(innerHeight),
    wallThickness,
    volume: Math.round(volumeL),
    material,
    outerLength: Math.round(outerLength),
    outerWidth: Math.round(outerWidth),
    outerHeight: Math.round(outerHeight),
    legHeight: 150,
    drainDN,
    overflowDN,
  };
}

// ── Pump Sizing ─────────────────────────────────────────────────────────

export function calculatePumpSize(
  tankVolume: number,
  stationType: string,
): PumpSizingResult {
  // Turnover rate: cleaning=3x/h, rinse=6x/h, spray=8x/h
  let turnoverRate: number;
  if (stationType.includes("SPRAY") || stationType === "TURBULENCE") {
    turnoverRate = 8;
  } else if (stationType.includes("RINSE") || stationType === "DI_RINSE") {
    turnoverRate = 6;
  } else {
    turnoverRate = 3;
  }

  const flowLpm = (tankVolume * turnoverRate) / 60; // L/h → L/min

  // Head: static head (~1.5m) + friction losses (~3.5m) + nozzle pressure drop (~5m for spray)
  const isSpray = stationType.includes("SPRAY") || stationType === "TURBULENCE";
  const head = 1.5 + 3.5 + (isSpray ? 15 : 5);

  // Motor power: P = Q × H × ρ × g / (3.6e6 × η)
  // Q in L/min → m³/h = Q*0.06; simplified: P = Q(L/min) × H(m) / (6120 × η)
  const efficiency = 0.65;
  const rawPower = (flowLpm * head) / (6120 * efficiency);
  const motorPower = roundToStandardPower(rawPower * 1.15); // 15% safety margin

  // Pump type selection
  let pumpType: string;
  if (flowLpm < 30) {
    pumpType = "magnetic"; // small flow, no seal leakage
  } else if (isSpray) {
    pumpType = "centrifugal"; // high flow for spray
  } else {
    pumpType = "centrifugal";
  }

  const suctionDN = selectPipeDN(flowLpm);
  const dischargeDN = selectPipeDN(flowLpm * 1.1); // slightly oversized

  return {
    flowRate: Math.round(flowLpm),
    head: Math.round(head * 10) / 10,
    motorPower,
    pumpType,
    suctionDN,
    dischargeDN,
  };
}

// ── Ultrasonic Sizing ───────────────────────────────────────────────────

export function calculateUltrasonicSize(
  tankVolume: number,
  cleanliness: CleanlinessRequirement,
): UltrasonicSizingResult {
  // Power density: standard=10 W/L, fine=20, precision=30
  let powerDensity: number;
  switch (cleanliness.cleanlinessGrade) {
    case "precision":
      powerDensity = 30;
      break;
    case "fine":
      powerDensity = 20;
      break;
    default:
      powerDensity = 10;
  }

  const totalPower = Math.round(tankVolume * powerDensity);

  // Frequency from max particle size
  let frequency: number;
  const maxParticle = cleanliness.maxParticleSize ?? 500;
  if (maxParticle > 500) {
    frequency = 25; // coarse particles → low freq, high cavitation
  } else if (maxParticle > 100) {
    frequency = 40; // medium
  } else if (maxParticle > 50) {
    frequency = 68; // fine
  } else {
    frequency = 120; // ultra-fine
  }

  // Each transducer unit: ~60W at 25/40kHz, ~40W at 68kHz, ~25W at 120kHz
  const wattPerUnit = frequency <= 40 ? 60 : frequency <= 68 ? 40 : 25;
  const transducerCount = Math.ceil(totalPower / wattPerUnit);

  // Generator count: each generator drives up to 1200W
  const generatorCount = Math.max(1, Math.ceil(totalPower / 1200));

  // Layout: arrange transducers on tank bottom in grid
  // Aspect ratio follows tank L:W
  const ratio = 1.5; // typical tank L:W
  const cols = Math.max(1, Math.round(Math.sqrt(transducerCount / ratio)));
  const rows = Math.max(1, Math.ceil(transducerCount / cols));

  return {
    frequency,
    totalPower,
    powerDensity,
    transducerCount: rows * cols, // adjusted to fill grid
    generatorCount,
    transducerLayout: { rows, cols },
  };
}

// ── Spray Layout ────────────────────────────────────────────────────────

export function calculateSprayLayout(
  workpiece: WorkpieceSpec,
  cleanliness: CleanlinessRequirement,
): SprayLayoutResult {
  // Nozzle type from cleanliness
  let nozzleType: string;
  let sprayAngle: number; // degrees
  let overlap: number;    // fraction
  switch (cleanliness.cleanlinessGrade) {
    case "precision":
      nozzleType = "full-cone";
      sprayAngle = 60;
      overlap = 0.3;
      break;
    case "fine":
      nozzleType = "flat-fan";
      sprayAngle = 80;
      overlap = 0.25;
      break;
    default:
      nozzleType = "flat-fan";
      sprayAngle = 110;
      overlap = 0.2;
  }

  // Spray distance from workpiece surface: ~150mm
  const sprayDist = 150;
  // Coverage per nozzle = 2 × dist × tan(angle/2) × (1 - overlap)
  const coveragePerNozzle =
    2 * sprayDist * Math.tan(((sprayAngle / 2) * Math.PI) / 180) * (1 - overlap);

  // Chamber inner dims (workpiece + 200mm clearance each side)
  const chamberLength = workpiece.length + 400;
  const chamberHeight = workpiece.height + 200;

  // Nozzles per pipe: covers chamber length
  const nozzlesPerPipe = Math.max(2, Math.ceil(chamberLength / coveragePerNozzle));

  // Pipe count: 2 sides + 1 top (precision adds bottom)
  const pipeCount = cleanliness.cleanlinessGrade === "precision" ? 4 : 3;

  const totalNozzles = nozzlesPerPipe * pipeCount;
  const nozzleSpacing = Math.round(chamberLength / nozzlesPerPipe);

  // Pressure: standard=3 bar, fine=5, precision=8
  const sprayPressure =
    cleanliness.cleanlinessGrade === "precision" ? 8 :
    cleanliness.cleanlinessGrade === "fine" ? 5 : 3;

  // Flow per nozzle: ~2 L/min at 3bar, ~3.5 at 5bar, ~5 at 8bar
  const flowPerNozzle =
    sprayPressure <= 3 ? 2 : sprayPressure <= 5 ? 3.5 : 5;

  const totalFlow = Math.round(totalNozzles * flowPerNozzle);

  const pipeDN = selectPipeDN(totalFlow / pipeCount);
  const manifoldDN = selectPipeDN(totalFlow);

  return {
    nozzleType,
    nozzlesPerPipe,
    pipeCount,
    totalNozzles,
    nozzleSpacing,
    pipeDN,
    manifoldDN,
    sprayPressure,
    flowPerNozzle,
    totalFlow,
  };
}

// ── Heater Sizing ───────────────────────────────────────────────────────

export function calculateHeaterSize(
  tankVolume: number,
  temperatureTarget: number = 60,
  heatUpTimeMinutes: number = 30,
  efficiency: number = 0.85,
): HeaterSizingResult {
  // Ambient temp assumption: 20°C
  const deltaT = temperatureTarget - 20;
  if (deltaT <= 0) {
    return {
      totalPower: 0,
      heaterCircuits: 0,
      powerPerCircuit: 0,
      elementType: "immersion",
      thermocouple: "PT100",
    };
  }

  // P (kW) = V(L) × ΔT(°C) / (860 × t(hours) × η)
  // 860 = conversion factor (1 kWh = 860 kcal, 1L water × 1°C = 1 kcal)
  const tHours = heatUpTimeMinutes / 60;
  const rawPower = (tankVolume * deltaT) / (860 * tHours * efficiency);
  const totalPower = roundToStandardPower(rawPower);

  // Each heater circuit max 6kW (standard immersion element)
  const heaterCircuits = Math.max(1, Math.ceil(totalPower / 6));
  const powerPerCircuit = Math.round((totalPower / heaterCircuits) * 10) / 10;

  return {
    totalPower,
    heaterCircuits,
    powerPerCircuit,
    elementType: tankVolume > 500 ? "plate" : "immersion",
    thermocouple: temperatureTarget > 100 ? "K-type" : "PT100",
  };
}

// ── Drying Sizing ───────────────────────────────────────────────────────

export function calculateDryingSize(
  workpiece: WorkpieceSpec,
  method: "hot_air" | "vacuum" | "air_knife",
  cleanliness: CleanlinessRequirement,
): DryingSizingResult {
  // Surface area estimate (box approximation × 2 for complex geometry)
  const surfaceArea = 2 * (
    workpiece.length * workpiece.width +
    workpiece.width * workpiece.height +
    workpiece.length * workpiece.height
  ) / 1e6; // m²

  switch (method) {
    case "hot_air": {
      // Airflow: surface area × 5 m³/h per m² (standard), ×8 for precision
      const multiplier = cleanliness.cleanlinessGrade === "precision" ? 8 : 5;
      const airflow = Math.max(50, Math.round(surfaceArea * multiplier * 100) / 100);
      // Blower: ~0.5 kW per 100 m³/h
      const blowerPower = roundToStandardPower(airflow / 200);
      return {
        method: "hot_air",
        airflow: Math.round(airflow),
        blowerPower,
        dryingTemp: cleanliness.cleanlinessGrade === "precision" ? 80 : 60,
      };
    }
    case "vacuum": {
      // Chamber volume = workpiece bounding box × 2.5 (clearance + door space)
      const chamberVolM3 = (workpiece.length * workpiece.width * workpiece.height) / 1e9 * 2.5;
      // Vacuum pump: evacuate to target in 3 min → capacity = V × 10 / 3
      const vacuumPumpCapacity = Math.max(10, Math.round(chamberVolM3 * 1000 * 10 / 3));
      return {
        method: "vacuum",
        vacuumPumpCapacity,
        vacuumLevel: cleanliness.cleanlinessGrade === "precision" ? 1 : 10,
        dryingTemp: 50,
      };
    }
    case "air_knife": {
      // Air knife slots: 1 per 200mm of workpiece width, min 2
      const airKnifeSlots = Math.max(2, Math.ceil(workpiece.width / 200));
      const airflow = airKnifeSlots * 80; // ~80 m³/h per slot
      const blowerPower = roundToStandardPower(airflow / 150);
      return {
        method: "air_knife",
        airflow,
        blowerPower,
        airKnifeSlots,
      };
    }
  }
}

// ── Cycle Time Optimization ─────────────────────────────────────────────

export function optimizeCycleTime(
  stations: Array<{ code: string; type: string; cycleTime: number }>,
  targetCycleTime: number,
): CycleTimeOptimizationResult {
  if (stations.length === 0) {
    return {
      bottleneckStation: "N/A",
      bottleneckTime: 0,
      totalLineTime: 0,
      suggestParallel: false,
      recommendations: ["No stations to optimize"],
    };
  }

  const bottleneck = stations.reduce((max, s) =>
    s.cycleTime > max.cycleTime ? s : max, stations[0]);

  const totalLineTime = stations.reduce((sum, s) => sum + s.cycleTime, 0);
  const suggestParallel = bottleneck.cycleTime > targetCycleTime * 1.2;

  const recommendations: string[] = [];

  if (suggestParallel) {
    recommendations.push(
      `${bottleneck.code} (${bottleneck.type}) is bottleneck at ${bottleneck.cycleTime}s — ` +
      `consider parallel station to meet ${targetCycleTime}s target`
    );
  }

  // Check if total throughput meets target (parallel line model)
  if (bottleneck.cycleTime > targetCycleTime) {
    const parallelCount = Math.ceil(bottleneck.cycleTime / targetCycleTime);
    recommendations.push(
      `Need ${parallelCount}x parallel ${bottleneck.type} stations to achieve ${targetCycleTime}s takt`
    );
  }

  // Flag stations that are over 80% of target
  for (const s of stations) {
    if (s.cycleTime > targetCycleTime * 0.8 && s.code !== bottleneck.code) {
      recommendations.push(
        `${s.code} at ${s.cycleTime}s — near bottleneck threshold`
      );
    }
  }

  return {
    bottleneckStation: bottleneck.code,
    bottleneckTime: bottleneck.cycleTime,
    totalLineTime,
    suggestParallel,
    recommendations,
  };
}

// ── Station Type Category ───────────────────────────────────────────────

type StationCategory = "tank_cleaning" | "spray" | "drying" | "handling" | "inspection";

function getStationCategory(stationType: string): StationCategory {
  switch (stationType) {
    case "ULTRASONIC":
    case "PRE_WASH":
    case "RINSE":
    case "DI_RINSE":
    case "PASSIVATION":
    case "DEGREASING":
    case "TURBULENCE":
      return "tank_cleaning";
    case "SPRAY":
    case "ROBOT_CLEAN":
      return "spray";
    case "AIR_KNIFE":
    case "HOT_AIR_DRY":
    case "VACUUM_DRY":
    case "COOLDOWN":
      return "drying";
    case "LOADING":
    case "UNLOADING":
    case "TRANSFER":
      return "handling";
    case "INSPECTION":
      return "inspection";
    default:
      return "tank_cleaning";
  }
}

// ── Electrical Parameter Derivation ─────────────────────────────────────

function deriveElectricalParams(
  stationType: string,
  mech: Partial<MechanicalParams>,
): Partial<ElectricalParams> {
  const category = getStationCategory(stationType);
  const elec: Partial<ElectricalParams> = {};

  // Motors
  const motors: NonNullable<ElectricalParams["motorDetails"]> = [];

  if (mech.pumpFlowRate && mech.pumpFlowRate > 0) {
    const pumpPower = roundToStandardPower(
      (mech.pumpFlowRate * (mech.pumpHead ?? 10)) / (6120 * 0.65)
    );
    motors.push({ name: "循环泵", power: pumpPower, voltage: 380, type: "AC" });
  }

  if (category === "drying" && mech.dryingAirflow) {
    const blowerPower = roundToStandardPower(mech.dryingAirflow / 200);
    motors.push({ name: "风机", power: blowerPower, voltage: 380, type: "AC" });
  }

  if (mech.conveyorSpeed && mech.conveyorSpeed > 0) {
    motors.push({ name: "输送电机", power: 0.75, voltage: 380, type: "VFD" });
  }

  elec.motorCount = motors.length;
  elec.motorTotalPower = motors.reduce((sum, m) => sum + m.power, 0);
  elec.motorDetails = motors.length > 0 ? motors : undefined;

  // IO points
  // DI: 2 base (run/fault) + per-motor(2) + 2 level + 1 temp + 1 pressure + 2 door/safety
  const baseDI = 4;
  const motorDI = motors.length * 2;
  const sensorDI = (category === "tank_cleaning" ? 4 : 2); // level + temp + pressure
  elec.plcDI = baseDI + motorDI + sensorDI;

  // DO: per-motor(1 start) + 1 heater + 1 valve + 1 alarm
  elec.plcDO = motors.length + (mech.heaterPower ? 2 : 0) + 2;

  // AI: temp (1-2) + level(1) + pressure(0-1) + ultrasonic power(0-1)
  elec.plcAI = (mech.heaterPower ? 2 : 0) +
    (category === "tank_cleaning" ? 2 : 1) +
    (stationType === "ULTRASONIC" ? 1 : 0);

  elec.plcAO = mech.conveyorSpeed ? 1 : 0; // VFD speed ref

  elec.totalIoPoints = (elec.plcDI ?? 0) + (elec.plcDO ?? 0) +
    (elec.plcAI ?? 0) + (elec.plcAO ?? 0);

  // Sensors
  const sensors: NonNullable<ElectricalParams["sensorTypes"]> = [];
  if (category === "tank_cleaning") {
    sensors.push({ type: "液位传感器", count: 2 });
    sensors.push({ type: "温度传感器", count: mech.heaterPower ? 2 : 1 });
    if (stationType.includes("RINSE")) {
      sensors.push({ type: "电导率仪", count: 1 });
    }
  }
  if (category === "spray") {
    sensors.push({ type: "压力传感器", count: 1 });
    sensors.push({ type: "流量计", count: 1 });
  }
  if (category === "drying") {
    sensors.push({ type: "温度传感器", count: 1 });
    if (stationType === "VACUUM_DRY") {
      sensors.push({ type: "真空度传感器", count: 1 });
    }
  }
  elec.sensorCount = sensors.reduce((sum, s) => sum + s.count, 0);
  elec.sensorTypes = sensors.length > 0 ? sensors : undefined;

  // Heater circuits
  if (mech.heaterPower && mech.heaterPower > 0) {
    elec.heaterCircuits = Math.max(1, Math.ceil(mech.heaterPower / 6));
    elec.heaterTotalPower = mech.heaterPower;
  }

  // Safety
  elec.safetyInterlocks = ["emergency_stop"];
  if (category === "tank_cleaning") {
    elec.safetyInterlocks.push("liquid_level_low", "over_temperature");
  }
  if (mech.heaterPower) {
    elec.safetyInterlocks.push("heater_dry_run");
  }

  elec.emergencyStopCount = 1;
  elec.communicationProtocol = "PROFINET";

  return elec;
}

// ── Main Orchestrator ───────────────────────────────────────────────────

/**
 * Size a single station: derive mechanical + electrical params from workpiece specs.
 *
 * @param stationType - one of the 17 station type enum values
 * @param workpiece - workpiece dimensions, weight, material
 * @param cleanliness - cleanliness grade + particle requirement
 * @param process - cycle time target, chemistry, temperature
 * @returns merged mechanical + electrical params
 */
export function sizeStation(
  stationType: string,
  workpiece: WorkpieceSpec,
  cleanliness: CleanlinessRequirement,
  process: ProcessRequirement,
): SizingOutput {
  const category = getStationCategory(stationType);
  const mech: Partial<MechanicalParams> = {};

  // Weight capacity from workpiece
  mech.weightCapacity = Math.ceil(workpiece.weight * 1.5); // 50% safety margin

  switch (category) {
    case "tank_cleaning": {
      const tank = calculateTankSize(workpiece, process.cleaningChemistry);
      mech.tankLength = tank.innerLength;
      mech.tankWidth = tank.innerWidth;
      mech.tankHeight = tank.innerHeight;
      mech.tankVolume = tank.volume;
      mech.tankMaterial = tank.material;

      const pump = calculatePumpSize(tank.volume, stationType);
      mech.pumpType = pump.pumpType;
      mech.pumpFlowRate = pump.flowRate;
      mech.pumpHead = pump.head;

      // Ultrasonic-specific
      if (stationType === "ULTRASONIC") {
        const us = calculateUltrasonicSize(tank.volume, cleanliness);
        mech.ultrasonicFrequency = us.frequency;
        mech.ultrasonicPower = us.totalPower;
        mech.transducerCount = us.transducerCount;
      }

      // Filtration
      if (stationType !== "DI_RINSE") {
        mech.filtrationMicron = cleanliness.cleanlinessGrade === "precision" ? 5 :
          cleanliness.cleanlinessGrade === "fine" ? 25 : 50;
      }

      // Agitation
      mech.agitationType = stationType === "ULTRASONIC" ? "ultrasonic" :
        stationType === "TURBULENCE" ? "mechanical" : "bubbling";

      // Heating (if temperature target set)
      if (process.temperatureTarget && process.temperatureTarget > 25) {
        const heater = calculateHeaterSize(
          tank.volume,
          process.temperatureTarget,
          process.heatUpTimeMinutes ?? 30,
        );
        mech.heaterPower = heater.totalPower;
        mech.dryingTemp = process.temperatureTarget; // reuse field for process temp
      }
      break;
    }

    case "spray": {
      const spray = calculateSprayLayout(workpiece, cleanliness);
      mech.nozzleType = spray.nozzleType;
      mech.nozzleCount = spray.totalNozzles;
      mech.sprayPressure = spray.sprayPressure;

      // Spray needs a sump tank (smaller than immersion)
      const sumpVol = Math.max(50, spray.totalFlow * 2); // 2-minute retention
      mech.tankVolume = Math.round(sumpVol);
      mech.tankLength = Math.round(workpiece.length + 400);
      mech.tankWidth = Math.round(workpiece.width + 400);
      mech.tankHeight = Math.round(300); // shallow sump

      const pump = calculatePumpSize(sumpVol, stationType);
      mech.pumpType = pump.pumpType;
      mech.pumpFlowRate = spray.totalFlow; // use actual spray demand
      mech.pumpHead = pump.head;

      mech.filtrationMicron = cleanliness.cleanlinessGrade === "precision" ? 5 : 25;
      break;
    }

    case "drying": {
      let method: "hot_air" | "vacuum" | "air_knife";
      if (stationType === "VACUUM_DRY") method = "vacuum";
      else if (stationType === "AIR_KNIFE") method = "air_knife";
      else method = "hot_air";

      const drying = calculateDryingSize(workpiece, method, cleanliness);
      mech.dryingTemp = drying.dryingTemp;
      mech.dryingAirflow = drying.airflow;
      mech.vacuumLevel = drying.vacuumLevel;
      break;
    }

    case "handling": {
      // Conveyor defaults
      mech.conveyorType = workpiece.weight > 50 ? "chain" : "roller";
      mech.conveyorSpeed = 5; // m/min default
      break;
    }

    case "inspection": {
      // Inspection station: minimal mechanical
      mech.conveyorType = "roller";
      mech.conveyorSpeed = 2;
      break;
    }
  }

  // Derive electrical from mechanical
  const elec = deriveElectricalParams(stationType, mech);

  return { mechanicalParams: mech, electricalParams: elec };
}

/**
 * Convenience: size all stations in a project layout.
 */
export function sizeAllStations(
  stations: Array<{ stationCode: string; stationType: string; cycleTime?: number }>,
  workpiece: WorkpieceSpec,
  cleanliness: CleanlinessRequirement,
  process: ProcessRequirement,
): Array<{ stationCode: string; sizing: SizingOutput }> {
  return stations.map(s => ({
    stationCode: s.stationCode,
    sizing: sizeStation(s.stationType, workpiece, cleanliness, process),
  }));
}
