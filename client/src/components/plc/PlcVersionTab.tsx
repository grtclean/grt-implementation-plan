/**
 * PLC Version Management Tab — Version lifecycle timeline
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  GitBranch, ArrowUpCircle, RotateCcw, Plus,
  Check, X, Clock, FileText, ArrowRight,
} from "lucide-react";

interface PlcVersionTabProps {
  projectId: number;
  plcProjectId: number | null;
}

const STATUS_COLOR: Record<string, string> = {
  dev: "bg-blue-100 text-blue-800",
  test: "bg-yellow-100 text-yellow-800",
  production: "bg-green-100 text-green-800",
};

const STATUS_LABEL: Record<string, string> = {
  dev: "开发版",
  test: "试验版",
  production: "生产版",
};

const APPROVAL_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default function PlcVersionTab({ projectId, plcProjectId }: PlcVersionTabProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newVersion, setNewVersion] = useState("");
  const [changeLog, setChangeLog] = useState("");

  const versions = trpc.designEngine.plcGetVersionHistory.useQuery(
    { plcProjectId: plcProjectId || 0 },
    { enabled: !!plcProjectId }
  );

  const createVersion = trpc.designEngine.plcCreateVersion.useMutation({
    onSuccess: () => {
      toast.success("新版本已创建");
      setShowCreate(false);
      setNewVersion("");
      setChangeLog("");
      versions.refetch();
    },
    onError: (e) => toast.error(`创建失败: ${e.message}`),
  });

  const promoteVersion = trpc.designEngine.plcPromoteVersion.useMutation({
    onSuccess: (data) => {
      toast.success(`版本已提升: ${data.versionString}`);
      versions.refetch();
    },
    onError: (e) => toast.error(`提升失败: ${e.message}`),
  });

  const rollbackVersion = trpc.designEngine.plcRollbackVersion.useMutation({
    onSuccess: (data) => {
      toast.success(`已回退到: ${data.rolledBackTo}`);
      versions.refetch();
    },
    onError: (e) => toast.error(`回退失败: ${e.message}`),
  });

  if (!plcProjectId) {
    return <div className="text-center py-20 text-muted-foreground">请先创建PLC项目</div>;
  }

  if (versions.isLoading) return <Skeleton className="h-96" />;

  const versionList = versions.data || [];

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1">
          <GitBranch className="h-4 w-4" />
          版本管理
          <Badge variant="secondary">{versionList.length} 个版本</Badge>
        </h3>
        <Button size="sm" onClick={() => setShowCreate(true)} disabled={showCreate}>
          <Plus className="h-4 w-4 mr-1" />
          创建新版本
        </Button>
      </div>

      {/* Create version form */}
      {showCreate && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="版本号, 例如 V1.0.1-dev"
                value={newVersion}
                onChange={e => setNewVersion(e.target.value)}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={() => createVersion.mutate({
                  plcProjectId: plcProjectId!,
                  versionString: newVersion,
                  changeLog,
                })}
                disabled={!newVersion || createVersion.isPending}
              >
                <Check className="h-4 w-4 mr-1" />
                创建
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              placeholder="变更日志..."
              value={changeLog}
              onChange={e => setChangeLog(e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>
      )}

      {/* Version timeline */}
      <div className="space-y-3">
        {versionList.map((v, idx) => {
          const testResults = (v.testResults || {}) as { fatPassed?: boolean; satPassed?: boolean; notes?: string };
          const isActive = v.isActive;
          const nextPromotion = v.versionType === "dev" ? "test" : v.versionType === "test" ? "production" : null;

          return (
            <Card key={v.id} className={`${isActive ? "ring-2 ring-primary" : "opacity-75"}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-sm">{v.versionString}</span>
                      <Badge className={STATUS_COLOR[v.versionType || "dev"]}>{STATUS_LABEL[v.versionType || "dev"]}</Badge>
                      {isActive && <Badge variant="default" className="text-[10px]">当前</Badge>}
                      {v.isFrozen && <Badge variant="outline" className="text-[10px]">已冻结</Badge>}
                      {v.approvalStatus && v.approvalStatus !== "pending" && (
                        <Badge variant="outline" className={APPROVAL_COLOR[v.approvalStatus]}>
                          {v.approvalStatus === "approved" ? "已批准" : "已拒绝"}
                        </Badge>
                      )}
                    </div>

                    {v.changeLog && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                        <FileText className="h-3 w-3 mt-0.5 shrink-0" />
                        {v.changeLog}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {v.createdAt ? new Date(v.createdAt).toLocaleString("zh-CN") : "—"}
                      </span>
                      {v.promotedBy && <span>由 {v.promotedBy} 提升</span>}
                      {v.promotedAt && <span>@ {new Date(v.promotedAt).toLocaleString("zh-CN")}</span>}
                    </div>

                    {/* Test results */}
                    {(testResults.fatPassed !== undefined || testResults.satPassed !== undefined) && (
                      <div className="flex items-center gap-3 mt-1 text-xs">
                        {testResults.fatPassed !== undefined && (
                          <span className={testResults.fatPassed ? "text-green-600" : "text-red-600"}>
                            FAT: {testResults.fatPassed ? "PASS" : "FAIL"}
                          </span>
                        )}
                        {testResults.satPassed !== undefined && (
                          <span className={testResults.satPassed ? "text-green-600" : "text-red-600"}>
                            SAT: {testResults.satPassed ? "PASS" : "FAIL"}
                          </span>
                        )}
                        {testResults.notes && <span className="text-muted-foreground">{testResults.notes}</span>}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {nextPromotion && !v.isFrozen && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => promoteVersion.mutate({
                          plcProjectId: plcProjectId!,
                          from: v.versionType as "dev" | "test",
                          to: nextPromotion as "test" | "production",
                          changeLog: v.changeLog || "Promoted via UI",
                        })}
                        disabled={promoteVersion.isPending}
                      >
                        <ArrowUpCircle className="h-3.5 w-3.5 mr-1" />
                        提升至{STATUS_LABEL[nextPromotion]}
                      </Button>
                    )}
                    {!isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => rollbackVersion.mutate({
                          plcProjectId: plcProjectId!,
                          targetVersionId: v.id,
                        })}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        回退
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {versionList.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            暂无版本记录,点击"创建新版本"开始版本管理
          </div>
        )}
      </div>
    </div>
  );
}
