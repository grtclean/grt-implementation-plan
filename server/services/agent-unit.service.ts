/**
 * Agent Unit Service
 * Manages GRT-Atom agent unit statuses, calibration checks, and workflows.
 */

export type AgentUnitStatus = "pending" | "calibrating" | "passed" | "rework";

export interface StatusConfigEntry {
  label: string;
  color: string;
}

export const STATUS_CONFIG: Record<AgentUnitStatus, StatusConfigEntry> = {
  pending: { label: "待装配", color: "grey" },
  calibrating: { label: "标定中", color: "blue" },
  passed: { label: "合格", color: "green" },
  rework: { label: "需返工", color: "red" },
};

export interface CalibrationParameter {
  name: string;
  unit: string;
  minValue: number;
  maxValue: number;
  tolerance: number;
}

export interface CalibrationCheck {
  checkType: string;
  name: string;
  passThreshold: number;
  warningThreshold: number;
  parameters: CalibrationParameter[];
}

export const DEFAULT_CALIBRATION_CHECKS: CalibrationCheck[] = [
  {
    checkType: "pressure_calibration",
    name: "压力标定",
    passThreshold: 95,
    warningThreshold: 90,
    parameters: [
      { name: "pressure", unit: "bar", minValue: 0, maxValue: 200, tolerance: 2 },
    ],
  },
  {
    checkType: "flow_calibration",
    name: "流量标定",
    passThreshold: 95,
    warningThreshold: 90,
    parameters: [
      { name: "flow_rate", unit: "L/min", minValue: 0, maxValue: 100, tolerance: 5 },
    ],
  },
  {
    checkType: "temperature_calibration",
    name: "温度标定",
    passThreshold: 95,
    warningThreshold: 90,
    parameters: [
      { name: "temperature", unit: "°C", minValue: 0, maxValue: 100, tolerance: 1 },
    ],
  },
  {
    checkType: "position_calibration",
    name: "位置标定",
    passThreshold: 95,
    warningThreshold: 90,
    parameters: [
      { name: "x_position", unit: "mm", minValue: -500, maxValue: 500, tolerance: 0.5 },
      { name: "y_position", unit: "mm", minValue: -500, maxValue: 500, tolerance: 0.5 },
      { name: "z_position", unit: "mm", minValue: -500, maxValue: 500, tolerance: 0.5 },
    ],
  },
  {
    checkType: "ultrasonic_calibration",
    name: "超声波标定",
    passThreshold: 95,
    warningThreshold: 90,
    parameters: [
      { name: "power", unit: "W", minValue: 0, maxValue: 1000, tolerance: 10 },
      { name: "frequency", unit: "kHz", minValue: 20, maxValue: 100, tolerance: 1 },
    ],
  },
];
