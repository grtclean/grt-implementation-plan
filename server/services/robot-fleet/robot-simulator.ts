/**
 * Robot Simulator
 *
 * Brand-specific telemetry simulation for testing without hardware.
 * Generates realistic joint movements (sinusoidal + noise),
 * motor temperature drift, program execution, and occasional alerts.
 */

import type { RobotBrand, RobotTelemetry, JointLimits, BrandSpec } from "./types";

// ── Brand Specifications ──

const BRAND_SPECS: Record<RobotBrand, BrandSpec> = {
  kuka: {
    brand: "kuka",
    protocolName: "RSI",
    models: ["KR 6 R900", "KR 16 R2010", "KR 60-3", "KR 120 R2700", "KR 210 R3100"],
    controllerTypes: ["KRC4", "KRC5"],
    defaultJointLimits: {
      min: [-185, -140, -120, -350, -130, -350],
      max: [185, 20, 155, 350, 130, 350],
    },
    maxPayloadKg: 60,
    reachMm: 2033,
    repeatabilityMm: 0.05,
    description: "KUKA KRC4 via RSI (Robot Sensor Interface) — XML/UDP gateway relay",
  },
  fanuc: {
    brand: "fanuc",
    protocolName: "PCDK",
    models: ["M-20iD/25", "M-710iC/50", "R-2000iC/165F", "LR Mate 200iD", "CRX-10iA/L"],
    controllerTypes: ["R-30iB", "R-30iB Plus", "R-30iB Mini Plus"],
    defaultJointLimits: {
      min: [-370, -105, -213, -380, -130, -360],
      max: [370, 145, 343, 380, 210, 360],
    },
    maxPayloadKg: 25,
    reachMm: 1831,
    repeatabilityMm: 0.04,
    description: "FANUC R-30iB via PCDK (PC Developer Kit) — TCP binary gateway relay",
  },
  abb: {
    brand: "abb",
    protocolName: "EGM",
    models: ["IRB 1200", "IRB 2600", "IRB 4600", "IRB 6700", "IRB 7600", "YuMi IRB 14000"],
    controllerTypes: ["IRC5", "OmniCore"],
    defaultJointLimits: {
      min: [-170, -65, -180, -300, -130, -360],
      max: [170, 85, 70, 300, 130, 360],
    },
    maxPayloadKg: 150,
    reachMm: 2650,
    repeatabilityMm: 0.05,
    description: "ABB IRC5 via EGM (Externally Guided Motion) — UDP protobuf gateway relay",
  },
  staubli: {
    brand: "staubli",
    protocolName: "uniVAL",
    models: ["TX2-40", "TX2-60", "TX2-90", "TX2-140", "TS2-40", "TS2-60"],
    controllerTypes: ["CS9", "CS9L"],
    defaultJointLimits: {
      min: [-180, -130, -145, -270, -140, -270],
      max: [180, 130, 145, 270, 140, 270],
    },
    maxPayloadKg: 9,
    reachMm: 670,
    repeatabilityMm: 0.02,
    description: "Stäubli CS9 via uniVAL (Universal Valve) — TCP JSON gateway relay, cleanroom-rated",
  },
};

export function getBrandSpecs(): BrandSpec[] {
  return Object.values(BRAND_SPECS);
}

export function getBrandSpec(brand: RobotBrand): BrandSpec {
  return BRAND_SPECS[brand];
}

// ── Simulation State (per-brand) ──

const simState: Record<string, { tick: number; temps: number[]; programLine: number }> = {};

function getSimState(key: string) {
  if (!simState[key]) {
    simState[key] = {
      tick: 0,
      temps: [35, 36, 38, 34, 37, 35], // starting motor temps
      programLine: 1,
    };
  }
  return simState[key];
}

/**
 * Generate realistic brand-specific telemetry data.
 * Uses sinusoidal joint motion with noise, temperature drift, and program line stepping.
 */
export function generateBrandTelemetry(brand: RobotBrand, robotKey?: string): RobotTelemetry {
  const spec = BRAND_SPECS[brand];
  const state = getSimState(robotKey ?? brand);
  state.tick++;

  const t = state.tick * 0.1; // time factor

  // Joint positions: sinusoidal motion within brand limits + noise
  const joints = spec.defaultJointLimits.min.map((min, i) => {
    const max = spec.defaultJointLimits.max[i];
    const center = (min + max) / 2;
    const amplitude = (max - min) * 0.3; // 30% of range
    const freq = 0.1 + i * 0.05; // different frequency per joint
    const noise = (Math.random() - 0.5) * 2;
    return Number((center + amplitude * Math.sin(t * freq) + noise).toFixed(3));
  });

  // TCP position: derived from joints (simplified forward kinematics approximation)
  const reach = spec.reachMm;
  const tcp = {
    x: Number((reach * 0.5 * Math.cos(t * 0.08) + (Math.random() - 0.5) * 5).toFixed(3)),
    y: Number((reach * 0.3 * Math.sin(t * 0.12) + (Math.random() - 0.5) * 5).toFixed(3)),
    z: Number((reach * 0.4 + reach * 0.1 * Math.sin(t * 0.05) + (Math.random() - 0.5) * 3).toFixed(3)),
    rx: Number((10 * Math.sin(t * 0.15) + (Math.random() - 0.5) * 1).toFixed(3)),
    ry: Number((8 * Math.cos(t * 0.1) + (Math.random() - 0.5) * 1).toFixed(3)),
    rz: Number((15 * Math.sin(t * 0.2) + (Math.random() - 0.5) * 1).toFixed(3)),
  };

  // Motor temperatures: slow drift with load simulation
  state.temps = state.temps.map((temp, i) => {
    const loadFactor = 0.5 + 0.3 * Math.abs(Math.sin(t * 0.02 + i));
    const drift = (loadFactor * 0.1) - 0.05 + (Math.random() - 0.5) * 0.3;
    return Number(Math.max(25, Math.min(85, temp + drift)).toFixed(1));
  });

  // Speed: 50-100% range
  const speed = Number((70 + 20 * Math.sin(t * 0.03) + (Math.random() - 0.5) * 5).toFixed(1));

  // Program line: step forward periodically
  if (state.tick % 10 === 0) {
    state.programLine = (state.programLine % 200) + 1;
  }

  // Operating mode: mostly auto
  const modes = ["auto", "auto", "auto", "auto", "t1"];
  const operatingMode = modes[Math.floor(Math.random() * modes.length)];

  return {
    joints,
    tcp,
    speed,
    payload: Number((spec.maxPayloadKg * 0.6 + (Math.random() - 0.5) * spec.maxPayloadKg * 0.2).toFixed(2)),
    motorTemps: [...state.temps],
    operatingMode,
    programName: `${brand.toUpperCase()}_MAIN_PROG`,
    programLine: state.programLine,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Check if current telemetry triggers any condition alerts.
 * Returns alert descriptions for conditions that exceed thresholds.
 */
export function checkConditionAlerts(
  telemetry: RobotTelemetry,
  brand: RobotBrand,
): Array<{ alertType: string; severity: string; message: string; jointIndex?: number; measuredValue: number; thresholdValue: number; unit: string }> {
  const alerts: Array<{ alertType: string; severity: string; message: string; jointIndex?: number; measuredValue: number; thresholdValue: number; unit: string }> = [];
  const spec = BRAND_SPECS[brand];

  // Check motor temperatures
  telemetry.motorTemps.forEach((temp, i) => {
    if (temp > 75) {
      alerts.push({
        alertType: "overtemp",
        severity: temp > 80 ? "critical" : "warning",
        message: `Motor ${i + 1} temperature ${temp}°C exceeds threshold`,
        jointIndex: i + 1,
        measuredValue: temp,
        thresholdValue: 75,
        unit: "°C",
      });
    }
  });

  // Check joint limits
  telemetry.joints.forEach((angle, i) => {
    const min = spec.defaultJointLimits.min[i];
    const max = spec.defaultJointLimits.max[i];
    const margin = (max - min) * 0.05; // 5% margin warning
    if (angle < min + margin || angle > max - margin) {
      alerts.push({
        alertType: "joint_limit",
        severity: "warning",
        message: `J${i + 1} at ${angle}° approaching limit [${min}°, ${max}°]`,
        jointIndex: i + 1,
        measuredValue: angle,
        thresholdValue: angle < min + margin ? min : max,
        unit: "°",
      });
    }
  });

  // Check payload
  if (telemetry.payload > spec.maxPayloadKg * 0.95) {
    alerts.push({
      alertType: "payload_exceeded",
      severity: "critical",
      message: `Payload ${telemetry.payload}kg near max ${spec.maxPayloadKg}kg`,
      measuredValue: telemetry.payload,
      thresholdValue: spec.maxPayloadKg,
      unit: "kg",
    });
  }

  return alerts;
}
