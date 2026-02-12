/**
 * GRT Compliance Test Data Seed Script
 * 
 * This script inserts sample employee and time entry data for testing
 * the compliance dashboard with German (ArbZG) and US (FLSA) regulations.
 * 
 * Includes:
 * - 5 German employees (DE jurisdiction)
 * - 5 US employees (US jurisdiction)
 * - Time entries with normal and violation cases
 * - Compliance alerts for various violation types
 */

import { requireDb } from './utils/db-helpers';
import { grtEmployees, grtTimeEntries, grtComplianceAlerts, grtWeeklyComplianceSummary } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// Helper function to generate dates
function getDateString(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

function getWeekStartDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  // Get Monday of that week
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date.toISOString().split('T')[0];
}

function getWeekEndDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  // Get Sunday of that week
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? 0 : 7);
  date.setDate(diff);
  return date.toISOString().split('T')[0];
}

// German employees data
const germanEmployees = [
  {
    employeeId: "DE-001",
    name: "Hans Müller",
    email: "hans.mueller@grt.de",
    department: "Engineering",
    roleType: "office" as const,
    jurisdiction: "DE" as const,
    contractType: "full_time" as const,
    weeklyHoursLimit: 40,
    isExempt: 0,
    exemptionType: "none" as const,
    hireDate: "2020-03-15",
    timezone: "Europe/Berlin",
    isActive: 1,
  },
  {
    employeeId: "DE-002",
    name: "Anna Schmidt",
    email: "anna.schmidt@grt.de",
    department: "Sales",
    roleType: "field" as const,
    jurisdiction: "DE" as const,
    contractType: "full_time" as const,
    weeklyHoursLimit: 40,
    isExempt: 0,
    exemptionType: "none" as const,
    hireDate: "2019-07-01",
    timezone: "Europe/Berlin",
    isActive: 1,
  },
  {
    employeeId: "DE-003",
    name: "Klaus Weber",
    email: "klaus.weber@grt.de",
    department: "Project Management",
    roleType: "hybrid" as const,
    jurisdiction: "DE" as const,
    contractType: "full_time" as const,
    weeklyHoursLimit: 40,
    isExempt: 0,
    exemptionType: "none" as const,
    hireDate: "2018-01-10",
    timezone: "Europe/Berlin",
    isActive: 1,
  },
  {
    employeeId: "DE-004",
    name: "Maria Fischer",
    email: "maria.fischer@grt.de",
    department: "HR",
    roleType: "office" as const,
    jurisdiction: "DE" as const,
    contractType: "part_time" as const,
    weeklyHoursLimit: 30,
    isExempt: 0,
    exemptionType: "none" as const,
    hireDate: "2021-05-20",
    timezone: "Europe/Berlin",
    isActive: 1,
  },
  {
    employeeId: "DE-005",
    name: "Thomas Becker",
    email: "thomas.becker@grt.de",
    department: "Service",
    roleType: "field" as const,
    jurisdiction: "DE" as const,
    contractType: "full_time" as const,
    weeklyHoursLimit: 40,
    isExempt: 0,
    exemptionType: "none" as const,
    hireDate: "2017-09-01",
    timezone: "Europe/Berlin",
    isActive: 1,
  },
];

// US employees data
const usEmployees = [
  {
    employeeId: "US-001",
    name: "John Smith",
    email: "john.smith@grt.us",
    department: "Sales",
    roleType: "field" as const,
    jurisdiction: "US" as const,
    contractType: "full_time" as const,
    weeklyHoursLimit: 40,
    isExempt: 1,
    exemptionType: "outside_sales" as const,
    hireDate: "2019-02-01",
    timezone: "America/New_York",
    isActive: 1,
  },
  {
    employeeId: "US-002",
    name: "Emily Johnson",
    email: "emily.johnson@grt.us",
    department: "Engineering",
    roleType: "office" as const,
    jurisdiction: "US" as const,
    contractType: "full_time" as const,
    weeklyHoursLimit: 40,
    isExempt: 1,
    exemptionType: "professional" as const,
    hireDate: "2020-06-15",
    timezone: "America/Chicago",
    isActive: 1,
  },
  {
    employeeId: "US-003",
    name: "Michael Davis",
    email: "michael.davis@grt.us",
    department: "Service",
    roleType: "field" as const,
    jurisdiction: "US" as const,
    contractType: "full_time" as const,
    weeklyHoursLimit: 40,
    isExempt: 0,
    exemptionType: "none" as const,
    hireDate: "2018-11-20",
    timezone: "America/Los_Angeles",
    isActive: 1,
  },
  {
    employeeId: "US-004",
    name: "Sarah Wilson",
    email: "sarah.wilson@grt.us",
    department: "Project Management",
    roleType: "hybrid" as const,
    jurisdiction: "US" as const,
    contractType: "full_time" as const,
    weeklyHoursLimit: 40,
    isExempt: 1,
    exemptionType: "administrative" as const,
    hireDate: "2021-01-10",
    timezone: "America/New_York",
    isActive: 1,
  },
  {
    employeeId: "US-005",
    name: "Robert Brown",
    email: "robert.brown@grt.us",
    department: "IT",
    roleType: "office" as const,
    jurisdiction: "US" as const,
    contractType: "full_time" as const,
    weeklyHoursLimit: 40,
    isExempt: 1,
    exemptionType: "computer" as const,
    hireDate: "2019-08-05",
    timezone: "America/Denver",
    isActive: 1,
  },
];

// Generate time entries for an employee
function generateTimeEntries(employeeId: number, jurisdiction: "DE" | "US", includeViolations: boolean) {
  const entries: any[] = [];
  
  // Generate entries for the past 14 days
  for (let day = 0; day < 14; day++) {
    const dateStr = getDateString(day);
    const dayOfWeek = new Date(dateStr).getDay();
    
    // Skip weekends for most employees
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    
    // Normal work day
    let startTime = "08:00:00";
    let endTime = "17:00:00";
    let durationMinutes = 480; // 8 hours
    let complianceFlag: "OK" | "VIOLATION_10H_LIMIT" | "VIOLATION_REST_PERIOD" | "VIOLATION_WEEKLY_LIMIT" | "EXEMPTION_REVIEW" | "PENDING_APPROVAL" = "OK";
    let isOvertime = 0;
    
    // Add some violations for testing
    if (includeViolations) {
      if (day === 2 && jurisdiction === "DE") {
        // German 10-hour violation
        startTime = "06:00:00";
        endTime = "19:30:00";
        durationMinutes = 810; // 13.5 hours - exceeds 10-hour limit
        complianceFlag = "VIOLATION_10H_LIMIT";
        isOvertime = 1;
      } else if (day === 5 && jurisdiction === "DE") {
        // German rest period violation (worked too soon after previous day)
        startTime = "05:00:00";
        endTime = "14:00:00";
        durationMinutes = 540; // 9 hours
        complianceFlag = "VIOLATION_REST_PERIOD";
      } else if (day === 8 && jurisdiction === "US") {
        // US FLSA exemption review needed
        startTime = "07:00:00";
        endTime = "20:00:00";
        durationMinutes = 780; // 13 hours
        complianceFlag = "EXEMPTION_REVIEW";
        isOvertime = 1;
      } else if (day === 10) {
        // Overtime but compliant
        startTime = "07:30:00";
        endTime = "18:30:00";
        durationMinutes = 600; // 10 hours - at limit for Germany
        isOvertime = 1;
      }
    }
    
    entries.push({
      employeeId,
      date: dateStr,
      startTime,
      endTime,
      durationMinutes,
      activityCategory: "work" as const,
      jurisdiction,
      taskDescription: `Daily work tasks for ${dateStr}`,
      location: jurisdiction === "DE" ? "Berlin Office" : "New York Office",
      isRemote: day % 3 === 0 ? 1 : 0,
      complianceFlag,
      supervisorApproval: complianceFlag === "OK" ? "auto_approved" as const : "pending" as const,
      isOvertime,
      overtimeRate: isOvertime ? "1.5" : "1.0",
    });
    
    // Add travel time for field employees (some days)
    if (day % 4 === 0) {
      entries.push({
        employeeId,
        date: dateStr,
        startTime: "07:00:00",
        endTime: "08:00:00",
        durationMinutes: 60,
        activityCategory: "travel_paid" as const,
        jurisdiction,
        taskDescription: "Travel to customer site",
        location: "In transit",
        isRemote: 0,
        complianceFlag: "OK" as const,
        supervisorApproval: "auto_approved" as const,
        isOvertime: 0,
        overtimeRate: "1.0",
      });
    }
  }
  
  return entries;
}

// Generate compliance alerts
function generateAlerts(employeeId: number, jurisdiction: "DE" | "US", timeEntryId: number | null) {
  const alerts: any[] = [];
  
  if (jurisdiction === "DE") {
    // German 10-hour limit violation
    alerts.push({
      employeeId,
      timeEntryId,
      alertType: "DAILY_10H_LIMIT" as const,
      jurisdiction,
      severity: "critical" as const,
      description: "Employee exceeded the 10-hour daily work limit as per ArbZG §3.",
      legalReference: "ArbZG §3 - Maximum daily working time",
      recommendedAction: "Review work schedule and ensure compensatory rest time. Consider workload redistribution.",
      status: "open" as const,
      notificationSent: 1,
      notificationSentAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    });
    
    // Rest period violation
    alerts.push({
      employeeId,
      timeEntryId: null,
      alertType: "REST_PERIOD_11H" as const,
      jurisdiction,
      severity: "warning" as const,
      description: "Minimum 11-hour rest period between work days was not observed.",
      legalReference: "ArbZG §5 - Minimum rest period",
      recommendedAction: "Adjust next day start time to ensure 11-hour rest period compliance.",
      status: "acknowledged" as const,
      acknowledgedBy: 1,
      acknowledgedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      notificationSent: 1,
      notificationSentAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    });
  } else {
    // US FLSA exemption review
    alerts.push({
      employeeId,
      timeEntryId,
      alertType: "FLSA_EXEMPTION_REVIEW" as const,
      jurisdiction,
      severity: "warning" as const,
      description: "Outside sales exemption status requires periodic review. Employee worked significant overtime.",
      legalReference: "FLSA 29 U.S.C. §213(a)(1) - Outside Sales Exemption",
      recommendedAction: "Verify that employee still meets outside sales exemption criteria: primary duty is making sales, customarily works away from employer's place of business.",
      status: "open" as const,
      notificationSent: 1,
      notificationSentAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    });
    
    // Overtime threshold alert
    alerts.push({
      employeeId,
      timeEntryId: null,
      alertType: "OVERTIME_THRESHOLD" as const,
      jurisdiction,
      severity: "info" as const,
      description: "Employee approaching weekly overtime threshold. Current week: 45 hours.",
      legalReference: "FLSA 29 U.S.C. §207 - Overtime compensation",
      recommendedAction: "Monitor remaining work hours for the week. Ensure proper overtime compensation if applicable.",
      status: "resolved" as const,
      resolvedBy: 1,
      resolvedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      resolutionNotes: "Overtime approved by manager. Compensation calculated correctly.",
      notificationSent: 1,
      notificationSentAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    });
  }
  
  return alerts;
}

// Generate weekly compliance summaries
function generateWeeklySummaries(employeeId: number, jurisdiction: "DE" | "US") {
  const summaries: any[] = [];
  
  // Generate summaries for the past 4 weeks
  for (let week = 0; week < 4; week++) {
    const weekStart = getWeekStartDate(week * 7);
    const weekEnd = getWeekEndDate(week * 7);
    
    const isViolationWeek = week === 1; // Second week has violations
    
    summaries.push({
      employeeId,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      jurisdiction,
      totalWorkMinutes: isViolationWeek ? 2880 : 2400, // 48 hours vs 40 hours
      totalTravelPaidMinutes: 120,
      totalOvertimeMinutes: isViolationWeek ? 480 : 0,
      daysWorked: 5,
      maxDailyMinutes: isViolationWeek ? 660 : 540, // 11 hours vs 9 hours
      restPeriodViolations: isViolationWeek && jurisdiction === "DE" ? 1 : 0,
      exemptionStatus: jurisdiction === "US" ? "exempt" as const : "non_exempt" as const,
      exemptionCriteriaMet: jurisdiction === "US" ? 1 : 0,
      primaryDutyPercentage: jurisdiction === "US" ? "85.00" : null,
      overallComplianceStatus: isViolationWeek ? "warning" as const : "compliant" as const,
      reviewedBy: week > 1 ? 1 : null,
      reviewedAt: week > 1 ? new Date().toISOString().replace('T', ' ').substring(0, 19) : null,
      reviewNotes: week > 1 ? "Weekly review completed. No issues found." : null,
    });
  }
  
  return summaries;
}

// Main seed function
export async function seedComplianceData() {
  console.log("Starting compliance data seeding...");
  
  const db = await requireDb();
  if (!db) {
    console.error("Database not available");
    return { success: false, error: "Database not available" };
  }
  
  try {
    // Clear existing data
    console.log("Clearing existing compliance data...");
    await db.delete(grtWeeklyComplianceSummary);
    await db.delete(grtComplianceAlerts);
    await db.delete(grtTimeEntries);
    await db.delete(grtEmployees);
    
    // Insert German employees
    console.log("Inserting German employees...");
    const insertedDeEmployees: number[] = [];
    for (const emp of germanEmployees) {
      const result = await db.insert(grtEmployees).values(emp);
      insertedDeEmployees.push(Number(result[0].insertId));
    }
    console.log(`Inserted ${insertedDeEmployees.length} German employees`);
    
    // Insert US employees
    console.log("Inserting US employees...");
    const insertedUsEmployees: number[] = [];
    for (const emp of usEmployees) {
      const result = await db.insert(grtEmployees).values(emp);
      insertedUsEmployees.push(Number(result[0].insertId));
    }
    console.log(`Inserted ${insertedUsEmployees.length} US employees`);
    
    // Insert time entries for German employees
    console.log("Inserting time entries for German employees...");
    let deTimeEntryCount = 0;
    let firstDeViolationEntryId: number | null = null;
    for (let i = 0; i < insertedDeEmployees.length; i++) {
      const empId = insertedDeEmployees[i];
      const includeViolations = i < 2; // First 2 German employees have violations
      const entries = generateTimeEntries(empId, "DE", includeViolations);
      
      for (const entry of entries) {
        const result = await db.insert(grtTimeEntries).values(entry);
        deTimeEntryCount++;
        
        // Track first violation entry for alerts
        if (entry.complianceFlag !== "OK" && !firstDeViolationEntryId) {
          firstDeViolationEntryId = Number(result[0].insertId);
        }
      }
    }
    console.log(`Inserted ${deTimeEntryCount} time entries for German employees`);
    
    // Insert time entries for US employees
    console.log("Inserting time entries for US employees...");
    let usTimeEntryCount = 0;
    let firstUsViolationEntryId: number | null = null;
    for (let i = 0; i < insertedUsEmployees.length; i++) {
      const empId = insertedUsEmployees[i];
      const includeViolations = i < 2; // First 2 US employees have violations
      const entries = generateTimeEntries(empId, "US", includeViolations);
      
      for (const entry of entries) {
        const result = await db.insert(grtTimeEntries).values(entry);
        usTimeEntryCount++;
        
        // Track first violation entry for alerts
        if (entry.complianceFlag !== "OK" && !firstUsViolationEntryId) {
          firstUsViolationEntryId = Number(result[0].insertId);
        }
      }
    }
    console.log(`Inserted ${usTimeEntryCount} time entries for US employees`);
    
    // Insert compliance alerts for German employees with violations
    console.log("Inserting compliance alerts for German employees...");
    let deAlertCount = 0;
    for (let i = 0; i < 2; i++) {
      const empId = insertedDeEmployees[i];
      const alerts = generateAlerts(empId, "DE", firstDeViolationEntryId);
      
      for (const alert of alerts) {
        await db.insert(grtComplianceAlerts).values(alert);
        deAlertCount++;
      }
    }
    console.log(`Inserted ${deAlertCount} alerts for German employees`);
    
    // Insert compliance alerts for US employees with violations
    console.log("Inserting compliance alerts for US employees...");
    let usAlertCount = 0;
    for (let i = 0; i < 2; i++) {
      const empId = insertedUsEmployees[i];
      const alerts = generateAlerts(empId, "US", firstUsViolationEntryId);
      
      for (const alert of alerts) {
        await db.insert(grtComplianceAlerts).values(alert);
        usAlertCount++;
      }
    }
    console.log(`Inserted ${usAlertCount} alerts for US employees`);
    
    // Insert weekly compliance summaries
    console.log("Inserting weekly compliance summaries...");
    let summaryCount = 0;
    for (const empId of [...insertedDeEmployees, ...insertedUsEmployees]) {
      const jurisdiction = insertedDeEmployees.includes(empId) ? "DE" : "US";
      const summaries = generateWeeklySummaries(empId, jurisdiction as "DE" | "US");
      
      for (const summary of summaries) {
        await db.insert(grtWeeklyComplianceSummary).values(summary);
        summaryCount++;
      }
    }
    console.log(`Inserted ${summaryCount} weekly compliance summaries`);
    
    console.log("\n=== Compliance Data Seeding Complete ===");
    console.log(`Total employees: ${insertedDeEmployees.length + insertedUsEmployees.length}`);
    console.log(`  - German (DE): ${insertedDeEmployees.length}`);
    console.log(`  - US: ${insertedUsEmployees.length}`);
    console.log(`Total time entries: ${deTimeEntryCount + usTimeEntryCount}`);
    console.log(`Total alerts: ${deAlertCount + usAlertCount}`);
    console.log(`Total weekly summaries: ${summaryCount}`);
    
    return {
      success: true,
      stats: {
        employees: {
          de: insertedDeEmployees.length,
          us: insertedUsEmployees.length,
          total: insertedDeEmployees.length + insertedUsEmployees.length,
        },
        timeEntries: {
          de: deTimeEntryCount,
          us: usTimeEntryCount,
          total: deTimeEntryCount + usTimeEntryCount,
        },
        alerts: {
          de: deAlertCount,
          us: usAlertCount,
          total: deAlertCount + usAlertCount,
        },
        weeklySummaries: summaryCount,
      },
    };
  } catch (error) {
    console.error("Error seeding compliance data:", error);
    throw error;
  }
}

// Export for use in API routes
export default seedComplianceData;
