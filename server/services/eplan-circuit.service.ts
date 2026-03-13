/**
 * EPLAN Circuit Schematic Service — Pure Functions
 *
 * Generates EPLAN-importable circuit page content (XML + SVG preview)
 * for each schematic category.
 *
 * Standards: IEC 60617 (symbols), IEC 81346 (designation), EN 60204-1 (safety)
 */

import type { StationInfo, IoMappingEntry } from "./plc-architecture.service";

// ── Types ────────────────────────────────────────────────────────────────

export interface MotorCircuitSpec {
  name: string;
  power: number;     // kW
  voltage: number;   // V
  type: string;      // VFD | DOL
  fla: number;       // Full-load amps
  stationCode: string;
  circuitNumber: number;
}

export interface CircuitPage {
  pageNumber: number;
  pageTitle: string;
  pageCategory: string;
  xmlContent: string;
  svgPreview: string;
  stationIds: number[];
}

export interface EplanProjectSpec {
  projectName: string;
  voltageSystem: string;   // "380V/3P/50Hz" | "480V/3P/60Hz"
  totalPower: number;       // kW
  stations: StationInfo[];
  ioMappings: IoMappingEntry[];
  eStopCount: number;
  plcModel: string;
  hmiModel: string;
}

// ── Constants ────────────────────────────────────────────────────────────

const CABLE_SIZES: Array<{ maxAmps: number; mm2: number; awg: string }> = [
  { maxAmps: 10, mm2: 1.5, awg: "16" },
  { maxAmps: 16, mm2: 2.5, awg: "14" },
  { maxAmps: 25, mm2: 4, awg: "12" },
  { maxAmps: 32, mm2: 6, awg: "10" },
  { maxAmps: 40, mm2: 10, awg: "8" },
  { maxAmps: 63, mm2: 16, awg: "6" },
  { maxAmps: 80, mm2: 25, awg: "4" },
  { maxAmps: 100, mm2: 35, awg: "2" },
  { maxAmps: 125, mm2: 50, awg: "1/0" },
  { maxAmps: 160, mm2: 70, awg: "2/0" },
  { maxAmps: 200, mm2: 95, awg: "3/0" },
  { maxAmps: 250, mm2: 120, awg: "4/0" },
];

// ── Main Generator ──────────────────────────────────────────────────────

export function generateAllSchematics(spec: EplanProjectSpec): CircuitPage[] {
  const pages: CircuitPage[] = [];
  let pageNum = 1;

  // 1. Main power circuit
  pages.push(generateMainPowerCircuit(spec, pageNum++));

  // 2. Motor control circuits (one per station with motors)
  for (const station of spec.stations) {
    const ep = station.electricalParams || {};
    if ((ep.motorCount || 0) > 0) {
      pages.push(generateMotorControlCircuit(station, pageNum++));
    }
  }

  // 3. Safety circuit
  pages.push(generateSafetyCircuit(spec, pageNum++));

  // 4. Control 24V circuit
  pages.push(generateControl24VCircuit(spec, pageNum++));

  // 5. PLC rack layout
  pages.push(generatePlcRackLayout(spec, pageNum++));

  // 6. HMI network topology
  pages.push(generateHmiNetworkTopology(spec, pageNum++));

  // 7. Terminal layout
  pages.push(generateTerminalLayout(spec, pageNum++));

  return pages;
}

// ── 1. Main Power Circuit ────────────────────────────────────────────────

function generateMainPowerCircuit(spec: EplanProjectSpec, pageNum: number): CircuitPage {
  const voltage = spec.voltageSystem || "380V/3P/50Hz";
  const isThreePhase = voltage.includes("3P");
  const nominalV = parseInt(voltage) || 380;
  const totalAmps = (spec.totalPower * 1000) / (Math.sqrt(3) * nominalV * 0.85); // cos(phi)=0.85
  const mainBreakerAmps = selectBreakerSize(totalAmps * 1.25);
  const mainCable = selectCableSize(mainBreakerAmps);

  // Build motor branch summary
  const branches = spec.stations
    .filter(s => (s.electricalParams?.motorCount || 0) > 0)
    .map(s => {
      const ep = s.electricalParams!;
      const power = ep.motorTotalPower || 0;
      const branchAmps = (power * 1000) / (Math.sqrt(3) * nominalV * 0.85);
      return { code: s.stationCode, name: s.stationName, power, amps: branchAmps };
    });

  const svgPreview = generateMainPowerSVG(voltage, mainBreakerAmps, mainCable, branches);

  const xmlContent = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<eplan-page project="${spec.projectName}" page="${pageNum}" category="main_power">`,
    `  <title>Main Power Distribution — ${voltage}</title>`,
    `  <supply voltage="${nominalV}" phases="${isThreePhase ? 3 : 1}" frequency="50"/>`,
    `  <main-breaker rating="${mainBreakerAmps}A" type="MCCB" poles="3" icn="50kA"/>`,
    `  <main-cable size="${mainCable.mm2}mm²" type="NYY" conductors="${isThreePhase ? "3+PE" : "2+PE"}"/>`,
    `  <branches>`,
    ...branches.map(b => `    <branch station="${b.code}" name="${b.name}" power="${b.power}kW" current="${b.amps.toFixed(1)}A"/>`),
    `  </branches>`,
    `</eplan-page>`,
  ].join("\n");

  return {
    pageNumber: pageNum,
    pageTitle: `主电源回路 ${voltage}`,
    pageCategory: "main_power",
    xmlContent,
    svgPreview,
    stationIds: [],
  };
}

// ── 2. Motor Control Circuit ─────────────────────────────────────────────

function generateMotorControlCircuit(station: StationInfo, pageNum: number): CircuitPage {
  const ep = station.electricalParams || {};
  const motors = ep.motorDetails || [];
  const voltage = parseInt(ep.voltageSystem || "380") || 380;

  const motorSpecs: MotorCircuitSpec[] = motors.map((m, i) => ({
    name: m.name,
    power: m.power,
    voltage: m.voltage || voltage,
    type: m.type || "DOL",
    fla: (m.power * 1000) / (Math.sqrt(3) * (m.voltage || voltage) * 0.85),
    stationCode: station.stationCode,
    circuitNumber: i + 1,
  }));

  // If no detailed motors, generate generic ones
  if (motorSpecs.length === 0) {
    const avgPower = (ep.motorTotalPower || 1) / (ep.motorCount || 1);
    for (let i = 0; i < (ep.motorCount || 0); i++) {
      motorSpecs.push({
        name: `M${i + 1}`,
        power: avgPower,
        voltage,
        type: avgPower > 5 ? "VFD" : "DOL",
        fla: (avgPower * 1000) / (Math.sqrt(3) * voltage * 0.85),
        stationCode: station.stationCode,
        circuitNumber: i + 1,
      });
    }
  }

  const svgPreview = generateMotorControlSVG(station.stationCode, motorSpecs);

  const xmlContent = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<eplan-page page="${pageNum}" category="motor_control">`,
    `  <title>${station.stationCode} ${station.stationName} — Motor Control</title>`,
    `  <motors>`,
    ...motorSpecs.map(m => {
      const breaker = selectBreakerSize(m.fla * 1.25);
      const cable = selectCableSize(m.fla);
      const overload = { min: (m.fla * 1.05).toFixed(1), max: (m.fla * 1.2).toFixed(1) };
      return [
        `    <motor circuit="${m.circuitNumber}" name="${m.name}" power="${m.power}kW" type="${m.type}">`,
        `      <breaker rating="${breaker}A" type="${m.type === 'VFD' ? 'MPCB' : 'MCCB'}"/>`,
        m.type === "VFD"
          ? `      <vfd rating="${Math.ceil(m.power * 1.2)}kW" input="3P" output="3P"/>`
          : `      <contactor rating="${Math.ceil(m.fla * 1.2)}A" coil="24VDC"/>`,
        m.type !== "VFD"
          ? `      <overload-relay range="${overload.min}-${overload.max}A"/>`
          : "",
        `      <cable size="${cable.mm2}mm²" type="${m.type === 'VFD' ? 'LIYCY (shielded)' : 'NYY'}"/>`,
        `    </motor>`,
      ].filter(Boolean).join("\n");
    }),
    `  </motors>`,
    `</eplan-page>`,
  ].join("\n");

  return {
    pageNumber: pageNum,
    pageTitle: `${station.stationCode} ${station.stationName} 电机控制`,
    pageCategory: "motor_control",
    xmlContent,
    svgPreview,
    stationIds: [station.id],
  };
}

// ── 3. Safety Circuit ────────────────────────────────────────────────────

function generateSafetyCircuit(spec: EplanProjectSpec, pageNum: number): CircuitPage {
  const svgPreview = generateSafetyCircuitSVG(spec.eStopCount);

  const xmlContent = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<eplan-page page="${pageNum}" category="safety_circuit">`,
    `  <title>Safety Circuit — EN ISO 13849-1 PLd/Cat.3</title>`,
    `  <standard>EN ISO 13849-1, EN 60204-1</standard>`,
    `  <e-stop-chain>`,
    ...Array.from({ length: spec.eStopCount }, (_, i) =>
      `    <e-stop id="${i + 1}" type="mushroom" contacts="2NC" iec-designation="-SB${i + 1}"/>`
    ),
    `  </e-stop-chain>`,
    `  <guard-switches>`,
    `    <guard-switch type="interlock" contacts="2NC+1NO" iec-designation="-SQ1"/>`,
    `  </guard-switches>`,
    `  <safety-relay type="PNOZ_s7" contacts="3NO+1NC" edm="true" iec-designation="-KF1"/>`,
    `  <enable-chain>`,
    `    <description>All E-stops in series → Safety relay input → EDM monitoring → Enable outputs</description>`,
    `  </enable-chain>`,
    `</eplan-page>`,
  ].join("\n");

  return {
    pageNumber: pageNum,
    pageTitle: "安全回路 EN 13849-1 Cat.3",
    pageCategory: "safety_circuit",
    xmlContent,
    svgPreview,
    stationIds: [],
  };
}

// ── 4. Control 24V Circuit ───────────────────────────────────────────────

function generateControl24VCircuit(spec: EplanProjectSpec, pageNum: number): CircuitPage {
  // Calculate 24VDC load
  const sensorLoad = spec.ioMappings.filter(m => m.ioType === "DI" || m.ioType === "AI").length * 0.05; // 50mA each
  const solenoidLoad = spec.ioMappings.filter(m => m.ioType === "DO").length * 0.15; // 150mA per valve solenoid
  const plcLoad = 2.0; // PLC CPU + I/O modules ~2A
  const hmiLoad = 1.5; // HMI ~1.5A
  const totalLoad = sensorLoad + solenoidLoad + plcLoad + hmiLoad;
  const psuRating = Math.ceil(totalLoad * 1.3 / 5) * 5; // Round up to nearest 5A, 1.3× margin

  const svgPreview = generateControl24VSVG(psuRating, totalLoad);

  const xmlContent = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<eplan-page page="${pageNum}" category="control_24v">`,
    `  <title>24VDC Control Power Supply</title>`,
    `  <power-supply input="230VAC" output="24VDC" rating="${psuRating}A" type="SITOP_PSU300S"/>`,
    `  <load-summary>`,
    `    <sensors current="${sensorLoad.toFixed(1)}A" count="${spec.ioMappings.filter(m => m.ioType === "DI" || m.ioType === "AI").length}"/>`,
    `    <solenoids current="${solenoidLoad.toFixed(1)}A" count="${spec.ioMappings.filter(m => m.ioType === "DO").length}"/>`,
    `    <plc current="${plcLoad}A"/>`,
    `    <hmi current="${hmiLoad}A"/>`,
    `    <total current="${totalLoad.toFixed(1)}A" margin="30%"/>`,
    `  </load-summary>`,
    `  <distribution>`,
    `    <branch name="PLC" fuse="6A" type="MCB_C"/>`,
    `    <branch name="HMI" fuse="4A" type="MCB_C"/>`,
    `    <branch name="Sensors" fuse="6A" type="MCB_C"/>`,
    `    <branch name="Solenoids" fuse="10A" type="MCB_C"/>`,
    `  </distribution>`,
    `</eplan-page>`,
  ].join("\n");

  return {
    pageNumber: pageNum,
    pageTitle: "24VDC控制电源",
    pageCategory: "control_24v",
    xmlContent,
    svgPreview,
    stationIds: [],
  };
}

// ── 5. PLC Rack Layout ───────────────────────────────────────────────────

function generatePlcRackLayout(spec: EplanProjectSpec, pageNum: number): CircuitPage {
  const diCount = spec.ioMappings.filter(m => m.ioType === "DI").length;
  const doCount = spec.ioMappings.filter(m => m.ioType === "DO").length;
  const aiCount = spec.ioMappings.filter(m => m.ioType === "AI").length;
  const aoCount = spec.ioMappings.filter(m => m.ioType === "AO").length;

  const diModules = Math.ceil(diCount / 16);  // 16-ch DI modules
  const doModules = Math.ceil(doCount / 16);   // 16-ch DO modules
  const aiModules = Math.ceil(aiCount / 8);    // 8-ch AI modules
  const aoModules = Math.ceil(aoCount / 4);    // 4-ch AO modules
  const totalModules = 1 + diModules + doModules + aiModules + aoModules + 1; // CPU + IO + PSU
  const rackCount = Math.ceil(totalModules / 12); // 12 slots per rack

  const svgPreview = generatePlcRackSVG(spec.plcModel, diModules, doModules, aiModules, aoModules);

  const xmlContent = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<eplan-page page="${pageNum}" category="plc_rack">`,
    `  <title>PLC Rack Layout — ${spec.plcModel}</title>`,
    `  <rack count="${rackCount}">`,
    `    <slot position="0" type="PSU" model="PM190W"/>`,
    `    <slot position="1" type="CPU" model="${spec.plcModel}"/>`,
    ...Array.from({ length: diModules }, (_, i) =>
      `    <slot position="${i + 2}" type="DI16" model="6ES7521-1BH50-0AA0" channels="16"/>`),
    ...Array.from({ length: doModules }, (_, i) =>
      `    <slot position="${i + 2 + diModules}" type="DO16" model="6ES7522-1BH50-0AA0" channels="16"/>`),
    ...Array.from({ length: aiModules }, (_, i) =>
      `    <slot position="${i + 2 + diModules + doModules}" type="AI8" model="6ES7531-7KF00-0AB0" channels="8"/>`),
    ...Array.from({ length: aoModules }, (_, i) =>
      `    <slot position="${i + 2 + diModules + doModules + aiModules}" type="AO4" model="6ES7532-5HD00-0AB0" channels="4"/>`),
    `  </rack>`,
    `  <io-summary di="${diCount}" do="${doCount}" ai="${aiCount}" ao="${aoCount}" modules="${totalModules}" racks="${rackCount}"/>`,
    `</eplan-page>`,
  ].join("\n");

  return {
    pageNumber: pageNum,
    pageTitle: `PLC机架布局 ${spec.plcModel}`,
    pageCategory: "plc_rack",
    xmlContent,
    svgPreview,
    stationIds: [],
  };
}

// ── 6. HMI Network Topology ─────────────────────────────────────────────

function generateHmiNetworkTopology(spec: EplanProjectSpec, pageNum: number): CircuitPage {
  const svgPreview = generateNetworkTopologySVG(spec.plcModel, spec.hmiModel);

  const xmlContent = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<eplan-page page="${pageNum}" category="hmi_network">`,
    `  <title>Network Topology — PROFINET/EtherCAT</title>`,
    `  <network type="PROFINET" speed="100Mbit">`,
    `    <node type="PLC" model="${spec.plcModel}" ip="192.168.0.1"/>`,
    `    <node type="HMI" model="${spec.hmiModel}" ip="192.168.0.10"/>`,
    `    <node type="Switch" model="SCALANCE XB005" ports="5"/>`,
    `    <node type="IO-Device" model="ET200SP" ip="192.168.0.20"/>`,
    `  </network>`,
    `</eplan-page>`,
  ].join("\n");

  return {
    pageNumber: pageNum,
    pageTitle: "网络拓扑",
    pageCategory: "hmi_network",
    xmlContent,
    svgPreview,
    stationIds: [],
  };
}

// ── 7. Terminal Layout ───────────────────────────────────────────────────

function generateTerminalLayout(spec: EplanProjectSpec, pageNum: number): CircuitPage {
  // Group I/O by station
  const stationGroups = new Map<string, IoMappingEntry[]>();
  stationGroups.set("SYSTEM", spec.ioMappings.filter(m => !m.stationId));
  for (const station of spec.stations) {
    stationGroups.set(station.stationCode, spec.ioMappings.filter(m => m.stationCode === station.stationCode));
  }

  const terminalBlocks: string[] = [];
  let terminalNum = 1;
  for (const [code, ios] of stationGroups) {
    terminalBlocks.push(`    <terminal-block name="X${terminalNum}" designation="-X${terminalNum}" station="${code}">`);
    for (const io of ios) {
      terminalBlocks.push(`      <terminal number="${terminalNum}" signal="${io.signalName}" address="${io.address}" type="${io.ioType}"/>`);
      terminalNum++;
    }
    terminalBlocks.push(`    </terminal-block>`);
  }

  const svgPreview = generateTerminalLayoutSVG(stationGroups);

  const xmlContent = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<eplan-page page="${pageNum}" category="terminal_layout">`,
    `  <title>Terminal Block Layout — IEC 81346</title>`,
    `  <terminal-strips>`,
    ...terminalBlocks,
    `  </terminal-strips>`,
    `</eplan-page>`,
  ].join("\n");

  return {
    pageNumber: pageNum,
    pageTitle: "端子排布局",
    pageCategory: "terminal_layout",
    xmlContent,
    svgPreview,
    stationIds: spec.stations.map(s => s.id),
  };
}

// ── Engineering Helpers ──────────────────────────────────────────────────

function selectBreakerSize(amps: number): number {
  const standardSizes = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 630];
  return standardSizes.find(s => s >= amps) || 630;
}

function selectCableSize(amps: number): { mm2: number; awg: string } {
  return CABLE_SIZES.find(c => c.maxAmps >= amps) || CABLE_SIZES[CABLE_SIZES.length - 1];
}

// ── SVG Preview Generators ───────────────────────────────────────────────

function generateMainPowerSVG(
  voltage: string,
  mainBreaker: number,
  mainCable: { mm2: number },
  branches: Array<{ code: string; name: string; power: number; amps: number }>,
): string {
  const w = 800, h = 400 + branches.length * 50;
  const branchLines = branches.map((b, i) => {
    const y = 200 + i * 50;
    return [
      `<line x1="400" y1="${y}" x2="600" y2="${y}" stroke="#333" stroke-width="2"/>`,
      `<text x="610" y="${y + 5}" font-size="12">${b.code} ${b.name} (${b.power}kW / ${b.amps.toFixed(1)}A)</text>`,
      `<rect x="550" y="${y - 10}" width="40" height="20" fill="none" stroke="#c00" stroke-width="2"/>`,
      `<text x="555" y="${y + 5}" font-size="10" fill="#c00">CB</text>`,
    ].join("\n");
  }).join("\n");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">`,
    `  <rect width="${w}" height="${h}" fill="#fff"/>`,
    `  <text x="20" y="30" font-size="16" font-weight="bold">Main Power: ${voltage}</text>`,
    `  <text x="20" y="50" font-size="12">Main Breaker: ${mainBreaker}A MCCB | Cable: ${mainCable.mm2}mm² NYY</text>`,
    `  <!-- Main bus -->`,
    `  <line x1="100" y1="80" x2="100" y2="${160 + branches.length * 50}" stroke="#333" stroke-width="3"/>`,
    `  <line x1="200" y1="80" x2="200" y2="${160 + branches.length * 50}" stroke="#333" stroke-width="3"/>`,
    `  <line x1="300" y1="80" x2="300" y2="${160 + branches.length * 50}" stroke="#333" stroke-width="3"/>`,
    `  <text x="90" y="75" font-size="10">L1</text>`,
    `  <text x="190" y="75" font-size="10">L2</text>`,
    `  <text x="290" y="75" font-size="10">L3</text>`,
    `  <!-- Main breaker -->`,
    `  <rect x="80" y="90" width="240" height="30" fill="none" stroke="#c00" stroke-width="2"/>`,
    `  <text x="130" y="110" font-size="12" fill="#c00">QF1 Main Breaker ${mainBreaker}A</text>`,
    `  <!-- Branches -->`,
    branchLines,
    `</svg>`,
  ].join("\n");
}

function generateMotorControlSVG(stationCode: string, motors: MotorCircuitSpec[]): string {
  const w = 800, h = 200 + motors.length * 120;
  const motorDiags = motors.map((m, i) => {
    const y = 100 + i * 120;
    const breaker = selectBreakerSize(m.fla * 1.25);
    return [
      `<g transform="translate(50, ${y})">`,
      `  <rect x="0" y="0" width="700" height="100" fill="#f8f8f8" stroke="#ddd"/>`,
      `  <text x="10" y="20" font-size="14" font-weight="bold">${m.name} — ${m.power}kW (${m.fla.toFixed(1)}A) [${m.type}]</text>`,
      `  <rect x="10" y="30" width="60" height="25" fill="none" stroke="#c00" stroke-width="2"/>`,
      `  <text x="15" y="48" font-size="10">CB ${breaker}A</text>`,
      m.type === "VFD"
        ? `  <rect x="90" y="30" width="80" height="25" fill="#efe" stroke="#0a0" stroke-width="2"/><text x="100" y="48" font-size="10">VFD ${Math.ceil(m.power * 1.2)}kW</text>`
        : `  <rect x="90" y="30" width="60" height="25" fill="none" stroke="#00c" stroke-width="2"/><text x="95" y="48" font-size="10">KM</text>`,
      m.type !== "VFD"
        ? `  <rect x="170" y="30" width="80" height="25" fill="none" stroke="#f80" stroke-width="2"/><text x="175" y="48" font-size="10">OL ${(m.fla*1.05).toFixed(0)}-${(m.fla*1.2).toFixed(0)}A</text>`
        : "",
      `  <circle cx="400" cy="42" r="20" fill="none" stroke="#333" stroke-width="2"/>`,
      `  <text x="392" y="47" font-size="12">M</text>`,
      `</g>`,
    ].filter(Boolean).join("\n");
  }).join("\n");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">`,
    `  <rect width="${w}" height="${h}" fill="#fff"/>`,
    `  <text x="20" y="30" font-size="16" font-weight="bold">${stationCode} Motor Control</text>`,
    motorDiags,
    `</svg>`,
  ].join("\n");
}

function generateSafetyCircuitSVG(eStopCount: number): string {
  const w = 800, h = 300;
  const eStops = Array.from({ length: eStopCount }, (_, i) => {
    const x = 100 + i * 120;
    return [
      `<circle cx="${x}" cy="100" r="20" fill="#c00" stroke="#800"/>`,
      `<text x="${x - 8}" y="105" font-size="10" fill="#fff">E${i + 1}</text>`,
      `<line x1="${x}" y1="120" x2="${x}" y2="160" stroke="#c00" stroke-width="2"/>`,
    ].join("\n");
  }).join("\n");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">`,
    `  <rect width="${w}" height="${h}" fill="#fff"/>`,
    `  <text x="20" y="30" font-size="16" font-weight="bold">Safety Circuit — EN 13849-1 Cat.3</text>`,
    `  <text x="20" y="55" font-size="12">${eStopCount} E-stops in series → Safety relay (PNOZ) → Enable chain</text>`,
    eStops,
    `  <!-- Safety relay -->`,
    `  <rect x="300" y="180" width="120" height="40" fill="#fea" stroke="#f80" stroke-width="2"/>`,
    `  <text x="310" y="205" font-size="12">KF1 PNOZ s7</text>`,
    `  <!-- Enable output -->`,
    `  <line x1="420" y1="200" x2="600" y2="200" stroke="#0a0" stroke-width="3"/>`,
    `  <text x="610" y="205" font-size="12" fill="#0a0">SAFE OK</text>`,
    `</svg>`,
  ].join("\n");
}

function generateControl24VSVG(psuRating: number, totalLoad: number): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 300">`,
    `  <rect width="800" height="300" fill="#fff"/>`,
    `  <text x="20" y="30" font-size="16" font-weight="bold">24VDC Control Power</text>`,
    `  <rect x="50" y="60" width="150" height="60" fill="#eef" stroke="#00c" stroke-width="2"/>`,
    `  <text x="70" y="85" font-size="12">230VAC → 24VDC</text>`,
    `  <text x="70" y="105" font-size="12">${psuRating}A PSU</text>`,
    `  <line x1="200" y1="90" x2="400" y2="90" stroke="#333" stroke-width="2"/>`,
    `  <text x="250" y="80" font-size="10">Total: ${totalLoad.toFixed(1)}A / ${psuRating}A</text>`,
    `  <rect x="400" y="60" width="100" height="30" fill="#efe" stroke="#0a0"/><text x="410" y="80" font-size="10">PLC 2.0A</text>`,
    `  <rect x="400" y="100" width="100" height="30" fill="#efe" stroke="#0a0"/><text x="410" y="120" font-size="10">HMI 1.5A</text>`,
    `  <rect x="400" y="140" width="100" height="30" fill="#efe" stroke="#0a0"/><text x="410" y="160" font-size="10">Sensors</text>`,
    `  <rect x="400" y="180" width="100" height="30" fill="#efe" stroke="#0a0"/><text x="410" y="200" font-size="10">Solenoids</text>`,
    `</svg>`,
  ].join("\n");
}

function generatePlcRackSVG(plcModel: string, di: number, dox: number, ai: number, ao: number): string {
  const slots = [
    { label: "PSU", color: "#fea" },
    { label: plcModel.substring(0, 8), color: "#aef" },
    ...Array.from({ length: di }, () => ({ label: "DI16", color: "#cfc" })),
    ...Array.from({ length: dox }, () => ({ label: "DO16", color: "#fcc" })),
    ...Array.from({ length: ai }, () => ({ label: "AI8", color: "#ccf" })),
    ...Array.from({ length: ao }, () => ({ label: "AO4", color: "#fcf" })),
  ];
  const w = Math.max(800, slots.length * 60 + 40);

  const slotSvg = slots.map((s, i) => {
    const x = 20 + i * 60;
    return [
      `<rect x="${x}" y="80" width="55" height="120" fill="${s.color}" stroke="#666"/>`,
      `<text x="${x + 5}" y="145" font-size="10" transform="rotate(-90 ${x + 15} 145)">${s.label}</text>`,
      `<text x="${x + 20}" y="215" font-size="9">${i}</text>`,
    ].join("\n");
  }).join("\n");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} 250">`,
    `  <rect width="${w}" height="250" fill="#fff"/>`,
    `  <text x="20" y="30" font-size="16" font-weight="bold">PLC Rack — ${plcModel}</text>`,
    `  <text x="20" y="55" font-size="12">${di}×DI16 + ${dox}×DO16 + ${ai}×AI8 + ${ao}×AO4 = ${slots.length} modules</text>`,
    slotSvg,
    `</svg>`,
  ].join("\n");
}

function generateNetworkTopologySVG(plcModel: string, hmiModel: string): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 300">`,
    `  <rect width="800" height="300" fill="#fff"/>`,
    `  <text x="20" y="30" font-size="16" font-weight="bold">PROFINET Network Topology</text>`,
    `  <!-- Switch -->`,
    `  <rect x="300" y="100" width="200" height="50" fill="#eef" stroke="#00c" stroke-width="2" rx="5"/>`,
    `  <text x="340" y="130" font-size="12">SCALANCE XB005</text>`,
    `  <!-- PLC -->`,
    `  <rect x="50" y="200" width="150" height="50" fill="#cfc" stroke="#0a0" stroke-width="2" rx="5"/>`,
    `  <text x="70" y="230" font-size="11">${plcModel.substring(0, 16)}</text>`,
    `  <line x1="125" y1="200" x2="350" y2="150" stroke="#00c" stroke-width="2"/>`,
    `  <!-- HMI -->`,
    `  <rect x="600" y="200" width="150" height="50" fill="#fea" stroke="#f80" stroke-width="2" rx="5"/>`,
    `  <text x="620" y="230" font-size="11">${hmiModel}</text>`,
    `  <line x1="675" y1="200" x2="450" y2="150" stroke="#00c" stroke-width="2"/>`,
    `  <!-- ET200SP -->`,
    `  <rect x="300" y="220" width="150" height="40" fill="#fcf" stroke="#c0c" stroke-width="2" rx="5"/>`,
    `  <text x="320" y="245" font-size="11">ET200SP (Remote)</text>`,
    `  <line x1="375" y1="220" x2="400" y2="150" stroke="#00c" stroke-width="2"/>`,
    `</svg>`,
  ].join("\n");
}

function generateTerminalLayoutSVG(stationGroups: Map<string, IoMappingEntry[]>): string {
  const h = 100 + stationGroups.size * 50;
  let y = 80;
  const blocks: string[] = [];
  for (const [code, ios] of stationGroups) {
    blocks.push(`<rect x="50" y="${y}" width="700" height="35" fill="#f8f8f8" stroke="#ccc"/>`);
    blocks.push(`<text x="60" y="${y + 22}" font-size="12" font-weight="bold">${code}</text>`);
    blocks.push(`<text x="200" y="${y + 22}" font-size="11">${ios.length} signals (${ios.filter(i => i.ioType === "DI").length}DI/${ios.filter(i => i.ioType === "DO").length}DO/${ios.filter(i => i.ioType === "AI").length}AI/${ios.filter(i => i.ioType === "AO").length}AO)</text>`);
    y += 45;
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 ${h}">`,
    `  <rect width="800" height="${h}" fill="#fff"/>`,
    `  <text x="20" y="30" font-size="16" font-weight="bold">Terminal Block Layout</text>`,
    `  <text x="20" y="55" font-size="12">IEC 81346 Designation System</text>`,
    ...blocks,
    `</svg>`,
  ].join("\n");
}

// ── Cable Schedule Generator ─────────────────────────────────────────────

export function generateCableSchedule(
  stations: StationInfo[],
  voltageSystem: string,
): Array<{
  cableId: string;
  from: string;
  to: string;
  type: string;
  size: string;
  cores: number;
  length: number;
}> {
  const voltage = parseInt(voltageSystem) || 380;
  const cables: Array<{
    cableId: string; from: string; to: string; type: string;
    size: string; cores: number; length: number;
  }> = [];

  let cableNum = 1;

  for (const station of stations) {
    const ep = station.electricalParams || {};
    const motors = ep.motorDetails || [];

    for (const motor of motors) {
      const fla = (motor.power * 1000) / (Math.sqrt(3) * (motor.voltage || voltage) * 0.85);
      const cable = selectCableSize(fla);
      const isVfd = motor.type === "VFD";

      cables.push({
        cableId: `W${String(cableNum++).padStart(3, "0")}`,
        from: "MCC",
        to: `${station.stationCode}-${motor.name}`,
        type: isVfd ? "LIYCY (shielded)" : "NYY",
        size: `${cable.mm2}mm²`,
        cores: 4, // 3P + PE
        length: 15 + Math.random() * 20, // Estimated
      });
    }
  }

  return cables;
}
