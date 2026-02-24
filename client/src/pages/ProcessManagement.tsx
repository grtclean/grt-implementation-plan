/**
 * 工序管理页面
 * 生产工序定义、工序流程、工时统计
 */
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wrench, Plus, Clock, CheckCircle2, ArrowRight, Settings, Users } from "lucide-react";
import { PageHeader, StatCard } from "@/components/grt";

const MOCK_PROCESSES = [
  { id: "WP-001", name: "钢结构焊接", category: "结构", avgTime: "4.5h", workers: 3, status: "进行中", quality: 98 },
  { id: "WP-002", name: "管路安装", category: "管路", avgTime: "3.0h", workers: 2, status: "进行中", quality: 97 },
  { id: "WP-003", name: "电气布线", category: "电气", avgTime: "6.0h", workers: 2, status: "待开始", quality: 99 },
  { id: "WP-004", name: "喷淋系统安装", category: "核心", avgTime: "5.0h", workers: 4, status: "已完成", quality: 100 },
  { id: "WP-005", name: "整机调试", category: "调试", avgTime: "8.0h", workers: 3, status: "待开始", quality: 0 },
];

export default function ProcessManagement() {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Wrench}
        title={t("manufacturing.process.title")}
        description={t("manufacturing.process.description")}
        actions={<Button><Plus className="h-4 w-4 mr-2" />{t("manufacturing.processMgmt.createProcess")}</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Settings} label={t("manufacturing.process.totalProcesses")} value={48} iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard icon={Clock} label={t("manufacturing.process.activeProcesses")} value={12} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={CheckCircle2} label={t("manufacturing.processMgmt.qualityRate")} value="98.5%" iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={Wrench} label={t("manufacturing.processMgmt.avgWorkHours")} value="4.2h" iconColor="text-primary" iconBg="bg-primary/10" />
      </div>

      <Card>
        <CardHeader><CardTitle>{t("manufacturing.processMgmt.processList")}</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {MOCK_PROCESSES.map(p => (
              <div key={p.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer">
                <Settings className="h-8 w-8 text-primary/20" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">{p.id}</span>
                    <Badge variant="outline">{p.category}</Badge>
                  </div>
                  <p className="font-medium mt-1">{p.name}</p>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{p.avgTime}</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{p.workers}人</span>
                    {p.quality > 0 && <span>{t("manufacturing.processMgmt.qualityRate")}: {p.quality}%</span>}
                  </div>
                </div>
                <Badge className={p.status === "已完成" ? "bg-green-100 text-green-700" : p.status === "进行中" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}>{p.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
