/**
 * 阶段门管理 Tab - 检查清单与状态管理
 * 使用Mock数据，后续对接tRPC
 */
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { STAGES, CHECKLIST_STATUSES, M5_REVIEW_CATEGORIES } from "../../../../shared/stage-definitions";
import {
  CheckCircle, XCircle, Clock, AlertTriangle, Shield,
  FileCheck, ArrowRight, Settings, Inbox,
} from "lucide-react";

interface MockCheckItem {
  id: number;
  checkItem: string;
  status: "pending" | "pass" | "fail";
  isMandatory: boolean;
  autoVerifySource?: string;
}

const MOCK_CHECKLISTS: Record<string, MockCheckItem[]> = {
  M3: [
    { id: 1, checkItem: "商业价值评估完成", status: "pass", isMandatory: true },
    { id: 2, checkItem: "项目范围定义确认", status: "pass", isMandatory: true },
    { id: 3, checkItem: "资源配置计划审批", status: "pending", isMandatory: false },
    { id: 4, checkItem: "RACI矩阵确认", status: "pending", isMandatory: false },
    { id: 5, checkItem: "风险评估报告", status: "fail", isMandatory: true },
  ],
  M4: [
    { id: 6, checkItem: "机械方案评审通过", status: "pass", isMandatory: true },
    { id: 7, checkItem: "电气方案评审通过", status: "pass", isMandatory: true },
    { id: 8, checkItem: "质量方案确认", status: "pending", isMandatory: true },
    { id: 9, checkItem: "采购BOM初版确认", status: "pending", isMandatory: false },
  ],
  M5: [
    { id: 10, checkItem: "3D模型最终版发布", status: "pass", isMandatory: true, autoVerifySource: "PLM_Model_Status" },
    { id: 11, checkItem: "加工图纸完成", status: "pass", isMandatory: true, autoVerifySource: "PLM_Drawing_Status" },
    { id: 12, checkItem: "PLC程序设计完成", status: "pending", isMandatory: true },
    { id: 13, checkItem: "BOM与3D模型一致性", status: "fail", isMandatory: true, autoVerifySource: "ERP_BOM_Consistency" },
    { id: 14, checkItem: "结构仿真通过", status: "pass", isMandatory: false },
  ],
};

const statusIcons: Record<string, React.ComponentType<{className?: string}>> = {
  pending: Clock, pass: CheckCircle, fail: XCircle,
};

function getStatusBadge(status: string) {
  const config = CHECKLIST_STATUSES[status as keyof typeof CHECKLIST_STATUSES];
  const Icon = statusIcons[status] || Clock;
  return (
    <Badge variant="outline" className={config?.color || ""}>
      <Icon className="w-3 h-3 mr-1" />{config?.label || status}
    </Badge>
  );
}

export default function GateManagement() {
  const [selectedStage, setSelectedStage] = useState("M5");
  const items = MOCK_CHECKLISTS[selectedStage] || [];
  const passCount = items.filter(i => i.status === "pass").length;
  const progress = items.length > 0 ? Math.round((passCount / items.length) * 100) : 0;
  const hasMandFail = items.some(i => i.isMandatory && i.status === "fail");
  const currentStage = STAGES.find(s => s.id === selectedStage);

  return (
    <div className="space-y-4">
      {/* 阶段选择器 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {STAGES.map((stage, index) => (
              <div key={stage.id} className="flex items-center">
                <button className={"flex flex-col items-center p-2 rounded-lg transition-colors min-w-[56px] " + (selectedStage === stage.id ? "bg-primary/20 border border-primary" : "bg-muted/30 hover:bg-muted/50")} onClick={() => setSelectedStage(stage.id)}>
                  <div className={"w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold " + (selectedStage === stage.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{stage.id}</div>
                  <span className="text-[10px] mt-1 text-muted-foreground whitespace-nowrap">{stage.name}</span>
                </button>
                {index < STAGES.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground mx-0.5 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 标题和管理链接 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{currentStage?.id} - {currentStage?.name}</h3>
          <p className="text-sm text-muted-foreground">{currentStage?.description}</p>
        </div>
        <Link href="/gate-checklist-settings">
          <Button variant="outline" size="sm"><Settings className="w-4 h-4 mr-1" />检查项配置</Button>
        </Link>
      </div>

      {/* 进度条 */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">阶段完成度</span>
            <span className="text-sm font-bold">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          {hasMandFail && (
            <div className="mt-2 flex items-center gap-2 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4" />存在一票否决项未通过
            </div>
          )}
        </CardContent>
      </Card>

      {/* 检查项列表 */}
      <div className="space-y-3">
        {items.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Inbox className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>该阶段暂无检查项</p>
            </CardContent>
          </Card>
        ) : items.map((item) => (
          <Card key={item.id} className={"border-l-4 hover:shadow-md transition-shadow " + (item.status === "pass" ? "border-l-green-500" : item.status === "fail" ? "border-l-red-500" : "border-l-yellow-500")}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium">{item.checkItem}</span>
                    {item.isMandatory && (
                      <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
                        <Shield className="w-3 h-3 mr-1" />一票否决
                      </Badge>
                    )}
                    {getStatusBadge(item.status)}
                  </div>
                  {item.autoVerifySource && (
                    <p className="text-xs text-muted-foreground">自动验证源: {item.autoVerifySource}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
