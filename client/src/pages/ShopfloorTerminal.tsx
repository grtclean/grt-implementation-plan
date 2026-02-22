import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Clock,
  User,
  Scan,
  AlertTriangle,
  CheckCircle2,
  X,
} from "lucide-react";

interface VerifyResult {
  passed: boolean;
  employeeName: string;
  domain: string;
  currentLevel: number;
  requiredLevel: number;
  message: string;
}

export default function ShopfloorTerminal() {
  const [selectedOperator, setSelectedOperator] = useState<number | null>(null);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-dismiss success toast after 4 seconds
  useEffect(() => {
    if (showSuccess) {
      const timeout = setTimeout(() => {
        setShowSuccess(false);
      }, 4000);
      return () => clearTimeout(timeout);
    }
  }, [showSuccess]);

  const operatorsQuery = trpc.mes.getOperators.useQuery();
  const verifyMutation = trpc.mes.verifySkill.useMutation();

  const selectedOperatorName = operatorsQuery.data?.find(
    (op) => op.id === selectedOperator
  )?.name;

  const handleScanAndStart = useCallback(async () => {
    if (selectedOperator === null) return;

    try {
      const result = await verifyMutation.mutateAsync({
        employeeId: selectedOperator,
        domain: "S",
        requiredLevel: 2,
      });

      setVerifyResult({
        passed: result.passed,
        employeeName: result.employeeName,
        domain: result.domain,
        currentLevel: result.currentLevel,
        requiredLevel: result.requiredLevel,
        message: result.message,
      });

      if (result.passed) {
        setShowSuccess(true);
        setShowBlockedModal(false);
      } else {
        setShowBlockedModal(true);
        setShowSuccess(false);
      }
    } catch {
      setVerifyResult({
        passed: false,
        employeeName: "Unknown",
        domain: "S",
        currentLevel: 0,
        requiredLevel: 2,
        message: "Network error — unable to reach quality guard service.",
      });
      setShowBlockedModal(true);
    }
  }, [selectedOperator, verifyMutation]);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <div className="min-h-screen bg-[#faf9f8] flex flex-col">
      {/* ── Success Toast ── */}
      {showSuccess && verifyResult?.passed && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-[#dff6dd] border-2 border-[#107c10] rounded-lg px-8 py-5 shadow-xl flex items-center gap-4 min-w-[480px]">
            <CheckCircle2 className="h-8 w-8 text-[#107c10] flex-shrink-0" />
            <div className="flex-1">
              <p className="text-[#107c10] font-semibold text-lg">
                Skill verified. Assembly started.
              </p>
              <p className="text-[#107c10]/80 text-sm mt-0.5">
                {verifyResult.employeeName} — L{verifyResult.currentLevel}{" "}
                {verifyResult.domain} (required: L{verifyResult.requiredLevel})
              </p>
            </div>
            <button
              onClick={() => setShowSuccess(false)}
              className="text-[#107c10]/60 hover:text-[#107c10] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Station Header Card ── */}
      <div className="px-8 pt-8 pb-4">
        <div className="bg-white rounded-xl shadow-sm border border-[#edebe9] px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="h-14 w-14 rounded-xl bg-[#0078d4]/10 flex items-center justify-center">
                <Shield className="h-7 w-7 text-[#0078d4]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#323130] tracking-tight">
                  Station T3 — Core Assembly
                </h1>
                <p className="text-[#605e5c] text-sm mt-0.5">
                  Shopfloor Terminal &middot; Manufacturing Execution System
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Status indicator */}
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#107c10] opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#107c10]" />
                </span>
                <span className="text-sm font-medium text-[#107c10]">
                  Online
                </span>
              </div>

              {/* Separator */}
              <div className="h-10 w-px bg-[#edebe9]" />

              {/* Live clock */}
              <div className="text-right">
                <div className="flex items-center gap-2 text-[#323130]">
                  <Clock className="h-4 w-4 text-[#605e5c]" />
                  <span className="text-2xl font-mono font-semibold tabular-nums tracking-tight">
                    {formatTime(currentTime)}
                  </span>
                </div>
                <p className="text-xs text-[#a19f9d] mt-0.5">
                  {formatDate(currentTime)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 px-8 pb-8 flex flex-col">
        <div className="bg-white rounded-xl shadow-sm border border-[#edebe9] flex-1 flex flex-col p-8">
          {/* Operator Selection */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-[#323130] mb-3 uppercase tracking-wider">
              <User className="inline h-4 w-4 mr-2 -mt-0.5 text-[#605e5c]" />
              Select Operator
            </label>
            <Select
              value={selectedOperator?.toString() ?? ""}
              onValueChange={(val) => setSelectedOperator(Number(val))}
            >
              <SelectTrigger className="h-14 text-lg border-[#8a8886] rounded-lg bg-white hover:border-[#0078d4] transition-colors focus:ring-2 focus:ring-[#0078d4]/20">
                <SelectValue placeholder="Tap to select operator..." />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {operatorsQuery.isLoading && (
                  <div className="p-4 text-center text-[#605e5c]">
                    Loading operators...
                  </div>
                )}
                {operatorsQuery.data?.map((op) => (
                  <SelectItem
                    key={op.id}
                    value={op.id.toString()}
                    className="py-3 text-base"
                  >
                    <span className="font-medium">{op.name}</span>
                    <span className="text-[#605e5c] ml-2">
                      — {op.department}
                      {op.position ? ` · ${op.position}` : ""}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedOperator !== null && selectedOperatorName && (
              <div className="mt-3 flex items-center gap-2 text-sm text-[#605e5c]">
                <ShieldCheck className="h-4 w-4 text-[#0078d4]" />
                <span>
                  Selected:{" "}
                  <span className="font-semibold text-[#323130]">
                    {selectedOperatorName}
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Big Action Button */}
          <div className="flex flex-col items-center gap-6">
            <Button
              onClick={handleScanAndStart}
              disabled={selectedOperator === null || verifyMutation.isPending}
              className="h-20 w-full max-w-2xl text-xl font-bold tracking-wide rounded-xl shadow-lg transition-all duration-200
                bg-[#0078d4] hover:bg-[#106ebe] active:bg-[#005a9e] active:scale-[0.98]
                disabled:bg-[#c8c6c4] disabled:text-[#a19f9d] disabled:shadow-none disabled:cursor-not-allowed"
            >
              {verifyMutation.isPending ? (
                <span className="flex items-center gap-3">
                  <svg
                    className="animate-spin h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  VERIFYING SKILL...
                </span>
              ) : (
                <span className="flex items-center gap-3">
                  <Scan className="h-7 w-7" />
                  SCAN BARCODE &amp; START ASSEMBLY
                </span>
              )}
            </Button>

            {selectedOperator === null && (
              <p className="text-sm text-[#a19f9d]">
                Please select an operator above to enable scanning
              </p>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="px-8 pb-6">
        <div className="flex items-center justify-center gap-3">
          <Badge
            variant="outline"
            className="border-[#0078d4]/30 text-[#0078d4] bg-[#0078d4]/5 px-4 py-1.5 text-xs font-medium tracking-wide"
          >
            <Shield className="h-3.5 w-3.5 mr-1.5" />
            IATF 16949 Compliant
          </Badge>
          <span className="text-[#c8c6c4]">&middot;</span>
          <Badge
            variant="outline"
            className="border-[#107c10]/30 text-[#107c10] bg-[#107c10]/5 px-4 py-1.5 text-xs font-medium tracking-wide"
          >
            <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
            AI Quality Guard Active
          </Badge>
        </div>
      </div>

      {/* ── Blocked Modal ── */}
      <Dialog open={showBlockedModal} onOpenChange={setShowBlockedModal}>
        <DialogContent className="sm:max-w-lg border-2 border-[#d13438] rounded-xl p-0 overflow-hidden">
          {/* Red warning banner */}
          <div className="bg-gradient-to-r from-[#d13438] to-[#a4262c] px-6 py-4">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-8 w-8 text-white" />
              <DialogHeader className="p-0 space-y-0">
                <DialogTitle className="text-white text-xl font-bold">
                  ACTION BLOCKED
                </DialogTitle>
                <DialogDescription className="text-white/80 text-sm">
                  Insufficient skill level detected
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            {/* Warning icon + main message */}
            <div className="flex items-start gap-4 mb-5">
              <div className="h-12 w-12 rounded-full bg-[#fed9cc] flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-[#d13438]" />
              </div>
              <div>
                <p className="text-[#323130] font-semibold text-base">
                  Skill Level L{verifyResult?.currentLevel ?? 1} detected.
                  Minimum L{verifyResult?.requiredLevel ?? 2} required for this
                  station.
                </p>
                {verifyResult?.employeeName && (
                  <p className="text-[#605e5c] text-sm mt-1">
                    Operator:{" "}
                    <span className="font-medium">{verifyResult.employeeName}</span>{" "}
                    &middot; Domain: {verifyResult.domain}
                  </p>
                )}
              </div>
            </div>

            {/* IATF warning text */}
            <div className="bg-[#fff4ce] border border-[#f7d87c] rounded-lg px-4 py-3 mb-5">
              <p className="text-[#835b00] text-sm leading-relaxed">
                {verifyResult?.message ||
                  "IATF 16949 §7.2 — Personnel performing work affecting product quality shall be competent on the basis of appropriate education, training, skills, and experience."}
              </p>
            </div>

            {/* Supervisor authorization */}
            <div className="bg-[#faf9f8] border border-[#edebe9] rounded-lg px-4 py-3 flex items-center gap-3">
              <Shield className="h-5 w-5 text-[#8a8886]" />
              <p className="text-[#605e5c] text-sm font-medium">
                Supervisor authorization needed to override this block.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-[#edebe9] px-6 py-4 flex justify-end">
            <Button
              onClick={() => setShowBlockedModal(false)}
              variant="outline"
              className="h-11 px-8 text-base border-[#8a8886] hover:bg-[#f3f2f1]"
            >
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
