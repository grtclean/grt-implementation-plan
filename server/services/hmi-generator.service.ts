/**
 * HMI Generator Service — Auto-generate HMI touch-screen layouts from station configs
 *
 * Maps station types → screen templates with appropriate widgets.
 * Reads station electricalParams for PLC I/O tags.
 */

import { createChildLogger } from "../lib/logger";
import { requireDb } from "../db";
import { hmiScreens } from "../../drizzle/hmi-screen-schema";
import type { HmiWidget, HmiLayoutJson } from "../../drizzle/hmi-screen-schema";
import { equipmentStations } from "../../drizzle/design-engine-schema";
import { plcProjects, plcIoMappings, plcAlarmDefinitions } from "../../drizzle/plc-program-schema";
import { eq, and } from "drizzle-orm";

const log = createChildLogger("hmi-generator");

interface StationScreenConfig {
  screenType: "main_overview" | "station_detail" | "alarm_list" | "recipe_management" | "trend_chart" | "user_management" | "maintenance" | "diagnostics";
  screenName: string;
  screenNameEn: string;
  widgets: HmiWidget[];
}

/**
 * Generate all HMI screens for a project.
 * Creates: 1 overview + 1 per station + alarm list + recipe + user mgmt + maintenance
 */
export async function generateHmiScreens(
  projectId: number,
  plcProjectId: number,
  targetPlatform: "siemens_comfort" | "siemens_unified" | "weintek_eb" | "pro_face" | "generic_html" = "siemens_comfort",
): Promise<{ screenCount: number; screenIds: number[] }> {
  const db = await requireDb();

  // Get stations for this project
  const stations = await db.select().from(equipmentStations)
    .where(eq(equipmentStations.projectId, projectId))
    .orderBy(equipmentStations.stationIndex)
    .limit(50);

  // Get I/O mappings for tag references
  const ioMappings = await db.select().from(plcIoMappings)
    .where(eq(plcIoMappings.plcProjectId, plcProjectId))
    .limit(1000);

  // Get alarms for alarm list screen
  const alarms = await db.select().from(plcAlarmDefinitions)
    .where(eq(plcAlarmDefinitions.plcProjectId, plcProjectId))
    .limit(500);

  // Delete existing screens for this project
  await db.delete(hmiScreens).where(
    and(eq(hmiScreens.projectId, projectId), eq(hmiScreens.plcProjectId, plcProjectId)),
  );

  const screenIds: number[] = [];
  let screenIndex = 0;

  // Screen 1: Main Overview (all stations summary)
  const overviewLayout = generateOverviewScreen(stations);
  const [overview] = await db.insert(hmiScreens).values({
    projectId, plcProjectId, screenIndex: screenIndex++,
    screenName: "系统总览", screenNameEn: "System Overview",
    screenType: "main_overview", targetPlatform,
    layoutJson: overviewLayout, widgetCount: overviewLayout.widgets.length,
  }).returning();
  screenIds.push(overview.id);

  // Screens 2-N: Per-station detail
  for (const station of stations) {
    const stationIo = ioMappings.filter(io => io.stationId === station.id);
    const layout = generateStationDetailScreen(station, stationIo);
    const [screen] = await db.insert(hmiScreens).values({
      projectId, plcProjectId, screenIndex: screenIndex++,
      screenName: `${station.stationCode} ${station.stationName}`,
      screenNameEn: station.stationNameEn || station.stationCode,
      screenType: "station_detail", targetPlatform,
      layoutJson: layout, widgetCount: layout.widgets.length,
      stationId: station.id,
    }).returning();
    screenIds.push(screen.id);
  }

  // Alarm List screen
  const alarmLayout = generateAlarmListScreen(alarms.length);
  const [alarmScreen] = await db.insert(hmiScreens).values({
    projectId, plcProjectId, screenIndex: screenIndex++,
    screenName: "报警列表", screenNameEn: "Alarm List",
    screenType: "alarm_list", targetPlatform,
    layoutJson: alarmLayout, widgetCount: alarmLayout.widgets.length,
  }).returning();
  screenIds.push(alarmScreen.id);

  // Recipe Management screen
  const recipeLayout = generateRecipeScreen();
  const [recipeScreen] = await db.insert(hmiScreens).values({
    projectId, plcProjectId, screenIndex: screenIndex++,
    screenName: "配方管理", screenNameEn: "Recipe Management",
    screenType: "recipe_management", targetPlatform,
    layoutJson: recipeLayout, widgetCount: recipeLayout.widgets.length,
  }).returning();
  screenIds.push(recipeScreen.id);

  // User Management screen
  const userLayout = generateUserManagementScreen();
  const [userScreen] = await db.insert(hmiScreens).values({
    projectId, plcProjectId, screenIndex: screenIndex++,
    screenName: "用户管理", screenNameEn: "User Management",
    screenType: "user_management", targetPlatform,
    layoutJson: userLayout, widgetCount: userLayout.widgets.length,
  }).returning();
  screenIds.push(userScreen.id);

  // Maintenance screen
  const maintLayout = generateMaintenanceScreen(stations.length);
  const [maintScreen] = await db.insert(hmiScreens).values({
    projectId, plcProjectId, screenIndex: screenIndex++,
    screenName: "维护保养", screenNameEn: "Maintenance",
    screenType: "maintenance", targetPlatform,
    layoutJson: maintLayout, widgetCount: maintLayout.widgets.length,
  }).returning();
  screenIds.push(maintScreen.id);

  log.info({ projectId, plcProjectId, screenCount: screenIds.length }, "HMI screens generated");
  return { screenCount: screenIds.length, screenIds };
}

function generateOverviewScreen(stations: any[]): HmiLayoutJson {
  const widgets: HmiWidget[] = [];
  const cols = Math.min(stations.length, 5);
  const cellW = 350;
  const cellH = 180;

  // Header
  widgets.push({
    id: "header", type: "text", x: 10, y: 10, width: 1900, height: 60,
    label: "清洗线系统总览", labelEn: "Cleaning Line System Overview",
  });

  // Station status tiles
  stations.forEach((st, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    widgets.push({
      id: `st_${st.stationCode}`, type: "indicator",
      x: 20 + col * (cellW + 10), y: 80 + row * (cellH + 10),
      width: cellW, height: cellH,
      label: `${st.stationCode} ${st.stationName}`,
      plcTag: `DB_Overview.Station[${i}].Status`,
      color: "#22c55e",
    });
  });

  // Mode indicator
  widgets.push({
    id: "mode", type: "indicator", x: 1600, y: 10, width: 300, height: 60,
    label: "运行模式", labelEn: "Operating Mode",
    plcTag: "DB_ModeManager.CurrentMode", color: "#3b82f6",
  });

  return {
    screenWidth: 1920, screenHeight: 1080, backgroundColor: "#0f172a",
    headerText: "System Overview", widgets, navigationLinks: [],
  };
}

function generateStationDetailScreen(station: any, ioMappings: any[]): HmiLayoutJson {
  const widgets: HmiWidget[] = [];
  const mech = station.mechanicalParams || {};
  const elec = station.electricalParams || {};
  const stType = station.stationType;

  // Station header
  widgets.push({
    id: "header", type: "text", x: 10, y: 10, width: 1900, height: 50,
    label: `${station.stationCode} — ${station.stationName}`,
  });

  let y = 70;

  // Temperature gauge (if applicable)
  if (["ULTRASONIC", "SPRAY", "HOT_AIR_DRY", "VACUUM_DRY", "RINSE", "DI_RINSE", "DEGREASING", "PASSIVATION"].includes(stType)) {
    widgets.push({
      id: "temp", type: "gauge", x: 20, y, width: 200, height: 200,
      label: "温度", labelEn: "Temperature", unit: "°C",
      plcTag: `DB_${station.stationCode}.Temperature.Actual`,
      minValue: 0, maxValue: mech.dryingTemp ? mech.dryingTemp + 20 : 100,
      alarmHigh: mech.dryingTemp || 80,
    });
  }

  // Pressure gauge (for spray/rinse)
  if (["SPRAY", "RINSE", "DI_RINSE", "ROBOT_CLEAN"].includes(stType)) {
    widgets.push({
      id: "pressure", type: "gauge", x: 240, y, width: 200, height: 200,
      label: "压力", labelEn: "Pressure", unit: "bar",
      plcTag: `DB_${station.stationCode}.Pressure.Actual`,
      minValue: 0, maxValue: (mech.sprayPressure || 10) * 1.5,
      alarmHigh: mech.sprayPressure || 8,
    });
  }

  // Flow rate bar (for pump stations)
  if (mech.pumpFlowRate) {
    widgets.push({
      id: "flow", type: "bar", x: 460, y, width: 200, height: 200,
      label: "流量", labelEn: "Flow Rate", unit: "L/min",
      plcTag: `DB_${station.stationCode}.FlowRate.Actual`,
      minValue: 0, maxValue: mech.pumpFlowRate * 1.2,
    });
  }

  // Ultrasonic power (for ultrasonic stations)
  if (stType === "ULTRASONIC" && mech.ultrasonicPower) {
    widgets.push({
      id: "us_power", type: "gauge", x: 680, y, width: 200, height: 200,
      label: "超声功率", labelEn: "Ultrasonic Power", unit: "W",
      plcTag: `DB_${station.stationCode}.UltrasonicPower.Actual`,
      minValue: 0, maxValue: mech.ultrasonicPower * 1.2,
    });
  }

  // Level indicator (for tank stations)
  if (mech.tankVolume) {
    widgets.push({
      id: "level", type: "bar", x: 900, y, width: 150, height: 200,
      label: "液位", labelEn: "Tank Level", unit: "L",
      plcTag: `DB_${station.stationCode}.TankLevel.Actual`,
      minValue: 0, maxValue: mech.tankVolume,
      alarmLow: mech.tankVolume * 0.1,
    });
  }

  y += 220;

  // Motor status indicators
  const motorCount = elec.motorCount || 0;
  for (let i = 0; i < Math.min(motorCount, 6); i++) {
    const motor = elec.motorDetails?.[i];
    widgets.push({
      id: `motor_${i}`, type: "indicator", x: 20 + i * 170, y, width: 160, height: 80,
      label: motor?.name || `电机${i + 1}`,
      plcTag: `DB_${station.stationCode}.Motor[${i}].Running`,
      color: "#22c55e",
    });
  }

  y += 100;

  // Cycle timer
  widgets.push({
    id: "timer", type: "numericInput", x: 20, y, width: 200, height: 80,
    label: "节拍时间", labelEn: "Cycle Time", unit: "s",
    plcTag: `DB_${station.stationCode}.CycleTime.Setpoint`,
    minValue: 0, maxValue: 9999,
  });

  // Start/Stop buttons
  widgets.push({
    id: "btn_start", type: "button", x: 1600, y: 950, width: 140, height: 60,
    label: "启动", labelEn: "START", plcTag: `DB_${station.stationCode}.Cmd.Start`, color: "#22c55e",
  });
  widgets.push({
    id: "btn_stop", type: "button", x: 1750, y: 950, width: 140, height: 60,
    label: "停止", labelEn: "STOP", plcTag: `DB_${station.stationCode}.Cmd.Stop`, color: "#ef4444",
  });

  return {
    screenWidth: 1920, screenHeight: 1080, backgroundColor: "#0f172a",
    headerText: station.stationName, widgets,
    navigationLinks: [{ targetScreenIndex: 0, label: "返回总览" }],
  };
}

function generateAlarmListScreen(alarmCount: number): HmiLayoutJson {
  return {
    screenWidth: 1920, screenHeight: 1080, backgroundColor: "#0f172a",
    headerText: "Alarm List", widgets: [
      { id: "header", type: "text", x: 10, y: 10, width: 1900, height: 50, label: `报警列表 (${alarmCount} 条)` },
      { id: "alarm_list", type: "listView", x: 10, y: 70, width: 1900, height: 900, label: "报警列表", plcTag: "DB_Alarms.ActiveAlarms" },
      { id: "btn_ack", type: "button", x: 1700, y: 980, width: 200, height: 50, label: "确认全部", plcTag: "DB_Alarms.AckAll", color: "#f59e0b" },
    ],
    navigationLinks: [{ targetScreenIndex: 0, label: "返回总览" }],
  };
}

function generateRecipeScreen(): HmiLayoutJson {
  return {
    screenWidth: 1920, screenHeight: 1080, backgroundColor: "#0f172a",
    headerText: "Recipe Management", widgets: [
      { id: "header", type: "text", x: 10, y: 10, width: 1900, height: 50, label: "配方管理" },
      { id: "recipe_list", type: "listView", x: 10, y: 70, width: 600, height: 800, label: "配方列表", plcTag: "DB_Recipe.RecipeList" },
      { id: "recipe_params", type: "listView", x: 620, y: 70, width: 1280, height: 800, label: "参数详情", plcTag: "DB_Recipe.CurrentRecipe" },
      { id: "btn_load", type: "button", x: 10, y: 880, width: 200, height: 50, label: "下载到PLC", plcTag: "DB_Recipe.Cmd.Download", color: "#3b82f6" },
      { id: "btn_save", type: "button", x: 220, y: 880, width: 200, height: 50, label: "保存配方", plcTag: "DB_Recipe.Cmd.Save", color: "#22c55e" },
    ],
    navigationLinks: [{ targetScreenIndex: 0, label: "返回总览" }],
  };
}

function generateUserManagementScreen(): HmiLayoutJson {
  return {
    screenWidth: 1920, screenHeight: 1080, backgroundColor: "#0f172a",
    headerText: "User Management", widgets: [
      { id: "header", type: "text", x: 10, y: 10, width: 1900, height: 50, label: "用户管理" },
      { id: "user_list", type: "listView", x: 10, y: 70, width: 900, height: 700, label: "用户列表" },
      { id: "access_level", type: "numericInput", x: 920, y: 70, width: 300, height: 80, label: "权限等级", unit: "0-9", minValue: 0, maxValue: 9 },
      { id: "btn_login", type: "button", x: 920, y: 200, width: 200, height: 50, label: "登录", color: "#3b82f6" },
      { id: "btn_logout", type: "button", x: 1130, y: 200, width: 200, height: 50, label: "注销", color: "#6b7280" },
    ],
    navigationLinks: [{ targetScreenIndex: 0, label: "返回总览" }],
  };
}

function generateMaintenanceScreen(stationCount: number): HmiLayoutJson {
  return {
    screenWidth: 1920, screenHeight: 1080, backgroundColor: "#0f172a",
    headerText: "Maintenance", widgets: [
      { id: "header", type: "text", x: 10, y: 10, width: 1900, height: 50, label: `维护保养 (${stationCount} 工位)` },
      { id: "maint_list", type: "listView", x: 10, y: 70, width: 1900, height: 700, label: "维护项目列表" },
      { id: "hours_counter", type: "gauge", x: 10, y: 780, width: 300, height: 200, label: "运行小时数", unit: "h", minValue: 0, maxValue: 10000, plcTag: "DB_Maintenance.RunHours" },
      { id: "btn_reset", type: "button", x: 320, y: 900, width: 200, height: 50, label: "复位计数器", plcTag: "DB_Maintenance.ResetHours", color: "#f59e0b" },
    ],
    navigationLinks: [{ targetScreenIndex: 0, label: "返回总览" }],
  };
}
