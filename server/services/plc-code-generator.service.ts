/**
 * PLC Code Generator Service — Pure Functions
 *
 * Takes architecture modules + brand adapter → generates actual program source code.
 * Each function produces the complete source code for a specific module type.
 */

import type { PlcBrandAdapter, MotorSpec, ValveSpec, PidSpec, AlarmDef, AccessLevel } from "./plc-brands/types";
import type { ProgramModule, StationInfo, IoMappingEntry } from "./plc-architecture.service";

// ── Main Entry Point ─────────────────────────────────────────────────────

export function generateModuleCode(
  adapter: PlcBrandAdapter,
  module: ProgramModule,
  context: {
    stations: StationInfo[];
    ioMappings: IoMappingEntry[];
    alarms: AlarmDef[];
    accessLevels: AccessLevel[];
  },
): string {
  const { stations, ioMappings, alarms, accessLevels } = context;
  const stationCount = stations.length;

  switch (module.moduleName) {
    case "FB_ModeManager":
      return adapter.getModeManagerTemplate(stationCount);

    case "FB_SafetyManager": {
      const interlocks = collectUniqueInterlocks(stations);
      const eStopCount = module.parameterInterface.inputs?.filter(i => i.name.startsWith("eStop")).length || 4;
      return adapter.getSafetyTemplate(interlocks, eStopCount);
    }

    case "FB_UserAuth":
      return adapter.getUserAuthTemplate(accessLevels);

    case "FB_RecipeManager":
      return adapter.getRecipeManagerTemplate(stationCount);

    case "FB_DiagnosticLog":
      return adapter.getDiagnosticTemplate();

    case "FB_Communication":
      return adapter.getCommunicationTemplate(stationCount * 20);

    case "FB_AlarmManager":
      return adapter.getAlarmBlockTemplate(alarms);

    case "FB_MaintenanceMode":
      return generateMaintenanceCode(adapter, stations);

    case "FC_MotorControl":
      return generateGenericMotorControl(adapter);

    case "FC_ValveControl":
      return generateGenericValveControl(adapter);

    case "FC_SensorRead":
      return generateSensorReadCode(adapter);

    case "FC_TemperatureControl":
      return generateTemperatureControl(adapter);

    case "FC_AlarmCheck":
      return generateAlarmCheckCode(adapter);

    case "Main":
      return generateMainOBCode(adapter, context.stations, module);

    case "Startup":
      return generateStartupCode(adapter, stationCount);

    case "DiagnosticError":
      return generateDiagnosticOB(adapter, "OB82", "Diagnostic interrupt");

    case "RackFailure":
      return generateDiagnosticOB(adapter, "OB86", "Rack failure");

    case "ModuleAccessError":
      return generateDiagnosticOB(adapter, "OB122", "Module access error");

    default:
      // Station FBs
      if (module.moduleName.startsWith("FB_Station_")) {
        const stationCode = module.moduleName.replace("FB_Station_", "");
        const station = stations.find(s => s.stationCode === stationCode);
        if (station) {
          return generateStationCode(adapter, station, ioMappings);
        }
      }
      // Fallback: use generic source generation
      return generateGenericModuleSource(adapter, module);
  }
}

// ── OB1 Main ─────────────────────────────────────────────────────────────

function generateMainOBCode(
  adapter: PlcBrandAdapter,
  stations: StationInfo[],
  _module: ProgramModule,
): string {
  const stationCalls = stations.map((s, i) => {
    const fbNum = 200 + i;
    const dbNum = fbNum;
    return [
      `  // ── ${s.stationCode}: ${s.stationName} ──`,
      `  "FB_Station_${s.stationCode}"."DB_Station_${s.stationCode}"(`,
      `    mode := "DB_ModeManager".currentMode,`,
      `    safetyOk := "DB_SafetyManager".safetyChainOk,`,
      `    startCmd := "DB_HMI".station${s.stationCode}_start,`,
      `    stopCmd := "DB_HMI".station${s.stationCode}_stop`,
      `  );`,
    ].join("\n");
  }).join("\n\n");

  return [
    `ORGANIZATION_BLOCK "Main"`,
    `VERSION : 1.0`,
    `// 主循环程序 — 按顺序调用所有功能块`,
    `// Main cyclic — calls all FBs in sequence`,
    ``,
    `  VAR_TEMP`,
    `    tempInfo : OB_ANY_INFO;`,
    `  END_VAR`,
    ``,
    `BEGIN`,
    `  // ═══════════════════════════════════════════════`,
    `  // 1. Mode Manager`,
    `  // ═══════════════════════════════════════════════`,
    `  "FB_ModeManager"."DB_ModeManager"(`,
    `    modeRequest := "DB_HMI".modeRequest,`,
    `    safetyOk := "DB_SafetyManager".safetyChainOk,`,
    `    allStationsReady := "DB_HMI".allStationsReady,`,
    `    keySwitch := "DB_HMI".keySwitch,`,
    `    acknowledgeFault := "DB_HMI".acknowledgeFault`,
    `  );`,
    ``,
    `  // ═══════════════════════════════════════════════`,
    `  // 2. Safety Manager`,
    `  // ═══════════════════════════════════════════════`,
    `  "FB_SafetyManager"."DB_SafetyManager"(`,
    `    // E-stop and guard inputs wired directly`,
    `  );`,
    ``,
    `  // ═══════════════════════════════════════════════`,
    `  // 3. User Authentication`,
    `  // ═══════════════════════════════════════════════`,
    `  "FB_UserAuth"."DB_UserAuth"(`,
    `    loginRequest := "DB_HMI".loginRequest,`,
    `    logoutRequest := "DB_HMI".logoutRequest,`,
    `    enteredPassword := "DB_HMI".enteredPassword,`,
    `    enteredLevel := "DB_HMI".enteredLevel`,
    `  );`,
    ``,
    `  // ═══════════════════════════════════════════════`,
    `  // 4. Station Controls`,
    `  // ═══════════════════════════════════════════════`,
    stationCalls,
    ``,
    `  // ═══════════════════════════════════════════════`,
    `  // 5. Recipe Manager`,
    `  // ═══════════════════════════════════════════════`,
    `  "FB_RecipeManager"."DB_RecipeManager"(`,
    `    loadRecipe := "DB_HMI".loadRecipe,`,
    `    recipeNumber := "DB_HMI".recipeNumber,`,
    `    downloadToStations := "DB_HMI".downloadToStations`,
    `  );`,
    ``,
    `  // ═══════════════════════════════════════════════`,
    `  // 6. Alarm Manager`,
    `  // ═══════════════════════════════════════════════`,
    `  "FB_AlarmManager"."DB_AlarmManager"(`,
    `    acknowledgeAll := "DB_HMI".acknowledgeAll`,
    `  );`,
    ``,
    `  // ═══════════════════════════════════════════════`,
    `  // 7. Communication + Diagnostic`,
    `  // ═══════════════════════════════════════════════`,
    `  "FB_Communication"."DB_Communication"(`,
    `    hmiConnected := "DB_HMI".hmiOnline`,
    `  );`,
    ``,
    `  "FB_MaintenanceMode"."DB_Maintenance"(`,
    `    autoRunning := ("DB_ModeManager".currentMode = 1)`,
    `  );`,
    ``,
    `END_ORGANIZATION_BLOCK`,
  ].join("\n");
}

// ── OB100 Startup ────────────────────────────────────────────────────────

function generateStartupCode(adapter: PlcBrandAdapter, stationCount: number): string {
  return [
    `ORGANIZATION_BLOCK "Startup"`,
    `VERSION : 1.0`,
    `// 启动初始化 — 清除输出、设置初始模式`,
    ``,
    `  VAR_TEMP`,
    `    i : INT;`,
    `  END_VAR`,
    ``,
    `BEGIN`,
    `  // ── Clear all outputs ──`,
    `  // (TIA Portal automatically resets outputs on warm restart)`,
    ``,
    `  // ── Initialize mode to INITIALIZING (0) ──`,
    `  "DB_ModeManager".state := 0;`,
    `  "DB_ModeManager".initDone := FALSE;`,
    ``,
    `  // ── Reset all station steps ──`,
    ...Array.from({ length: stationCount }, (_, i) =>
      `  "DB_Station_ST${String(i + 1).padStart(2, "0")}".stepNumber := 0;`
    ),
    ``,
    `  // ── Clear alarm buffer ──`,
    `  "DB_DiagnosticLog".writePtr := 0;`,
    `  "DB_DiagnosticLog".entryCount := 0;`,
    ``,
    `  // ── Log startup event ──`,
    `  "FB_DiagnosticLog"."DB_DiagnosticLog"(`,
    `    logEntry := TRUE,`,
    `    source := 'SYSTEM',`,
    `    code := 0,`,
    `    message := 'PLC Startup - System Initializing',`,
    `    severity := 0,`,
    `    value := 0.0`,
    `  );`,
    ``,
    `END_ORGANIZATION_BLOCK`,
  ].join("\n");
}

// ── Diagnostic OBs ───────────────────────────────────────────────────────

function generateDiagnosticOB(adapter: PlcBrandAdapter, obNumber: string, description: string): string {
  return [
    `ORGANIZATION_BLOCK "${description}"`,
    `VERSION : 1.0`,
    `// ${description} — log fault to diagnostic buffer`,
    ``,
    `  VAR_TEMP`,
    `    faultInfo : OB_ANY_INFO;`,
    `  END_VAR`,
    ``,
    `BEGIN`,
    `  "FB_DiagnosticLog"."DB_DiagnosticLog"(`,
    `    logEntry := TRUE,`,
    `    source := '${obNumber}',`,
    `    code := 82,`,
    `    message := '${description} detected',`,
    `    severity := 2,`,
    `    value := 0.0`,
    `  );`,
    ``,
    `END_ORGANIZATION_BLOCK`,
  ].join("\n");
}

// ── Per-Station Code ─────────────────────────────────────────────────────

function generateStationCode(
  adapter: PlcBrandAdapter,
  station: StationInfo,
  ioMappings: IoMappingEntry[],
): string {
  const ep = station.electricalParams || {};
  const sc = station.stationCode;
  const motorCount = ep.motorCount || 0;
  const hasHeater = (ep.heaterCircuits || 0) > 0;
  const stationType = station.stationType;

  // Build motor control calls
  const motorCalls = Array.from({ length: motorCount }, (_, i) => {
    const motorName = ep.motorDetails?.[i]?.name || `Motor${i + 1}`;
    const isVfd = ep.motorDetails?.[i]?.type === "VFD";
    return [
      `  // Motor ${i + 1}: ${motorName} (${isVfd ? "VFD" : "DOL"})`,
      `  "FC_MotorControl"(`,
      `    startCmd := #motor${i + 1}Start,`,
      `    stopCmd := #stopCmd OR NOT #safetyOk,`,
      `    safetyOk := #safetyOk,`,
      `    mode := #mode,`,
      `    manualStart := "DB_HMI".${sc}_motor${i + 1}_manual,`,
      isVfd ? `    speedSetpoint := #motor${i + 1}Speed,` : "",
      `    overloadTrip := "${sc}_Motor${i + 1}_OL",`,
      `    runFeedback := "${sc}_Motor${i + 1}_FB",`,
      `    motorRun => #motor${i + 1}Run,`,
      `    motorFault => #motor${i + 1}Fault`,
      `  );`,
    ].filter(Boolean).join("\n");
  }).join("\n\n");

  // Build heater PID call
  const heaterCall = hasHeater ? [
    ``,
    `  // Temperature PID Control`,
    `  "FC_TemperatureControl"(`,
    `    enable := #mode = 1,  // Auto only`,
    `    setpoint := #tempSetpoint,`,
    `    processValue := "${sc}_Temperature",`,
    `    autoMode := (#mode = 1),`,
    `    output => #heaterOutput,`,
    `    deviation => #tempDeviation,`,
    `    deviationAlarm => #tempAlarm`,
    `  );`,
  ].join("\n") : "";

  // Sequence logic skeleton
  const sequenceSteps = generateSequenceSteps(stationType, sc);

  return [
    `FUNCTION_BLOCK "FB_Station_${sc}"`,
    `{ S7_Optimized_Access := 'TRUE' }`,
    `VERSION : 1.0`,
    `// ${station.stationName} (${station.stationNameEn || sc})`,
    `// ${motorCount} motors, ${ep.plcDI || 0}DI/${ep.plcDO || 0}DO/${ep.plcAI || 0}AI/${ep.plcAO || 0}AO`,
    ``,
    `  VAR_INPUT`,
    `    mode : INT;              // Current program mode`,
    `    safetyOk : BOOL;         // Safety chain OK`,
    `    startCmd : BOOL;         // Station start command`,
    `    stopCmd : BOOL;          // Station stop command`,
    hasHeater ? `    tempSetpoint : REAL;     // Temperature setpoint °C` : "",
    `  END_VAR`,
    ``,
    `  VAR_OUTPUT`,
    `    stationReady : BOOL;     // Ready for auto cycle`,
    `    stationRunning : BOOL;   // Currently running`,
    `    stationFault : BOOL;     // Has active fault`,
    `    cycleComplete : BOOL;    // Cycle finished`,
    hasHeater ? `    currentTemp : REAL;      // Current temperature` : "",
    `  END_VAR`,
    ``,
    `  VAR`,
    `    stepNumber : INT := 0;   // Sequence step`,
    `    cycleTimer : TON;        // Cycle time monitor`,
    `    stepTimer : TON;         // Step time monitor`,
    ...Array.from({ length: motorCount }, (_, i) => [
      `    motor${i + 1}Run : BOOL;`,
      `    motor${i + 1}Fault : BOOL;`,
      `    motor${i + 1}Start : BOOL;`,
      i < (ep.motorDetails?.length || 0) && ep.motorDetails?.[i]?.type === "VFD"
        ? `    motor${i + 1}Speed : REAL := 50.0;`
        : "",
    ].filter(Boolean)).flat().map(l => `    ${l.trim()}`),
    hasHeater ? `    heaterOutput : REAL;` : "",
    hasHeater ? `    tempDeviation : REAL;` : "",
    hasHeater ? `    tempAlarm : BOOL;` : "",
    `  END_VAR`,
    ``,
    `BEGIN`,
    `  // ── Fault aggregation ──`,
    `  #stationFault := ${Array.from({ length: motorCount }, (_, i) => `#motor${i + 1}Fault`).join(" OR ") || "FALSE"}`,
    hasHeater ? `    OR #tempAlarm` : "",
    `  ;`,
    ``,
    `  // ── Safety stop ──`,
    `  IF NOT #safetyOk OR #stopCmd THEN`,
    `    #stepNumber := 0;`,
    `    #stationRunning := FALSE;`,
    ...Array.from({ length: motorCount }, (_, i) => `    #motor${i + 1}Start := FALSE;`),
    `    RETURN;`,
    `  END_IF;`,
    ``,
    motorCalls,
    heaterCall,
    ``,
    `  // ── Auto sequence ──`,
    `  IF #mode = 1 THEN  // AUTO`,
    `    CASE #stepNumber OF`,
    sequenceSteps,
    `    END_CASE;`,
    `  END_IF;`,
    ``,
    `  // ── Ready when no faults and at step 0 ──`,
    `  #stationReady := NOT #stationFault AND (#stepNumber = 0);`,
    hasHeater ? `  #currentTemp := "${sc}_Temperature";  // Map from analog input` : "",
    ``,
    `END_FUNCTION_BLOCK`,
  ].filter(l => l !== "").join("\n");
}

// ── Sequence Step Generator ──────────────────────────────────────────────

function generateSequenceSteps(stationType: string, sc: string): string {
  const lines: string[] = [];

  switch (stationType) {
    case "LOADING":
    case "UNLOADING":
      lines.push(`      0:  // Idle — waiting for workpiece`);
      lines.push(`        IF #startCmd THEN #stepNumber := 10; #stationRunning := TRUE; END_IF;`);
      lines.push(`      10: // Position workpiece`);
      lines.push(`        #motor1Start := TRUE;`);
      lines.push(`        #stepTimer(IN := TRUE, PT := T#10s);`);
      lines.push(`        IF #stepTimer.Q THEN #stepNumber := 90; #stepTimer(IN := FALSE); END_IF;`);
      lines.push(`      90: // Cycle complete`);
      lines.push(`        #motor1Start := FALSE;`);
      lines.push(`        #cycleComplete := TRUE; #stationRunning := FALSE; #stepNumber := 0;`);
      break;

    case "PRE_WASH":
    case "RINSE":
    case "DI_RINSE":
    case "PASSIVATION":
    case "DEGREASING":
      lines.push(`      0:  // Idle`);
      lines.push(`        IF #startCmd THEN #stepNumber := 10; #stationRunning := TRUE; #cycleComplete := FALSE; END_IF;`);
      lines.push(`      10: // Lower workpiece into tank`);
      lines.push(`        #stepTimer(IN := TRUE, PT := T#5s);`);
      lines.push(`        IF #stepTimer.Q THEN #stepNumber := 20; #stepTimer(IN := FALSE); END_IF;`);
      lines.push(`      20: // Pump on — circulation`);
      lines.push(`        #motor1Start := TRUE;`);
      lines.push(`        #stepTimer(IN := TRUE, PT := T#60s);  // Process time`);
      lines.push(`        IF #stepTimer.Q THEN #stepNumber := 30; #stepTimer(IN := FALSE); END_IF;`);
      lines.push(`      30: // Lift workpiece`);
      lines.push(`        #motor1Start := FALSE;`);
      lines.push(`        #stepTimer(IN := TRUE, PT := T#5s);`);
      lines.push(`        IF #stepTimer.Q THEN #stepNumber := 90; #stepTimer(IN := FALSE); END_IF;`);
      lines.push(`      90: // Done`);
      lines.push(`        #cycleComplete := TRUE; #stationRunning := FALSE; #stepNumber := 0;`);
      break;

    case "ULTRASONIC":
      lines.push(`      0:  // Idle`);
      lines.push(`        IF #startCmd THEN #stepNumber := 10; #stationRunning := TRUE; #cycleComplete := FALSE; END_IF;`);
      lines.push(`      10: // Lower into ultrasonic tank`);
      lines.push(`        #stepTimer(IN := TRUE, PT := T#5s);`);
      lines.push(`        IF #stepTimer.Q THEN #stepNumber := 20; #stepTimer(IN := FALSE); END_IF;`);
      lines.push(`      20: // Ultrasonic ON + pump circulation`);
      lines.push(`        #motor1Start := TRUE;  // Ultrasonic generator`);
      lines.push(`        #stepTimer(IN := TRUE, PT := T#120s);  // US process time`);
      lines.push(`        IF #stepTimer.Q THEN #stepNumber := 30; #stepTimer(IN := FALSE); END_IF;`);
      lines.push(`      30: // Ultrasonic OFF, drain/lift`);
      lines.push(`        #motor1Start := FALSE;`);
      lines.push(`        #stepTimer(IN := TRUE, PT := T#5s);`);
      lines.push(`        IF #stepTimer.Q THEN #stepNumber := 90; #stepTimer(IN := FALSE); END_IF;`);
      lines.push(`      90: // Done`);
      lines.push(`        #cycleComplete := TRUE; #stationRunning := FALSE; #stepNumber := 0;`);
      break;

    case "SPRAY":
    case "TURBULENCE":
      lines.push(`      0:  // Idle`);
      lines.push(`        IF #startCmd THEN #stepNumber := 10; #stationRunning := TRUE; #cycleComplete := FALSE; END_IF;`);
      lines.push(`      10: // Position workpiece`);
      lines.push(`        #stepTimer(IN := TRUE, PT := T#3s);`);
      lines.push(`        IF #stepTimer.Q THEN #stepNumber := 20; #stepTimer(IN := FALSE); END_IF;`);
      lines.push(`      20: // High-pressure spray / turbulence`);
      lines.push(`        #motor1Start := TRUE;  // Pump`);
      lines.push(`        #stepTimer(IN := TRUE, PT := T#90s);`);
      lines.push(`        IF #stepTimer.Q THEN #stepNumber := 30; #stepTimer(IN := FALSE); END_IF;`);
      lines.push(`      30: // Drain & lift`);
      lines.push(`        #motor1Start := FALSE;`);
      lines.push(`        #stepTimer(IN := TRUE, PT := T#5s);`);
      lines.push(`        IF #stepTimer.Q THEN #stepNumber := 90; #stepTimer(IN := FALSE); END_IF;`);
      lines.push(`      90: // Done`);
      lines.push(`        #cycleComplete := TRUE; #stationRunning := FALSE; #stepNumber := 0;`);
      break;

    case "HOT_AIR_DRY":
    case "VACUUM_DRY":
    case "AIR_KNIFE":
    case "COOLDOWN":
      lines.push(`      0:  // Idle`);
      lines.push(`        IF #startCmd THEN #stepNumber := 10; #stationRunning := TRUE; #cycleComplete := FALSE; END_IF;`);
      lines.push(`      10: // Start drying`);
      lines.push(`        #motor1Start := TRUE;  // Blower/vacuum pump`);
      lines.push(`        #stepTimer(IN := TRUE, PT := T#180s);  // Dry time`);
      lines.push(`        IF #stepTimer.Q THEN #stepNumber := 90; #stepTimer(IN := FALSE); END_IF;`);
      lines.push(`      90: // Done`);
      lines.push(`        #motor1Start := FALSE;`);
      lines.push(`        #cycleComplete := TRUE; #stationRunning := FALSE; #stepNumber := 0;`);
      break;

    default:
      lines.push(`      0:  // Idle`);
      lines.push(`        IF #startCmd THEN #stepNumber := 10; #stationRunning := TRUE; #cycleComplete := FALSE; END_IF;`);
      lines.push(`      10: // Process`);
      lines.push(`        #stepTimer(IN := TRUE, PT := T#30s);`);
      lines.push(`        IF #stepTimer.Q THEN #stepNumber := 90; #stepTimer(IN := FALSE); END_IF;`);
      lines.push(`      90: // Done`);
      lines.push(`        #cycleComplete := TRUE; #stationRunning := FALSE; #stepNumber := 0;`);
  }

  return lines.join("\n");
}

// ── Generic Function Blocks / Calls ──────────────────────────────────────

function generateGenericMotorControl(adapter: PlcBrandAdapter): string {
  const motor: MotorSpec = { name: "Generic", power: 0, voltage: 380, type: "DOL", stationCode: "" };
  return adapter.getMotorControlTemplate(motor);
}

function generateGenericValveControl(adapter: PlcBrandAdapter): string {
  const valve: ValveSpec = { name: "Generic", type: "solenoid_2way", feedbackType: "limit_switch", stationCode: "" };
  return adapter.getValveControlTemplate(valve);
}

function generateSensorReadCode(adapter: PlcBrandAdapter): string {
  return [
    `FUNCTION "FC_SensorRead" : Void`,
    `{ S7_Optimized_Access := 'TRUE' }`,
    `VERSION : 1.0`,
    `// 传感器读取 — 模拟量缩放 + 故障检测`,
    ``,
    `  VAR_INPUT`,
    `    rawValue : INT;           // Raw analog 0-27648`,
    `    scaleLow : REAL;          // Engineering low`,
    `    scaleHigh : REAL;         // Engineering high`,
    `    filterTime : REAL;        // Filter ms (0=disabled)`,
    `  END_VAR`,
    ``,
    `  VAR_OUTPUT`,
    `    scaledValue : REAL;       // Scaled result`,
    `    sensorFault : BOOL;       // Wire break / overflow`,
    `  END_VAR`,
    ``,
    `  VAR_TEMP`,
    `    rawReal : REAL;`,
    `    range : REAL;`,
    `  END_VAR`,
    ``,
    `BEGIN`,
    `  // ── Wire break detection (< 1000 or > 30000) ──`,
    `  #sensorFault := (#rawValue < 1000) OR (#rawValue > 30000);`,
    ``,
    `  IF NOT #sensorFault THEN`,
    `    // ── Linear scaling: raw 0-27648 → engineering units ──`,
    `    #rawReal := INT_TO_REAL(#rawValue);`,
    `    #range := #scaleHigh - #scaleLow;`,
    `    #scaledValue := (#rawReal / 27648.0) * #range + #scaleLow;`,
    `  END_IF;`,
    ``,
    `END_FUNCTION`,
  ].join("\n");
}

function generateTemperatureControl(adapter: PlcBrandAdapter): string {
  const pid: PidSpec = { name: "Generic", processVariable: "Temperature", setpoint: 60, outputType: "heater", stationCode: "" };
  return adapter.getPidTemplate(pid);
}

function generateAlarmCheckCode(adapter: PlcBrandAdapter): string {
  return [
    `FUNCTION "FC_AlarmCheck" : Void`,
    `{ S7_Optimized_Access := 'TRUE' }`,
    `VERSION : 1.0`,
    `// 报警检查 — 工位级报警评估`,
    ``,
    `  VAR_INPUT`,
    `    stationFaults : DWORD;    // Fault bit field`,
    `    acknowledge : BOOL;       // Operator acknowledge`,
    `  END_VAR`,
    ``,
    `  VAR_OUTPUT`,
    `    hasAlarm : BOOL;          // Any alarm active`,
    `    alarmCode : INT;          // Highest priority alarm`,
    `  END_VAR`,
    ``,
    `  VAR_TEMP`,
    `    i : INT;`,
    `    testBit : BOOL;`,
    `  END_VAR`,
    ``,
    `BEGIN`,
    `  #hasAlarm := (#stationFaults <> 0);`,
    `  #alarmCode := 0;`,
    ``,
    `  // Find highest set bit`,
    `  FOR #i := 31 TO 0 BY -1 DO`,
    `    IF (#stationFaults AND SHL(DWORD#1, #i)) <> 0 THEN`,
    `      #alarmCode := #i + 1;`,
    `      EXIT;`,
    `    END_IF;`,
    `  END_FOR;`,
    ``,
    `END_FUNCTION`,
  ].join("\n");
}

function generateMaintenanceCode(adapter: PlcBrandAdapter, stations: StationInfo[]): string {
  const counterLines = stations.map(s =>
    `  // ${s.stationCode} — ${s.stationName}\n  IF #autoRunning THEN #${s.stationCode}_hours := #${s.stationCode}_hours + 0.000278; END_IF;  // +1s in hours`
  ).join("\n");

  return [
    `FUNCTION_BLOCK "FB_MaintenanceMode"`,
    `{ S7_Optimized_Access := 'TRUE' }`,
    `VERSION : 1.0`,
    `// 维护模式 — 运行小时计数/定期保养提醒`,
    ``,
    `  VAR_INPUT`,
    `    autoRunning : BOOL;       // System in auto mode`,
    `    resetCounter : INT;       // Station index to reset (0=none)`,
    `  END_VAR`,
    ``,
    `  VAR_OUTPUT`,
    `    maintenanceDue : BOOL;    // Any station needs maintenance`,
    `    totalRunHours : REAL;     // Total system run hours`,
    `  END_VAR`,
    ``,
    `  VAR`,
    ...stations.map(s => `    ${s.stationCode}_hours : REAL := 0.0;`),
    `    maintenanceInterval : REAL := 2000.0;  // hours`,
    `  END_VAR`,
    ``,
    `BEGIN`,
    counterLines,
    ``,
    `  // ── Check if any station exceeded maintenance interval ──`,
    `  #maintenanceDue := FALSE;`,
    ...stations.map(s => `  IF #${s.stationCode}_hours >= #maintenanceInterval THEN #maintenanceDue := TRUE; END_IF;`),
    ``,
    `  // ── Reset individual counter ──`,
    ...stations.map((s, i) => `  IF #resetCounter = ${i + 1} THEN #${s.stationCode}_hours := 0.0; END_IF;`),
    ``,
    `  // ── Total ──`,
    `  #totalRunHours := ${stations.map(s => `#${s.stationCode}_hours`).join(" + ") || "0.0"};`,
    ``,
    `END_FUNCTION_BLOCK`,
  ].join("\n");
}

// ── Generic Fallback ─────────────────────────────────────────────────────

function generateGenericModuleSource(adapter: PlcBrandAdapter, module: ProgramModule): string {
  switch (module.moduleType) {
    case "OB": return adapter.generateOBSource({ ...module, moduleNumber: module.moduleNumber } as any);
    case "FB": return adapter.generateFBSource({ ...module, moduleNumber: module.moduleNumber } as any);
    case "FC": return adapter.generateFCSource({ ...module, moduleNumber: module.moduleNumber } as any);
    case "DB": return adapter.generateDBSource({ ...module, moduleNumber: module.moduleNumber } as any);
    default: return `// Module: ${module.moduleName} (${module.moduleType}) — ${module.description}`;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────

function collectUniqueInterlocks(stations: StationInfo[]): string[] {
  const all: string[] = [];
  for (const s of stations) {
    for (const il of (s.electricalParams?.safetyInterlocks || [])) {
      const key = `${s.stationCode}_${il}`;
      if (!all.includes(key)) all.push(key);
    }
  }
  return all;
}

// ── Export All Functions for ZIP Download ─────────────────────────────────

export function generateAllModuleCode(
  adapter: PlcBrandAdapter,
  modules: ProgramModule[],
  context: {
    stations: StationInfo[];
    ioMappings: IoMappingEntry[];
    alarms: AlarmDef[];
    accessLevels: AccessLevel[];
  },
): Array<{ fileName: string; content: string; moduleNumber: string }> {
  const ext = adapter.getFileExtension();
  return modules.map(m => ({
    fileName: `${m.moduleNumber}_${m.moduleName}${ext}`,
    content: generateModuleCode(adapter, m, context),
    moduleNumber: m.moduleNumber,
  }));
}
