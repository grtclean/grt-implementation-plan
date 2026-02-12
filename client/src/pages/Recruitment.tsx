/**
 * 招聘管理页面
 * 职位发布、候选人管理、面试安排、Offer管理
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCheck, Plus, Search, Users, Clock, CheckCircle2, XCircle, Briefcase } from "lucide-react";

const MOCK_POSITIONS = [
  { id: 1, title: "高级机械工程师", dept: "研发设计部", bu: "BU3", applicants: 12, status: "招聘中", urgency: "紧急", salary: "20-35K" },
  { id: 2, title: "PLC程序员", dept: "研发设计部", bu: "BU1", applicants: 8, status: "招聘中", urgency: "高", salary: "18-28K" },
  { id: 3, title: "销售经理", dept: "销售部", bu: "BU4", applicants: 15, status: "面试中", urgency: "正常", salary: "25-40K" },
  { id: 4, title: "现场服务工程师", dept: "技术服务部", bu: "通用", applicants: 6, status: "已关闭", urgency: "正常", salary: "15-22K" },
];

export default function Recruitment() {
  const [tab, setTab] = useState("open");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><UserCheck className="h-6 w-6 text-primary" />招聘管理</h1>
          <p className="text-muted-foreground mt-1">职位管理 · 候选人追踪 · 面试安排</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />发布职位</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold">8</p><p className="text-sm text-muted-foreground">开放职位</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-primary">56</p><p className="text-sm text-muted-foreground">候选人</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-blue-600">12</p><p className="text-sm text-muted-foreground">本周面试</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-green-600">3</p><p className="text-sm text-muted-foreground">待发Offer</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>职位列表</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {MOCK_POSITIONS.map(p => (
              <div key={p.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer">
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
                  <Badge className={p.status === "招聘中" ? "bg-blue-100 text-blue-700" : p.status === "面试中" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}>{p.status}</Badge>
                  <p className="text-sm text-muted-foreground mt-1"><Users className="inline h-3 w-3 mr-1" />{p.applicants}位候选人</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
