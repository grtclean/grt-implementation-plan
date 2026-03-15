import React, { useState, useEffect, useRef } from "react";
import { Rocket, CheckCircle2, Loader2, PlayCircle, AlertCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";

interface BatchDef {
  id: 1 | 2 | 3;
  label: string;
  labelEn: string;
  count: number;
  sandboxes: string[];
  mutationKey: "launchBatch1" | "launchBatch2" | "launchBatch3";
}

const BATCHES: BatchDef[] = [
  {
    id: 1,
    label: "核心流程 (项目→HR→排产→绩效→薪酬)",
    labelEn: "Core Flow",
    count: 5,
    sandboxes: ["project-lifecycle", "hr-lifecycle", "production-scheduling", "performance-points", "payroll-attendance"],
    mutationKey: "launchBatch1",
  },
  {
    id: 2,
    label: "战略配置 (规划→报价→客户→机械→电气)",
    labelEn: "Strategy Config",
    count: 5,
    sandboxes: ["annual-planning", "quoting-bom", "customer-config", "mechanical-standards", "electrical-standards"],
    mutationKey: "launchBatch2",
  },
  {
    id: 3,
    label: "交付闭环 (验收→现场→AI孪生)",
    labelEn: "Delivery Loop",
    count: 3,
    sandboxes: ["acceptance-tracking", "site-delivery", "ai-process-twin"],
    mutationKey: "launchBatch3",
  },
];

export default function SandboxScenarioLauncher() {
  const { toast } = useToast();
  const [runningBatch, setRunningBatch] = useState<number | null>(null);
  const [completedBatches, setCompletedBatches] = useState<Set<number>>(() => new Set());

  const statusQuery = trpc.scenarioInit.getStatus.useQuery(undefined, {
    refetchInterval: runningBatch ? 3000 : false,
  });

  const batch1 = trpc.scenarioInit.launchBatch1.useMutation({
    onSuccess: (data) => handleSuccess(1, data),
    onError: (err) => handleError(1, err.message),
  });
  const batch2 = trpc.scenarioInit.launchBatch2.useMutation({
    onSuccess: (data) => handleSuccess(2, data),
    onError: (err) => handleError(2, err.message),
  });
  const batch3 = trpc.scenarioInit.launchBatch3.useMutation({
    onSuccess: (data) => handleSuccess(3, data),
    onError: (err) => handleError(3, err.message),
  });

  const mutations = { launchBatch1: batch1, launchBatch2: batch2, launchBatch3: batch3 };

  function handleSuccess(batchId: number, data: { initialized: number; skipped: number }) {
    setRunningBatch(null);
    setCompletedBatches((prev) => new Set(prev).add(batchId));
    statusQuery.refetch();
    toast({
      title: `批次 ${batchId} 完成`,
      description: `初始化 ${data.initialized} 个沙盘，跳过 ${data.skipped} 个（已存在）`,
    });
  }

  function handleError(batchId: number, msg: string) {
    setRunningBatch(null);
    toast({ title: `批次 ${batchId} 失败`, description: msg, variant: "destructive" });
  }

  function launchBatch(batch: BatchDef) {
    setRunningBatch(batch.id);
    mutations[batch.mutationKey].mutate();
  }

  function launchAll() {
    // Launch sequentially: batch 1 → 2 → 3
    setRunningBatch(1);
    batch1.mutate(undefined, {
      onSuccess: (d1) => {
        handleSuccess(1, d1);
        setRunningBatch(2);
        batch2.mutate(undefined, {
          onSuccess: (d2) => {
            handleSuccess(2, d2);
            setRunningBatch(3);
            batch3.mutate();
          },
        });
      },
    });
  }

  const initializedSet = new Set(statusQuery.data?.initialized ?? []);
  const totalInitialized = initializedSet.size;
  const isFirstLoad = statusQuery.data && totalInitialized === 0;

  // Auto-init prompt: show prominent CTA when zero sandboxes initialized
  if (isFirstLoad && runningBatch === null) {
    return (
      <div className="rounded-xl border-2 border-dashed border-cyan-500/40 bg-gradient-to-r from-cyan-500/5 via-[#0a0d14] to-purple-500/5 p-6 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Zap className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-200">系统尚未注入场景数据</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                点击下方按钮一键初始化全部13个沙盘的业务场景数据，含项目、HR、排产、客户、报价等
              </p>
            </div>
          </div>
          <Button
            size="lg"
            className="gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-6"
            onClick={launchAll}
          >
            <Rocket className="h-4 w-4" />
            一键初始化全部沙盘 (13)
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-[#0a0d14] p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Rocket className="h-4 w-4 text-cyan-400" />
        <h2 className="text-sm font-bold text-gray-200">场景数据注入 Scenario Launcher</h2>
        <span className="text-[10px] text-gray-600 ml-1">一键注入真实业务场景数据</span>
        <div className="ml-auto">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[10px] gap-1 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
            onClick={launchAll}
            disabled={runningBatch !== null}
          >
            <PlayCircle className="h-3 w-3" />
            Launch All (13)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {BATCHES.map((batch) => {
          const isRunning = runningBatch === batch.id;
          const isCompleted = completedBatches.has(batch.id);
          const batchInitCount = batch.sandboxes.filter((s) => initializedSet.has(s)).length;

          return (
            <div
              key={batch.id}
              className={`rounded-lg border p-3 transition-all ${
                isCompleted
                  ? "border-green-500/30 bg-green-500/5"
                  : isRunning
                  ? "border-cyan-500/30 bg-cyan-500/5"
                  : "border-gray-800 bg-[#0d1117]"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-gray-300">Batch {batch.id}</span>
                  <span className="text-[10px] text-gray-600">({batch.count})</span>
                </div>
                {isCompleted && <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />}
                {isRunning && <Loader2 className="h-3.5 w-3.5 text-cyan-400 animate-spin" />}
              </div>
              <p className="text-[10px] text-gray-500 mb-2">{batch.label}</p>

              {/* Sandbox status dots */}
              <div className="flex gap-1 mb-2 flex-wrap">
                {batch.sandboxes.map((s) => (
                  <span
                    key={s}
                    className={`h-2 w-2 rounded-full ${
                      initializedSet.has(s)
                        ? "bg-green-500 shadow-sm shadow-green-500/30"
                        : "bg-gray-700"
                    }`}
                    title={s}
                  />
                ))}
                <span className="text-[9px] text-gray-600 ml-1">{batchInitCount}/{batch.count}</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full h-6 text-[10px] gap-1 border-gray-700 text-gray-400 hover:text-gray-200"
                onClick={() => launchBatch(batch)}
                disabled={runningBatch !== null}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    初始化中...
                  </>
                ) : isCompleted ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    已完成
                  </>
                ) : (
                  <>
                    <Rocket className="h-3 w-3" />
                    Start Batch {batch.id}
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>

      {statusQuery.data && statusQuery.data.initialized.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-gray-600">
          <AlertCircle className="h-3 w-3" />
          已初始化: {statusQuery.data.initialized.join(", ")} ({statusQuery.data.initialized.length}/13)
        </div>
      )}
    </div>
  );
}
