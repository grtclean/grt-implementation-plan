/**
 * 电气设计页面 (TX-004)
 * 电气控制系统设计、PLC程序、电气图纸管理
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { Zap, Plus, Upload, Building2, Cpu, FileText } from "lucide-react";

const MOCK_DESIGNS = [
  { id: "ED-001", name: "主控PLC程序设计", project: "缸体清洗线", status: "编程中", bu: "BU3", engineer: "陈工", progress: 60 },
  { id: "ED-002", name: "HMI界面开发", project: "变速箱清洗", status: "已完成", bu: "BU1", engineer: "周工", progress: 100 },
  { id: "ED-003", name: "电气原理图设计", project: "晶圆清洗", status: "审核中", bu: "BU4", engineer: "吴工", progress: 85 },
  { id: "ED-004", name: "IO分配表", project: "柴油机清洗", status: "编程中", bu: "BU2", engineer: "郑工", progress: 30 },
];

export default function ElectricalDesign() {
  const { currentBU } = useUserProfile();
  const filtered = MOCK_DESIGNS.filter(d => !currentBU || d.bu === currentBU);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Zap className="h-6 w-6 text-primary" />电气设计</h1>
          <p className="text-muted-foreground mt-1">TX-004 · 电气控制系统设计与PLC编程</p>
        </div>
        <div className="flex gap-2">
          {currentBU && <Badge variant="outline"><Building2 className="h-3 w-3 mr-1" />{currentBU}</Badge>}
          <Button><Plus className="h-4 w-4 mr-2" />新建设计</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><p className="text-2xl font-bold">15</p><p className="text-sm text-muted-foreground">总设计任务</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-2xl font-bold text-blue-600">5</p><p className="text-sm text-muted-foreground">编程中</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-2xl font-bold text-amber-600">2</p><p className="text-sm text-muted-foreground">审核中</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-2xl font-bold text-green-600">8</p><p className="text-sm text-muted-foreground">已完成</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>电气设计任务</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filtered.map(d => (
              <div key={d.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer">
                <Cpu className="h-10 w-10 text-primary/20" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">{d.id}</span>
                    <Badge variant="outline">{d.bu}</Badge>
                  </div>
                  <p className="font-medium mt-1">{d.name}</p>
                  <p className="text-sm text-muted-foreground">项目: {d.project} · 工程师: {d.engineer}</p>
                </div>
                <div className="text-right space-y-1">
                  <Badge className={d.status === "已完成" ? "bg-green-100 text-green-700" : d.status === "审核中" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}>{d.status}</Badge>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${d.progress}%` }} /></div>
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
