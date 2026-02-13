/**
 * Compliance Scheduler
 * Manages scheduled compliance checks for German daily and US weekly regulations
 */

import {
  runGermanDailyCheck,
  runUSWeeklyCheck,
} from "../services/scheduled-compliance-check.service";

interface ExecutionLog {
  taskName: string;
  status: "completed" | "failed";
  executedAt: string;
  result?: any;
  error?: string;
}

interface SchedulerInfo {
  running: boolean;
  nextExecution?: string;
  intervalId?: ReturnType<typeof setInterval>;
}

interface SchedulerStatus {
  germanDaily: { running: boolean; nextExecution?: string };
  usWeekly: { running: boolean; nextExecution?: string };
}

const executionLogs: ExecutionLog[] = [];
const MAX_LOGS = 100;

const schedulers: {
  germanDaily: SchedulerInfo;
  usWeekly: SchedulerInfo;
} = {
  germanDaily: { running: false },
  usWeekly: { running: false },
};

function addLog(log: ExecutionLog): void {
  executionLogs.push(log);
  if (executionLogs.length > MAX_LOGS) {
    executionLogs.splice(0, executionLogs.length - MAX_LOGS);
  }
}

export async function executeGermanDailyCheck(): Promise<{
  success: boolean;
  result: any;
}> {
  try {
    const result = await runGermanDailyCheck();
    addLog({
      taskName: "GermanDailyCheck",
      status: "completed",
      executedAt: new Date().toISOString(),
      result,
    });
    return { success: true, result };
  } catch (error: any) {
    addLog({
      taskName: "GermanDailyCheck",
      status: "failed",
      executedAt: new Date().toISOString(),
      error: error.message,
    });
    return { success: false, result: null };
  }
}

export async function executeUSWeeklyCheck(): Promise<{
  success: boolean;
  result: any;
}> {
  try {
    const result = await runUSWeeklyCheck();
    addLog({
      taskName: "USWeeklyCheck",
      status: "completed",
      executedAt: new Date().toISOString(),
      result,
    });
    return { success: true, result };
  } catch (error: any) {
    addLog({
      taskName: "USWeeklyCheck",
      status: "failed",
      executedAt: new Date().toISOString(),
      error: error.message,
    });
    return { success: false, result: null };
  }
}

export function getExecutionLogs(): ExecutionLog[] {
  return [...executionLogs];
}

export function getSchedulerStatus(): SchedulerStatus {
  return {
    germanDaily: {
      running: schedulers.germanDaily.running,
      nextExecution: schedulers.germanDaily.nextExecution,
    },
    usWeekly: {
      running: schedulers.usWeekly.running,
      nextExecution: schedulers.usWeekly.nextExecution,
    },
  };
}

export function startGermanDailyScheduler(): void {
  if (schedulers.germanDaily.running) return;

  const now = new Date();
  const nextExecution = new Date(now);
  nextExecution.setDate(nextExecution.getDate() + 1);
  nextExecution.setHours(6, 0, 0, 0);

  schedulers.germanDaily.running = true;
  schedulers.germanDaily.nextExecution = nextExecution.toISOString();
  schedulers.germanDaily.intervalId = setInterval(async () => {
    await executeGermanDailyCheck();
    const next = new Date();
    next.setDate(next.getDate() + 1);
    next.setHours(6, 0, 0, 0);
    schedulers.germanDaily.nextExecution = next.toISOString();
  }, 24 * 60 * 60 * 1000);
}

export function startUSWeeklyScheduler(): void {
  if (schedulers.usWeekly.running) return;

  const now = new Date();
  const nextExecution = new Date(now);
  const daysUntilMonday = (8 - nextExecution.getDay()) % 7 || 7;
  nextExecution.setDate(nextExecution.getDate() + daysUntilMonday);
  nextExecution.setHours(9, 0, 0, 0);

  schedulers.usWeekly.running = true;
  schedulers.usWeekly.nextExecution = nextExecution.toISOString();
  schedulers.usWeekly.intervalId = setInterval(async () => {
    await executeUSWeeklyCheck();
    const next = new Date();
    next.setDate(next.getDate() + 7);
    next.setHours(9, 0, 0, 0);
    schedulers.usWeekly.nextExecution = next.toISOString();
  }, 7 * 24 * 60 * 60 * 1000);
}

export function stopAllSchedulers(): void {
  if (schedulers.germanDaily.intervalId) {
    clearInterval(schedulers.germanDaily.intervalId);
  }
  schedulers.germanDaily.running = false;
  schedulers.germanDaily.nextExecution = undefined;
  schedulers.germanDaily.intervalId = undefined;

  if (schedulers.usWeekly.intervalId) {
    clearInterval(schedulers.usWeekly.intervalId);
  }
  schedulers.usWeekly.running = false;
  schedulers.usWeekly.nextExecution = undefined;
  schedulers.usWeekly.intervalId = undefined;
}
