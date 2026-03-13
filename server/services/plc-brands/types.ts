/**
 * PLC Brand Adapter Interface
 *
 * Each PLC brand adapter implements this interface to generate
 * brand-specific program source code (SCL, ST, etc.)
 */

export interface ProgramModuleSpec {
  moduleName: string;
  moduleType: "OB" | "FB" | "FC" | "DB" | "UDT" | "SAFETY_FB";
  moduleNumber: string;        // "OB1", "FB100", "FC200"
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

export interface MotorSpec {
  name: string;
  power: number;     // kW
  voltage: number;   // V
  type: string;      // VFD | DOL
  stationCode: string;
}

export interface ValveSpec {
  name: string;
  type: string;      // solenoid_2way | solenoid_3way | proportional
  feedbackType: string; // none | limit_switch | proximity
  stationCode: string;
}

export interface PidSpec {
  name: string;
  processVariable: string;
  setpoint: number;
  outputType: string;  // heater | cooling_valve | speed
  stationCode: string;
}

export interface AlarmDef {
  code: string;
  message: string;
  messageEn: string;
  triggerCondition: string;
  interlockAction: string;
  resetType: "auto" | "manual" | "acknowledge";
  severity: "critical" | "high" | "medium" | "low";
}

export interface AccessLevel {
  levelNumber: number;
  levelName: string;
  levelNameEn: string;
  permissions: Record<string, boolean>;
  timeout: number;
}

export interface PlcModelInfo {
  model: string;
  description: string;
  maxIO: number;
}

export interface PlcBrandAdapter {
  brandKey: string;
  brandName: string;
  brandNameZh: string;
  models: PlcModelInfo[];

  // Source code generation
  generateVariableDeclaration(name: string, type: string, address?: string): string;
  generateFBSource(module: ProgramModuleSpec): string;
  generateFCSource(module: ProgramModuleSpec): string;
  generateOBSource(module: ProgramModuleSpec): string;
  generateDBSource(module: ProgramModuleSpec): string;

  // I/O addressing
  formatIOAddress(ioType: string, byteOffset: number, bitOffset?: number): string;

  // Template generators
  getModeManagerTemplate(stationCount: number): string;
  getSafetyTemplate(interlocks: string[], eStopCount: number): string;
  getUserAuthTemplate(levels: AccessLevel[]): string;
  getMotorControlTemplate(motor: MotorSpec): string;
  getValveControlTemplate(valve: ValveSpec): string;
  getPidTemplate(pid: PidSpec): string;
  getAlarmBlockTemplate(alarms: AlarmDef[]): string;
  getRecipeManagerTemplate(stationCount: number): string;
  getDiagnosticTemplate(): string;
  getCommunicationTemplate(hmiDbSize: number): string;

  // Metadata
  getFileExtension(): string;
  getProjectStructureInfo(): string;
}

/** Registry of all brand adapters, keyed by brand enum value */
export const brandAdapters: Record<string, PlcBrandAdapter> = {};

export function registerAdapter(adapter: PlcBrandAdapter): void {
  brandAdapters[adapter.brandKey] = adapter;
}

export function getAdapter(brandKey: string): PlcBrandAdapter {
  const adapter = brandAdapters[brandKey];
  if (!adapter) {
    throw new Error(`No PLC brand adapter registered for "${brandKey}". Available: ${Object.keys(brandAdapters).join(", ")}`);
  }
  return adapter;
}
