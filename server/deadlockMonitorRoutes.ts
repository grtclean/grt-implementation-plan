/**
 * Deadlock Monitor Routes
 * State management and record keeping for deadlock detection
 */

interface MonitorState {
  isRunning: boolean;
  lastCheckTime: string;
  totalChecks: number;
}

interface DeadlockRecord {
  id: string;
  detectedAt: string;
  resolvedAt: string | null;
  cycleNodes: string[];
  severity: "low" | "medium" | "high" | "critical";
  resolution: string | null;
  autoResolved: boolean;
}

let monitorState: MonitorState = {
  isRunning: false,
  lastCheckTime: "",
  totalChecks: 0,
};

const deadlockRecords: DeadlockRecord[] = [];
const MAX_RECORDS = 100;

export function updateMonitorState(state: Partial<MonitorState>): void {
  monitorState = { ...monitorState, ...state };
}

export function addDeadlockRecord(record: DeadlockRecord): void {
  deadlockRecords.unshift(record);
  if (deadlockRecords.length > MAX_RECORDS) {
    deadlockRecords.splice(MAX_RECORDS);
  }
}

export function getMonitorState(): MonitorState {
  return { ...monitorState };
}

export function getDeadlockRecords(): DeadlockRecord[] {
  return [...deadlockRecords];
}
