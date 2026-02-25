/**
 * Shop Floor Machine Login — Industrial Tablet Experience
 * Phase 1.2 — SOP + Role Quality Interlock
 *
 * Designed for rugged tablets mounted on/near machines.
 * Large touch targets, high contrast, impossible to misread.
 *
 * Flow:
 *   1. Operator scans badge (or enters ID)
 *   2. Selects machine (or machine is pre-set via URL param)
 *   3. System calls interlock verifyAccess
 *   4. GRANTED → massive green screen "START PRODUCTION"
 *   5. BLOCKED → massive red screen with reason + "Review SOP" button
 *
 * Mock mode: Works entirely with mock data when backend is unavailable.
 */

import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import {
  ShieldCheck,
  ShieldAlert,
  ScanLine,
  Factory,
  FileCheck,
  AlertOctagon,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────

interface InterlockResult {
  status: "GRANTED" | "BLOCKED";
  reason: string | null;
  details: {
    certCheckPassed: boolean;
    sopCheckPassed: boolean;
    missingCerts: string[];
    outdatedSops: { sopId: number; required: string; signed: string | null }[];
  };
}

// ─── Mock Data (works without backend) ──────────────────────────────

const MOCK_MACHINES = [
  { id: 1, name: "CNC-001 5-Axis Mill", code: "CNC-001", location: "Workshop A, Bay 3" },
  { id: 2, name: "WASH-003 Ultrasonic Cleaner", code: "WASH-003", location: "Cleanroom B" },
  { id: 3, name: "WELD-007 Robotic Welder", code: "WELD-007", location: "Workshop C, Bay 1" },
];

const MOCK_OPERATORS: Record<number, { name: string; badge: string }> = {
  1001: { name: "Zhang Wei", badge: "GRT-1001" },
  1002: { name: "Li Ming", badge: "GRT-1002" },
  1003: { name: "Wang Jun", badge: "GRT-1003" },
};

// Mock interlock results — demonstrates both GRANTED and BLOCKED
const MOCK_RESULTS: Record<string, InterlockResult> = {
  // Zhang Wei on CNC-001: fully qualified
  "1001-1": {
    status: "GRANTED",
    reason: null,
    details: { certCheckPassed: true, sopCheckPassed: true, missingCerts: [], outdatedSops: [] },
  },
  // Li Ming on CNC-001: expired cert
  "1002-1": {
    status: "BLOCKED",
    reason: "Missing certifications: CNC_MILL_L2. Certificate expired on 2025-06-15.",
    details: {
      certCheckPassed: false, sopCheckPassed: true,
      missingCerts: ["CNC_MILL_L2"], outdatedSops: [],
    },
  },
  // Wang Jun on WASH-003: SOP not signed
  "1003-2": {
    status: "BLOCKED",
    reason: "SOP #101 requires v2.1, you signed v1.4. Please review and acknowledge the latest SOP before operating.",
    details: {
      certCheckPassed: true, sopCheckPassed: false,
      missingCerts: [],
      outdatedSops: [{ sopId: 101, required: "2.1", signed: "1.4" }],
    },
  },
};

function getMockResult(userId: number, machineId: number): InterlockResult {
  const key = `${userId}-${machineId}`;
  return MOCK_RESULTS[key] ?? {
    status: "BLOCKED",
    reason: "Machine has no skill requirements configured. Contact supervisor.",
    details: { certCheckPassed: false, sopCheckPassed: false, missingCerts: [], outdatedSops: [] },
  };
}

// ─── Component ──────────────────────────────────────────────────────

type Screen = "scan" | "granted" | "blocked";

export default function ShopFloorMachineLogin() {
  const [screen, setScreen] = useState<Screen>("scan");
  const [badgeInput, setBadgeInput] = useState("");
  const [selectedMachine, setSelectedMachine] = useState(MOCK_MACHINES[0]);
  const [result, setResult] = useState<InterlockResult | null>(null);
  const [operatorName, setOperatorName] = useState("");
  const [checking, setChecking] = useState(false);
  const [sopSigningId, setSopSigningId] = useState<number | null>(null);

  // Try live tRPC, fall back to mock
  const liveVerify = trpc.sopInterlock.verifyAccess.useQuery(
    { userId: 0, machineId: 0 },
    { enabled: false }, // manual trigger only
  );

  const handleScan = useCallback(async () => {
    const userId = parseInt(badgeInput.replace(/\D/g, ""), 10);
    if (!userId || isNaN(userId)) return;

    setChecking(true);
    setOperatorName(MOCK_OPERATORS[userId]?.name ?? `Operator #${userId}`);

    // Simulate network delay for realistic feel on demo
    await new Promise((r) => setTimeout(r, 800));

    // Try live backend first
    try {
      const res = await (liveVerify as any).refetch?.({
        queryKey: ["sopInterlock.verifyAccess", { userId, machineId: selectedMachine.id }],
      });
      if (res?.data) {
        setResult(res.data);
        setScreen(res.data.status === "GRANTED" ? "granted" : "blocked");
        setChecking(false);
        return;
      }
    } catch {
      // Backend unavailable — use mock
    }

    // Fallback: mock data
    const mockResult = getMockResult(userId, selectedMachine.id);
    setResult(mockResult);
    setScreen(mockResult.status === "GRANTED" ? "granted" : "blocked");
    setChecking(false);
  }, [badgeInput, selectedMachine, liveVerify]);

  const handleReset = useCallback(() => {
    setScreen("scan");
    setBadgeInput("");
    setResult(null);
    setOperatorName("");
    setSopSigningId(null);
  }, []);

  const handleSignSop = useCallback((sopId: number) => {
    setSopSigningId(sopId);
    // Simulate SOP acknowledgment — in production this calls sopInterlock.acknowledgeSop
    setTimeout(() => {
      setSopSigningId(null);
      // Re-verify after signing
      handleReset();
    }, 2000);
  }, [handleReset]);

  // ─── SCAN SCREEN ──────────────────────────────────────────────

  if (screen === "scan") {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col">
        {/* Header */}
        <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Factory className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-xl font-bold">GRT Machine Access Control</h1>
              <p className="text-sm text-gray-400">SOP + Certification Interlock System</p>
            </div>
          </div>
          <div className="text-right text-sm text-gray-500">
            <div>{new Date().toLocaleDateString()}</div>
            <div>{new Date().toLocaleTimeString()}</div>
          </div>
        </div>

        {/* Machine Selector */}
        <div className="bg-gray-900/50 px-6 py-4 border-b border-gray-800">
          <label className="text-sm text-gray-400 mb-2 block">Active Machine</label>
          <div className="flex gap-3">
            {MOCK_MACHINES.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMachine(m)}
                className={`flex-1 px-4 py-3 rounded-lg border-2 text-left transition-all ${
                  selectedMachine.id === m.id
                    ? "border-blue-500 bg-blue-500/10 text-blue-300"
                    : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                }`}
              >
                <div className="font-bold text-lg">{m.code}</div>
                <div className="text-sm opacity-75">{m.name}</div>
                <div className="text-xs opacity-50 mt-1">{m.location}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Badge Scan Area */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-lg space-y-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-24 h-24 rounded-full bg-blue-500/20 flex items-center justify-center">
                <ScanLine className="w-12 h-12 text-blue-400" />
              </div>
              <h2 className="text-3xl font-bold">Scan Employee Badge</h2>
              <p className="text-gray-400 text-lg">
                Hold your badge to the reader or enter your ID below
              </p>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                value={badgeInput}
                onChange={(e) => setBadgeInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScan()}
                placeholder="Employee ID (e.g., 1001, 1002, 1003)"
                className="w-full px-6 py-5 text-2xl text-center bg-gray-800 border-2 border-gray-600 rounded-xl focus:border-blue-500 focus:outline-none text-white placeholder-gray-500"
                autoFocus
              />
              <button
                onClick={handleScan}
                disabled={!badgeInput.trim() || checking}
                className="w-full px-6 py-5 text-xl font-bold bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl transition-colors flex items-center justify-center gap-3"
              >
                {checking ? (
                  <>
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify Access <ArrowRight className="w-6 h-6" />
                  </>
                )}
              </button>
            </div>

            {/* Demo hint */}
            <div className="text-sm text-gray-600 space-y-1">
              <p>Demo IDs: <span className="text-gray-400">1001</span> (granted), <span className="text-gray-400">1002</span> (cert expired), <span className="text-gray-400">1003</span> (SOP outdated)</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── GRANTED SCREEN ───────────────────────────────────────────

  if (screen === "granted") {
    return (
      <div className="min-h-screen bg-green-950 flex flex-col items-center justify-center text-white p-8">
        <div className="text-center space-y-8 max-w-2xl">
          {/* Massive checkmark */}
          <div className="flex justify-center">
            <div className="w-40 h-40 rounded-full bg-green-500/30 flex items-center justify-center animate-pulse">
              <CheckCircle2 className="w-24 h-24 text-green-400" />
            </div>
          </div>

          {/* ACCESS GRANTED text */}
          <div>
            <h1 className="text-6xl font-black text-green-400 tracking-wider">
              ACCESS GRANTED
            </h1>
            <div className="mt-4 text-2xl text-green-200">
              {operatorName} verified for {selectedMachine.code}
            </div>
          </div>

          {/* Status badges */}
          <div className="flex justify-center gap-6 text-lg">
            <div className="flex items-center gap-2 bg-green-900/50 px-6 py-3 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-green-400" />
              Certifications Valid
            </div>
            <div className="flex items-center gap-2 bg-green-900/50 px-6 py-3 rounded-lg">
              <FileCheck className="w-6 h-6 text-green-400" />
              SOP Acknowledged
            </div>
          </div>

          {/* Start Production */}
          <div className="pt-4">
            <div className="text-8xl font-black text-green-300 py-8 px-16 border-4 border-green-500 rounded-2xl bg-green-500/10 inline-block">
              START PRODUCTION
            </div>
          </div>

          {/* Reset button */}
          <button
            onClick={handleReset}
            className="mt-8 px-8 py-4 bg-green-800 hover:bg-green-700 rounded-xl text-xl flex items-center gap-3 mx-auto transition-colors"
          >
            <RotateCcw className="w-6 h-6" />
            New Operator Login
          </button>
        </div>
      </div>
    );
  }

  // ─── BLOCKED SCREEN ───────────────────────────────────────────

  return (
    <div className="min-h-screen bg-red-950 flex flex-col items-center justify-center text-white p-8">
      <div className="text-center space-y-8 max-w-2xl">
        {/* Massive warning */}
        <div className="flex justify-center">
          <div className="w-40 h-40 rounded-full bg-red-500/30 flex items-center justify-center animate-pulse">
            <AlertOctagon className="w-24 h-24 text-red-400" />
          </div>
        </div>

        {/* ACCESS BLOCKED text */}
        <div>
          <h1 className="text-6xl font-black text-red-400 tracking-wider">
            ACCESS BLOCKED
          </h1>
          <div className="mt-4 text-2xl text-red-200">
            {operatorName} cannot operate {selectedMachine.code}
          </div>
        </div>

        {/* Reason cards */}
        {result && (
          <div className="space-y-4 text-left">
            {/* Cert failure */}
            {!result.details.certCheckPassed && (
              <div className="bg-red-900/50 border-2 border-red-700 rounded-xl p-6">
                <div className="flex items-center gap-3 text-xl font-bold text-red-300 mb-3">
                  <XCircle className="w-7 h-7" />
                  Certification Check Failed
                </div>
                <p className="text-red-200 text-lg">
                  Missing required certifications:
                </p>
                <ul className="mt-2 space-y-2">
                  {result.details.missingCerts.map((cert) => (
                    <li key={cert} className="flex items-center gap-2 text-lg bg-red-800/50 px-4 py-2 rounded-lg">
                      <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0" />
                      <span className="font-mono font-bold">{cert}</span>
                      <span className="text-red-300 text-sm ml-2">— Contact HR/Training dept.</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* SOP failure */}
            {!result.details.sopCheckPassed && (
              <div className="bg-red-900/50 border-2 border-red-700 rounded-xl p-6">
                <div className="flex items-center gap-3 text-xl font-bold text-red-300 mb-3">
                  <XCircle className="w-7 h-7" />
                  SOP Acknowledgment Required
                </div>
                {result.details.outdatedSops.map((sop) => (
                  <div key={sop.sopId} className="space-y-3">
                    <div className="bg-red-800/50 px-4 py-3 rounded-lg text-lg">
                      <span className="text-red-200">SOP #{sop.sopId}:</span>{" "}
                      <span className="text-yellow-300">Current version v{sop.required}</span>{" "}
                      <span className="text-red-300">
                        {sop.signed ? `(you signed v${sop.signed})` : "(never signed)"}
                      </span>
                    </div>

                    {/* Review & Sign SOP button */}
                    <button
                      onClick={() => handleSignSop(sop.sopId)}
                      disabled={sopSigningId === sop.sopId}
                      className="w-full px-6 py-4 bg-yellow-600 hover:bg-yellow-500 disabled:bg-yellow-800 rounded-xl text-xl font-bold flex items-center justify-center gap-3 transition-colors"
                    >
                      {sopSigningId === sop.sopId ? (
                        <>
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Signing SOP v{sop.required}...
                        </>
                      ) : (
                        <>
                          <FileCheck className="w-6 h-6" />
                          Review & Sign SOP v{sop.required}
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 justify-center pt-4">
          <button
            onClick={handleReset}
            className="px-8 py-4 bg-red-800 hover:bg-red-700 rounded-xl text-xl flex items-center gap-3 transition-colors"
          >
            <RotateCcw className="w-6 h-6" />
            Try Different Badge
          </button>
        </div>

        {/* Timestamp */}
        <div className="text-red-400/50 text-sm flex items-center justify-center gap-2">
          <Clock className="w-4 h-4" />
          Blocked at {new Date().toLocaleString()} | Machine: {selectedMachine.code}
        </div>
      </div>
    </div>
  );
}
