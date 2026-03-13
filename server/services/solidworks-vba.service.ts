/**
 * Enhanced SolidWorks VBA Generation Service
 *
 * Generates parametric SolidWorks VBA macros with:
 * - Tank body with wall thickness, reinforcement ribs, drain/overflow ports
 * - Work chamber with basket rails, fixture lift clearance, access door
 * - Spray pipe layout with nozzle positions from sizing results
 * - Pump assembly with suction/discharge routing
 * - Conveyor frame with weldment profiles, roller positions
 * - Ultrasonic transducer grid placement
 */
import type { MechanicalParams, ElectricalParams } from "../../drizzle/design-engine-schema";
import type { SprayLayoutResult } from "./engineering-sizing.service";

// ── Types ───────────────────────────────────────────────────────────────

export interface StationData {
  stationCode: string;
  stationName: string;
  stationType: string;
  stationIndex: number;
  mechanicalParams: MechanicalParams;
  electricalParams: ElectricalParams;
  sprayLayout?: SprayLayoutResult;
}

interface StationTypeMeta {
  nameEn: string;
  category: string;
}

const STATION_META: Record<string, StationTypeMeta> = {
  LOADING: { nameEn: "Loading", category: "handling" },
  PRE_WASH: { nameEn: "Pre-Wash", category: "tank" },
  ULTRASONIC: { nameEn: "Ultrasonic Clean", category: "tank" },
  SPRAY: { nameEn: "Spray Clean", category: "spray" },
  TURBULENCE: { nameEn: "Turbulence Wash", category: "tank" },
  ROBOT_CLEAN: { nameEn: "Robot Clean", category: "spray" },
  RINSE: { nameEn: "Rinse", category: "tank" },
  DI_RINSE: { nameEn: "DI Rinse", category: "tank" },
  PASSIVATION: { nameEn: "Passivation", category: "tank" },
  DEGREASING: { nameEn: "Degreasing", category: "tank" },
  AIR_KNIFE: { nameEn: "Air Knife", category: "drying" },
  HOT_AIR_DRY: { nameEn: "Hot Air Dry", category: "drying" },
  VACUUM_DRY: { nameEn: "Vacuum Dry", category: "drying" },
  COOLDOWN: { nameEn: "Cooldown", category: "drying" },
  INSPECTION: { nameEn: "Inspection", category: "inspection" },
  UNLOADING: { nameEn: "Unloading", category: "handling" },
  TRANSFER: { nameEn: "Transfer", category: "handling" },
};

// ── Main Generator ──────────────────────────────────────────────────────

export function generateSolidWorksVBA(stations: StationData[], projectName: string): string {
  const lines: string[] = [];

  // Header
  lines.push(
    `' ═══════════════════════════════════════════════════════════════`,
    `' GRT Design Engine — SolidWorks VBA Parametric Macro (Enhanced)`,
    `' Project: ${projectName}`,
    `' Generated: ${new Date().toISOString()}`,
    `' Stations: ${stations.length}`,
    `' ═══════════════════════════════════════════════════════════════`,
    ``,
    `Option Explicit`,
    ``,
  );

  // Main sub
  lines.push(
    `Sub GRT_SetupCleaningLine()`,
    `    Dim swApp As SldWorks.SldWorks`,
    `    Dim swModel As SldWorks.ModelDoc2`,
    `    Dim swAssy As SldWorks.AssemblyDoc`,
    `    Dim swComp As SldWorks.Component2`,
    `    Dim swFeat As SldWorks.Feature`,
    `    Dim swDim As SldWorks.Dimension`,
    `    Dim boolstatus As Boolean`,
    `    Dim longstatus As Long`,
    `    Dim xOffset As Double`,
    `    `,
    `    Set swApp = Application.SldWorks`,
    `    `,
    `    ' ─── Create Assembly ───`,
    `    Set swModel = swApp.NewAssembly("C:\\GRT_Templates\\CleaningLine_Template.sldasm")`,
    `    Set swAssy = swModel`,
    `    xOffset = 0`,
    `    `,
  );

  // Per-station generation
  for (const st of stations) {
    const mp = st.mechanicalParams || {};
    const meta = STATION_META[st.stationType] || { nameEn: st.stationType, category: "other" };

    lines.push(
      `    ' ═══════════════════════════════════════════════════════`,
      `    ' ${st.stationCode}: ${st.stationName} (${meta.nameEn})`,
      `    ' ═══════════════════════════════════════════════════════`,
      ``,
    );

    // Station offset (1.5m spacing)
    const offset = st.stationIndex * 1.5;

    switch (meta.category) {
      case "tank":
        lines.push(...generateParametricTank(st, offset));
        if (st.stationType === "ULTRASONIC") {
          lines.push(...generateUltrasonicGrid(st));
        }
        lines.push(...generateWorkChamber(st));
        if (mp.pumpFlowRate) {
          lines.push(...generatePumpAssembly(st, offset));
        }
        break;

      case "spray":
        lines.push(...generateParametricTank(st, offset)); // sump tank
        lines.push(...generateSprayPipeLayout(st));
        if (mp.pumpFlowRate) {
          lines.push(...generatePumpAssembly(st, offset));
        }
        break;

      case "drying":
        lines.push(...generateDryingStation(st, offset));
        break;

      case "handling":
        lines.push(...generateConveyorFrame(st, offset));
        break;

      default:
        lines.push(`    ' ${st.stationCode}: Inspection/other — manual configuration`);
        lines.push(
          `    Call InsertComponentAtPosition("C:\\GRT_Templates\\Station_Generic.sldprt", ${offset}, 0, 0)`,
        );
        break;
    }

    // Custom properties for all stations
    lines.push(...generateCustomProperties(st));
    lines.push(`    xOffset = ${offset + 1.5}`);
    lines.push(``);
  }

  // Finalize
  lines.push(
    `    ' ─── Rebuild and Save ───`,
    `    swAssy.EditRebuild3`,
    `    swModel.Save3 swSaveAsOptions_Silent, longstatus, longstatus`,
    `    MsgBox "GRT cleaning line configured: ${stations.length} stations." & vbCrLf & _`,
    `        "Project: ${projectName}", vbInformation, "GRT Design Engine"`,
    `End Sub`,
    ``,
  );

  // Helper subs
  lines.push(...generateHelperSubs());

  return lines.join("\r\n");
}

// ── Sub-Generators ──────────────────────────────────────────────────────

function generateParametricTank(st: StationData, xOffset: number): string[] {
  const mp = st.mechanicalParams;
  if (!mp.tankLength || !mp.tankWidth || !mp.tankHeight) return [];

  const vol = mp.tankVolume ?? 0;
  const wallT = vol < 200 ? 3 : vol < 500 ? 4 : 5;
  const ribSpacing = 300; // mm — reinforcement rib interval
  const ribCount = Math.max(0, Math.floor((mp.tankLength - 100) / ribSpacing));

  const lines: string[] = [
    `    ' ─── Tank Body: ${mp.tankLength}×${mp.tankWidth}×${mp.tankHeight}mm, ${mp.tankMaterial ?? "SUS304"}, ${vol}L ───`,
    `    Call InsertComponentAtPosition("C:\\GRT_Templates\\Tank_Parametric.sldprt", ${xOffset}, 0, 0)`,
    `    Set swComp = swAssy.GetLastComponent`,
    `    Set swModel = swComp.GetModelDoc2`,
    `    `,
    `    ' Drive tank inner dimensions`,
    `    Set swDim = swModel.Parameter("TankLength@Tank")`,
    `    swDim.SystemValue = ${mp.tankLength} / 1000  ' ${mp.tankLength}mm`,
    `    Set swDim = swModel.Parameter("TankWidth@Tank")`,
    `    swDim.SystemValue = ${mp.tankWidth} / 1000  ' ${mp.tankWidth}mm`,
    `    Set swDim = swModel.Parameter("TankHeight@Tank")`,
    `    swDim.SystemValue = ${mp.tankHeight} / 1000  ' ${mp.tankHeight}mm`,
    `    `,
    `    ' Wall thickness`,
    `    Set swDim = swModel.Parameter("WallThickness@Tank")`,
    `    swDim.SystemValue = ${wallT} / 1000  ' ${wallT}mm`,
    `    `,
    `    ' Reinforcement ribs @ ${ribSpacing}mm spacing (${ribCount} ribs)`,
    `    Set swDim = swModel.Parameter("RibCount@Tank")`,
    `    swDim.SystemValue = ${ribCount}`,
    `    Set swDim = swModel.Parameter("RibSpacing@Tank")`,
    `    swDim.SystemValue = ${ribSpacing} / 1000`,
    `    `,
    `    ' Drain port position (bottom center)`,
    `    Set swDim = swModel.Parameter("DrainDN@Tank")`,
    `    swDim.SystemValue = ${mp.tankVolume && mp.tankVolume < 100 ? 25 : mp.tankVolume && mp.tankVolume < 300 ? 40 : 50} / 1000`,
    `    `,
    `    ' Overflow port position (top, 20mm from rim)`,
    `    Set swDim = swModel.Parameter("OverflowHeight@Tank")`,
    `    swDim.SystemValue = (${mp.tankHeight} - 20) / 1000`,
    `    `,
    `    ' Tank legs (H=150mm)`,
    `    Set swDim = swModel.Parameter("LegHeight@Tank")`,
    `    swDim.SystemValue = 0.15`,
    `    Set swDim = swModel.Parameter("LegCount@Tank")`,
    `    swDim.SystemValue = ${vol > 300 ? 6 : 4}`,
    `    `,
    `    ' Flange positions (inlet at 1/3 height, outlet at bottom)`,
    `    Set swDim = swModel.Parameter("InletHeight@Tank")`,
    `    swDim.SystemValue = (${mp.tankHeight} * 0.33) / 1000`,
    `    `,
    `    swModel.EditRebuild3`,
    `    `,
  ];

  return lines;
}

function generateWorkChamber(st: StationData): string[] {
  const mp = st.mechanicalParams;
  if (!mp.tankLength || !mp.tankWidth) return [];

  // Work chamber = inner tank space with basket rails and fixture clearance
  const chamberL = mp.tankLength - 40; // 20mm margin each side
  const chamberW = mp.tankWidth - 40;
  const basketRailY1 = Math.round(mp.tankWidth * 0.25);
  const basketRailY2 = Math.round(mp.tankWidth * 0.75);
  const liftClearance = 100; // mm above tank top for basket lift

  return [
    `    ' ─── Work Chamber Configuration ───`,
    `    ' Inner chamber: ${chamberL}×${chamberW}mm, basket rails at 1/4 & 3/4 width`,
    `    Set swDim = swModel.Parameter("ChamberLength@WorkChamber")`,
    `    swDim.SystemValue = ${chamberL} / 1000`,
    `    Set swDim = swModel.Parameter("ChamberWidth@WorkChamber")`,
    `    swDim.SystemValue = ${chamberW} / 1000`,
    `    `,
    `    ' Basket rail positions`,
    `    Set swDim = swModel.Parameter("RailY1@WorkChamber")`,
    `    swDim.SystemValue = ${basketRailY1} / 1000  ' Rail at 1/4 width`,
    `    Set swDim = swModel.Parameter("RailY2@WorkChamber")`,
    `    swDim.SystemValue = ${basketRailY2} / 1000  ' Rail at 3/4 width`,
    `    `,
    `    ' Fixture lift clearance above tank`,
    `    Set swDim = swModel.Parameter("LiftClearance@WorkChamber")`,
    `    swDim.SystemValue = ${liftClearance} / 1000  ' ${liftClearance}mm`,
    `    `,
    `    ' Access door (front, full height)`,
    `    Set swDim = swModel.Parameter("DoorWidth@WorkChamber")`,
    `    swDim.SystemValue = ${Math.min(chamberL, 600)} / 1000`,
    `    `,
    `    ' Drip tray under tank`,
    `    Set swDim = swModel.Parameter("DripTrayLength@WorkChamber")`,
    `    swDim.SystemValue = ${mp.tankLength + 100} / 1000`,
    `    Set swDim = swModel.Parameter("DripTrayWidth@WorkChamber")`,
    `    swDim.SystemValue = ${mp.tankWidth + 100} / 1000`,
    `    `,
    `    swModel.EditRebuild3`,
    `    `,
  ];
}

function generateSprayPipeLayout(st: StationData): string[] {
  const mp = st.mechanicalParams;
  const spray = st.sprayLayout;
  if (!mp.nozzleCount) return [];

  // Use spray layout result if available, else estimate
  const nozzlesPerPipe = spray?.nozzlesPerPipe ?? Math.ceil(mp.nozzleCount / 3);
  const pipeCount = spray?.pipeCount ?? 3;
  const nozzleSpacing = spray?.nozzleSpacing ?? 150;
  const pipeDN = spray?.pipeDN ?? 25;
  const manifoldDN = spray?.manifoldDN ?? 50;
  const pressure = mp.sprayPressure ?? 5;

  const lines: string[] = [
    `    ' ─── Spray Pipe Layout: ${pipeCount} pipes × ${nozzlesPerPipe} nozzles ───`,
    `    `,
    `    ' Top manifold DN${manifoldDN}`,
    `    Call InsertComponentAtPosition("C:\\GRT_Templates\\Pipe_Manifold.sldprt", xOffset, 0, ${((mp.tankHeight ?? 500) + 200) / 1000})`,
    `    Set swComp = swAssy.GetLastComponent`,
    `    Set swModel = swComp.GetModelDoc2`,
    `    Set swDim = swModel.Parameter("PipeDN@Manifold")`,
    `    swDim.SystemValue = ${manifoldDN} / 1000`,
    `    Set swDim = swModel.Parameter("ManifoldLength@Manifold")`,
    `    swDim.SystemValue = ${(mp.tankWidth ?? 600) + 100} / 1000`,
    `    swModel.EditRebuild3`,
    `    `,
  ];

  // Side pipes (left + right) and top pipe
  const pipeLabels = ["LeftPipe", "RightPipe", "TopPipe", "BottomPipe"];
  for (let i = 0; i < pipeCount; i++) {
    const label = pipeLabels[i] ?? `Pipe${i + 1}`;
    lines.push(
      `    ' ${label}: DN${pipeDN}, ${nozzlesPerPipe} nozzles @ ${nozzleSpacing}mm spacing`,
      `    Call InsertSprayPipe("${st.stationCode}_${label}", ${pipeDN}, ${nozzlesPerPipe}, ${nozzleSpacing / 1000})`,
    );

    // Nozzle positions
    for (let n = 0; n < nozzlesPerPipe; n++) {
      const pos = (nozzleSpacing * (n + 0.5)) / 1000;
      lines.push(
        `    Call PlaceNozzle("${st.stationCode}_${label}", ${n + 1}, ${pos}, "${mp.nozzleType ?? "flat-fan"}", ${pressure})`,
      );
    }
    lines.push(`    `);
  }

  // DN transitions (manifold → pipe)
  lines.push(
    `    ' DN${manifoldDN}→DN${pipeDN} reducer at each branch`,
    `    Call AddCustomProperty swModel, "${st.stationCode}_SprayPressure", "${pressure}bar"`,
    `    Call AddCustomProperty swModel, "${st.stationCode}_TotalNozzles", "${mp.nozzleCount}"`,
    `    Call AddCustomProperty swModel, "${st.stationCode}_NozzleType", "${mp.nozzleType ?? "flat-fan"}"`,
    `    `,
  );

  return lines;
}

function generateUltrasonicGrid(st: StationData): string[] {
  const mp = st.mechanicalParams;
  if (!mp.ultrasonicPower || !mp.transducerCount) return [];

  const freq = mp.ultrasonicFrequency ?? 40;
  const count = mp.transducerCount;

  // Grid layout on tank bottom
  const ratio = (mp.tankLength ?? 900) / (mp.tankWidth ?? 600);
  const cols = Math.max(1, Math.round(Math.sqrt(count / ratio)));
  const rows = Math.max(1, Math.ceil(count / cols));
  const spacingX = (mp.tankLength ?? 900) / (cols + 1);
  const spacingY = (mp.tankWidth ?? 600) / (rows + 1);

  const lines: string[] = [
    `    ' ─── Ultrasonic Transducer Grid: ${rows}×${cols} = ${rows * cols} units @ ${freq}kHz ───`,
    `    Dim usRow As Integer, usCol As Integer`,
    `    Dim usPosX As Double, usPosY As Double`,
    `    `,
    `    For usRow = 1 To ${rows}`,
    `        For usCol = 1 To ${cols}`,
    `            usPosX = usCol * ${spacingX / 1000}  ' ${Math.round(spacingX)}mm spacing`,
    `            usPosY = usRow * ${spacingY / 1000}  ' ${Math.round(spacingY)}mm spacing`,
    `            Call PlaceTransducer("${st.stationCode}", usRow, usCol, usPosX, usPosY, ${freq})`,
    `        Next usCol`,
    `    Next usRow`,
    `    `,
    `    Call AddCustomProperty swModel, "${st.stationCode}_USFreq", "${freq}kHz"`,
    `    Call AddCustomProperty swModel, "${st.stationCode}_USPower", "${mp.ultrasonicPower}W"`,
    `    Call AddCustomProperty swModel, "${st.stationCode}_USCount", "${rows * cols}"`,
    `    Call AddCustomProperty swModel, "${st.stationCode}_USLayout", "${rows}x${cols}"`,
    `    `,
  ];

  return lines;
}

function generatePumpAssembly(st: StationData, xOffset: number): string[] {
  const mp = st.mechanicalParams;
  if (!mp.pumpFlowRate) return [];

  const pumpOffset = -0.5; // 500mm in front of tank

  return [
    `    ' ─── Pump Assembly: ${mp.pumpType ?? "centrifugal"} Q=${mp.pumpFlowRate}L/min H=${mp.pumpHead ?? 10}m ───`,
    `    Call InsertComponentAtPosition("C:\\GRT_Templates\\Pump_${(mp.pumpType ?? "centrifugal").charAt(0).toUpperCase() + (mp.pumpType ?? "centrifugal").slice(1)}.sldprt", ${xOffset}, ${pumpOffset}, 0)`,
    `    Set swComp = swAssy.GetLastComponent`,
    `    Set swModel = swComp.GetModelDoc2`,
    `    `,
    `    ' Pump performance parameters`,
    `    Call AddCustomProperty swModel, "${st.stationCode}_PumpFlow", "${mp.pumpFlowRate}L/min"`,
    `    Call AddCustomProperty swModel, "${st.stationCode}_PumpHead", "${mp.pumpHead ?? 10}m"`,
    `    Call AddCustomProperty swModel, "${st.stationCode}_PumpType", "${mp.pumpType ?? "centrifugal"}"`,
    `    `,
    `    ' Suction pipe routing (tank bottom → pump inlet)`,
    `    Call RoutePipe("${st.stationCode}_Suction", ${xOffset}, -0.05, 0.15, ${xOffset}, ${pumpOffset}, 0.1)`,
    `    `,
    `    ' Discharge pipe routing (pump outlet → tank side return)`,
    `    Call RoutePipe("${st.stationCode}_Discharge", ${xOffset}, ${pumpOffset}, 0.3, ${xOffset}, 0, ${((mp.tankHeight ?? 500) * 0.33) / 1000})`,
    `    `,
    `    ' Motor coupling`,
    `    Call AddCustomProperty swModel, "${st.stationCode}_MotorPower", "${roundToStdPower(mp.pumpFlowRate * (mp.pumpHead ?? 10) / 6120 / 0.65)}kW"`,
    `    `,
    `    swModel.EditRebuild3`,
    `    `,
  ];
}

function generateConveyorFrame(st: StationData, xOffset: number): string[] {
  const mp = st.mechanicalParams;
  const isChain = mp.conveyorType === "chain";
  const profile = isChain ? "60x60x3" : "40x40x3";
  const frameLength = 1200; // mm default
  const frameWidth = 600;  // mm default

  const lines: string[] = [
    `    ' ─── Conveyor Frame: ${mp.conveyorType ?? "roller"} @ ${mp.conveyorSpeed ?? 5}m/min, ${mp.weightCapacity ?? 200}kg ───`,
    `    Call InsertComponentAtPosition("C:\\GRT_Templates\\Conveyor_${isChain ? "Chain" : "Roller"}.sldprt", ${xOffset}, 0, 0)`,
    `    Set swComp = swAssy.GetLastComponent`,
    `    Set swModel = swComp.GetModelDoc2`,
    `    `,
    `    ' Weldment profile: ${profile} ${isChain ? "heavy duty" : "light"}`,
    `    Set swDim = swModel.Parameter("FrameLength@Conveyor")`,
    `    swDim.SystemValue = ${frameLength} / 1000`,
    `    Set swDim = swModel.Parameter("FrameWidth@Conveyor")`,
    `    swDim.SystemValue = ${frameWidth} / 1000`,
    `    Set swDim = swModel.Parameter("FrameHeight@Conveyor")`,
    `    swDim.SystemValue = 0.85  ' 850mm working height`,
    `    `,
  ];

  if (isChain) {
    lines.push(
      `    ' Chain conveyor: drive sprocket + idler sprocket`,
      `    Set swDim = swModel.Parameter("SprocketPitch@Chain")`,
      `    swDim.SystemValue = 0.0254  ' 25.4mm (1" pitch)`,
      `    `,
    );
  } else {
    // Roller positions
    const rollerCount = 8;
    const rollerSpacing = Math.round(frameLength / (rollerCount + 1));
    lines.push(
      `    ' Roller positions: ${rollerCount} rollers @ ${rollerSpacing}mm spacing`,
      `    Set swDim = swModel.Parameter("RollerCount@Conveyor")`,
      `    swDim.SystemValue = ${rollerCount}`,
      `    Set swDim = swModel.Parameter("RollerSpacing@Conveyor")`,
      `    swDim.SystemValue = ${rollerSpacing} / 1000`,
      `    Set swDim = swModel.Parameter("RollerDia@Conveyor")`,
      `    swDim.SystemValue = 0.05  ' φ50mm`,
      `    `,
    );
  }

  lines.push(
    `    ' Guard rail`,
    `    Set swDim = swModel.Parameter("GuardRailHeight@Conveyor")`,
    `    swDim.SystemValue = 0.1  ' 100mm guard rails`,
    `    `,
    `    ' Drive motor position (end of conveyor)`,
    `    Call AddCustomProperty swModel, "${st.stationCode}_ConveyorType", "${mp.conveyorType ?? "roller"}"`,
    `    Call AddCustomProperty swModel, "${st.stationCode}_Speed", "${mp.conveyorSpeed ?? 5}m/min"`,
    `    Call AddCustomProperty swModel, "${st.stationCode}_Capacity", "${mp.weightCapacity ?? 200}kg"`,
    `    `,
    `    swModel.EditRebuild3`,
    `    `,
  );

  return lines;
}

function generateDryingStation(st: StationData, xOffset: number): string[] {
  const mp = st.mechanicalParams;

  const lines: string[] = [
    `    ' ─── Drying Station: ${st.stationType} ───`,
    `    Call InsertComponentAtPosition("C:\\GRT_Templates\\Drying_${st.stationType}.sldprt", ${xOffset}, 0, 0)`,
    `    Set swComp = swAssy.GetLastComponent`,
    `    Set swModel = swComp.GetModelDoc2`,
    `    `,
  ];

  if (st.stationType === "AIR_KNIFE" && mp.dryingAirflow) {
    const slots = Math.max(2, Math.ceil(mp.dryingAirflow / 80));
    lines.push(
      `    ' Air knife: ${slots} slots`,
      `    Set swDim = swModel.Parameter("SlotCount@AirKnife")`,
      `    swDim.SystemValue = ${slots}`,
      `    Set swDim = swModel.Parameter("SlotLength@AirKnife")`,
      `    swDim.SystemValue = 0.5  ' 500mm per slot`,
      `    `,
    );
  }

  if (mp.dryingTemp) {
    lines.push(
      `    Call AddCustomProperty swModel, "${st.stationCode}_DryingTemp", "${mp.dryingTemp}°C"`,
    );
  }
  if (mp.dryingAirflow) {
    lines.push(
      `    Call AddCustomProperty swModel, "${st.stationCode}_Airflow", "${mp.dryingAirflow}m³/h"`,
    );
  }
  if (mp.vacuumLevel) {
    lines.push(
      `    Call AddCustomProperty swModel, "${st.stationCode}_VacuumLevel", "${mp.vacuumLevel}mbar"`,
    );
  }

  lines.push(
    `    swModel.EditRebuild3`,
    `    `,
  );

  return lines;
}

function generateCustomProperties(st: StationData): string[] {
  const ep = st.electricalParams;
  return [
    `    ' ─── Station Custom Properties ───`,
    `    Call AddCustomProperty swModel, "${st.stationCode}_StationName", "${st.stationName}"`,
    `    Call AddCustomProperty swModel, "${st.stationCode}_StationType", "${st.stationType}"`,
    `    Call AddCustomProperty swModel, "${st.stationCode}_IO_DI", "${ep.plcDI ?? 0}"`,
    `    Call AddCustomProperty swModel, "${st.stationCode}_IO_DO", "${ep.plcDO ?? 0}"`,
    `    Call AddCustomProperty swModel, "${st.stationCode}_IO_AI", "${ep.plcAI ?? 0}"`,
    `    Call AddCustomProperty swModel, "${st.stationCode}_TotalPower", "${(ep.motorTotalPower ?? 0) + (ep.heaterTotalPower ?? 0)}kW"`,
    `    `,
  ];
}

// ── Helper Subs ─────────────────────────────────────────────────────────

function generateHelperSubs(): string[] {
  return [
    `' ═══════════════════════════════════════════════════════════════`,
    `' Helper Subroutines`,
    `' ═══════════════════════════════════════════════════════════════`,
    ``,
    `Sub InsertComponentAtPosition(templatePath As String, x As Double, y As Double, z As Double)`,
    `    Dim swApp As SldWorks.SldWorks: Set swApp = Application.SldWorks`,
    `    Dim swAssy As SldWorks.AssemblyDoc: Set swAssy = swApp.ActiveDoc`,
    `    Dim boolstatus As Boolean`,
    `    boolstatus = swAssy.AddComponent5( _`,
    `        templatePath, _`,
    `        swAddComponentConfigOptions_CurrentSelectedConfig, "", False, "", _`,
    `        x, y, z)`,
    `End Sub`,
    ``,
    `Sub AddCustomProperty(swModel As SldWorks.ModelDoc2, propName As String, propValue As String)`,
    `    swModel.AddCustomInfo3 propName, swCustomInfoType_e.swCustomInfoText, propValue`,
    `End Sub`,
    ``,
    `Sub PlaceTransducer(stCode As String, row As Integer, col As Integer, posX As Double, posY As Double, freq As Integer)`,
    `    Dim swApp As SldWorks.SldWorks: Set swApp = Application.SldWorks`,
    `    Dim swAssy As SldWorks.AssemblyDoc: Set swAssy = swApp.ActiveDoc`,
    `    Dim boolstatus As Boolean`,
    `    boolstatus = swAssy.AddComponent5( _`,
    `        "C:\\GRT_Templates\\Transducer_" & freq & "kHz.sldprt", _`,
    `        swAddComponentConfigOptions_CurrentSelectedConfig, "", False, "", _`,
    `        posX, posY, -0.01)  ' Bottom of tank`,
    `    Dim swComp As SldWorks.Component2: Set swComp = swAssy.GetLastComponent`,
    `    Dim swModel As SldWorks.ModelDoc2: Set swModel = swComp.GetModelDoc2`,
    `    Call AddCustomProperty(swModel, stCode & "_US_R" & row & "C" & col, "Transducer")`,
    `End Sub`,
    ``,
    `Sub InsertSprayPipe(pipeName As String, pipeDN As Integer, nozzleCount As Integer, nozzleSpacing As Double)`,
    `    Dim swApp As SldWorks.SldWorks: Set swApp = Application.SldWorks`,
    `    Dim swAssy As SldWorks.AssemblyDoc: Set swAssy = swApp.ActiveDoc`,
    `    Dim swModel As SldWorks.ModelDoc2`,
    `    Dim boolstatus As Boolean`,
    `    boolstatus = swAssy.AddComponent5( _`,
    `        "C:\\GRT_Templates\\SprayPipe_DN" & pipeDN & ".sldprt", _`,
    `        swAddComponentConfigOptions_CurrentSelectedConfig, "", False, "", _`,
    `        0, 0, 0)`,
    `    Set swModel = swAssy.GetLastComponent.GetModelDoc2`,
    `    Call AddCustomProperty(swModel, pipeName & "_NozzleCount", CStr(nozzleCount))`,
    `    Call AddCustomProperty(swModel, pipeName & "_NozzleSpacing", CStr(nozzleSpacing) & "m")`,
    `End Sub`,
    ``,
    `Sub PlaceNozzle(pipeName As String, nozzleIdx As Integer, posAlongPipe As Double, nType As String, pressure As Double)`,
    `    Dim swApp As SldWorks.SldWorks: Set swApp = Application.SldWorks`,
    `    Dim swAssy As SldWorks.AssemblyDoc: Set swAssy = swApp.ActiveDoc`,
    `    Dim boolstatus As Boolean`,
    `    boolstatus = swAssy.AddComponent5( _`,
    `        "C:\\GRT_Templates\\Nozzle_" & nType & ".sldprt", _`,
    `        swAddComponentConfigOptions_CurrentSelectedConfig, "", False, "", _`,
    `        posAlongPipe, 0, 0)`,
    `    Dim swModel As SldWorks.ModelDoc2: Set swModel = swAssy.GetLastComponent.GetModelDoc2`,
    `    Call AddCustomProperty(swModel, pipeName & "_Nozzle" & nozzleIdx, nType & "@" & pressure & "bar")`,
    `End Sub`,
    ``,
    `Sub RoutePipe(pipeName As String, x1 As Double, y1 As Double, z1 As Double, x2 As Double, y2 As Double, z2 As Double)`,
    `    ' Route a pipe segment between two 3D points`,
    `    Dim swApp As SldWorks.SldWorks: Set swApp = Application.SldWorks`,
    `    Dim swModel As SldWorks.ModelDoc2: Set swModel = swApp.ActiveDoc`,
    `    Call AddCustomProperty(swModel, pipeName & "_Start", CStr(x1) & "," & CStr(y1) & "," & CStr(z1))`,
    `    Call AddCustomProperty(swModel, pipeName & "_End", CStr(x2) & "," & CStr(y2) & "," & CStr(z2))`,
    `End Sub`,
    ``,
  ];
}

// ── Internal helpers ────────────────────────────────────────────────────

function roundToStdPower(kw: number): number {
  const STANDARD = [0.37, 0.55, 0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5, 11, 15, 18.5, 22, 30];
  for (const std of STANDARD) {
    if (std >= kw * 1.15) return std; // 15% margin
  }
  return STANDARD[STANDARD.length - 1];
}
