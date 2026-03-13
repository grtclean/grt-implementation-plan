/**
 * Mitsubishi iQ-R Series PLC Brand Adapter
 *
 * GX Works3 ST mode, device addressing (X/Y for IO, D for data, M for internal)
 */

import type {
  PlcBrandAdapter, ProgramModuleSpec, MotorSpec, ValveSpec, PidSpec,
  AlarmDef, AccessLevel,
} from "./types";
import { registerAdapter } from "./types";

function genIface(spec: ProgramModuleSpec): string {
  const lines: string[] = [];
  const iface = spec.parameterInterface;
  if (iface.inputs?.length) {
    lines.push("  VAR_INPUT");
    for (const p of iface.inputs) lines.push(`    ${p.name} : ${p.type};`);
    lines.push("  END_VAR");
  }
  if (iface.outputs?.length) {
    lines.push("  VAR_OUTPUT");
    for (const p of iface.outputs) lines.push(`    ${p.name} : ${p.type};`);
    lines.push("  END_VAR");
  }
  if (iface.statics?.length) {
    lines.push("  VAR");
    for (const p of iface.statics) lines.push(`    ${p.name} : ${p.type}${p.initialValue ? ` := ${p.initialValue}` : ""};`);
    lines.push("  END_VAR");
  }
  return lines.join("\n");
}

const mitsubishiAdapter: PlcBrandAdapter = {
  brandKey: "MITSUBISHI_IQR",
  brandName: "Mitsubishi iQ-R",
  brandNameZh: "三菱 iQ-R",
  models: [
    { model: "R04CPU", description: "Standard, 40K steps", maxIO: 4096 },
    { model: "R08CPU", description: "Advanced, 80K steps", maxIO: 8192 },
    { model: "R16CPU", description: "High-performance, 160K steps", maxIO: 16384 },
    { model: "R120CPU", description: "Premium, 1200K steps", maxIO: 32768 },
  ],

  generateVariableDeclaration(name: string, type: string, address?: string): string {
    return address ? `${name} AT ${address} : ${type};` : `${name} : ${type};`;
  },
  generateFBSource(module: ProgramModuleSpec): string {
    return `FUNCTION_BLOCK ${module.moduleName}\n(* ${module.description} *)\n${genIface(module)}\n  (* Implementation *)\nEND_FUNCTION_BLOCK`;
  },
  generateFCSource(module: ProgramModuleSpec): string {
    return `FUNCTION ${module.moduleName} : BOOL\n(* ${module.description} *)\n${genIface(module)}\n  ${module.moduleName} := TRUE;\nEND_FUNCTION`;
  },
  generateOBSource(module: ProgramModuleSpec): string {
    return `PROGRAM ${module.moduleName}\n(* ${module.description} *)\n${genIface(module)}\n  (* Scan execution *)\nEND_PROGRAM`;
  },
  generateDBSource(module: ProgramModuleSpec): string {
    const fields = module.parameterInterface.statics || [];
    return `TYPE ${module.moduleName}_T :\n  STRUCT\n${fields.map(f => `    ${f.name} : ${f.type};`).join("\n")}\n  END_STRUCT;\nEND_TYPE`;
  },

  // Mitsubishi uses octal-based X/Y for I/O, D for data registers, M for internal bits
  formatIOAddress(ioType: string, byteOffset: number, bitOffset?: number): string {
    const bit = bitOffset ?? 0;
    const point = byteOffset * 8 + bit;
    switch (ioType) {
      case "DI": return `X${point.toString(16).toUpperCase()}`;   // X0, X1, ..., XA, XB
      case "DO": return `Y${point.toString(16).toUpperCase()}`;   // Y0, Y1, ...
      case "AI": return `D${byteOffset}`;                         // Data register
      case "AO": return `D${byteOffset + 1000}`;                  // Data register (offset)
      default: return `M${point}`;
    }
  },

  getModeManagerTemplate(stationCount: number): string {
    return `FUNCTION_BLOCK FB_ModeManager\n(* 7-state mode manager — Mitsubishi iQ-R *)\n  VAR_INPUT modeRequest:INT; safetyOk:BOOL; allReady:BOOL; END_VAR\n  VAR_OUTPUT currentMode:INT; modeConfirmed:BOOL; END_VAR\n  VAR state:INT := 0; timer:TON; END_VAR\n  IF NOT safetyOk THEN state:=6; END_IF;\n  CASE state OF\n    0: timer(IN:=TRUE,PT:=T#3s); IF timer.Q THEN state:=2; END_IF;\n    1: IF modeRequest=2 THEN state:=2; END_IF;\n    2: IF modeRequest=1 AND allReady AND safetyOk THEN state:=1; END_IF;\n    6: IF safetyOk THEN state:=2; END_IF;\n  END_CASE;\n  currentMode:=state; modeConfirmed:=state=modeRequest;\nEND_FUNCTION_BLOCK`;
  },
  getSafetyTemplate(interlocks: string[], eStopCount: number): string {
    const chain = Array.from({ length: eStopCount }, (_, i) => `eStop${i+1}`).join(" AND ");
    return `FUNCTION_BLOCK FB_SafetyManager\n  VAR_INPUT ${Array.from({ length: eStopCount }, (_, i) => `eStop${i+1}:BOOL;`).join(" ")} guardDoor:BOOL; END_VAR\n  VAR_OUTPUT safetyChainOk:BOOL; eStopActive:BOOL; END_VAR\n  eStopActive := NOT (${chain || "TRUE"});\n  safetyChainOk := (${chain || "TRUE"}) AND guardDoor;\nEND_FUNCTION_BLOCK`;
  },
  getUserAuthTemplate(levels: AccessLevel[]): string {
    return `FUNCTION_BLOCK FB_UserAuth\n  VAR_INPUT loginReq:BOOL; password:DWORD; level:INT; END_VAR\n  VAR_OUTPUT loggedIn:BOOL; currentLevel:INT; END_VAR\n  VAR pwDB:ARRAY[0..9] OF DWORD; END_VAR\n  IF loginReq AND password=pwDB[level] THEN loggedIn:=TRUE; currentLevel:=level; END_IF;\nEND_FUNCTION_BLOCK`;
  },
  getMotorControlTemplate(motor: MotorSpec): string {
    return `FUNCTION FC_Motor_${motor.name} : BOOL\n  VAR_INPUT start,stop,safety:BOOL; END_VAR\n  VAR_OUTPUT run,fault:BOOL; END_VAR\n  run := start AND NOT stop AND safety AND NOT fault;\n  FC_Motor_${motor.name} := run;\nEND_FUNCTION`;
  },
  getValveControlTemplate(valve: ValveSpec): string {
    return `FUNCTION FC_Valve_${valve.name} : BOOL\n  VAR_INPUT openCmd,closeCmd,safety:BOOL; END_VAR\n  VAR_OUTPUT valveOut:BOOL; END_VAR\n  valveOut := openCmd AND NOT closeCmd AND safety;\n  FC_Valve_${valve.name} := valveOut;\nEND_FUNCTION`;
  },
  getPidTemplate(pid: PidSpec): string {
    return `FUNCTION FC_PID_${pid.name} : REAL\n  VAR_INPUT enable:BOOL; sp,pv:REAL; END_VAR\n  VAR_OUTPUT output,deviation:REAL; END_VAR\n  deviation := sp - pv;\n  IF enable THEN output := 50.0; ELSE output := 0.0; END_IF;\n  FC_PID_${pid.name} := output;\nEND_FUNCTION`;
  },
  getAlarmBlockTemplate(alarms: AlarmDef[]): string {
    return `FUNCTION_BLOCK FB_AlarmManager\n  VAR_INPUT triggers:ARRAY[0..${Math.max(alarms.length-1,0)}] OF BOOL; ack:BOOL; END_VAR\n  VAR_OUTPUT active:ARRAY[0..${Math.max(alarms.length-1,0)}] OF BOOL; count:INT; END_VAR\n  VAR i:INT; END_VAR\n  count:=0; FOR i:=0 TO ${Math.max(alarms.length-1,0)} DO IF triggers[i] THEN active[i]:=TRUE; count:=count+1; END_IF; IF ack THEN active[i]:=FALSE; END_IF; END_FOR;\nEND_FUNCTION_BLOCK`;
  },
  getRecipeManagerTemplate(sc: number): string { return `FUNCTION_BLOCK FB_RecipeManager\n  VAR_INPUT load:BOOL; num:INT; END_VAR\n  VAR_OUTPUT loaded:BOOL; END_VAR\n  IF load AND num>=1 THEN loaded:=TRUE; END_IF;\nEND_FUNCTION_BLOCK`; },
  getDiagnosticTemplate(): string { return `FUNCTION_BLOCK FB_DiagnosticLog\n  VAR_INPUT logEntry:BOOL; code:INT; severity:INT; END_VAR\n  VAR_OUTPUT total,errors:INT; END_VAR\n  VAR ptr:INT:=0; prev:BOOL; END_VAR\n  IF logEntry AND NOT prev THEN ptr:=(ptr+1) MOD 200; total:=total+1; END_IF;\n  IF severity>=2 THEN errors:=errors+1; END_IF; prev:=logEntry;\nEND_FUNCTION_BLOCK`; },
  getCommunicationTemplate(s: number): string { return `FUNCTION_BLOCK FB_Communication\n  VAR_INPUT hmiOk:BOOL; END_VAR\n  VAR_OUTPUT heartbeat,timeout:BOOL; END_VAR\n  VAR hb:TON; ct:TON; st:BOOL; END_VAR\n  hb(IN:=NOT st,PT:=T#500ms); IF hb.Q THEN st:=NOT st; hb(IN:=FALSE); END_IF;\n  heartbeat:=st; ct(IN:=NOT hmiOk,PT:=T#10s); timeout:=ct.Q;\nEND_FUNCTION_BLOCK`; },

  getFileExtension(): string { return ".st"; },
  getProjectStructureInfo(): string { return "GX Works3 Project\n├── Program/\n├── FB/FC Library/\n├── Global Labels/\n├── Module Parameters/\n└── CC-Link IE TSN/"; },
};

registerAdapter(mitsubishiAdapter);
export { mitsubishiAdapter };
