/**
 * 终验收页面 (TX-015)
 * 最终验收管理、签收确认、验收报告
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { CheckCircle, Plus, Building2, FileText, Award, Clock, Users } from "lucide-react";

const MOCK_ACCEPTANCES = [
  { id: "ACC-001", project: "半导体清洗设备", customer: "英飞凌", bu: "BU4", status: "已验收", date: "2026-01-25", signedBy: "Dr. Mueller", score: 98 },
  { id: "ACC-002", project: "缸体清洗线", customer: "上海大众", bu: "BU3", status: "验收中", date: "2026-02-15", signedBy: "-", score: 0 },
  { id: "ACC-003", project: "商用车清洗线", customer: "潍柴动力", bu: "BU2", status: "待验收", date: "2026-03-10", signedBy: "-", score: 0 },
];

export default function FinalAcceptance() {
  const { currentBU } = useUserProfile();
  const filtered = MOCK_ACCEPTANCES.filter(a => !currentBU || a.bu === currentBU);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><CheckCircle className="h-6 w-6 text-primary" />终验收</h1>
          <p className="text-muted-foreground mt-1">TX-015 · 设备最终验收与签收管理</p>
        </div>
        <div className="flex gap-2">
          {currentBU && <Badge variant="outline"><Building2 className="h-3 w-3 mr-1" />{currentBU}</Badge>}
          <Button><Plus className="h-4 w-4 mr-2" />创建验收单</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-green-600">15</p><p className="text-sm text-muted-foreground">已验收</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-blue-600">3</p><p className="text-sm text-muted-foreground">验收中</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-amber-600">2</p><p className="text-sm text-muted-foreground">待验收</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>验收列表</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filtered.map(a => (
              <div key={a.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer">
                <Award className="h-10 w-10 text-primary/20" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">{a.id}</span>
                    <Badge variant="outline">{a.bu}</Badge>
                  </div>
                  <p className="font-medium mt-1">{a.project} - {a.customer}</p>
                  <p className="text-sm text-muted-foreground">计划日期: {a.date} · 签收人: {a.signedBy}</p>
                </div>
                <div className="text-right">
                  <Badge className={a.status === "已验收" ? "bg-green-100 text-green-700" : a.status === "验收中" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}>{a.status}</Badge>
                  {a.score > 0 && <p className="text-lg font-bold mt-1">{a.score}分</p>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
