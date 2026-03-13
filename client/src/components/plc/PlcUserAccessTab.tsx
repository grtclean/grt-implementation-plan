/**
 * PLC User Access Tab — HMI user authorization level configuration
 */

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Shield, Users, Lock, Clock } from "lucide-react";

interface PlcUserAccessTabProps {
  projectId: number;
  plcProjectId: number | null;
}

const LEVEL_COLOR = ["bg-gray-100", "bg-green-100", "bg-blue-100", "bg-orange-100", "bg-red-100"];
const LEVEL_ICON_COLOR = ["text-gray-500", "text-green-600", "text-blue-600", "text-orange-600", "text-red-600"];

const PERMISSION_LABELS: Record<string, string> = {
  viewProcess: "查看工艺画面",
  adjustParams: "调整工艺参数",
  changeRecipe: "切换/修改配方",
  manualMode: "手动模式操作",
  serviceMode: "维修模式",
  systemConfig: "系统配置",
  userAdmin: "用户管理",
};

export default function PlcUserAccessTab({ projectId, plcProjectId }: PlcUserAccessTabProps) {
  const accessLevels = trpc.designEngine.plcGetAccessLevels.useQuery(
    { plcProjectId: plcProjectId || 0 },
    { enabled: !!plcProjectId }
  );
  const updateLevel = trpc.designEngine.plcUpdateAccessLevel.useMutation({
    onSuccess: () => { toast.success("权限已更新"); accessLevels.refetch(); },
  });

  if (!plcProjectId) {
    return <div className="text-center py-20 text-muted-foreground">请先创建PLC项目</div>;
  }

  if (accessLevels.isLoading) return <Skeleton className="h-96" />;

  const levels = accessLevels.data || [];

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold flex items-center gap-1">
        <Shield className="h-4 w-4" />
        用户授权等级
        <Badge variant="secondary">{levels.length} 个等级</Badge>
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {levels.map((level, idx) => {
          const perms = (level.permissions || {}) as Record<string, boolean>;
          const policy = (level.passwordPolicy || {}) as Record<string, unknown>;
          const users = (level.defaultUsers || []) as Array<{ username: string; realName: string; role: string }>;

          return (
            <Card key={level.id} className={LEVEL_COLOR[idx] || "bg-gray-50"}>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className={`h-4 w-4 ${LEVEL_ICON_COLOR[idx] || ""}`} />
                  <span>Level {level.levelNumber}: {level.levelName}</span>
                </CardTitle>
                <p className="text-xs text-muted-foreground">{level.levelNameEn}</p>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                {/* Permissions */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-semibold flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    权限
                  </h4>
                  {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Checkbox
                        checked={!!perms[key]}
                        onCheckedChange={(checked) => {
                          updateLevel.mutate({
                            id: level.id,
                            permissions: { ...perms, [key]: !!checked },
                          });
                        }}
                        className="h-3.5 w-3.5"
                      />
                      <Label className="text-xs cursor-pointer">{label}</Label>
                    </div>
                  ))}
                </div>

                {/* Timeout */}
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">超时:</span>
                  <span className="text-xs font-mono">{level.timeout || 1800}s</span>
                  <span className="text-xs text-muted-foreground">({Math.round((level.timeout || 1800) / 60)}分钟)</span>
                </div>

                {/* Default users */}
                {users.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold">默认用户</h4>
                    {users.map((u, i) => (
                      <div key={i} className="text-xs flex gap-1">
                        <Badge variant="outline" className="text-[9px]">{u.role}</Badge>
                        <span>{u.realName} ({u.username})</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Password policy */}
                {Object.keys(policy).length > 0 && (
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-semibold">密码策略</h4>
                    {policy.minLength && <div className="text-[10px] text-muted-foreground">最小长度: {String(policy.minLength)}</div>}
                    {policy.maxAttempts && <div className="text-[10px] text-muted-foreground">最大尝试: {String(policy.maxAttempts)}</div>}
                    {policy.lockoutMinutes && <div className="text-[10px] text-muted-foreground">锁定: {String(policy.lockoutMinutes)}分钟</div>}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {levels.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          请先在"PLC程序架构"中生成架构,将自动创建4个默认授权等级
        </div>
      )}
    </div>
  );
}
