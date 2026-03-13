/**
 * useRobotControl — Real-time robot cleaning monitoring + adaptive control hook.
 *
 * Provides polling-based state, KPI computation, adaptive adjustment logic,
 * and auto-alert on over-torque (>15Nm).
 */
import { useState, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { withRetry } from "@/lib/withRetry";
import { useToast } from "@/hooks/use-toast";

export interface RobotControlConfig {
  robotCode: string;
  projectId?: number;
  pollIntervalMs?: number;
  torqueUpperLimitNm?: number;
  adaptiveEnabled?: boolean;
}

export interface RobotAlert {
  id: string;
  type: "torque" | "cleanliness" | "adaptive";
  message: string;
  timestamp: string;
  severity: "warning" | "critical";
}

export function useRobotControl(config: RobotControlConfig) {
  const {
    robotCode,
    projectId,
    pollIntervalMs = 2000,
    torqueUpperLimitNm = 15,
    adaptiveEnabled = true,
  } = config;

  const { toast } = useToast();
  const [alerts, setAlerts] = useState<RobotAlert[]>([]);
  const [isPolling, setIsPolling] = useState(true);
  const [adaptiveIteration, setAdaptiveIteration] = useState(0);
  const [lastAdjustment, setLastAdjustment] = useState<{ pressureDelta: number; angleDelta: number } | null>(null);

  // ── Polling queries ──

  const realtimeFeed = trpc.robotCleaning.robotCleaning.getRealtimeFeed.useQuery(
    { robotCode, limit: 20 },
    { refetchInterval: isPolling ? pollIntervalMs : false, enabled: isPolling },
  );

  const torqueList = trpc.robotCleaning.oilingTorque.list.useQuery(
    { robotCode, limit: 20 },
    { refetchInterval: isPolling ? pollIntervalMs : false, enabled: isPolling },
  );

  const stats = trpc.robotCleaning.robotCleaning.getStats.useQuery(
    { robotCode, projectId },
    { refetchInterval: isPolling ? pollIntervalMs * 2 : false, enabled: isPolling },
  );

  // ── Mutations ──

  const recordCleaningMut = trpc.robotCleaning.robotCleaning.record.useMutation();
  const recordAdaptiveMut = trpc.robotCleaning.robotCleaning.recordAdaptive.useMutation();
  const recordTorqueMut = trpc.robotCleaning.oilingTorque.record.useMutation();
  const recordPerfMut = trpc.robotCleaning.techPerformance.record.useMutation();

  // ── Computed KPIs ──

  const latestActions = realtimeFeed.data ?? [];
  const latestTorqueRecords = torqueList.data?.items ?? [];

  const kpis = useMemo(() => {
    const latest = latestActions[0];
    return {
      currentPressure: latest ? Number(latest.pressureBar ?? 0) : 0,
      currentAngle: latest ? Number(latest.nozzleAngleDeg ?? 0) : 0,
      currentCleanliness: latest ? Number(latest.cleanlinessAfterMg ?? 0) : 0,
      passRate: stats.data?.passRate ?? 0,
      avgCycleTime:
        latestActions.length > 0
          ? latestActions.reduce((sum, a) => sum + Number(a.cycleTimeSeconds ?? 0), 0) / latestActions.length
          : 0,
    };
  }, [latestActions, stats.data]);

  const hasTorqueAlert = latestTorqueRecords.some((r) => r.isOverTorque);
  const hasCleanlinessAlert = latestActions.some((a) => a.hasAlert);

  // ── Actions ──

  const addAlert = useCallback(
    (type: RobotAlert["type"], message: string, severity: RobotAlert["severity"]) => {
      const alert: RobotAlert = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type,
        message,
        timestamp: new Date().toISOString(),
        severity,
      };
      setAlerts((prev) => [alert, ...prev].slice(0, 50));
      return alert;
    },
    [],
  );

  const recordCleaningAction = useCallback(
    async (params: {
      pressureBar?: number;
      nozzleAngleDeg?: number;
      flowRateLpm?: number;
      cleanlinessBeforeMg?: number;
      cleanlinessAfterMg?: number;
      cycleTimeSeconds?: number;
      stationCode?: string;
    }) => {
      const result = await withRetry(() =>
        recordCleaningMut.mutateAsync({
          robotCode,
          projectId,
          ...params,
        }),
      );
      // Check for cleanliness alert
      if (result.hasAlert) {
        const msg = `Cleanliness FAIL: ${params.cleanlinessAfterMg}mg (limit: 5.0mg)`;
        addAlert("cleanliness", msg, "warning");
        toast({ variant: "destructive", title: "Cleanliness Alert", description: msg });
      }
      return result;
    },
    [robotCode, projectId, recordCleaningMut, addAlert, toast],
  );

  const recordOilingTorque = useCallback(
    async (params: {
      actualTorqueNm: number;
      targetTorqueNm?: number;
      oilType?: string;
      applicationPoint?: string;
      oilVolumeMl?: number;
      stationCode?: string;
    }) => {
      const result = await withRetry(() =>
        recordTorqueMut.mutateAsync({
          robotCode,
          projectId,
          torqueUpperLimitNm,
          ...params,
        }),
      );
      // Auto-alert when > 15Nm
      if (result.alertTriggered) {
        const msg = `Over-torque: ${params.actualTorqueNm}Nm > ${torqueUpperLimitNm}Nm`;
        addAlert("torque", msg, "critical");
        toast({ variant: "destructive", title: "Torque Alert", description: msg });
      }
      return result;
    },
    [robotCode, projectId, torqueUpperLimitNm, recordTorqueMut, addAlert, toast],
  );

  const triggerAdaptiveAdjustment = useCallback(
    async (reading: { cleanlinessAfterMg: number; currentPressure: number; currentAngle: number }) => {
      if (!adaptiveEnabled) return null;
      const gap = reading.cleanlinessAfterMg - 5.0; // target = 5.0mg
      if (gap <= 0) return null; // Already passing

      const iteration = adaptiveIteration + 1;
      // +0.5bar per iteration, capped at 6.0bar total
      const pressureDelta = Math.min(0.5, 6.0 - reading.currentPressure);
      // +5deg per iteration, capped at 70deg total
      const angleDelta = Math.min(5, 70 - reading.currentAngle);

      const newPressure = reading.currentPressure + pressureDelta;
      const newAngle = reading.currentAngle + angleDelta;

      const result = await withRetry(() =>
        recordAdaptiveMut.mutateAsync({
          robotCode,
          projectId,
          pressureBar: newPressure,
          nozzleAngleDeg: newAngle,
          cleanlinessAfterMg: reading.cleanlinessAfterMg,
          iteration,
          pressureDelta,
          angleDelta,
          reason: `Gap=${gap.toFixed(1)}mg, iter=${iteration}`,
        }),
      );

      setAdaptiveIteration(iteration);
      setLastAdjustment({ pressureDelta, angleDelta });

      if (result.hasAlert) {
        addAlert("adaptive", `Adaptive #${iteration} still failing: ${reading.cleanlinessAfterMg}mg`, "warning");
      }
      return { result, pressureDelta, angleDelta, iteration };
    },
    [adaptiveEnabled, adaptiveIteration, robotCode, projectId, recordAdaptiveMut, addAlert],
  );

  const recordPerformance = useCallback(
    async (params: {
      entryType: string;
      cycleTimeSeconds: number;
      qualityPass: boolean;
      standardCycleTimeSeconds?: number;
      cleanlinessScore?: number;
      workDate?: string;
      shiftCode?: string;
    }) => {
      return withRetry(() =>
        recordPerfMut.mutateAsync({
          projectId,
          ...params,
        }),
      );
    },
    [projectId, recordPerfMut],
  );

  const startPolling = useCallback(() => setIsPolling(true), []);
  const stopPolling = useCallback(() => setIsPolling(false), []);
  const clearAlerts = useCallback(() => setAlerts([]), []);

  return {
    // Data
    latestActions,
    latestTorqueRecords,
    kpis,
    alerts,

    // Alert state
    hasTorqueAlert,
    hasCleanlinessAlert,

    // Adaptive state
    adaptiveIteration,
    lastAdjustment,

    // Loading
    isLoading: realtimeFeed.isLoading || torqueList.isLoading,
    isPolling,

    // Actions
    recordCleaningAction,
    recordOilingTorque,
    triggerAdaptiveAdjustment,
    recordPerformance,
    startPolling,
    stopPolling,
    clearAlerts,
  };
}
