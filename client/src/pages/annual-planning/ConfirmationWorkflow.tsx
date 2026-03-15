/**
 * ConfirmationWorkflow — Approve KPIs and trigger event bus downstream
 *
 * Calls annualPlanning.approveKPIs → emits planning.budget.approved event
 * which triggers reactions in payroll + project lifecycle sandboxes.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Loader2, Shield, Send, AlertTriangle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface ConfirmationWorkflowProps {
  interpretation: any;
  year: number;
  onComplete: () => void;
}

export default function ConfirmationWorkflow({ interpretation, year, onComplete }: ConfirmationWorkflowProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [approved, setApproved] = useState(false);

  const approveMutation = (trpc.annualPlanning as any).approveKPIs.useMutation({
    onSuccess: (data: any) => {
      setApproved(true);
      toast.success(`${data.message} — Event bus notifications sent to downstream sandboxes`);
    },
    onError: (err: any) => {
      toast.error(`Approval failed: ${err.message}`);
    },
  });

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await approveMutation.mutateAsync({ year });
    } finally {
      setIsApproving(false);
    }
  };

  const analysisData = typeof interpretation === 'string'
    ? (() => { try { return JSON.parse(interpretation); } catch { return null; } })()
    : interpretation;

  return (
    <div className="space-y-6">
      {/* Approval status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            KPI Confirmation & Approval — {year}
          </CardTitle>
          <CardDescription>
            Review the AI analysis results and approve KPIs to activate downstream system reactions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Pre-approval summary */}
          {analysisData && (
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 border rounded-lg text-center">
                <div className="text-2xl font-bold">{analysisData.totalKPIs ?? '—'}</div>
                <div className="text-xs text-muted-foreground">Total KPIs</div>
              </div>
              <div className="p-3 border rounded-lg text-center">
                <div className="text-2xl font-bold">{analysisData.score ?? '—'}/100</div>
                <div className="text-xs text-muted-foreground">Quality Score</div>
              </div>
              <div className="p-3 border rounded-lg text-center">
                <div className="text-2xl font-bold">{analysisData.grade ?? '—'}</div>
                <div className="text-xs text-muted-foreground">Grade</div>
              </div>
            </div>
          )}

          {/* Risk warnings before approval */}
          {analysisData?.risks?.filter((r: any) => r.level === 'high').length > 0 && !approved && (
            <Alert className="bg-yellow-500/10 border-yellow-500/20">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                {analysisData.risks.filter((r: any) => r.level === 'high').length} high-risk items detected.
                Review AI recommendations before approving.
              </AlertDescription>
            </Alert>
          )}

          {/* Downstream effects explanation */}
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Approval triggers the following system reactions:</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Event Bus</Badge>
                <span className="text-muted-foreground">planning.budget.approved → Payroll & Project sandboxes notified</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">DB</Badge>
                <span className="text-muted-foreground">KPI items marked as completed in annualPlanningItems</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Audit</Badge>
                <span className="text-muted-foreground">Approval logged in annualPlanningUpdateLogs</span>
              </div>
            </CardContent>
          </Card>

          {/* Action buttons */}
          {!approved ? (
            <div className="flex gap-4">
              <Button
                onClick={handleApprove}
                disabled={isApproving}
                className="flex-1"
                size="lg"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Approve KPIs & Activate / 批准并激活
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Alert className="bg-green-500/10 border-green-500/20">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                {year} KPIs approved successfully. Event bus notifications sent.
                <Button variant="link" size="sm" className="ml-2" onClick={onComplete}>
                  <Send className="w-3 h-3 mr-1" />
                  Go to Execution Dashboard
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
