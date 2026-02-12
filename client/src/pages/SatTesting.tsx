/**
 * SAT测试页面 (TX-014)
 * 现场验收测试、测试报告、缺陷跟踪
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { TestTube, Plus, Building2, CheckCircle2, XCircle, Clock, FileText, AlertTriangle } from "lucide-react";

const MOCK_TESTS = [
  { id: "SAT-001", project: "缸体清洗线", customer: "上海大众", bu: "BU3", status: "测试中", passRate: 85, totalItems: 48, passed: 41, failed: 3, pending: 4 },
  { id: "SAT-002", project: "半导体清洗", customer: "英飞凌", bu: "BU4", status: "已通过", passRate: 100, totalItems: 32, passed: 32, failed: 0, pending: 0 },
  { id: "SAT-003", project: "商用车清洗", customer: "潍柴动力", bu: "BU2", status: "待测试", passRate: 0, totalItems: 36, passed: 0, failed: 0, pending: 36 },
];

export default function SatTesting() {
  const { currentBU } = useUserProfile();
  const filtered = MOCK_TESTS.filter(t => !currentBU || t.bu === currentBU);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><TestTube className="h-6 w-6 text-primary" />SAT测试</h1>
          <p className="text-muted-foreground mt-1">TX-014 · 现场验收测试管理</p>
        </div>
        <div className="flex gap-2">
          {currentBU && <Badge variant="outline"><Building2 className="h-3 w-3 mr-1" />{currentBU}</Badge>}
          <Button><Plus className="h-4 w-4 mr-2" />新建测试计划</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><p className="text-2xl font-bold">8</p><p className="text-sm text-muted-foreground">测试计划总数</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-2xl font-bold text-blue-600">3</p><p className="text-sm text-muted-foreground">测试中</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-2xl font-bold text-green-600">4</p><p className="text-sm text-muted-foreground">已通过</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-2xl font-bold text-red-600">1</p><p className="text-sm text-muted-foreground">有缺陷</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>SAT测试列表</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filtered.map(t => (
              <div key={t.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">{t.id}</span>
                    <Badge variant="outline">{t.bu}</Badge>
                  </div>
                  <p className="font-medium mt-1">{t.project} - {t.customer}</p>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" />{t.passed}通过</span>
                    <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-red-500" />{t.failed}失败</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-amber-500" />{t.pending}待测</span>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={t.status === "已通过" ? "bg-green-100 text-green-700" : t.status === "测试中" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}>{t.status}</Badge>
                  <p className="text-lg font-bold mt-1">{t.passRate}%</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
