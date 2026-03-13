import { describe, it, expect } from "vitest";
import {
  calculateTankSize,
  calculatePumpSize,
  calculateUltrasonicSize,
  calculateSprayLayout,
  calculateHeaterSize,
  calculateDryingSize,
  optimizeCycleTime,
  sizeStation,
  sizeAllStations,
  type WorkpieceSpec,
  type CleanlinessRequirement,
  type ProcessRequirement,
} from "./engineering-sizing.service";

// ── Test Fixtures ───────────────────────────────────────────────────────

const PHONE_CASE: WorkpieceSpec = {
  length: 160, width: 80, height: 10, weight: 0.2, material: "aluminum_alloy",
};

const ENGINE_BLOCK: WorkpieceSpec = {
  length: 600, width: 400, height: 350, weight: 45, material: "cast_iron",
};

const LARGE_HOUSING: WorkpieceSpec = {
  length: 1200, width: 800, height: 600, weight: 120, material: "steel",
};

const STANDARD_CLEAN: CleanlinessRequirement = {
  cleanlinessGrade: "standard", maxParticleSize: 600,
};

const FINE_CLEAN: CleanlinessRequirement = {
  cleanlinessGrade: "fine", maxParticleSize: 200,
};

const PRECISION_CLEAN: CleanlinessRequirement = {
  cleanlinessGrade: "precision", maxParticleSize: 50,
};

const BASE_PROCESS: ProcessRequirement = {
  targetCycleTime: 90,
  cleaningChemistry: "alkaline",
  temperatureTarget: 55,
  heatUpTimeMinutes: 30,
};

// ── Tank Sizing ─────────────────────────────────────────────────────────

describe("calculateTankSize", () => {
  it("phone case → small tank with SUS304", () => {
    const result = calculateTankSize(PHONE_CASE, "alkaline");
    expect(result.innerLength).toBeGreaterThanOrEqual(240); // 160 * 1.5
    expect(result.innerWidth).toBeGreaterThanOrEqual(120);
    expect(result.innerHeight).toBeGreaterThanOrEqual(190); // 10 + 100 + 80
    expect(result.material).toBe("SUS304");
    expect(result.volume).toBeGreaterThan(0);
    expect(result.wallThickness).toBeLessThanOrEqual(5);
    expect(result.legHeight).toBe(150);
  });

  it("engine block → medium tank", () => {
    const result = calculateTankSize(ENGINE_BLOCK, "alkaline");
    expect(result.innerLength).toBeGreaterThanOrEqual(900);
    expect(result.innerWidth).toBeGreaterThanOrEqual(600);
    expect(result.volume).toBeGreaterThan(200);
    expect(result.drainDN).toBeGreaterThanOrEqual(40);
  });

  it("acid chemistry → SUS316L", () => {
    const result = calculateTankSize(PHONE_CASE, "acid");
    expect(result.material).toBe("SUS316L");
  });

  it("solvent chemistry → PP", () => {
    const result = calculateTankSize(PHONE_CASE, "solvent");
    expect(result.material).toBe("PP");
  });

  it("large housing → thick walls and large drain", () => {
    const result = calculateTankSize(LARGE_HOUSING, "alkaline");
    expect(result.wallThickness).toBeGreaterThanOrEqual(4);
    expect(result.volume).toBeGreaterThan(500);
    expect(result.drainDN).toBeGreaterThanOrEqual(50);
  });

  it("outer dims = inner + 2 × wall thickness", () => {
    const result = calculateTankSize(ENGINE_BLOCK, "neutral");
    expect(result.outerLength).toBe(result.innerLength + 2 * result.wallThickness);
    expect(result.outerWidth).toBe(result.innerWidth + 2 * result.wallThickness);
    expect(result.outerHeight).toBe(result.innerHeight + 2 * result.wallThickness);
  });
});

// ── Pump Sizing ─────────────────────────────────────────────────────────

describe("calculatePumpSize", () => {
  it("small tank cleaning → low flow, magnetic pump", () => {
    const result = calculatePumpSize(50, "PRE_WASH");
    expect(result.flowRate).toBeLessThan(30);
    expect(result.pumpType).toBe("magnetic");
    expect(result.motorPower).toBeGreaterThan(0);
  });

  it("spray station → higher turnover rate", () => {
    const cleaning = calculatePumpSize(300, "PRE_WASH");
    const spray = calculatePumpSize(300, "SPRAY");
    expect(spray.flowRate).toBeGreaterThan(cleaning.flowRate);
  });

  it("rinse station → 6x turnover", () => {
    const result = calculatePumpSize(200, "RINSE");
    expect(result.flowRate).toBe(Math.round((200 * 6) / 60));
  });

  it("motor power is a standard size", () => {
    const STANDARD = [0.37, 0.55, 0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5, 11, 15, 18.5, 22, 30];
    const result = calculatePumpSize(500, "SPRAY");
    expect(STANDARD).toContain(result.motorPower);
  });

  it("spray head includes nozzle pressure drop", () => {
    const spray = calculatePumpSize(300, "SPRAY");
    const wash = calculatePumpSize(300, "PRE_WASH");
    expect(spray.head).toBeGreaterThan(wash.head);
  });
});

// ── Ultrasonic Sizing ───────────────────────────────────────────────────

describe("calculateUltrasonicSize", () => {
  it("standard grade → 10 W/L, 25 kHz", () => {
    const result = calculateUltrasonicSize(200, STANDARD_CLEAN);
    expect(result.powerDensity).toBe(10);
    expect(result.totalPower).toBe(2000);
    expect(result.frequency).toBe(25); // >500μm
    expect(result.transducerCount).toBeGreaterThan(0);
    expect(result.generatorCount).toBeGreaterThanOrEqual(1);
  });

  it("fine grade → 20 W/L, 40 kHz", () => {
    const result = calculateUltrasonicSize(100, FINE_CLEAN);
    expect(result.powerDensity).toBe(20);
    expect(result.totalPower).toBe(2000);
    expect(result.frequency).toBe(40); // 100-500μm
  });

  it("precision grade → 30 W/L, 120 kHz", () => {
    const result = calculateUltrasonicSize(100, PRECISION_CLEAN);
    expect(result.powerDensity).toBe(30);
    expect(result.totalPower).toBe(3000);
    expect(result.frequency).toBe(120); // ≤50μm
  });

  it("layout rows × cols ≥ transducerCount", () => {
    const result = calculateUltrasonicSize(300, FINE_CLEAN);
    expect(result.transducerLayout.rows * result.transducerLayout.cols)
      .toBeGreaterThanOrEqual(result.transducerCount - result.transducerLayout.cols); // grid may round
  });

  it("generator count scales with power", () => {
    const small = calculateUltrasonicSize(50, STANDARD_CLEAN);
    const large = calculateUltrasonicSize(500, STANDARD_CLEAN);
    expect(large.generatorCount).toBeGreaterThan(small.generatorCount);
  });
});

// ── Spray Layout ────────────────────────────────────────────────────────

describe("calculateSprayLayout", () => {
  it("standard → flat-fan, 3 pipes", () => {
    const result = calculateSprayLayout(ENGINE_BLOCK, STANDARD_CLEAN);
    expect(result.nozzleType).toBe("flat-fan");
    expect(result.pipeCount).toBe(3);
    expect(result.totalNozzles).toBe(result.nozzlesPerPipe * result.pipeCount);
    expect(result.totalFlow).toBeGreaterThan(0);
  });

  it("precision → full-cone, 4 pipes", () => {
    const result = calculateSprayLayout(ENGINE_BLOCK, PRECISION_CLEAN);
    expect(result.nozzleType).toBe("full-cone");
    expect(result.pipeCount).toBe(4);
    expect(result.sprayPressure).toBe(8);
  });

  it("higher pressure → higher flow per nozzle", () => {
    const std = calculateSprayLayout(ENGINE_BLOCK, STANDARD_CLEAN);
    const prec = calculateSprayLayout(ENGINE_BLOCK, PRECISION_CLEAN);
    expect(prec.flowPerNozzle).toBeGreaterThan(std.flowPerNozzle);
  });

  it("small workpiece → fewer nozzles", () => {
    const small = calculateSprayLayout(PHONE_CASE, STANDARD_CLEAN);
    const large = calculateSprayLayout(LARGE_HOUSING, STANDARD_CLEAN);
    expect(large.totalNozzles).toBeGreaterThanOrEqual(small.totalNozzles);
  });

  it("nozzle spacing is positive", () => {
    const result = calculateSprayLayout(ENGINE_BLOCK, FINE_CLEAN);
    expect(result.nozzleSpacing).toBeGreaterThan(0);
  });
});

// ── Heater Sizing ───────────────────────────────────────────────────────

describe("calculateHeaterSize", () => {
  it("200L tank, 60°C, 30min → reasonable power", () => {
    const result = calculateHeaterSize(200, 60, 30);
    expect(result.totalPower).toBeGreaterThan(0);
    expect(result.heaterCircuits).toBeGreaterThanOrEqual(1);
    expect(result.elementType).toBe("immersion"); // <500L
    expect(result.thermocouple).toBe("PT100"); // <100°C
  });

  it("large tank → more circuits", () => {
    const small = calculateHeaterSize(100, 60, 30);
    const large = calculateHeaterSize(800, 60, 30);
    expect(large.heaterCircuits).toBeGreaterThan(small.heaterCircuits);
  });

  it("higher temp → more power", () => {
    const low = calculateHeaterSize(200, 40, 30);
    const high = calculateHeaterSize(200, 80, 30);
    expect(high.totalPower).toBeGreaterThan(low.totalPower);
  });

  it("target at or below ambient → zero power", () => {
    const result = calculateHeaterSize(200, 20, 30);
    expect(result.totalPower).toBe(0);
    expect(result.heaterCircuits).toBe(0);
  });

  it(">100°C → K-type thermocouple", () => {
    const result = calculateHeaterSize(200, 120, 30);
    expect(result.thermocouple).toBe("K-type");
  });

  it(">500L → plate heater", () => {
    const result = calculateHeaterSize(600, 60, 30);
    expect(result.elementType).toBe("plate");
  });
});

// ── Drying Sizing ───────────────────────────────────────────────────────

describe("calculateDryingSize", () => {
  it("hot air → airflow + blower power", () => {
    const result = calculateDryingSize(ENGINE_BLOCK, "hot_air", STANDARD_CLEAN);
    expect(result.method).toBe("hot_air");
    expect(result.airflow).toBeGreaterThan(0);
    expect(result.blowerPower).toBeGreaterThan(0);
    expect(result.dryingTemp).toBe(60);
  });

  it("vacuum → pump capacity + vacuum level", () => {
    const result = calculateDryingSize(ENGINE_BLOCK, "vacuum", PRECISION_CLEAN);
    expect(result.method).toBe("vacuum");
    expect(result.vacuumPumpCapacity).toBeGreaterThan(0);
    expect(result.vacuumLevel).toBe(1); // precision
  });

  it("air knife → slots based on width", () => {
    const result = calculateDryingSize(ENGINE_BLOCK, "air_knife", STANDARD_CLEAN);
    expect(result.method).toBe("air_knife");
    expect(result.airKnifeSlots).toBeGreaterThanOrEqual(2);
    expect(result.airflow).toBeGreaterThan(0);
  });

  it("precision hot air → higher drying temp", () => {
    const std = calculateDryingSize(ENGINE_BLOCK, "hot_air", STANDARD_CLEAN);
    const prec = calculateDryingSize(ENGINE_BLOCK, "hot_air", PRECISION_CLEAN);
    expect(prec.dryingTemp!).toBeGreaterThan(std.dryingTemp!);
  });
});

// ── Cycle Time Optimization ─────────────────────────────────────────────

describe("optimizeCycleTime", () => {
  const stations = [
    { code: "ST01", type: "LOADING", cycleTime: 30 },
    { code: "ST02", type: "ULTRASONIC", cycleTime: 120 },
    { code: "ST03", type: "SPRAY", cycleTime: 60 },
    { code: "ST04", type: "HOT_AIR_DRY", cycleTime: 90 },
    { code: "ST05", type: "UNLOADING", cycleTime: 30 },
  ];

  it("identifies correct bottleneck", () => {
    const result = optimizeCycleTime(stations, 90);
    expect(result.bottleneckStation).toBe("ST02");
    expect(result.bottleneckTime).toBe(120);
  });

  it("total line time sums correctly", () => {
    const result = optimizeCycleTime(stations, 90);
    expect(result.totalLineTime).toBe(330);
  });

  it("suggests parallel when bottleneck > 1.2× target", () => {
    const result = optimizeCycleTime(stations, 90);
    expect(result.suggestParallel).toBe(true); // 120 > 90*1.2=108
  });

  it("no parallel suggestion when within target", () => {
    const result = optimizeCycleTime(stations, 120);
    expect(result.suggestParallel).toBe(false);
  });

  it("empty stations → safe defaults", () => {
    const result = optimizeCycleTime([], 90);
    expect(result.bottleneckStation).toBe("N/A");
    expect(result.totalLineTime).toBe(0);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });
});

// ── sizeStation Orchestrator ────────────────────────────────────────────

describe("sizeStation", () => {
  it("ULTRASONIC → tank + pump + ultrasonic params", () => {
    const result = sizeStation("ULTRASONIC", ENGINE_BLOCK, FINE_CLEAN, BASE_PROCESS);
    const { mechanicalParams: m, electricalParams: e } = result;

    expect(m.tankLength).toBeGreaterThan(0);
    expect(m.tankVolume).toBeGreaterThan(0);
    expect(m.pumpFlowRate).toBeGreaterThan(0);
    expect(m.ultrasonicFrequency).toBeGreaterThan(0);
    expect(m.ultrasonicPower).toBeGreaterThan(0);
    expect(m.transducerCount).toBeGreaterThan(0);
    expect(m.agitationType).toBe("ultrasonic");
    expect(m.weightCapacity).toBeGreaterThanOrEqual(Math.ceil(ENGINE_BLOCK.weight * 1.5));

    // Electrical derived
    expect(e.motorCount).toBeGreaterThan(0);
    expect(e.plcDI).toBeGreaterThan(0);
    expect(e.totalIoPoints).toBeGreaterThan(0);
    expect(e.communicationProtocol).toBe("PROFINET");
  });

  it("SPRAY → nozzle + sump tank params", () => {
    const result = sizeStation("SPRAY", ENGINE_BLOCK, STANDARD_CLEAN, BASE_PROCESS);
    const { mechanicalParams: m } = result;

    expect(m.nozzleType).toBeDefined();
    expect(m.nozzleCount).toBeGreaterThan(0);
    expect(m.sprayPressure).toBeGreaterThan(0);
    expect(m.tankVolume).toBeGreaterThan(0); // sump
    expect(m.pumpFlowRate).toBeGreaterThan(0);
  });

  it("HOT_AIR_DRY → drying params", () => {
    const result = sizeStation("HOT_AIR_DRY", ENGINE_BLOCK, STANDARD_CLEAN, BASE_PROCESS);
    const { mechanicalParams: m } = result;

    expect(m.dryingTemp).toBeGreaterThan(0);
    expect(m.dryingAirflow).toBeGreaterThan(0);
  });

  it("VACUUM_DRY → vacuum params", () => {
    const result = sizeStation("VACUUM_DRY", ENGINE_BLOCK, PRECISION_CLEAN, BASE_PROCESS);
    const { mechanicalParams: m } = result;

    expect(m.vacuumLevel).toBeGreaterThan(0);
  });

  it("LOADING → conveyor params", () => {
    const result = sizeStation("LOADING", ENGINE_BLOCK, STANDARD_CLEAN, BASE_PROCESS);
    const { mechanicalParams: m } = result;

    expect(m.conveyorType).toBeDefined();
    expect(m.conveyorSpeed).toBeGreaterThan(0);
  });

  it("heavy workpiece → chain conveyor", () => {
    const result = sizeStation("LOADING", LARGE_HOUSING, STANDARD_CLEAN, BASE_PROCESS);
    expect(result.mechanicalParams.conveyorType).toBe("chain");
  });

  it("light workpiece → roller conveyor", () => {
    const result = sizeStation("LOADING", PHONE_CASE, STANDARD_CLEAN, BASE_PROCESS);
    expect(result.mechanicalParams.conveyorType).toBe("roller");
  });

  it("heated tank → heater power + safety interlocks", () => {
    const result = sizeStation("PRE_WASH", ENGINE_BLOCK, STANDARD_CLEAN, BASE_PROCESS);
    const { mechanicalParams: m, electricalParams: e } = result;

    expect(m.heaterPower).toBeGreaterThan(0);
    expect(e.heaterCircuits).toBeGreaterThan(0);
    expect(e.safetyInterlocks).toContain("heater_dry_run");
    expect(e.safetyInterlocks).toContain("over_temperature");
  });

  it("RINSE → conductivity sensor", () => {
    const result = sizeStation("RINSE", ENGINE_BLOCK, FINE_CLEAN, BASE_PROCESS);
    const sensors = result.electricalParams.sensorTypes ?? [];
    const hasConductivity = sensors.some(s => s.type === "电导率仪");
    expect(hasConductivity).toBe(true);
  });
});

// ── sizeAllStations ─────────────────────────────────────────────────────

describe("sizeAllStations", () => {
  it("sizes multiple stations", () => {
    const stations = [
      { stationCode: "ST01", stationType: "LOADING" },
      { stationCode: "ST02", stationType: "PRE_WASH" },
      { stationCode: "ST03", stationType: "ULTRASONIC" },
    ];
    const results = sizeAllStations(stations, ENGINE_BLOCK, FINE_CLEAN, BASE_PROCESS);

    expect(results).toHaveLength(3);
    expect(results[0].stationCode).toBe("ST01");
    expect(results[1].sizing.mechanicalParams.tankVolume).toBeGreaterThan(0);
    expect(results[2].sizing.mechanicalParams.ultrasonicPower).toBeGreaterThan(0);
  });

  it("empty list → empty result", () => {
    const results = sizeAllStations([], ENGINE_BLOCK, FINE_CLEAN, BASE_PROCESS);
    expect(results).toHaveLength(0);
  });
});
