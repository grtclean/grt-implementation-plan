import { describe, it, expect, beforeAll } from "vitest";

// Side-effect import triggers registerAdapter()
import "../plc-brands/inovance.adapter";
import { getAdapter } from "../plc-brands/types";
import type { PlcBrandAdapter, MotorSpec, ValveSpec, PidSpec, AlarmDef, AccessLevel } from "../plc-brands/types";

describe("Inovance AM600 PLC Brand Adapter", () => {
  let adapter: PlcBrandAdapter;

  beforeAll(() => {
    adapter = getAdapter("INOVANCE_AM600");
  });

  // ----------------------------------------------------------------
  // 1. Adapter registration
  // ----------------------------------------------------------------
  describe("adapter registration", () => {
    it("getAdapter('INOVANCE_AM600') returns the adapter", () => {
      expect(adapter).toBeDefined();
      expect(adapter.brandKey).toBe("INOVANCE_AM600");
      expect(adapter.brandName).toBe("Inovance AM600");
      expect(adapter.brandNameZh).toBe("汇川 AM600");
    });

    it("also registers INOVANCE_H5U variant", () => {
      const h5u = getAdapter("INOVANCE_H5U");
      expect(h5u).toBeDefined();
      expect(h5u.brandKey).toBe("INOVANCE_H5U");
      expect(h5u.brandName).toBe("Inovance H5U");
    });

    it("has model definitions with maxIO", () => {
      expect(adapter.models.length).toBeGreaterThanOrEqual(3);
      expect(adapter.models[0]).toHaveProperty("model");
      expect(adapter.models[0]).toHaveProperty("maxIO");
    });

    it("throws for unregistered brand", () => {
      expect(() => getAdapter("NONEXISTENT_BRAND")).toThrow(/No PLC brand adapter/);
    });
  });

  // ----------------------------------------------------------------
  // 2. getFileExtension
  // ----------------------------------------------------------------
  describe("getFileExtension", () => {
    it("returns .st for Structured Text", () => {
      expect(adapter.getFileExtension()).toBe(".st");
    });
  });

  // ----------------------------------------------------------------
  // 3. getModeManagerTemplate — 7 states
  // ----------------------------------------------------------------
  describe("getModeManagerTemplate", () => {
    it("contains all 7 states: INIT, AUTO, MANUAL, SERVICE, CHANGEOVER, DEBUG, E_STOP", () => {
      const template = adapter.getModeManagerTemplate(4);
      const states = ["INIT", "AUTO", "MANUAL", "SERVICE", "CHANGEOVER", "DEBUG", "E_STOP"];
      for (const state of states) {
        expect(template).toContain(state);
      }
    });

    it("references the station count parameter", () => {
      const template = adapter.getModeManagerTemplate(12);
      expect(template).toContain("12");
    });

    it("is valid ST (FUNCTION_BLOCK / END_FUNCTION_BLOCK)", () => {
      const template = adapter.getModeManagerTemplate(4);
      expect(template).toContain("FUNCTION_BLOCK");
      expect(template).toContain("END_FUNCTION_BLOCK");
    });

    it("contains CASE state machine construct", () => {
      const template = adapter.getModeManagerTemplate(4);
      expect(template).toContain("CASE state OF");
      expect(template).toContain("END_CASE");
    });
  });

  // ----------------------------------------------------------------
  // 4. getSafetyTemplate — E_STOP, dual-channel, EDM
  // ----------------------------------------------------------------
  describe("getSafetyTemplate", () => {
    const interlocks = ["pressureOk", "levelOk"];
    const eStopCount = 2;

    it("contains E_STOP references", () => {
      const template = adapter.getSafetyTemplate(interlocks, eStopCount);
      expect(template).toContain("E-Stop");
      expect(template).toContain("eStopActive");
    });

    it("contains dual-channel concordance logic", () => {
      const template = adapter.getSafetyTemplate(interlocks, eStopCount);
      expect(template).toContain("Ch1");
      expect(template).toContain("Ch2");
      expect(template).toContain("Discrepancy");
      expect(template).toContain("channelFault");
    });

    it("contains EDM (External Device Monitoring) references", () => {
      const template = adapter.getSafetyTemplate(interlocks, eStopCount);
      expect(template).toContain("EDM");
      expect(template).toContain("edmFeedback");
      expect(template).toContain("edmOk");
    });

    it("includes interlock names in the generated code", () => {
      const template = adapter.getSafetyTemplate(interlocks, eStopCount);
      expect(template).toContain("pressureOk");
      expect(template).toContain("levelOk");
    });

    it("generates dual-channel inputs for each E-stop", () => {
      const template = adapter.getSafetyTemplate(interlocks, 3);
      expect(template).toContain("eStop1_Ch1");
      expect(template).toContain("eStop2_Ch2");
      expect(template).toContain("eStop3_Ch1");
    });

    it("is valid ST (FUNCTION_BLOCK / END_FUNCTION_BLOCK)", () => {
      const template = adapter.getSafetyTemplate(interlocks, eStopCount);
      expect(template).toContain("FUNCTION_BLOCK FB_SafetyManager");
      expect(template).toContain("END_FUNCTION_BLOCK");
    });
  });

  // ----------------------------------------------------------------
  // 5. getPidTemplate — Kp, Ki, Kd, anti-windup
  // ----------------------------------------------------------------
  describe("getPidTemplate", () => {
    const pid: PidSpec = {
      name: "TempZone1",
      processVariable: "Temperature",
      setpoint: 180.0,
      outputType: "heater",
      stationCode: "ST10",
    };

    it("contains Kp, Ki, Kd parameters", () => {
      const template = adapter.getPidTemplate(pid);
      expect(template).toContain("Kp");
      expect(template).toContain("Ki");
      expect(template).toContain("Kd");
    });

    it("contains anti-windup logic", () => {
      const template = adapter.getPidTemplate(pid);
      expect(template).toMatch(/anti.?windup/i);
      expect(template).toContain("windupActive");
    });

    it("includes the setpoint value in the template", () => {
      const template = adapter.getPidTemplate(pid);
      expect(template).toContain("180.0");
    });

    it("contains output clamping", () => {
      const template = adapter.getPidTemplate(pid);
      expect(template).toContain("outputMax");
      expect(template).toContain("outputMin");
      expect(template).toContain("outputLimited");
    });

    it("contains process variable and output type in header", () => {
      const template = adapter.getPidTemplate(pid);
      expect(template).toContain("Temperature");
      expect(template).toContain("heater");
    });

    it("is valid ST (FUNCTION_BLOCK / END_FUNCTION_BLOCK)", () => {
      const template = adapter.getPidTemplate(pid);
      expect(template).toContain(`FUNCTION_BLOCK FB_PID_TempZone1`);
      expect(template).toContain("END_FUNCTION_BLOCK");
    });
  });

  // ----------------------------------------------------------------
  // 6. getMotorControlTemplate — VFD, ramp, overload
  // ----------------------------------------------------------------
  describe("getMotorControlTemplate", () => {
    const vfdMotor: MotorSpec = {
      name: "Pump1",
      power: 7.5,
      voltage: 380,
      type: "VFD",
      stationCode: "ST20",
    };

    const dolMotor: MotorSpec = {
      name: "Fan1",
      power: 3.0,
      voltage: 380,
      type: "DOL",
      stationCode: "ST21",
    };

    it("contains VFD references for VFD motor type", () => {
      const template = adapter.getMotorControlTemplate(vfdMotor);
      expect(template).toContain("VFD");
      expect(template).toContain("vfdRunCmd");
      expect(template).toContain("vfdSpeedOut");
    });

    it("contains ramp-up/ramp-down logic for VFD", () => {
      const template = adapter.getMotorControlTemplate(vfdMotor);
      expect(template).toContain("rampUpTime");
      expect(template).toContain("rampDownTime");
      expect(template).toContain("rampValue");
      expect(template).toContain("rampIncrement");
    });

    it("contains overload detection", () => {
      const template = adapter.getMotorControlTemplate(vfdMotor);
      expect(template).toContain("overload");
      expect(template).toContain("overloadLimit");
      expect(template).toContain("overloadTimer");
    });

    it("DOL motor does not include VFD-specific blocks", () => {
      const template = adapter.getMotorControlTemplate(dolMotor);
      expect(template).not.toContain("vfdRunCmd");
      expect(template).not.toContain("rampIncrement");
    });

    it("embeds motor name in function block name", () => {
      const template = adapter.getMotorControlTemplate(vfdMotor);
      expect(template).toContain("FB_Motor_Pump1");
    });

    it("is valid ST (FUNCTION_BLOCK / END_FUNCTION_BLOCK)", () => {
      const template = adapter.getMotorControlTemplate(vfdMotor);
      expect(template).toContain("FUNCTION_BLOCK");
      expect(template).toContain("END_FUNCTION_BLOCK");
    });
  });

  // ----------------------------------------------------------------
  // 7. getValveControlTemplate — feedback, timeout, proportional
  // ----------------------------------------------------------------
  describe("getValveControlTemplate", () => {
    const proportionalValve: ValveSpec = {
      name: "FlowCtrl1",
      type: "proportional",
      feedbackType: "proximity",
      stationCode: "ST30",
    };

    const solenoidValve: ValveSpec = {
      name: "AirBlast1",
      type: "solenoid_2way",
      feedbackType: "limit_switch",
      stationCode: "ST31",
    };

    const noFeedbackValve: ValveSpec = {
      name: "Drain1",
      type: "solenoid_2way",
      feedbackType: "none",
      stationCode: "ST32",
    };

    it("contains feedback references for valve with feedback", () => {
      const template = adapter.getValveControlTemplate(solenoidValve);
      expect(template).toContain("fbOpen");
      expect(template).toContain("fbClosed");
      expect(template).toContain("feedback");
    });

    it("contains timeout detection", () => {
      const template = adapter.getValveControlTemplate(solenoidValve);
      expect(template).toContain("travelTimeout");
      expect(template).toContain("Timeout");
    });

    it("contains proportional output for proportional valve", () => {
      const template = adapter.getValveControlTemplate(proportionalValve);
      expect(template).toContain("proportional");
      expect(template).toContain("positionCmd");
      expect(template).toContain("analogOut");
    });

    it("contains stuck-valve alarm", () => {
      const template = adapter.getValveControlTemplate(solenoidValve);
      expect(template).toContain("stuckAlarm");
      expect(template).toContain("stuckRetries");
    });

    it("handles no-feedback valve without fbOpen/fbClosed checks", () => {
      const template = adapter.getValveControlTemplate(noFeedbackValve);
      expect(template).not.toContain("fbOpen");
      expect(template).not.toContain("fbClosed");
    });

    it("is valid ST (FUNCTION_BLOCK / END_FUNCTION_BLOCK)", () => {
      const template = adapter.getValveControlTemplate(proportionalValve);
      expect(template).toContain("FUNCTION_BLOCK FB_Valve_FlowCtrl1");
      expect(template).toContain("END_FUNCTION_BLOCK");
    });
  });

  // ----------------------------------------------------------------
  // 8. getAlarmBlockTemplate — priority, acknowledge, reset
  // ----------------------------------------------------------------
  describe("getAlarmBlockTemplate", () => {
    const alarms: AlarmDef[] = [
      {
        code: "ALM001",
        message: "过温报警",
        messageEn: "Over temperature",
        triggerCondition: "temp > 150",
        interlockAction: "stop",
        resetType: "manual",
        severity: "critical",
      },
      {
        code: "ALM002",
        message: "压力低",
        messageEn: "Low pressure",
        triggerCondition: "pressure < 2",
        interlockAction: "warn",
        resetType: "auto",
        severity: "medium",
      },
      {
        code: "ALM003",
        message: "液位低",
        messageEn: "Low level",
        triggerCondition: "level < 20",
        interlockAction: "reduce_speed",
        resetType: "acknowledge",
        severity: "high",
      },
    ];

    it("contains priority level references", () => {
      const template = adapter.getAlarmBlockTemplate(alarms);
      expect(template).toContain("priority");
      expect(template).toContain("severity");
      expect(template).toContain("highestPriority");
    });

    it("contains acknowledge logic", () => {
      const template = adapter.getAlarmBlockTemplate(alarms);
      expect(template).toContain("acknowledge");
      expect(template).toContain("ackSingle");
      expect(template).toContain("ackAll");
      expect(template).toContain("acknowledged");
    });

    it("contains reset logic", () => {
      const template = adapter.getAlarmBlockTemplate(alarms);
      expect(template).toContain("resetAll");
      expect(template).toContain("resetEdge");
      expect(template).toContain("autoReset");
    });

    it("includes alarm codes in comments", () => {
      const template = adapter.getAlarmBlockTemplate(alarms);
      expect(template).toContain("ALM001");
      expect(template).toContain("ALM002");
      expect(template).toContain("ALM003");
    });

    it("generates correct severity initialization", () => {
      const template = adapter.getAlarmBlockTemplate(alarms);
      // critical=1, medium=3, high=2
      expect(template).toContain("[1, 3, 2]");
    });

    it("generates correct auto-reset flags", () => {
      const template = adapter.getAlarmBlockTemplate(alarms);
      // manual=FALSE, auto=TRUE, acknowledge=FALSE
      expect(template).toContain("[FALSE, TRUE, FALSE]");
    });

    it("is valid ST (FUNCTION_BLOCK / END_FUNCTION_BLOCK)", () => {
      const template = adapter.getAlarmBlockTemplate(alarms);
      expect(template).toContain("FUNCTION_BLOCK FB_AlarmManager");
      expect(template).toContain("END_FUNCTION_BLOCK");
    });
  });

  // ----------------------------------------------------------------
  // 9. formatIOAddress — EtherCAT format (%IX, %QX, etc.)
  // ----------------------------------------------------------------
  describe("formatIOAddress", () => {
    it("DI returns %IX format with byte.bit", () => {
      expect(adapter.formatIOAddress("DI", 5, 3)).toBe("%IX5.3");
    });

    it("DI defaults bit offset to 0", () => {
      expect(adapter.formatIOAddress("DI", 5)).toBe("%IX5.0");
    });

    it("DO returns %QX format", () => {
      expect(adapter.formatIOAddress("DO", 10, 7)).toBe("%QX10.7");
    });

    it("AI returns %IW format (word, no bit)", () => {
      expect(adapter.formatIOAddress("AI", 100)).toBe("%IW100");
    });

    it("AO returns %QW format (word, no bit)", () => {
      expect(adapter.formatIOAddress("AO", 200)).toBe("%QW200");
    });

    it("unknown type falls back to %MX", () => {
      expect(adapter.formatIOAddress("UNKNOWN", 50)).toBe("%MX50.0");
    });
  });

  // ----------------------------------------------------------------
  // 10. All templates produce valid ST (no undefined, no [object Object])
  // ----------------------------------------------------------------
  describe("all templates produce valid ST output", () => {
    const pid: PidSpec = {
      name: "TestPid",
      processVariable: "Flow",
      setpoint: 50.0,
      outputType: "cooling_valve",
      stationCode: "ST01",
    };
    const motor: MotorSpec = {
      name: "TestMotor",
      power: 5.5,
      voltage: 380,
      type: "VFD",
      stationCode: "ST02",
    };
    const valve: ValveSpec = {
      name: "TestValve",
      type: "solenoid_3way",
      feedbackType: "limit_switch",
      stationCode: "ST03",
    };
    const alarms: AlarmDef[] = [
      {
        code: "ALM_TEST",
        message: "测试报警",
        messageEn: "Test alarm",
        triggerCondition: "x > 100",
        interlockAction: "stop",
        resetType: "manual",
        severity: "high",
      },
    ];
    const levels: AccessLevel[] = [
      { levelNumber: 0, levelName: "操作员", levelNameEn: "Operator", permissions: { view: true }, timeout: 300 },
    ];

    const templateGenerators: Array<{ name: string; generate: () => string }> = [
      { name: "getModeManagerTemplate", generate: () => adapter.getModeManagerTemplate(4) },
      { name: "getSafetyTemplate", generate: () => adapter.getSafetyTemplate(["interlockA"], 2) },
      { name: "getUserAuthTemplate", generate: () => adapter.getUserAuthTemplate(levels) },
      { name: "getMotorControlTemplate", generate: () => adapter.getMotorControlTemplate(motor) },
      { name: "getValveControlTemplate", generate: () => adapter.getValveControlTemplate(valve) },
      { name: "getPidTemplate", generate: () => adapter.getPidTemplate(pid) },
      { name: "getAlarmBlockTemplate", generate: () => adapter.getAlarmBlockTemplate(alarms) },
      { name: "getRecipeManagerTemplate", generate: () => adapter.getRecipeManagerTemplate(6) },
      { name: "getDiagnosticTemplate", generate: () => adapter.getDiagnosticTemplate() },
      { name: "getCommunicationTemplate", generate: () => adapter.getCommunicationTemplate(256) },
    ];

    for (const { name, generate } of templateGenerators) {
      it(`${name}() does not contain 'undefined'`, () => {
        const output = generate();
        expect(output).not.toContain("undefined");
      });

      it(`${name}() does not contain '[object Object]'`, () => {
        const output = generate();
        expect(output).not.toContain("[object Object]");
      });

      it(`${name}() returns a non-empty string`, () => {
        const output = generate();
        expect(typeof output).toBe("string");
        expect(output.length).toBeGreaterThan(10);
      });
    }
  });

  // ----------------------------------------------------------------
  // Additional: generateVariableDeclaration
  // ----------------------------------------------------------------
  describe("generateVariableDeclaration", () => {
    it("generates declaration with address", () => {
      expect(adapter.generateVariableDeclaration("sensor1", "BOOL", "%IX0.0"))
        .toBe("sensor1 AT %IX0.0 : BOOL;");
    });

    it("generates declaration without address", () => {
      expect(adapter.generateVariableDeclaration("counter", "INT"))
        .toBe("counter : INT;");
    });
  });

  // ----------------------------------------------------------------
  // Additional: generateFBSource / generateFCSource / generateOBSource / generateDBSource
  // ----------------------------------------------------------------
  describe("source code generation", () => {
    const spec = {
      moduleName: "FB_TestModule",
      moduleType: "FB" as const,
      moduleNumber: "FB100",
      description: "测试模块",
      descriptionEn: "Test module",
      category: "test",
      parameterInterface: {
        inputs: [{ name: "inVal", type: "INT", description: "输入值" }],
        outputs: [{ name: "outVal", type: "BOOL" }],
        statics: [{ name: "counter", type: "INT", initialValue: "0" }],
      },
    };

    it("generateFBSource produces FUNCTION_BLOCK..END_FUNCTION_BLOCK", () => {
      const result = adapter.generateFBSource(spec);
      expect(result).toContain("FUNCTION_BLOCK FB_TestModule");
      expect(result).toContain("END_FUNCTION_BLOCK");
      expect(result).toContain("VAR_INPUT");
      expect(result).toContain("inVal : INT;");
    });

    it("generateFCSource produces FUNCTION..END_FUNCTION", () => {
      const result = adapter.generateFCSource(spec);
      expect(result).toContain("FUNCTION FB_TestModule : BOOL");
      expect(result).toContain("END_FUNCTION");
    });

    it("generateOBSource produces PROGRAM..END_PROGRAM", () => {
      const result = adapter.generateOBSource(spec);
      expect(result).toContain("PROGRAM FB_TestModule");
      expect(result).toContain("END_PROGRAM");
    });

    it("generateDBSource produces TYPE..END_TYPE struct", () => {
      const result = adapter.generateDBSource(spec);
      expect(result).toContain("TYPE FB_TestModule_T");
      expect(result).toContain("STRUCT");
      expect(result).toContain("END_STRUCT");
      expect(result).toContain("END_TYPE");
    });
  });

  // ----------------------------------------------------------------
  // Additional: getProjectStructureInfo
  // ----------------------------------------------------------------
  describe("getProjectStructureInfo", () => {
    it("returns InoProShop project structure", () => {
      const info = adapter.getProjectStructureInfo();
      expect(info).toContain("InoProShop");
      expect(info).toContain("POU");
      expect(info).toContain("EtherCAT");
    });
  });
});
