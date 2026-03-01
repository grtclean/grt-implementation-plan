/**
 * 工序管理页面
 * 生产工序定义、工序流程、工时统计
 * Data source: operationsDashboard.getProcesses (DB-backed)
 */
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Wrench, Plus, Clock, CheckCircle2, Settings, Users } from "lucide-react";
import { PageHeader, StatCard } from "@/components/grt";
import { trpc } from "@/lib/trpc";

const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;

export default function ProcessManagement() {
  const { t } = useLanguage();
  const processesQuery = trpc.operationsDashboard.getProcesses.useQuery(undefined, QUERY_OPTS);
  const processes = (processesQuery.data ?? []) as any[];

  if (processesQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

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
            {processes.map((p: any) => (
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
                    {(p.quality ?? 0) > 0 && <span>{t("manufacturing.processMgmt.qualityRate")}: {p.quality}%</span>}
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
