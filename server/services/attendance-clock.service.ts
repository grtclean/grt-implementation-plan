/**
 * Attendance Clock-In Service — GPS-based daily clock-in/out
 *
 * Features:
 * - Haversine GPS distance calculation
 * - GRT office geofence (configurable radius)
 * - Monthly rollup: aggregate daily records → attendance_records
 */

import { requireDb } from "../db";
import { eq, and, sql, isNull } from "drizzle-orm";
import { attendanceClockRecords, attendanceGroups, attendanceGroupMembers, attendanceExcursions } from "../../drizzle/attendance-clock-schema";
import { attendanceRecords } from "../../drizzle/smart-payroll-schema";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("attendance-clock");

// ── GRT Office Default Location (Wuxi) ──────────────────
const DEFAULT_OFFICE_LAT = 31.4913;
const DEFAULT_OFFICE_LNG = 120.3119;
const DEFAULT_GEOFENCE_RADIUS = 100; // meters

// ── Haversine Formula ─────────────────────────────────────

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ── Check if within geofence ──────────────────────────────

export function isWithinGeofence(
  lat: number,
  lng: number,
  officeLat = DEFAULT_OFFICE_LAT,
  officeLng = DEFAULT_OFFICE_LNG,
  radiusMeters = DEFAULT_GEOFENCE_RADIUS,
): { withinFence: boolean; distanceMeters: number } {
  const distanceMeters = haversineDistance(lat, lng, officeLat, officeLng);
  return {
    withinFence: distanceMeters <= radiusMeters,
    distanceMeters: Math.round(distanceMeters * 10) / 10,
  };
}

// ── Clock In ──────────────────────────────────────────────

export interface ClockInInput {
  employeeId: number;
  lat: number;
  lng: number;
  method?: "gps" | "wifi" | "manual" | "dingtalk_import";
  photo?: string;
  customerName?: string;
}

export async function clockIn(input: ClockInInput) {
  const db = await requireDb();
  const now = new Date();
  const clockDate = now.toISOString().slice(0, 10);

  // Check if already clocked in today
  const [existing] = await db.select().from(attendanceClockRecords)
    .where(and(
      eq(attendanceClockRecords.employeeId, input.employeeId),
      eq(attendanceClockRecords.clockDate, clockDate),
    ))
    .limit(1);

  if (existing?.clockInTime) {
    return { success: false, error: "今日已打卡上班", record: existing };
  }

  // Get employee's group for geofence
  const [membership] = await db.select()
    .from(attendanceGroupMembers)
    .where(eq(attendanceGroupMembers.employeeId, input.employeeId))
    .limit(1);

  let officeLat = DEFAULT_OFFICE_LAT;
  let officeLng = DEFAULT_OFFICE_LNG;
  let geofenceRadius = DEFAULT_GEOFENCE_RADIUS;
  let shiftStart = "08:00";

  if (membership) {
    const [group] = await db.select().from(attendanceGroups)
      .where(eq(attendanceGroups.id, membership.groupId))
      .limit(1);
    if (group) {
      officeLat = Number(group.officeLat);
      officeLng = Number(group.officeLng);
      geofenceRadius = group.geofenceRadius;
      shiftStart = group.shiftStart;
    }
  }

  const { withinFence, distanceMeters } = isWithinGeofence(input.lat, input.lng, officeLat, officeLng, geofenceRadius);
  const isOffsite = !withinFence;

  // Calculate late minutes
  const [shiftHour, shiftMin] = shiftStart.split(":").map(Number);
  const shiftStartMinutes = shiftHour * 60 + shiftMin;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const lateMinutes = Math.max(0, currentMinutes - shiftStartMinutes - 5); // 5 min grace
  const status = lateMinutes > 0 ? "late" : (isOffsite ? "offsite" : "normal");

  if (existing) {
    // Update existing record (was created but no clock-in yet)
    await db.update(attendanceClockRecords).set({
      clockInTime: now.toISOString(),
      clockInLat: String(input.lat),
      clockInLng: String(input.lng),
      clockInDistanceMeters: String(distanceMeters),
      clockInMethod: input.method || "gps",
      clockInPhoto: input.photo || null,
      isOffsite,
      offsiteCustomerName: input.customerName || null,
      status,
      lateMinutes,
      updatedAt: now.toISOString(),
    }).where(eq(attendanceClockRecords.id, existing.id));

    log.info({ employeeId: input.employeeId, distance: distanceMeters, late: lateMinutes }, "Clock-in updated");
    return { success: true, clockDate, distanceMeters, isOffsite, lateMinutes, status };
  }

  // Create new record
  const [record] = await db.insert(attendanceClockRecords).values({
    employeeId: input.employeeId,
    clockDate,
    clockInTime: now.toISOString(),
    clockInLat: String(input.lat),
    clockInLng: String(input.lng),
    clockInDistanceMeters: String(distanceMeters),
    clockInMethod: input.method || "gps",
    clockInPhoto: input.photo || null,
    isOffsite,
    offsiteCustomerName: input.customerName || null,
    status,
    lateMinutes,
  }).returning();

  log.info({ employeeId: input.employeeId, distance: distanceMeters, late: lateMinutes }, "Clock-in recorded");
  return { success: true, id: record.id, clockDate, distanceMeters, isOffsite, lateMinutes, status };
}

// ── Clock Out ─────────────────────────────────────────────

export async function clockOut(employeeId: number, lat: number, lng: number) {
  const db = await requireDb();
  const now = new Date();
  const clockDate = now.toISOString().slice(0, 10);

  const [record] = await db.select().from(attendanceClockRecords)
    .where(and(
      eq(attendanceClockRecords.employeeId, employeeId),
      eq(attendanceClockRecords.clockDate, clockDate),
    ))
    .limit(1);

  if (!record) {
    return { success: false, error: "今日未打卡上班" };
  }
  if (record.clockOutTime) {
    return { success: false, error: "今日已打卡下班" };
  }

  const { distanceMeters } = isWithinGeofence(lat, lng);

  // Compute work hours
  let workHours = 0;
  if (record.clockInTime) {
    const clockInMs = new Date(record.clockInTime).getTime();
    const diffMs = now.getTime() - clockInMs;
    workHours = Math.round((diffMs / 3600000) * 100) / 100; // 2 decimal places
  }

  await db.update(attendanceClockRecords).set({
    clockOutTime: now.toISOString(),
    clockOutLat: String(lat),
    clockOutLng: String(lng),
    clockOutDistanceMeters: String(distanceMeters),
    clockOutMethod: "gps",
    workHours: String(workHours),
    updatedAt: now.toISOString(),
  }).where(eq(attendanceClockRecords.id, record.id));

  log.info({ employeeId, workHours, distance: distanceMeters }, "Clock-out recorded");
  return { success: true, clockDate, workHours, distanceMeters };
}

// ── Break Window Check ────────────────────────────────────
// Determines whether a given time falls within a configured break/meal window.

export interface BreakWindow {
  label: string;
  start: string; // HH:MM
  end: string;   // HH:MM
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function isWithinBreakWindow(
  timeHHMM: string,
  breakWindows: BreakWindow[],
): { inBreak: boolean; windowLabel: string | null } {
  const mins = timeToMinutes(timeHHMM);
  for (const w of breakWindows) {
    const start = timeToMinutes(w.start);
    const end = timeToMinutes(w.end);
    if (mins >= start && mins <= end) {
      return { inBreak: true, windowLabel: w.label };
    }
  }
  return { inBreak: false, windowLabel: null };
}

// ── Excursion Recording ───────────────────────────────────
// Called when a GPS ping detects an employee outside the geofence.

export async function recordExcursionOut(employeeId: number, lat: number, lng: number) {
  const db = await requireDb();
  const now = new Date();
  const excursionDate = now.toISOString().slice(0, 10);
  const currentHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  // Check for open excursion (already out, not returned yet)
  const [open] = await db.select().from(attendanceExcursions)
    .where(and(
      eq(attendanceExcursions.employeeId, employeeId),
      eq(attendanceExcursions.excursionDate, excursionDate),
      isNull(attendanceExcursions.timestampIn),
    ))
    .limit(1);

  if (open) {
    return { success: false, error: "已有未结束的离岗记录，请先签回", existing: open };
  }

  // Get employee's group for break windows
  const [membership] = await db.select()
    .from(attendanceGroupMembers)
    .where(eq(attendanceGroupMembers.employeeId, employeeId))
    .limit(1);

  let breakWindows: BreakWindow[] = [{ label: "午休", start: "11:30", end: "13:00" }];
  let officeLat = DEFAULT_OFFICE_LAT;
  let officeLng = DEFAULT_OFFICE_LNG;
  let geofenceRadius = DEFAULT_GEOFENCE_RADIUS;

  if (membership) {
    const [group] = await db.select().from(attendanceGroups)
      .where(eq(attendanceGroups.id, membership.groupId))
      .limit(1);
    if (group) {
      breakWindows = (group.breakWindows as BreakWindow[]) || breakWindows;
      officeLat = Number(group.officeLat);
      officeLng = Number(group.officeLng);
      geofenceRadius = group.geofenceRadius;
    }
  }

  const { distanceMeters } = isWithinGeofence(lat, lng, officeLat, officeLng, geofenceRadius);
  const { inBreak, windowLabel } = isWithinBreakWindow(currentHHMM, breakWindows);

  const [record] = await db.insert(attendanceExcursions).values({
    employeeId,
    excursionDate,
    timestampOut: now.toISOString(),
    gpsLatOut: String(lat),
    gpsLngOut: String(lng),
    distanceMetersOut: String(distanceMeters),
    isDuringBreak: inBreak,
    breakLabel: windowLabel,
  }).returning();

  log.info({
    employeeId, distance: distanceMeters, inBreak, breakLabel: windowLabel,
  }, inBreak ? "Excursion during break" : "UNAUTHORIZED excursion outside break window");

  return {
    success: true,
    id: record.id,
    excursionDate,
    distanceMeters,
    isDuringBreak: inBreak,
    breakLabel: windowLabel,
    warning: !inBreak ? "非休息时段离岗，已记录" : null,
  };
}

export async function recordExcursionReturn(employeeId: number, lat: number, lng: number) {
  const db = await requireDb();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  // Find the open excursion for today
  const [open] = await db.select().from(attendanceExcursions)
    .where(and(
      eq(attendanceExcursions.employeeId, employeeId),
      eq(attendanceExcursions.excursionDate, today),
      isNull(attendanceExcursions.timestampIn),
    ))
    .limit(1);

  if (!open) {
    return { success: false, error: "无未结束的离岗记录" };
  }

  const outTime = new Date(open.timestampOut).getTime();
  const durationMinutes = Math.round((now.getTime() - outTime) / 60000);

  await db.update(attendanceExcursions).set({
    timestampIn: now.toISOString(),
    gpsLatIn: String(lat),
    gpsLngIn: String(lng),
    durationMinutes,
  }).where(eq(attendanceExcursions.id, open.id));

  log.info({ employeeId, durationMinutes, wasBreak: open.isDuringBreak }, "Excursion return recorded");
  return {
    success: true,
    excursionId: open.id,
    durationMinutes,
    isDuringBreak: open.isDuringBreak,
    breakLabel: open.breakLabel,
  };
}

// ── Monthly Rollup ────────────────────────────────────────
// Aggregate daily clock records into the monthly attendance_records table

export async function rollupMonth(period: string) {
  const db = await requireDb();
  const [year, month] = period.split("-");
  const datePrefix = `${year}-${month}`;

  // Get all employees with clock records this month
  const records = await db.select().from(attendanceClockRecords)
    .where(sql`${attendanceClockRecords.clockDate} LIKE ${datePrefix + '%'}`)
    .limit(5000);

  // Group by employee
  const byEmployee = new Map<number, typeof records>();
  for (const r of records) {
    const existing = byEmployee.get(r.employeeId) || [];
    existing.push(r);
    byEmployee.set(r.employeeId, existing);
  }

  // Also get excursion data for the month
  const excursions = await db.select().from(attendanceExcursions)
    .where(sql`${attendanceExcursions.excursionDate} LIKE ${datePrefix + '%'}`)
    .limit(10000);

  // Group excursions by employee
  const excursionsByEmployee = new Map<number, typeof excursions>();
  for (const ex of excursions) {
    const list = excursionsByEmployee.get(ex.employeeId) || [];
    list.push(ex);
    excursionsByEmployee.set(ex.employeeId, list);
  }

  // Collect all employee IDs (from clock records + excursions)
  const allEmployeeIds = new Set([...byEmployee.keys(), ...excursionsByEmployee.keys()]);

  let rolled = 0;
  for (const employeeId of allEmployeeIds) {
    const empRecords = byEmployee.get(employeeId) || [];
    const empExcursions = excursionsByEmployee.get(employeeId) || [];

    const actualDays = empRecords.filter(r => r.clockInTime && r.status !== "absent").length;
    const lateDays = empRecords.filter(r => r.lateMinutes > 0).length;
    const totalOvertimeHours = empRecords.reduce((sum, r) => {
      const wh = Number(r.workHours || 0);
      return sum + Math.max(0, wh - 8); // hours beyond 8 = overtime
    }, 0);

    // Count unauthorized excursions (outside break windows)
    const unauthorizedExcursionCount = empExcursions.filter(e => !e.isDuringBreak).length;

    // Check if attendance record already exists for this period
    const [existing] = await db.select().from(attendanceRecords)
      .where(and(
        eq(attendanceRecords.employeeId, employeeId),
        eq(attendanceRecords.period, period),
      ))
      .limit(1);

    const data = {
      actualDays: String(actualDays),
      lateDays,
      lateCount: lateDays,
      weekdayOvertimeHours: String(Math.round(totalOvertimeHours * 10) / 10),
      unauthorizedExcursions: unauthorizedExcursionCount,
      dataSource: "clock_rollup" as const,
      updatedAt: new Date().toISOString(),
    };

    if (existing) {
      await db.update(attendanceRecords).set(data)
        .where(eq(attendanceRecords.id, existing.id));
    } else {
      await db.insert(attendanceRecords).values({
        employeeId,
        period,
        scheduledDays: 22,
        ...data,
      });
    }
    rolled++;
  }

  log.info({ period, employeeCount: rolled }, "Monthly attendance rollup completed");
  return { period, rolledUp: rolled };
}

export { haversineDistance };
