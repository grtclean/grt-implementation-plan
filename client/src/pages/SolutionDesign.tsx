/**
 * 方案设计页面 (TX-002)
 * 清洗方案配置、3D布局、技术参数计算
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { Lightbulb, Plus, FileText, CheckCircle2, Clock, Building2, Layers, Settings } from "lucide-react";

const MOCK_SOLUTIONS = [
  { id: "SOL-001", project: "缸体清洗线", customer: "上海大众", status: "设计中", bu: "BU3", version: "V2.1", engineer: "王工" },
  { id: "SOL-002", project: "变速箱清洗方案", customer: "宝马慕尼黑", status: "已评审", bu: "BU1", version: "V1.0", engineer: "李工" },
  { id: "SOL-003", project: "晶圆清洗设备", customer: "英飞凌", status: "修改中", bu: "BU4", version: "V3.2", engineer: "张工" },
];

export default function SolutionDesign() {
  const { currentBU } = useUserProfile();
  const filtered = MOCK_SOLUTIONS.filter(s => !currentBU || s.bu === currentBU);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-primary" />方案设计
          </h1>
          <p className="text-muted-foreground mt-1">TX-002 · 清洗方案配置与技术评审</p>
        </div>
        <div className="flex gap-2">
          {currentBU && <Badge variant="outline"><Building2 className="h-3 w-3 mr-1" />{currentBU}</Badge>}
          <Button><Plus className="h-4 w-4 mr-2" />新建方案</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold">12</p><p className="text-sm text-muted-foreground">进行中方案</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-green-600">8</p><p className="text-sm text-muted-foreground">已通过评审</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-amber-600">3</p><p className="text-sm text-muted-foreground">待修改</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>方案列表</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filtered.map(sol => (
              <div key={sol.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer">
                <Layers className="h-10 w-10 text-primary/20" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">{sol.id}</span>
                    <Badge variant="outline">{sol.bu}</Badge>
                    <Badge variant="secondary">{sol.version}</Badge>
                  </div>
                  <p className="font-medium mt-1">{sol.project}</p>
                  <p className="text-sm text-muted-foreground">客户: {sol.customer} · 工程师: {sol.engineer}</p>
                </div>
                <Badge className={sol.status === "已评审" ? "bg-green-100 text-green-700" : sol.status === "修改中" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}>
                  {sol.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
