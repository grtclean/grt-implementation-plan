/**
 * 机械设计页面 (TX-003)
 * 机械结构设计、图纸管理、设计变更
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { Cog, Plus, FileText, Upload, Download, Building2, CheckCircle2, Clock, AlertCircle } from "lucide-react";

const MOCK_DESIGNS = [
  { id: "MD-001", name: "清洗槽体结构设计", project: "缸体清洗线", status: "设计中", bu: "BU3", rev: "R3", engineer: "王工", progress: 75 },
  { id: "MD-002", name: "传送机构总装图", project: "变速箱清洗", status: "已审核", bu: "BU1", rev: "R1", engineer: "李工", progress: 100 },
  { id: "MD-003", name: "干燥室结构设计", project: "晶圆清洗", status: "审核中", bu: "BU4", rev: "R2", engineer: "张工", progress: 90 },
  { id: "MD-004", name: "框架结构优化", project: "柴油机清洗", status: "设计中", bu: "BU2", rev: "R1", engineer: "赵工", progress: 40 },
];

export default function MechanicalDesign() {
  const { currentBU } = useUserProfile();
  const filtered = MOCK_DESIGNS.filter(d => !currentBU || d.bu === currentBU);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Cog className="h-6 w-6 text-primary" />机械设计</h1>
          <p className="text-muted-foreground mt-1">TX-003 · 机械结构设计与图纸管理</p>
        </div>
        <div className="flex gap-2">
          {currentBU && <Badge variant="outline"><Building2 className="h-3 w-3 mr-1" />{currentBU}</Badge>}
          <Button><Plus className="h-4 w-4 mr-2" />新建设计</Button>
          <Button variant="outline"><Upload className="h-4 w-4 mr-2" />上传图纸</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><p className="text-2xl font-bold">18</p><p className="text-sm text-muted-foreground">总设计任务</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-2xl font-bold text-blue-600">7</p><p className="text-sm text-muted-foreground">设计中</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-2xl font-bold text-amber-600">3</p><p className="text-sm text-muted-foreground">审核中</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-2xl font-bold text-green-600">8</p><p className="text-sm text-muted-foreground">已完成</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>设计任务列表</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filtered.map(d => (
              <div key={d.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">{d.id}</span>
                    <Badge variant="outline">{d.bu}</Badge>
                    <Badge variant="secondary">{d.rev}</Badge>
                  </div>
                  <p className="font-medium mt-1">{d.name}</p>
                  <p className="text-sm text-muted-foreground">项目: {d.project} · 工程师: {d.engineer}</p>
                </div>
                <div className="text-right space-y-1">
                  <Badge className={d.status === "已审核" ? "bg-green-100 text-green-700" : d.status === "审核中" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}>{d.status}</Badge>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${d.progress}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{d.progress}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
