/**
 * ABB AC500 PLC Brand Adapter
 *
 * IEC 61131-3 Structured Text, %IX/%QX addressing
 * Automation Builder IDE
 */

import type {
  PlcBrandAdapter, ProgramModuleSpec, MotorSpec, ValveSpec, PidSpec,
  AlarmDef, AccessLevel,
} from "./types";
import { registerAdapter } from "./types";

function generateInterface(spec: ProgramModuleSpec): string {
  const lines: string[] = [];
  const iface = spec.parameterInterface;
  if (iface.inputs?.length) {
    lines.push("  VAR_INPUT");
    for (const p of iface.inputs) {
      const addr = p.address ? ` AT ${p.address}` : "";
      lines.push(`    ${p.name}${addr} : ${p.type};${p.description ? `  (* ${p.description} *)` : ""}`);
    }
    lines.push("  END_VAR");
  }
  if (iface.outputs?.length) {
    lines.push("  VAR_OUTPUT");
    for (const p of iface.outputs) lines.push(`    ${p.name} : ${p.type};`);
    lines.push("  END_VAR");
  }
  if (iface.statics?.length) {
    lines.push("  VAR");
    for (const p of iface.statics) {
      const init = p.initialValue ? ` := ${p.initialValue}` : "";
      lines.push(`    ${p.name} : ${p.type}${init};`);
    }
    lines.push("  END_VAR");
  }
  if (iface.temps?.length) {
    lines.push("  VAR_TEMP");
    for (const p of iface.temps) lines.push(`    ${p.name} : ${p.type};`);
    lines.push("  END_VAR");
  }
  return lines.join("\n");
}

const abbAdapter: PlcBrandAdapter = {
  brandKey: "ABB_AC500",
  brandName: "ABB AC500",
  brandNameZh: "ABB AC500",
  models: [
    { model: "PM554-T", description: "Compact CPU, 128KB", maxIO: 500 },
    { model: "PM573-ETH", description: "Standard CPU, 512KB, Ethernet", maxIO: 2000 },
    { model: "PM583-ETH", description: "Advanced CPU, 1MB, Ethernet/PROFIBUS", maxIO: 4000 },
    { model: "PM591-ETH", description: "High-end CPU, 4MB", maxIO: 8000 },
  ],

  generateVariableDeclaration(name: string, type: string, address?: string): string {
    if (address) return `${name} AT ${address} : ${type};`;
    return `${name} : ${type};`;
  },

  generateFBSource(module: ProgramModuleSpec): string {
    return [
      `FUNCTION_BLOCK ${module.moduleName}`,
      `(* ${module.description} *)`,
      `(* ${module.descriptionEn} *)`,
      "",
      generateInterface(module),
      "",
      `  (* Implementation *)`,
      "",
      `END_FUNCTION_BLOCK`,
    ].join("\n");
  },
  generateFCSource(module: ProgramModuleSpec): string {
    return [
      `FUNCTION ${module.moduleName} : BOOL`,
      `(* ${module.description} *)`,
      "", generateInterface(module), "",
      `  (* Implementation *)`,
      `  ${module.moduleName} := TRUE;`,
      `END_FUNCTION`,
    ].join("\n");
  },
  generateOBSource(module: ProgramModuleSpec): string {
    return [
      `PROGRAM ${module.moduleName}`,
      `(* ${module.description} *)`,
      "", generateInterface(module), "",
      `  (* Implementation *)`,
      `END_PROGRAM`,
    ].join("\n");
  },
  generateDBSource(module: ProgramModuleSpec): string {
    const fields = module.parameterInterface.statics || [];
    return [
      `TYPE ${module.moduleName}_T :`,
      `  STRUCT`,
      ...fields.map(f => `    ${f.name} : ${f.type};`),
      `  END_STRUCT;`,
      `END_TYPE`,
      "",
      `VAR_GLOBAL`,
      `  ${module.moduleName} : ${module.moduleName}_T;`,
      `END_VAR`,
    ].join("\n");
  },

  formatIOAddress(ioType: string, byteOffset: number, bitOffset?: number): string {
    switch (ioType) {
      case "DI": return `%IX${byteOffset}.${bitOffset ?? 0}`;
      case "DO": return `%QX${byteOffset}.${bitOffset ?? 0}`;
      case "AI": return `%IW${byteOffset}`;
      case "AO": return `%QW${byteOffset}`;
      default: return `%MX${byteOffset}.0`;
    }
  },

  getModeManagerTemplate(stationCount: number): string {
    return [
      `FUNCTION_BLOCK FB_ModeManager`,
      `(* 7-state mode manager for ABB AC500 *)`,
      `  VAR_INPUT modeRequest : INT; safetyOk : BOOL; allStationsReady : BOOL; END_VAR`,
      `  VAR_OUTPUT currentMode : INT; modeConfirmed : BOOL; autoReady : BOOL; END_VAR`,
      `  VAR state : INT := 0; initTimer : TON; END_VAR`,
      ``,
      `  IF NOT safetyOk THEN state := 6; END_IF;`,
      `  CASE state OF`,
      `    0: initTimer(IN:=TRUE, PT:=T#3s); IF initTimer.Q AND safetyOk THEN state := 2; END_IF;`,
      `    1: autoReady := TRUE; IF modeRequest = 2 THEN state := 2; END_IF;`,
      `    2: IF modeRequest = 1 AND allStationsReady AND safetyOk THEN state := 1; END_IF;`,
      `       IF modeRequest = 4 THEN state := 4; END_IF;`,
      `    3,4,5: IF modeRequest = 2 THEN state := 2; END_IF;`,
      `    6: IF safetyOk THEN state := 2; END_IF;`,
      `  END_CASE;`,
      `  currentMode := state; modeConfirmed := (state = modeRequest);`,
      `END_FUNCTION_BLOCK`,
    ].join("\n");
  },
  getSafetyTemplate(interlocks: string[], eStopCount: number): string {
    const chain = Array.from({ length: eStopCount }, (_, i) => `eStop${i + 1}`).join(" AND ");
    return [
      `FUNCTION_BLOCK FB_SafetyManager`,
      `(* EN 13849-1 Cat.3 Safety Chain — ABB AC500 *)`,
      `  VAR_INPUT ${Array.from({ length: eStopCount }, (_, i) => `eStop${i + 1} : BOOL;`).join(" ")} guardDoor : BOOL; safetyRelayFB : BOOL; END_VAR`,
      `  VAR_OUTPUT safetyChainOk : BOOL; eStopActive : BOOL; safetyRelayCmd : BOOL; END_VAR`,
      `  VAR edmTimer : TON; END_VAR`,
      `  eStopActive := NOT (${chain || "TRUE"});`,
      `  safetyChainOk := (${chain || "TRUE"}) AND guardDoor AND NOT edmTimer.Q;`,
      `  safetyRelayCmd := safetyChainOk;`,
      `  edmTimer(IN := safetyRelayCmd AND NOT safetyRelayFB, PT := T#500ms);`,
      `END_FUNCTION_BLOCK`,
    ].join("\n");
  },
  getUserAuthTemplate(levels: AccessLevel[]): string {
    return [
      `FUNCTION_BLOCK FB_UserAuth`,
      `(* HMI User Authentication — ABB AC500 *)`,
      `  VAR_INPUT loginReq : BOOL; logoutReq : BOOL; password : DWORD; level : INT; END_VAR`,
      `  VAR_OUTPUT loggedIn : BOOL; currentLevel : INT; END_VAR`,
      `  VAR passwordDB : ARRAY[0..9] OF DWORD; failCount : INT; END_VAR`,
      `  IF loginReq AND password = passwordDB[level] THEN loggedIn := TRUE; currentLevel := level; END_IF;`,
      `  IF logoutReq THEN loggedIn := FALSE; currentLevel := 0; END_IF;`,
      `END_FUNCTION_BLOCK`,
    ].join("\n");
  },
  getMotorControlTemplate(motor: MotorSpec): string {
    return [
      `FUNCTION FC_Motor_${motor.name} : BOOL`,
      `(* ${motor.type} Motor ${motor.power}kW — ABB *)`,
      `  VAR_INPUT startCmd, stopCmd, safetyOk : BOOL; END_VAR`,
      `  VAR_OUTPUT motorRun, motorFault : BOOL; END_VAR`,
      `  VAR overload, runFB : BOOL; fbTimer : TON; END_VAR`,
      `  motorFault := overload;`,
      `  motorRun := startCmd AND NOT stopCmd AND safetyOk AND NOT motorFault;`,
      `  fbTimer(IN := motorRun AND NOT runFB, PT := T#5s);`,
      `  IF fbTimer.Q THEN motorFault := TRUE; motorRun := FALSE; END_IF;`,
      `  FC_Motor_${motor.name} := motorRun;`,
      `END_FUNCTION`,
    ].join("\n");
  },
  getValveControlTemplate(valve: ValveSpec): string {
    return [
      `FUNCTION FC_Valve_${valve.name} : BOOL`,
      `  VAR_INPUT openCmd, closeCmd, safetyOk : BOOL; END_VAR`,
      `  VAR_OUTPUT valveOut, valveFault : BOOL; END_VAR`,
      `  valveOut := openCmd AND NOT closeCmd AND safetyOk;`,
      `  FC_Valve_${valve.name} := valveOut;`,
      `END_FUNCTION`,
    ].join("\n");
  },
  getPidTemplate(pid: PidSpec): string {
    return [
      `FUNCTION FC_PID_${pid.name} : REAL`,
      `  VAR_INPUT enable : BOOL; setpoint, pv : REAL; END_VAR`,
      `  VAR_OUTPUT output : REAL; deviation : REAL; END_VAR`,
      `  deviation := setpoint - pv;`,
      `  (* Use ABB PID FB or custom implementation *)`,
      `  IF enable THEN output := 50.0; ELSE output := 0.0; END_IF;`,
      `  FC_PID_${pid.name} := output;`,
      `END_FUNCTION`,
    ].join("\n");
  },
  getAlarmBlockTemplate(alarms: AlarmDef[]): string {
    return [
      `FUNCTION_BLOCK FB_AlarmManager`,
      `(* ${alarms.length} alarm definitions — ABB AC500 *)`,
      `  VAR_INPUT triggers : ARRAY[0..${Math.max(alarms.length - 1, 0)}] OF BOOL; ackAll : BOOL; END_VAR`,
      `  VAR_OUTPUT active : ARRAY[0..${Math.max(alarms.length - 1, 0)}] OF BOOL; count : INT; END_VAR`,
      `  VAR i : INT; END_VAR`,
      `  count := 0;`,
      `  FOR i := 0 TO ${Math.max(alarms.length - 1, 0)} DO`,
      `    IF triggers[i] THEN active[i] := TRUE; count := count + 1; END_IF;`,
      `    IF ackAll THEN active[i] := FALSE; END_IF;`,
      `  END_FOR;`,
      `END_FUNCTION_BLOCK`,
    ].join("\n");
  },
  getRecipeManagerTemplate(stationCount: number): string {
    return [
      `FUNCTION_BLOCK FB_RecipeManager`,
      `(* Recipe management for ${stationCount} stations — ABB AC500 *)`,
      `  VAR_INPUT loadCmd : BOOL; recipeNum : INT; END_VAR`,
      `  VAR_OUTPUT loaded : BOOL; recipeName : STRING(64); END_VAR`,
      `  IF loadCmd AND recipeNum >= 1 AND recipeNum <= 100 THEN loaded := TRUE; END_IF;`,
      `END_FUNCTION_BLOCK`,
    ].join("\n");
  },
  getDiagnosticTemplate(): string {
    return [
      `FUNCTION_BLOCK FB_DiagnosticLog`,
      `(* Ring buffer diagnostic logger — ABB AC500 *)`,
      `  VAR_INPUT logEntry : BOOL; code : INT; msg : STRING(128); severity : INT; END_VAR`,
      `  VAR_OUTPUT totalEntries, errorCount : INT; END_VAR`,
      `  VAR writePtr : INT := 0; prev : BOOL; END_VAR`,
      `  IF logEntry AND NOT prev THEN writePtr := (writePtr + 1) MOD 200; totalEntries := totalEntries + 1; END_IF;`,
      `  IF severity >= 2 THEN errorCount := errorCount + 1; END_IF;`,
      `  prev := logEntry;`,
      `END_FUNCTION_BLOCK`,
    ].join("\n");
  },
  getCommunicationTemplate(hmiDbSize: number): string {
    return [
      `FUNCTION_BLOCK FB_Communication`,
      `  VAR_INPUT hmiConnected : BOOL; END_VAR`,
      `  VAR_OUTPUT heartbeat : BOOL; commTimeout : BOOL; END_VAR`,
      `  VAR hbTimer : TON; ctTimer : TON; hbState : BOOL; END_VAR`,
      `  hbTimer(IN := NOT hbState, PT := T#500ms);`,
      `  IF hbTimer.Q THEN hbState := NOT hbState; hbTimer(IN := FALSE); END_IF;`,
      `  heartbeat := hbState;`,
      `  ctTimer(IN := NOT hmiConnected, PT := T#10s); commTimeout := ctTimer.Q;`,
      `END_FUNCTION_BLOCK`,
    ].join("\n");
  },

  getFileExtension(): string { return ".st"; },
  getProjectStructureInfo(): string {
    return "ABB Automation Builder Project\n├── POUs/\n├── GVLs/\n├── Library Manager/\n└── I/O Configuration/";
  },
};

registerAdapter(abbAdapter);
export { abbAdapter };
