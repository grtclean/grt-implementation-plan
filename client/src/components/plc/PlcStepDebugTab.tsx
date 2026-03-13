/**
 * PLC Step Debug Tab — Step-by-step simulation & parameter tuning
 *
 * Left: Station selector + step decomposition list
 * Center: Step execution visualization (current step, motor/sensor states)
 * Right: Adjustable parameters + PID tuning
 */

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Play, Pause, SkipForward, RotateCcw, StopCircle,
  Activity, Gauge, Thermometer, Zap, Timer, AlertTriangle,
  CheckCircle, Circle, ChevronRight,
} from "lucide-react";

interface PlcStepDebugTabProps {
  projectId: number;
}

export default function PlcStepDebugTab({ projectId }: PlcStepDebugTabProps) {
  const [selectedStation, setSelectedStation] = useState<string>("");
  const [simMode, setSimMode] = useState<"idle" | "running" | "paused" | "completed">("idle");
  const [currentMicroStep, setCurrentMicroStep] = useState(0);
  const [stepElapsed, setStepElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const decomp = trpc.designEngine.stepDecomposeProject.useQuery({ projectId });

  const stationData = useMemo(() => {
    if (!decomp.data || !selectedStation) return null;
    return decomp.data.stations.find(s => s.stationCode === selectedStation);
  }, [decomp.data, selectedStation]);

  // Auto-select first station
  useEffect(() => {
    if (decomp.data?.stations?.length && !selectedStation) {
      setSelectedStation(decomp.data.stations[0].stationCode);
    }
  }, [decomp.data, selectedStation]);

  // Simulation timer
  useEffect(() => {
    if (simMode === "running" && stationData) {
      timerRef.current = setInterval(() => {
        setStepElapsed(prev => {
          const step = stationData.steps[currentMicroStep];
          if (!step) { setSimMode("completed"); return prev; }
          if (step.type === "timer" && step.duration > 0) {
            if (prev + 0.1 >= step.duration) {
              // Advance to next step
              setCurrentMicroStep(ms => {
                if (ms + 1 >= stationData.steps.length) {
                  setSimMode("completed");
                  return ms;
                }
                return ms + 1;
              });
              return 0;
            }
            return prev + 0.1;
          }
          // Instant steps — advance after brief pause
          if (prev + 0.1 >= 0.3) {
            setCurrentMicroStep(ms => {
              if (ms + 1 >= stationData.steps.length) {
                setSimMode("completed");
                return ms;
              }
              return ms + 1;
            });
            return 0;
          }
          return prev + 0.1;
        });
      }, 100);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [simMode, currentMicroStep, stationData]);

  const handlePlay = useCallback(() => setSimMode("running"), []);
  const handlePause = useCallback(() => setSimMode("paused"), []);
  const handleStep = useCallback(() => {
    if (!stationData) return;
    setCurrentMicroStep(ms => Math.min(ms + 1, stationData.steps.length - 1));
    setStepElapsed(0);
  }, [stationData]);
  const handleReset = useCallback(() => {
    setSimMode("idle");
    setCurrentMicroStep(0);
    setStepElapsed(0);
  }, []);

  if (decomp.isLoading) return <Skeleton className="h-96" />;
  if (!decomp.data?.stations?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Activity className="h-12 w-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">需先创建工位才能使用步骤调试</p>
      </div>
    );
  }

  const currentStep = stationData?.steps[currentMicroStep];
  const progress = stationData ? Math.round((currentMicroStep / Math.max(stationData.steps.length - 1, 1)) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Top: Station selector + controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Select value={selectedStation} onValueChange={(v) => { setSelectedStation(v); handleReset(); }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="选择工位" />
            </SelectTrigger>
            <SelectContent>
              {decomp.data.stations.map(s => (
                <SelectItem key={s.stationCode} value={s.stationCode}>
                  {s.stationCode}: {s.stationName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {stationData && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Badge variant="outline">{stationData.stationType}</Badge>
              <span>{stationData.motorCount}电机</span>
              <span>{stationData.sensorCount}传感器</span>
              <span>总时间: {stationData.totalDuration}s</span>
            </div>
          )}
        </div>

        {/* Simulation controls */}
        <div className="flex items-center gap-1">
          <Badge variant={simMode === "running" ? "default" : simMode === "completed" ? "secondary" : "outline"} className="mr-2">
            {simMode === "idle" ? "就绪" : simMode === "running" ? "运行中" : simMode === "paused" ? "暂停" : "已完成"}
          </Badge>
          <Button size="sm" variant="outline" onClick={handleReset} disabled={simMode === "idle"}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          {simMode === "running" ? (
            <Button size="sm" onClick={handlePause}>
              <Pause className="h-3.5 w-3.5 mr-1" /> 暂停
            </Button>
          ) : (
            <Button size="sm" onClick={handlePlay} disabled={simMode === "completed"}>
              <Play className="h-3.5 w-3.5 mr-1" /> {simMode === "idle" ? "开始模拟" : "继续"}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleStep} disabled={simMode === "running" || simMode === "completed"}>
            <SkipForward className="h-3.5 w-3.5 mr-1" /> 单步
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Step list */}
        <div className="lg:col-span-3">
          <Card className="h-[550px] overflow-y-auto">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm flex items-center gap-1">
                <Timer className="h-4 w-4" />
                步骤分解
                {stationData && <Badge variant="secondary" className="ml-auto text-[9px]">{stationData.steps.length}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-1">
              {stationData?.steps.map((step, idx) => {
                const isCurrent = idx === currentMicroStep;
                const isDone = idx < currentMicroStep;
                const isTimer = step.type === "timer";
                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-1 px-2 py-1 text-xs rounded cursor-pointer hover:bg-accent ${isCurrent ? "bg-green-100 dark:bg-green-950 font-medium" : ""}`}
                    onClick={() => { setCurrentMicroStep(idx); setStepElapsed(0); }}
                  >
                    {isDone ? (
                      <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                    ) : isCurrent ? (
                      <ChevronRight className="h-3 w-3 text-green-600 shrink-0 animate-pulse" />
                    ) : (
                      <Circle className="h-3 w-3 text-muted-foreground shrink-0" />
                    )}
                    <span className="truncate flex-1">{step.nameZh}</span>
                    {isTimer && (
                      <Badge variant="outline" className="text-[9px] px-1">
                        {step.duration}s
                      </Badge>
                    )}
                    {step.parameterizable && (
                      <Gauge className="h-3 w-3 text-blue-500 shrink-0" />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Center: Execution visualization */}
        <div className="lg:col-span-6">
          <Card className="h-[550px]">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm flex items-center gap-1">
                <Activity className="h-4 w-4" />
                {currentStep ? `Step ${currentStep.stepNumber}: ${currentStep.nameZh}` : "选择工位开始调试"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-4">
              {/* Current step detail */}
              {currentStep && (
                <div className="space-y-3">
                  {/* Step timer visualization */}
                  {currentStep.type === "timer" && currentStep.duration > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">步骤计时</span>
                        <span className="font-mono">{stepElapsed.toFixed(1)}s / {currentStep.duration}s</span>
                      </div>
                      <div className="w-full h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all"
                          style={{ width: `${Math.min((stepElapsed / currentStep.duration) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Actions in current step */}
                  {currentStep.actions.length > 0 && (
                    <div className="space-y-1">
                      <h4 className="text-xs font-semibold text-muted-foreground">动作</h4>
                      {currentStep.actions.map((a, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1">
                          <Zap className="h-3 w-3 text-amber-500" />
                          <span>{a.type}</span>
                          <span className="font-mono text-muted-foreground">{a.target}</span>
                          {a.value !== undefined && <Badge variant="outline" className="text-[9px]">{String(a.value)}</Badge>}
                          {a.comment && <span className="text-muted-foreground ml-auto">{a.comment}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Adjustable parameters */}
                  {currentStep.adjustableParams && currentStep.adjustableParams.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-blue-600 flex items-center gap-1">
                        <Gauge className="h-3 w-3" /> 可调参数
                      </h4>
                      {currentStep.adjustableParams.map(p => (
                        <div key={p.key} className="space-y-0.5">
                          <div className="flex items-center justify-between text-xs">
                            <span>{p.nameZh}</span>
                            <span className="font-mono">{p.value} {p.unit}</span>
                          </div>
                          <Slider
                            value={[p.value]}
                            min={p.min}
                            max={p.max}
                            step={p.step}
                            className="w-full"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Motor state visualization */}
              {stationData && stationData.motorCount > 0 && (
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-muted-foreground">电机状态 (模拟)</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from({ length: stationData.motorCount }, (_, i) => {
                      const running = simMode === "running" && currentStep?.actions.some(
                        a => a.type === "motor_start" && currentMicroStep >= (stationData.steps.findIndex(s => s.actions.some(sa => sa === a)))
                      );
                      return (
                        <div key={i} className={`flex items-center gap-2 text-xs rounded px-2 py-1.5 ${running ? "bg-green-100 dark:bg-green-950" : "bg-muted/50"}`}>
                          <div className={`w-2 h-2 rounded-full ${running ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
                          <span>Motor {i + 1}</span>
                          <span className="ml-auto font-mono">{running ? "RUN" : "STOP"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sensor values (simulated) */}
              {stationData && stationData.sensorCount > 0 && (
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-muted-foreground">传感器 (模拟值)</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {stationData.hasPid && (
                      <div className="flex items-center gap-2 text-xs bg-amber-50 dark:bg-amber-950/30 rounded px-2 py-1.5">
                        <Thermometer className="h-3 w-3 text-amber-500" />
                        <span>温度</span>
                        <span className="ml-auto font-mono">
                          {simMode !== "idle" ? `${(25 + Math.min(currentMicroStep * 2, 35)).toFixed(1)}°C` : "25.0°C"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Info panel */}
        <div className="lg:col-span-3">
          <Card className="h-[550px] overflow-y-auto">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm flex items-center gap-1">
                <Gauge className="h-4 w-4" />
                调试信息
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-3">
              {/* Station overview */}
              {stationData && (
                <div className="space-y-1 text-xs">
                  <h4 className="font-semibold">工位概览</h4>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                    <span className="text-muted-foreground">工位类型</span>
                    <span>{stationData.stationType}</span>
                    <span className="text-muted-foreground">电机数</span>
                    <span>{stationData.motorCount}</span>
                    <span className="text-muted-foreground">传感器</span>
                    <span>{stationData.sensorCount}</span>
                    <span className="text-muted-foreground">PID控制</span>
                    <span>{stationData.hasPid ? "是" : "否"}</span>
                    <span className="text-muted-foreground">总时间</span>
                    <span>{stationData.totalDuration}s</span>
                    <span className="text-muted-foreground">总步骤</span>
                    <span>{stationData.steps.length}</span>
                  </div>
                </div>
              )}

              {/* Sequence overview */}
              {stationData && (
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold">工艺序列</h4>
                  {/* Group steps by stepNumber */}
                  {Array.from(new Set(stationData.steps.map(s => s.stepNumber))).map(stepNum => {
                    const step = stationData.steps.find(s => s.stepNumber === stepNum && s.type === "entry");
                    const timerStep = stationData.steps.find(s => s.stepNumber === stepNum && s.type === "timer");
                    return (
                      <div key={stepNum} className="flex items-center gap-1 text-xs">
                        <Badge variant="outline" className="text-[9px] w-8 justify-center">{stepNum}</Badge>
                        <span className="truncate flex-1">{step?.nameZh?.replace("▶ 进入: ", "") || `Step ${stepNum}`}</span>
                        {timerStep && <span className="text-muted-foreground">{timerStep.duration}s</span>}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Simulation mode indicator */}
              <div className="space-y-1">
                <h4 className="text-xs font-semibold">模式说明</h4>
                <div className="text-xs space-y-0.5">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded bg-green-500" />
                    <span>模拟模式 (Simulation) — 无需硬件</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded bg-blue-500" />
                    <span>实际模式 (Real) — OPC UA / S7连接</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  当前: 模拟模式。调试出的最佳参数可一键回写到M3参数库。
                </p>
              </div>

              {/* Version status */}
              <div className="space-y-1">
                <h4 className="text-xs font-semibold">版本状态</h4>
                <div className="flex gap-1">
                  <Badge variant="default" className="text-[9px]">DEV</Badge>
                  <Badge variant="outline" className="text-[9px]">参数未锁定</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  DEV→BETA(参数锁定)→PROD(加密导出)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
