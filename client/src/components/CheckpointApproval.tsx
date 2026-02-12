/**
 * 检查点审批组件
 * 支持审批通过/驳回，并自动发送通知
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, MessageSquare, Send, AlertTriangle } from "lucide-react";

interface Checkpoint {
  id: string;
  question: string;
  confirmBy: string;
  requiredConfirmation: boolean;
  phaseCode: string;
  phaseName?: string;
}

interface CheckpointApprovalProps {
  projectId: string;
  projectName: string;
  checkpoint: Checkpoint;
  onApprovalComplete?: (checkpointId: string, status: "approved" | "rejected") => void;
}

export function CheckpointApproval({ 
  projectId, 
  projectName, 
  checkpoint, 
  onApprovalComplete 
}: CheckpointApprovalProps) {
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [approveComments, setApproveComments] = useState("");
  const [rejectComments, setRejectComments] = useState("");
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");

  const approveMutation = trpc.capabilityOs.approveCheckpoint.useMutation({
    onSuccess: () => {
      toast.success("检查点已批准，通知已发送");
      setStatus("approved");
      setIsApproveDialogOpen(false);
      onApprovalComplete?.(checkpoint.id, "approved");
    },
    onError: (error) => {
      toast.error(`批准失败: ${error.message}`);
    },
  });

  const rejectMutation = trpc.capabilityOs.rejectCheckpoint.useMutation({
    onSuccess: () => {
      toast.warning("检查点已驳回，通知已发送");
      setStatus("rejected");
      setIsRejectDialogOpen(false);
      onApprovalComplete?.(checkpoint.id, "rejected");
    },
    onError: (error) => {
      toast.error(`驳回失败: ${error.message}`);
    },
  });

  const handleApprove = () => {
    approveMutation.mutate({
      projectId,
      projectName,
      phaseCode: checkpoint.phaseCode,
      phaseName: checkpoint.phaseName || checkpoint.phaseCode,
      checkpointId: checkpoint.id,
      checkpointName: checkpoint.question,
      comments: approveComments || undefined,
    });
  };

  const handleReject = () => {
    if (!rejectComments.trim()) {
      toast.error("请填写驳回原因");
      return;
    }
    rejectMutation.mutate({
      projectId,
      projectName,
      phaseCode: checkpoint.phaseCode,
      phaseName: checkpoint.phaseName || checkpoint.phaseCode,
      checkpointId: checkpoint.id,
      checkpointName: checkpoint.question,
      comments: rejectComments,
    });
  };

  const getStatusBadge = () => {
    switch (status) {
      case "approved":
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            已批准
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            已驳回
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            待审批
          </Badge>
        );
    }
  };

  return (
    <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          {getStatusBadge()}
          {checkpoint.requiredConfirmation && (
            <Badge variant="outline" className="text-orange-500 border-orange-500">
              <AlertTriangle className="w-3 h-3 mr-1" />
              必须确认
            </Badge>
          )}
        </div>
        <p className="font-medium text-foreground">{checkpoint.question}</p>
        <p className="text-sm text-muted-foreground mt-1">
          确认人: {checkpoint.confirmBy} | 阶段: {checkpoint.phaseCode}
        </p>
      </div>

      {status === "pending" && (
        <div className="flex gap-2">
          {/* 批准对话框 */}
          <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="default" className="bg-green-500 hover:bg-green-600">
                <CheckCircle2 className="w-4 h-4 mr-1" />
                批准
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>批准检查点</DialogTitle>
                <DialogDescription>
                  确认批准此检查点？批准后将自动通知项目经理和相关干系人。
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="p-3 rounded-lg bg-muted">
                  <p className="font-medium">{checkpoint.question}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    阶段: {checkpoint.phaseCode} | 确认人: {checkpoint.confirmBy}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="approve-comments">备注（可选）</Label>
                  <Textarea
                    id="approve-comments"
                    placeholder="添加批准备注..."
                    value={approveComments}
                    onChange={(e) => setApproveComments(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
                  取消
                </Button>
                <Button 
                  onClick={handleApprove} 
                  disabled={approveMutation.isPending}
                  className="bg-green-500 hover:bg-green-600"
                >
                  {approveMutation.isPending ? (
                    <>处理中...</>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-1" />
                      确认批准并通知
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 驳回对话框 */}
          <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="destructive">
                <XCircle className="w-4 h-4 mr-1" />
                驳回
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>驳回检查点</DialogTitle>
                <DialogDescription>
                  请填写驳回原因，驳回后将自动通知工程师和项目经理。
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="p-3 rounded-lg bg-muted">
                  <p className="font-medium">{checkpoint.question}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    阶段: {checkpoint.phaseCode} | 确认人: {checkpoint.confirmBy}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reject-comments">
                    驳回原因 <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="reject-comments"
                    placeholder="请详细说明驳回原因..."
                    value={rejectComments}
                    onChange={(e) => setRejectComments(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
                  取消
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleReject} 
                  disabled={rejectMutation.isPending || !rejectComments.trim()}
                >
                  {rejectMutation.isPending ? (
                    <>处理中...</>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-1" />
                      确认驳回并通知
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}

// 阶段完成通知组件
interface PhaseCompletionProps {
  projectId: string;
  projectName: string;
  phaseCode: string;
  phaseName: string;
  checkpoints: Array<{ id: string; approved: boolean }>;
  onComplete?: () => void;
}

export function PhaseCompletionNotifier({
  projectId,
  projectName,
  phaseCode,
  phaseName,
  checkpoints,
  onComplete,
}: PhaseCompletionProps) {
  const completePhaseMutation = trpc.capabilityOs.completePhase.useMutation({
    onSuccess: () => {
      toast.success("阶段完成通知已发送");
      onComplete?.();
    },
    onError: (error) => {
      toast.error(`通知发送失败: ${error.message}`);
    },
  });

  const allApproved = checkpoints.every((cp) => cp.approved);
  const approvedCount = checkpoints.filter((cp) => cp.approved).length;

  const handleCompletePhase = () => {
    if (!allApproved) {
      toast.error("还有检查点未通过审批");
      return;
    }
    completePhaseMutation.mutate({
      projectId,
      projectName,
      phaseCode,
      phaseName,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          {phaseName} 阶段进度
        </CardTitle>
        <CardDescription>
          已完成 {approvedCount} / {checkpoints.length} 个检查点
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${(approvedCount / checkpoints.length) * 100}%` }}
            />
          </div>
          {allApproved ? (
            <Button
              onClick={handleCompletePhase}
              disabled={completePhaseMutation.isPending}
              className="w-full"
            >
              {completePhaseMutation.isPending ? (
                <>处理中...</>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  发送阶段完成通知
                </>
              )}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              完成所有检查点后可发送阶段完成通知
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default CheckpointApproval;
