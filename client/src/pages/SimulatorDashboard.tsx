import { useState, useRef, useCallback, useEffect } from "react";
import {
  Play,
  Zap,
  Terminal,
  Users,
  Copy,
  Check,
  Circle,
  ChevronRight,
  RotateCcw,
  Activity,
  Shield,
  Truck,
  FlaskConical,
  ShoppingCart,
} from "lucide-react";
import {
  AGENTS,
  MILESTONES,
  runM6StressTest,
  runFullSimulation,
  runModuleIntegrationTest,
  type SimLog,
  type AgentType,
} from "@/simulator/AgentEngine";

// ── Agent Icon Map ──

const AGENT_ICONS: Record<AgentType, typeof Users> = {
  sales_rep: ShoppingCart,
  rd_engineer: FlaskConical,
  shopfloor_operator: Activity,
  qa_inspector: Shield,
  supply_chain: Truck,
};

// ── Status Colors ──

function statusColor(status: SimLog["status"]) {
  switch (status) {
    case "SUCCESS":
      return { bg: "bg-[#dff6dd]", text: "text-[#107c10]", dot: "bg-[#107c10]" };
    case "BUG_FOUND":
      return { bg: "bg-[#fed9cc]", text: "text-[#d83b01]", dot: "bg-[#d83b01]" };
    case "WARN":
      return { bg: "bg-[#fff4ce]", text: "text-[#797673]", dot: "bg-[#c19c00]" };
    case "INFO":
      return { bg: "bg-[#2d2d2d]", text: "text-[#569cd6]", dot: "bg-[#569cd6]" };
  }
}

// ── Agent Status Type ──

type AgentStatus = "idle" | "running" | "success" | "error";

// ── Typewriter Log Entry ──

function TypewriterText({ text, speed = 12 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (text.length <= 3) {
      setDisplayed(text);
      setDone(true);
      return;
    }

    let i = 0;
    // Start with a chunk for faster perceived speed
    const chunkSize = Math.max(1, Math.floor(text.length / 30));
    const interval = setInterval(() => {
      i += chunkSize;
      if (i >= text.length) {
        setDisplayed(text);
        setDone(true);
        clearInterval(interval);
      } else {
        setDisplayed(text.slice(0, i));
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span>
      {displayed}
      {!done && <span className="inline-block w-1.5 h-3 bg-[#569cd6] ml-0.5 animate-pulse" />}
    </span>
  );
}

// ── Main Component ──

export default function SimulatorDashboard() {
  const [logs, setLogs] = useState<SimLog[]>([]);
  const [running, setRunning] = useState(false);
  const [agentStates, setAgentStates] = useState<Record<AgentType, AgentStatus>>(
    () => Object.fromEntries(AGENTS.map((a) => [a.type, "idle"])) as Record<AgentType, AgentStatus>
  );
  const [activeMilestone, setActiveMilestone] = useState<string>("M6");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<string>("");
  const [elapsedSec, setElapsedSec] = useState(0);
  const terminalRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-scroll terminal on new logs
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  // Elapsed timer
  useEffect(() => {
    if (running) {
      setElapsedSec(0);
      timerRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running]);

  // ── Process a log entry ──

  const processLog = useCallback((log: SimLog) => {
    setLogs((prev) => [...prev, log]);

    // Update active milestone from log
    const msMatch = log.milestone.match(/M(\d+)/);
    if (msMatch) {
      setActiveMilestone(`M${msMatch[1]}`);
    }

    // Update agent state
    if (log.status !== "INFO") {
      setAgentStates((prev) => ({
        ...prev,
        [log.agentType]: log.status === "BUG_FOUND" ? "error" : "success",
      }));
    } else {
      // INFO means agent is actively working
      setAgentStates((prev) => ({
        ...prev,
        [log.agentType]: "running",
      }));
    }

    setCurrentAction(`${log.agent}: ${log.action}`);
  }, []);

  // ── Run M6 Stress Test ──

  const runM6Test = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setLogs([]);
    setActiveMilestone("M6");
    setCurrentAction("Initializing...");

    setAgentStates((prev) => ({
      ...prev,
      shopfloor_operator: "running",
      qa_inspector: "running",
    }));

    try {
      for await (const log of runM6StressTest()) {
        processLog(log);
      }
    } finally {
      setRunning(false);
      setCurrentAction("");
    }
  }, [running, processLog]);

  // ── Run Full Simulation ──

  const runFull = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setLogs([]);
    setActiveMilestone("M0");
    setCurrentAction("Initializing...");

    setAgentStates(
      Object.fromEntries(AGENTS.map((a) => [a.type, "running"])) as Record<AgentType, AgentStatus>
    );

    try {
      for await (const log of runFullSimulation()) {
        processLog(log);
      }
    } finally {
      setRunning(false);
      setCurrentAction("");
    }
  }, [running, processLog]);

  // ── Run Module Integration Test ──

  const runModules = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setLogs([]);
    setActiveMilestone("M0");
    setCurrentAction("Module Integration Test...");

    setAgentStates(
      Object.fromEntries(AGENTS.map((a) => [a.type, "running"])) as Record<AgentType, AgentStatus>
    );

    try {
      for await (const log of runModuleIntegrationTest()) {
        processLog(log);
      }
    } finally {
      setRunning(false);
      setCurrentAction("");
    }
  }, [running, processLog]);

  // ── Reset ──

  const resetAll = useCallback(() => {
    setLogs([]);
    setAgentStates(
      Object.fromEntries(AGENTS.map((a) => [a.type, "idle"])) as Record<AgentType, AgentStatus>
    );
    setActiveMilestone("M6");
    setCurrentAction("");
    setElapsedSec(0);
  }, []);

  // ── Copy Debug Prompt ──

  const copyDebugPrompt = useCallback((log: SimLog) => {
    const prompt = `[GRT System Bug Report]\nAgent: ${log.agent}\nAction: ${log.action}\nMilestone: ${log.milestone}\nStatus: ${log.status}\nTimestamp: ${log.timestamp}\n\nMessage:\n${log.message}\n\nDetail:\n${log.detail || "N/A"}\n\nPlease analyze this error and suggest a fix.`;
    navigator.clipboard.writeText(prompt).then(() => {
      setCopiedId(log.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  // ── Summary Stats ──

  const resultLogs = logs.filter((l) => l.status !== "INFO");
  const stats = {
    total: resultLogs.length,
    success: resultLogs.filter((l) => l.status === "SUCCESS").length,
    bugs: resultLogs.filter((l) => l.status === "BUG_FOUND").length,
    warns: resultLogs.filter((l) => l.status === "WARN").length,
    avgMs: resultLogs.length > 0 ? Math.round(resultLogs.reduce((s, l) => s + l.durationMs, 0) / resultLogs.length) : 0,
  };

  return (
    <div className="flex flex-col h-full bg-[#faf9f8]">
      {/* ── Header ── */}
      <div className="bg-white border-b border-[#edebe9] px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <Zap className="h-5 w-5 text-[#0078d4]" />
              <h1 className="text-lg sm:text-xl font-semibold text-[#323130]">
                GRT M0-M12 AI Simulation Command Center
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-[#605e5c] mt-1 ml-[30px]">
              Digital Agent Stress Testing &mdash; IATF 16949 Compliance Verification
            </p>
          </div>

          <div className="flex items-center gap-3 ml-[30px] sm:ml-0">
            {/* Stats Badges */}
            {resultLogs.length > 0 && (
              <div className="flex items-center gap-2 mr-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#dff6dd] text-[#107c10]">
                  {stats.success} passed
                </span>
                {stats.bugs > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#fed9cc] text-[#d83b01]">
                    {stats.bugs} bugs
                  </span>
                )}
                {stats.warns > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#fff4ce] text-[#797673]">
                    {stats.warns} warnings
                  </span>
                )}
                <span className="text-xs text-[#a19f9d]">
                  avg {stats.avgMs}ms
                </span>
              </div>
            )}

            <button
              onClick={resetAll}
              disabled={running}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md border border-[#8a8886] text-[#323130] bg-white hover:bg-[#f3f2f1] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* ── Main 3-Panel Layout ── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* ── Left Panel: Agent Roster ── */}
        <div className="w-full md:w-[260px] lg:w-[260px] border-b md:border-b-0 md:border-r border-[#edebe9] bg-white hidden md:flex flex-col">
          <div className="px-4 py-3 border-b border-[#edebe9]">
            <h2 className="text-xs font-semibold text-[#605e5c] uppercase tracking-wider">
              Digital Agents
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {AGENTS.map((agent) => {
              const Icon = AGENT_ICONS[agent.type];
              const state = agentStates[agent.type];
              const dotColor =
                state === "running"
                  ? "bg-[#0078d4] animate-pulse"
                  : state === "success"
                    ? "bg-[#107c10]"
                    : state === "error"
                      ? "bg-[#d83b01]"
                      : "bg-[#c8c6c4]";

              const isActive = state === "running";

              return (
                <div
                  key={agent.type}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-300 ${
                    isActive
                      ? "bg-[#deecf9] ring-1 ring-[#0078d4]/30"
                      : "hover:bg-[#f3f2f1]"
                  }`}
                >
                  <div className="relative">
                    <Icon className={`h-5 w-5 ${isActive ? "text-[#0078d4]" : "text-[#605e5c]"}`} />
                    <span
                      className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${dotColor}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${isActive ? "text-[#0078d4]" : "text-[#323130]"}`}>
                      {agent.name}
                    </div>
                    <div className="text-[11px] text-[#a19f9d]">
                      {agent.nameZh} &middot; {agent.milestone}
                    </div>
                  </div>
                  <span className={`text-[10px] uppercase font-medium ${
                    state === "running" ? "text-[#0078d4]"
                    : state === "success" ? "text-[#107c10]"
                    : state === "error" ? "text-[#d83b01]"
                    : "text-[#a19f9d]"
                  }`}>
                    {state === "running" && (
                      <span className="inline-block h-2 w-2 mr-1 border border-[#0078d4] border-t-transparent rounded-full animate-spin align-middle" />
                    )}
                    {state}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="p-3 border-t border-[#edebe9] space-y-2">
            <button
              onClick={runM6Test}
              disabled={running}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-md text-white bg-[#0078d4] hover:bg-[#106ebe] active:bg-[#005a9e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {running ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Running... ({elapsedSec}s)
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  RUN M6 STRESS TEST
                </>
              )}
            </button>
            <button
              onClick={runModules}
              disabled={running}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md text-white bg-[#107c10] hover:bg-[#0b6a0b] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Shield className="h-3.5 w-3.5" />
              Module Integration Test
            </button>
            <button
              onClick={runFull}
              disabled={running}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md text-[#323130] bg-white border border-[#8a8886] hover:bg-[#f3f2f1] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Zap className="h-3.5 w-3.5" />
              Run Full M0-M12
            </button>
          </div>
        </div>

        {/* ── Mobile Action Bar (visible when left panel is hidden) ── */}
        <div className="flex md:hidden gap-2 p-3 bg-white border-b border-[#edebe9] overflow-x-auto">
          <button
            onClick={runM6Test}
            disabled={running}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] text-sm font-semibold rounded-md text-white bg-[#0078d4] hover:bg-[#106ebe] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {running ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Running... ({elapsedSec}s)
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                M6 Stress Test
              </>
            )}
          </button>
          <button
            onClick={runModules}
            disabled={running}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] text-sm font-medium rounded-md text-white bg-[#107c10] hover:bg-[#0b6a0b] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            <Shield className="h-3.5 w-3.5" />
            Module Test
          </button>
          <button
            onClick={runFull}
            disabled={running}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] text-sm font-medium rounded-md text-[#323130] bg-white border border-[#8a8886] hover:bg-[#f3f2f1] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            <Zap className="h-3.5 w-3.5" />
            Full M0-M12
          </button>
          <button
            onClick={resetAll}
            disabled={running}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] text-sm font-medium rounded-md border border-[#8a8886] text-[#323130] bg-white hover:bg-[#f3f2f1] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>

        {/* ── Center + Right: Timeline + Terminal ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* ── Milestone Timeline ── */}
          <div className="bg-white border-b border-[#edebe9] px-4 sm:px-6 py-4">
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
              {MILESTONES.map((m, i) => {
                const activeIdx = MILESTONES.findIndex((mm) => mm.code === activeMilestone);
                const isActive = activeMilestone === m.code;
                const isPast = activeIdx > i;
                const hasLogs = logs.some((l) => l.milestone.includes(m.code));

                return (
                  <div key={m.code} className="flex items-center">
                    {i > 0 && (
                      <div
                        className={`w-4 h-0.5 transition-colors duration-500 ${
                          isPast ? "bg-[#0078d4]" : "bg-[#edebe9]"
                        }`}
                      />
                    )}
                    <div
                      className={`flex flex-col items-center min-w-[52px] transition-all duration-500 ${
                        isActive ? "scale-110" : ""
                      }`}
                    >
                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-500 ${
                          isActive
                            ? "bg-[#0078d4] text-white shadow-lg ring-4 ring-[#0078d4]/20"
                            : isPast
                              ? "bg-[#0078d4]/20 text-[#0078d4]"
                              : hasLogs
                                ? "bg-[#dff6dd] text-[#107c10]"
                                : "bg-[#f3f2f1] text-[#a19f9d]"
                        }`}
                      >
                        {m.code.replace("M", "")}
                      </div>
                      <span
                        className={`text-[9px] mt-1 whitespace-nowrap transition-colors duration-500 ${
                          isActive
                            ? "text-[#0078d4] font-semibold"
                            : isPast
                              ? "text-[#0078d4]/60"
                              : "text-[#a19f9d]"
                        }`}
                      >
                        {m.labelZh}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Execution Terminal ── */}
          <div className="flex-1 overflow-hidden p-4">
            <div className="h-full flex flex-col bg-[#1e1e1e] rounded-lg shadow-lg overflow-hidden">
              {/* Terminal Header */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#2d2d2d] border-b border-[#3e3e3e]">
                <Terminal className="h-3.5 w-3.5 text-[#569cd6]" />
                <span className="text-xs font-medium text-[#cccccc]">
                  GRT Simulation Terminal
                </span>
                {running && currentAction && (
                  <span className="text-[10px] text-[#808080] ml-2 truncate">
                    {currentAction}
                  </span>
                )}
                <div className="flex-1" />
                {running && (
                  <span className="text-[10px] text-[#569cd6] font-mono mr-2">
                    {elapsedSec}s
                  </span>
                )}
                <div className="flex items-center gap-1.5">
                  <Circle className="h-2.5 w-2.5 fill-[#f14c4c] text-[#f14c4c]" />
                  <Circle className="h-2.5 w-2.5 fill-[#cca700] text-[#cca700]" />
                  <Circle className={`h-2.5 w-2.5 ${running ? "fill-[#23d18b] text-[#23d18b] animate-pulse" : "fill-[#23d18b] text-[#23d18b]"}`} />
                </div>
              </div>

              {/* Terminal Body */}
              <div
                ref={terminalRef}
                className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-1.5"
              >
                {logs.length === 0 && !running && (
                  <div className="flex flex-col items-center justify-center h-full text-[#6a6a6a]">
                    <Terminal className="h-12 w-12 mb-3 text-[#3e3e3e]" />
                    <p className="text-sm">Awaiting simulation command...</p>
                    <p className="text-xs mt-1 text-[#4e4e4e]">
                      Press "RUN M6 STRESS TEST" to begin
                    </p>
                  </div>
                )}

                {logs.map((log, logIdx) => {
                  const colors = statusColor(log.status);
                  const isLatest = logIdx === logs.length - 1;
                  const isInfoLog = log.status === "INFO";

                  return (
                    <div
                      key={log.id}
                      className={`group ${isInfoLog ? "opacity-80" : ""}`}
                      style={{ animationDelay: "0ms" }}
                    >
                      {/* Log Line */}
                      <div className="flex items-start gap-2">
                        <span className="text-[#6a6a6a] text-xs mt-0.5 whitespace-nowrap w-[68px] shrink-0">
                          {log.timestamp.slice(11)}
                        </span>
                        {isInfoLog ? (
                          <span className="text-[#569cd6] text-xs">
                            <span className="text-[#4e4e4e]">{">"}</span>{" "}
                            {isLatest && running ? (
                              <TypewriterText text={log.message} speed={8} />
                            ) : (
                              log.message
                            )}
                          </span>
                        ) : (
                          <>
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${colors.bg} ${colors.text}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                              {log.status}
                            </span>
                            <span className="text-[#569cd6] text-xs">[{log.agent}]</span>
                            <span className="text-[#dcdcaa] text-xs">{log.action}</span>
                            <span className="text-[#a19f9d] text-xs">
                              ({log.durationMs}ms)
                            </span>
                          </>
                        )}
                      </div>

                      {/* Message for non-info logs */}
                      {!isInfoLog && (
                        <div className="ml-[76px] mt-0.5">
                          <span className="text-[#cccccc] text-xs leading-relaxed">
                            {isLatest && running ? (
                              <TypewriterText text={log.message} speed={6} />
                            ) : (
                              log.message
                            )}
                          </span>
                        </div>
                      )}

                      {/* Detail line */}
                      {log.detail && (
                        <div className="ml-[76px] mt-0.5">
                          <span className="text-[#808080] text-[11px]">
                            <ChevronRight className="h-3 w-3 inline" /> {log.detail}
                          </span>
                        </div>
                      )}

                      {/* Copy Debug Prompt button for BUG_FOUND */}
                      {log.status === "BUG_FOUND" && (
                        <div className="ml-[76px] mt-1">
                          <button
                            onClick={() => copyDebugPrompt(log)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-[#3e3e3e] text-[#cccccc] hover:bg-[#4e4e4e] transition-colors"
                          >
                            {copiedId === log.id ? (
                              <>
                                <Check className="h-3 w-3 text-[#23d18b]" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                Copy Prompt for Claude
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Running cursor */}
                {running && logs.length > 0 && (
                  <div className="flex items-center gap-2 text-[#569cd6] text-xs mt-1">
                    <div className="h-3 w-3 border-2 border-[#569cd6]/30 border-t-[#569cd6] rounded-full animate-spin" />
                    <span className="animate-pulse">Processing...</span>
                  </div>
                )}
              </div>

              {/* Terminal Footer */}
              <div className="px-4 py-2 bg-[#007acc] flex items-center gap-3">
                <span className={`text-[10px] font-medium ${running ? "text-white animate-pulse" : "text-white/90"}`}>
                  {running ? "RUNNING" : resultLogs.length > 0 ? "COMPLETE" : "IDLE"}
                </span>
                <div className="h-3 w-px bg-white/20" />
                <span className="text-[10px] text-white/70">
                  {stats.total} tests &middot; {stats.success} passed &middot;{" "}
                  {stats.bugs} bugs &middot; {stats.warns} warnings
                </span>
                {running && (
                  <>
                    <div className="h-3 w-px bg-white/20" />
                    <span className="text-[10px] text-white/70 font-mono">
                      {elapsedSec}s elapsed
                    </span>
                  </>
                )}
                <div className="flex-1" />
                <span className="text-[10px] text-white/50">
                  GRT Simulation Engine v2.0
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
