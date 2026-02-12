/**
 * 报价管理页面
 * 报价单创建、版本管理、审批流、AI辅助定价
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { Calculator, Plus, Search, Building2, FileText, DollarSign, Clock, CheckCircle2 } from "lucide-react";

const MOCK_QUOTES = [
  { id: "QT-2026-001", customer: "上海大众", project: "缸体清洗线升级", bu: "BU3", amount: "¥2,850,000", status: "已报价", version: "V2", date: "2026-02-08" },
  { id: "QT-2026-002", customer: "宝马慕尼黑", project: "变速箱清洗新线", bu: "BU1", amount: "€1,200,000", status: "审批中", version: "V1", date: "2026-02-10" },
  { id: "QT-2026-003", customer: "英飞凌", project: "晶圆清洗扩容", bu: "BU4", amount: "¥4,500,000", status: "已中标", version: "V3", date: "2026-01-25" },
  { id: "QT-2026-004", customer: "潍柴动力", project: "柴油机零部件清洗", bu: "BU2", amount: "¥1,680,000", status: "草稿", version: "V1", date: "2026-02-11" },
];

export default function QuotationManagement() {
  const { currentBU } = useUserProfile();
  const [search, setSearch] = useState("");
  const filtered = MOCK_QUOTES.filter(q => (!currentBU || q.bu === currentBU) && (!search || q.customer.includes(search) || q.project.includes(search)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Calculator className="h-6 w-6 text-primary" />报价管理</h1>
          <p className="text-muted-foreground mt-1">报价单管理 · AI辅助定价</p>
        </div>
        <div className="flex gap-2">
          {currentBU && <Badge variant="outline"><Building2 className="h-3 w-3 mr-1" />{currentBU}</Badge>}
          <Button><Plus className="h-4 w-4 mr-2" />新建报价</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold">36</p><p className="text-sm text-muted-foreground">报价总数</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-primary">¥28.5M</p><p className="text-sm text-muted-foreground">报价总额</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-green-600">68%</p><p className="text-sm text-muted-foreground">中标率</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-amber-600">5</p><p className="text-sm text-muted-foreground">待审批</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>报价列表</CardTitle>
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="搜索报价..." className="pl-9 w-64" value={search} onChange={e => setSearch(e.target.value)} /></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filtered.map(q => (
              <div key={q.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">{q.id}</span>
                    <Badge variant="outline">{q.bu}</Badge>
                    <Badge variant="secondary">{q.version}</Badge>
                  </div>
                  <p className="font-medium mt-1">{q.project}</p>
                  <p className="text-sm text-muted-foreground">客户: {q.customer}</p>
                </div>
                <div className="text-right">
                  <Badge className={q.status === "已中标" ? "bg-green-100 text-green-700" : q.status === "审批中" ? "bg-amber-100 text-amber-700" : q.status === "已报价" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}>{q.status}</Badge>
                  <p className="text-lg font-bold mt-1">{q.amount}</p>
                  <p className="text-xs text-muted-foreground">{q.date}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
