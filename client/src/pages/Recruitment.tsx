/**
 * 招聘管理页面
 * 职位发布、候选人管理、面试安排、Offer管理
 */
import { useState } from "react";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/grt/PageHeader";
import { StatCard } from "@/components/grt/StatCard";
import { StatusBadge, createStatusColorMap } from "@/components/grt/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserCheck, Plus, Users, Clock, CheckCircle2, Briefcase } from "lucide-react";

const positionStatusColorMap = createStatusColorMap({
  "招聘中": "blue",
  "面试中": "orange",
  "已关闭": "gray",
});

// TODO: 接入 tRPC 后端接口替换
const MOCK_POSITIONS = [
  { id: 1, title: "高级机械工程师", dept: "研发设计部", bu: "BU3", applicants: 12, status: "招聘中", urgency: "紧急", salary: "20-35K" },
  { id: 2, title: "PLC程序员", dept: "研发设计部", bu: "BU1", applicants: 8, status: "招聘中", urgency: "高", salary: "18-28K" },
  { id: 3, title: "销售经理", dept: "销售部", bu: "BU4", applicants: 15, status: "面试中", urgency: "正常", salary: "25-40K" },
  { id: 4, title: "现场服务工程师", dept: "技术服务部", bu: "通用", applicants: 6, status: "已关闭", urgency: "正常", salary: "15-22K" },
];

export default function Recruitment() {
  const { toast } = useToast();
  const [tab, setTab] = useState("open");

  const handleComingSoon = () => {
    toast({ title: "功能开发中", description: "该功能正在开发中，敬请期待" });
  };

  return (
    <Layout>
    <div className="space-y-6">
      <PageHeader
        icon={UserCheck}
        title="招聘管理"
        description="职位管理 · 候选人追踪 · 面试安排"
        actions={<Button onClick={handleComingSoon}><Plus className="h-4 w-4 mr-2" />发布职位</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Briefcase} label="开放职位" value={8} />
        <StatCard icon={Users} label="候选人" value={56} iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard icon={Clock} label="本周面试" value={12} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={CheckCircle2} label="待发Offer" value={3} iconColor="text-green-500" iconBg="bg-green-500/10" />
      </div>

      <Card>
        <CardHeader><CardTitle>职位列表</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {MOCK_POSITIONS.map(p => (
              <div key={p.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors">
                <Briefcase className="h-10 w-10 text-primary/20" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.title}</span>
                    {p.urgency === "紧急" && <Badge variant="destructive">紧急</Badge>}
                    {p.urgency === "高" && <Badge className="bg-amber-500">高</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{p.dept} · {p.bu} · {p.salary}</p>
                </div>
                <div className="text-right">
                  <StatusBadge color={positionStatusColorMap[p.status as keyof typeof positionStatusColorMap] ?? "gray"}>{p.status}</StatusBadge>
                  <p className="text-sm text-muted-foreground mt-1"><Users className="inline h-3 w-3 mr-1" />{p.applicants}位候选人</p>
                </div>
              </div>
            ))}
            {MOCK_POSITIONS.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <UserCheck className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">暂无招聘职位</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    </Layout>
  );
}
