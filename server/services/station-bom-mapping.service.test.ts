import { describe, it, expect } from "vitest";
import {
  mapStationToBomComponents,
  mapProjectToBom,
  type BomComponent,
} from "./station-bom-mapping.service";
import type { MechanicalParams, ElectricalParams } from "../../drizzle/design-engine-schema";

// ── Test Helpers ────────────────────────────────────────────────────────

const baseMech: MechanicalParams = {
  tankLength: 900, tankWidth: 700, tankHeight: 530, tankVolume: 334,
  tankMaterial: "SUS304",
  pumpType: "centrifugal", pumpFlowRate: 100, pumpHead: 10,
  heaterPower: 6,
  filtrationMicron: 25,
};

const ultrasonicMech: MechanicalParams = {
  ...baseMech,
  ultrasonicFrequency: 40, ultrasonicPower: 3000, transducerCount: 50,
};

const sprayMech: MechanicalParams = {
  tankLength: 1000, tankWidth: 800, tankHeight: 300, tankVolume: 120,
  tankMaterial: "SUS304",
  pumpType: "centrifugal", pumpFlowRate: 150, pumpHead: 20,
  nozzleType: "flat-fan", nozzleCount: 12, sprayPressure: 5,
  filtrationMicron: 25,
};

const dryingMech: MechanicalParams = {
  dryingTemp: 60, dryingAirflow: 200,
};

const handlingMech: MechanicalParams = {
  conveyorType: "roller", conveyorSpeed: 5, weightCapacity: 50,
};

const baseElec: ElectricalParams = {
  plcDI: 12, plcDO: 6, plcAI: 4, plcAO: 0,
  totalIoPoints: 22, motorCount: 1, motorTotalPower: 1.5,
  sensorCount: 3, emergencyStopCount: 1,
  communicationProtocol: "PROFINET",
  safetyInterlocks: ["emergency_stop", "liquid_level_low"],
};

function findByName(components: BomComponent[], name: string): BomComponent | undefined {
  return components.find(c => c.materialName.includes(name));
}

function totalCost(components: BomComponent[]): number {
  return components.reduce((sum, c) => sum + c.unitCost * c.quantity, 0);
}

// ── Tank-based Station ──────────────────────────────────────────────────

describe("mapStationToBomComponents — tank cleaning", () => {
  it("PRE_WASH → tank + pump + heater + filter + electrical", () => {
    const comps = mapStationToBomComponents("PRE_WASH", baseMech, baseElec, "ST02");

    expect(findByName(comps, "清洗槽体")).toBeDefined();
    expect(findByName(comps, "支腿")).toBeDefined();
    expect(findByName(comps, "球阀")).toBeDefined();
    expect(findByName(comps, "溢流管")).toBeDefined();
    expect(findByName(comps, "液位传感器")).toBeDefined();
    expect(findByName(comps, "离心泵")).toBeDefined();
    expect(findByName(comps, "吸入口过滤器")).toBeDefined();
    expect(findByName(comps, "止回阀")).toBeDefined();
    expect(findByName(comps, "浸入式加热器")).toBeDefined();
    expect(findByName(comps, "温度传感器")).toBeDefined();
    expect(findByName(comps, "过滤器壳体")).toBeDefined();
    expect(findByName(comps, "过滤袋")).toBeDefined();
    // Electrical
    expect(findByName(comps, "PLC DI模块")).toBeDefined();
    expect(findByName(comps, "急停按钮")).toBeDefined();
    expect(findByName(comps, "控制电缆")).toBeDefined();
  });

  it("ULTRASONIC → includes transducer + generator", () => {
    const comps = mapStationToBomComponents("ULTRASONIC", ultrasonicMech, baseElec, "ST03");
    const trans = findByName(comps, "超声波振子组");
    const gen = findByName(comps, "超声波发生器");
    expect(trans).toBeDefined();
    expect(gen).toBeDefined();
    expect(gen!.quantity).toBeGreaterThanOrEqual(1);
  });

  it("RINSE → includes conductivity meter", () => {
    const comps = mapStationToBomComponents("RINSE", baseMech, baseElec, "ST04");
    expect(findByName(comps, "电导率仪")).toBeDefined();
  });

  it("DI_RINSE → includes conductivity meter", () => {
    const comps = mapStationToBomComponents("DI_RINSE", baseMech, baseElec, "ST05");
    expect(findByName(comps, "电导率仪")).toBeDefined();
  });
});

// ── Spray Station ───────────────────────────────────────────────────────

describe("mapStationToBomComponents — spray", () => {
  it("SPRAY → nozzles + pipes + manifold + pump + flow meter", () => {
    const comps = mapStationToBomComponents("SPRAY", sprayMech, baseElec, "ST06");

    expect(findByName(comps, "扁平扇形喷嘴")).toBeDefined();
    const nozzle = findByName(comps, "扁平扇形喷嘴")!;
    expect(nozzle.quantity).toBe(12);
    expect(findByName(comps, "喷淋管")).toBeDefined();
    expect(findByName(comps, "汇流管")).toBeDefined();
    expect(findByName(comps, "流量计")).toBeDefined();
  });

  it("SPRAY includes sump tank", () => {
    const comps = mapStationToBomComponents("SPRAY", sprayMech, baseElec, "ST06");
    expect(findByName(comps, "清洗槽体")).toBeDefined();
  });
});

// ── Drying Station ──────────────────────────────────────────────────────

describe("mapStationToBomComponents — drying", () => {
  it("HOT_AIR_DRY → blower + temp sensor", () => {
    const comps = mapStationToBomComponents("HOT_AIR_DRY", dryingMech, baseElec, "ST08");
    expect(findByName(comps, "热风循环风机")).toBeDefined();
    expect(findByName(comps, "温度传感器")).toBeDefined();
  });

  it("VACUUM_DRY → vacuum pump + vacuum sensor", () => {
    const vacMech: MechanicalParams = { vacuumLevel: 10, dryingTemp: 50 };
    const comps = mapStationToBomComponents("VACUUM_DRY", vacMech, baseElec, "ST09");
    expect(findByName(comps, "真空泵")).toBeDefined();
    expect(findByName(comps, "真空度传感器")).toBeDefined();
  });

  it("AIR_KNIFE → air knife slots + blower", () => {
    const akMech: MechanicalParams = { dryingAirflow: 400 };
    const comps = mapStationToBomComponents("AIR_KNIFE", akMech, baseElec, "ST07");
    expect(findByName(comps, "风刀")).toBeDefined();
    expect(findByName(comps, "高压风机")).toBeDefined();
  });
});

// ── Handling Station ────────────────────────────────────────────────────

describe("mapStationToBomComponents — handling", () => {
  it("LOADING (roller) → frame + motor + rollers", () => {
    const comps = mapStationToBomComponents("LOADING", handlingMech, baseElec, "ST01");
    expect(findByName(comps, "输送机架")).toBeDefined();
    expect(findByName(comps, "减速电机")).toBeDefined();
    expect(findByName(comps, "输送辊筒")).toBeDefined();
  });

  it("LOADING (chain) → frame + motor + chain", () => {
    const chainMech: MechanicalParams = { conveyorType: "chain", conveyorSpeed: 5, weightCapacity: 150 };
    const comps = mapStationToBomComponents("LOADING", chainMech, baseElec, "ST01");
    expect(findByName(comps, "输送链条")).toBeDefined();
    // Chain frame is more expensive
    const frame = findByName(comps, "输送机架")!;
    expect(frame.unitCost).toBe(4500);
  });
});

// ── Electrical Components ───────────────────────────────────────────────

describe("electrical components", () => {
  it("all stations get PLC modules + cable + e-stop", () => {
    const comps = mapStationToBomComponents("INSPECTION", {}, baseElec, "ST10");
    expect(findByName(comps, "PLC DI模块")).toBeDefined();
    expect(findByName(comps, "PLC DO模块")).toBeDefined();
    expect(findByName(comps, "控制电缆")).toBeDefined();
    expect(findByName(comps, "急停按钮")).toBeDefined();
  });

  it("motor starters match motor count", () => {
    const highMotorElec: ElectricalParams = { ...baseElec, motorCount: 3 };
    const comps = mapStationToBomComponents("PRE_WASH", baseMech, highMotorElec, "ST02");
    const starter = findByName(comps, "电机启动器")!;
    expect(starter.quantity).toBe(3);
  });
});

// ── Cost Calculation ────────────────────────────────────────────────────

describe("cost calculations", () => {
  it("total cost is sum of quantity × unitCost", () => {
    const comps = mapStationToBomComponents("PRE_WASH", baseMech, baseElec, "ST02");
    const expectedTotal = comps.reduce((sum, c) => sum + c.unitCost * c.quantity, 0);
    expect(totalCost(comps)).toBe(expectedTotal);
    expect(totalCost(comps)).toBeGreaterThan(0);
  });

  it("ultrasonic station costs more than plain wash", () => {
    const washComps = mapStationToBomComponents("PRE_WASH", baseMech, baseElec, "ST02");
    const usComps = mapStationToBomComponents("ULTRASONIC", ultrasonicMech, baseElec, "ST03");
    expect(totalCost(usComps)).toBeGreaterThan(totalCost(washComps));
  });
});

// ── Project BOM Summary ─────────────────────────────────────────────────

describe("mapProjectToBom", () => {
  it("aggregates multiple stations", () => {
    const summary = mapProjectToBom([
      { stationCode: "ST01", stationType: "LOADING", mechanicalParams: handlingMech, electricalParams: baseElec },
      { stationCode: "ST02", stationType: "PRE_WASH", mechanicalParams: baseMech, electricalParams: baseElec },
      { stationCode: "ST03", stationType: "ULTRASONIC", mechanicalParams: ultrasonicMech, electricalParams: baseElec },
    ]);

    expect(summary.stations).toHaveLength(3);
    expect(summary.totalComponents).toBeGreaterThan(0);
    expect(summary.totalCost).toBeGreaterThan(0);
    expect(summary.totalCost).toBe(summary.stations.reduce((s, st) => s + st.subtotal, 0));
  });

  it("costByCategory has at least mechanical + electrical", () => {
    const summary = mapProjectToBom([
      { stationCode: "ST02", stationType: "PRE_WASH", mechanicalParams: baseMech, electricalParams: baseElec },
    ]);

    expect(summary.costByCategory["mechanical"]).toBeGreaterThan(0);
    expect(summary.costByCategory["electrical"]).toBeGreaterThan(0);
  });

  it("empty stations → zero totals", () => {
    const summary = mapProjectToBom([]);
    expect(summary.stations).toHaveLength(0);
    expect(summary.totalComponents).toBe(0);
    expect(summary.totalCost).toBe(0);
  });
});
