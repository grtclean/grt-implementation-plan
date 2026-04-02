/**
 * SalesProjectWorkbench — 销售项目工程师 · 客户项目管理
 *
 * 1. 创建新客户/新项目 → 分配用户名密码
 * 2. 发送设备介绍/方案/报价给客户不同角色
 * 3. 管理文档权限 (查看/下载/转发)
 * 4. 生成分享链接/二维码
 *
 * 复用 customer-authorization.router.ts 后端
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  FolderKanban, Plus, Send, FileText, Users, Shield, Download,
  Building2, Loader2, CheckCircle2, Copy, Link2, QrCode,
  Eye, Lock, Unlock, Package, Wrench, BookOpen,
} from "lucide-react";
import { useState } from "react";

// ── Document bundles by customer role ──
const DOC_BUNDLES = {
  management: {
    labelZh: "管理层资料包", labelEn: "Management Bundle", icon: "👑",
    docs: [
      { name: "GRT公司介绍", nameEn: "Company Profile", category: "company_intro", allowDownload: true },
      { name: "项目方案书", nameEn: "Project Proposal", category: "proposal", allowDownload: true },
      { name: "商务报价单", nameEn: "Commercial Quotation", category: "quotation", allowDownload: true },
      { name: "项目进度计划", nameEn: "Project Schedule", category: "schedule", allowDownload: true },
      { name: "FAT验收报告", nameEn: "FAT Certificate", category: "fat_certificate", allowDownload: true },
      { name: "SAT验收报告", nameEn: "SAT Certificate", category: "sat_certificate", allowDownload: true },
    ],
  },
  engineer: {
    labelZh: "工程师资料包", labelEn: "Engineer Bundle", icon: "🔧",
    docs: [
      { name: "设备操作手册", nameEn: "Operation Manual", category: "operation_manual", allowDownload: true },
      { name: "维护保养指南", nameEn: "Maintenance Guide", category: "maintenance_manual", allowDownload: true },
      { name: "电气原理图", nameEn: "Electrical Drawing", category: "electrical_drawing", allowDownload: false },
      { name: "BOM清单", nameEn: "BOM List", category: "bom_list", allowDownload: false },
      { name: "出厂参数表", nameEn: "Factory Parameters", category: "factory_parameters", allowDownload: false },
      { name: "备品备件清单", nameEn: "Spare Parts List", category: "spare_parts", allowDownload: true },
    ],
  },
  operator: {
    labelZh: "操作员资料包", labelEn: "Operator Bundle", icon: "👷",
    docs: [
      { name: "设备操作手册(简版)", nameEn: "Quick Operation Guide", category: "operation_manual", allowDownload: true },
      { name: "基础接线图", nameEn: "Basic Wiring", category: "basic_wiring", allowDownload: true },
    ],
  },
};

// ── Industry options ──
const INDUSTRIES = [
  { id: "fuel_injection", zh: "燃油喷射", en: "Fuel Injection" },
  { id: "die_casting_al", zh: "铝压铸加工装配", en: "Al Die Casting" },
  { id: "die_casting_mg", zh: "镁压铸加工装配", en: "Mg Die Casting" },
  { id: "powertrain", zh: "发动机变速箱", en: "Powertrain" },
  { id: "energy_storage", zh: "储能", en: "Energy Storage" },
  { id: "telecom", zh: "电信", en: "Telecom" },
  { id: "semiconductor", zh: "半导体", en: "Semiconductor" },
  { id: "machining", zh: "机加工", en: "Machining" },
  { id: "integrated", zh: "集成系统", en: "Integrated" },
  { id: "other", zh: "其他", en: "Other" },
];

// ── Demo project list (will be from DB) ──
const DEMO_PROJECTS = [
  { id: 1, company: "伊洛美克动力总成有限公司", contact: "鲁珊杉", industry: "powertrain", model: "USC-08", phase: "M3", status: "active", docsShared: 8 },
  { id: 2, company: "重庆美利信科技股份有限公司", contact: "项目经理", industry: "die_casting_al", model: "KLT-4200 + TSL-8000", phase: "M7", status: "active", docsShared: 12 },
  { id: 3, company: "比亚迪股份有限公司", contact: "设备总监", industry: "die_casting_al", model: "MCL-12000", phase: "M1", status: "active", docsShared: 4 },
  { id: 4, company: "宁德时代新能源科技有限公司", contact: "设备经理", industry: "energy_storage", model: "TSL-8000", phase: "M5", status: "active", docsShared: 6 },
  { id: 5, company: "Robert Bosch GmbH", contact: "Plant Manager", industry: "fuel_injection", model: "KLT-4200", phase: "M9", status: "active", docsShared: 10 },
];

export default function SalesProjectWorkbench() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const z = language === "zh";
  const [activeTab, setActiveTab] = useState("projects");
  const [showNewProject, setShowNewProject] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState<number | null>(null);

  // New project form
  const [newCompany, setNewCompany] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newIndustry, setNewIndustry] = useState("");
  const [newModel, setNewModel] = useState("");
  const [selectedBundles, setSelectedBundles] = useState<string[]>(["management"]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <FolderKanban className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">{z ? "客户项目管理" : "Customer Project Management"}</h1>
            <p className="text-sm text-muted-foreground">{z ? "创建项目 · 分配资料 · 管理权限 · 分享链接" : "Create projects · Share docs · Manage access · Share links"}</p>
          </div>
        </div>
        <Button onClick={() => setShowNewProject(!showNewProject)} className="gap-1.5">
          <Plus className="h-4 w-4" /> {z ? "新建项目" : "New Project"}
        </Button>
      </div>

      {/* New Project Form */}
      {showNewProject && (
        <Card className="border-2 border-dashed border-blue-300">
          <CardHeader><CardTitle className="text-base">{z ? "新建客户项目" : "New Customer Project"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>{z ? "客户公司" : "Company"} *</Label>
                <Input value={newCompany} onChange={e => setNewCompany(e.target.value)} placeholder={z ? "公司全称" : "Company name"} />
              </div>
              <div className="space-y-1.5">
                <Label>{z ? "联系人" : "Contact"} *</Label>
                <Input value={newContact} onChange={e => setNewContact(e.target.value)} placeholder={z ? "姓名" : "Name"} />
              </div>
              <div className="space-y-1.5">
                <Label>{z ? "手机号" : "Phone"} *</Label>
                <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="138xxxx" />
              </div>
              <div className="space-y-1.5">
                <Label>{z ? "行业" : "Industry"}</Label>
                <Select value={newIndustry} onValueChange={setNewIndustry}>
                  <SelectTrigger><SelectValue placeholder={z ? "选择行业" : "Select"} /></SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map(i => <SelectItem key={i.id} value={i.id}>{z ? i.zh : i.en}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{z ? "设备型号" : "Model"}</Label>
                <Select value={newModel} onValueChange={setNewModel}>
                  <SelectTrigger><SelectValue placeholder={z ? "选择型号" : "Select"} /></SelectTrigger>
                  <SelectContent>
                    {["USC-06","USC-08","USC-10","USC-12","KLT-4200","TSL-8000","MCL-12000"].map(m =>
                      <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Document Bundle Selection */}
            <div>
              <Label className="mb-2 block">{z ? "分配资料包（按角色）" : "Document Bundles (by role)"}</Label>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(DOC_BUNDLES).map(([key, bundle]) => {
                  const selected = selectedBundles.includes(key);
                  return (
                    <div key={key}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${selected ? "border-blue-500 bg-blue-50" : "border-[#edebe9] hover:border-blue-200"}`}
                      onClick={() => setSelectedBundles(prev => selected ? prev.filter(b => b !== key) : [...prev, key])}>
                      <div className="flex items-center gap-2 mb-1">
                        <span>{bundle.icon}</span>
                        <span className="text-sm font-semibold">{z ? bundle.labelZh : bundle.labelEn}</span>
                        {selected && <CheckCircle2 className="h-4 w-4 text-blue-500 ml-auto" />}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {bundle.docs.length} {z ? "份文档" : "docs"}: {bundle.docs.map(d => z ? d.name : d.nameEn).slice(0, 3).join("、")}...
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNewProject(false)}>{z ? "取消" : "Cancel"}</Button>
              <Button disabled={!newCompany || !newContact || !newPhone} className="gap-1.5">
                <Plus className="h-4 w-4" /> {z ? "创建项目并注册客户账号" : "Create Project & Register Account"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="projects" className="gap-1.5"><FolderKanban className="h-3.5 w-3.5" />{z ? "项目列表" : "Projects"}</TabsTrigger>
          <TabsTrigger value="docs" className="gap-1.5"><FileText className="h-3.5 w-3.5" />{z ? "资料管理" : "Documents"}</TabsTrigger>
          <TabsTrigger value="access" className="gap-1.5"><Shield className="h-3.5 w-3.5" />{z ? "权限控制" : "Access Control"}</TabsTrigger>
        </TabsList>

        {/* Tab 1: Project List */}
        <TabsContent value="projects" className="mt-4">
          <div className="space-y-2">
            {DEMO_PROJECTS.map(p => (
              <Card key={p.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                      {p.company.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{p.company}</div>
                      <div className="text-xs text-muted-foreground">{p.contact} · {p.model} · {(INDUSTRIES.find(i => i.id === p.industry) || {})[z ? "zh" : "en"]}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-[10px]">{p.phase}</Badge>
                    <span className="text-xs text-muted-foreground">{p.docsShared} {z ? "份资料" : "docs"}</span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setShowShareDialog(p.id)}>
                        <Send className="h-3 w-3" /> {z ? "发送" : "Send"}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                        <Link2 className="h-3 w-3" /> {z ? "链接" : "Link"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab 2: Document Management */}
        <TabsContent value="docs" className="mt-4 space-y-4">
          {Object.entries(DOC_BUNDLES).map(([key, bundle]) => (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span>{bundle.icon}</span>
                  {z ? bundle.labelZh : bundle.labelEn}
                  <Badge variant="outline" className="text-[10px]">{bundle.docs.length} {z ? "份" : "docs"}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {bundle.docs.map((doc, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/30">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{z ? doc.name : doc.nameEn}</span>
                        <Badge variant="outline" className="text-[9px]">{doc.category}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.allowDownload ? (
                          <span className="flex items-center gap-1 text-[10px] text-green-600"><Unlock className="h-3 w-3" />{z ? "可下载" : "Download"}</span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] text-amber-600"><Lock className="h-3 w-3" />{z ? "仅查看" : "View Only"}</span>
                        )}
                        <Button size="sm" variant="ghost" className="h-6 text-[10px]">{z ? "编辑权限" : "Edit"}</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Tab 3: Access Control Matrix */}
        <TabsContent value="access" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{z ? "客户角色权限矩阵" : "Customer Role Access Matrix"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">{z ? "文档类别" : "Document"}</th>
                      <th className="text-center p-2">👑 {z ? "管理层" : "Management"}</th>
                      <th className="text-center p-2">🔧 {z ? "工程师" : "Engineer"}</th>
                      <th className="text-center p-2">👷 {z ? "操作员" : "Operator"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { doc: z ? "公司介绍" : "Company Profile", mgmt: "view+dl", eng: "view", op: "-" },
                      { doc: z ? "项目方案书" : "Proposal", mgmt: "view+dl", eng: "view", op: "-" },
                      { doc: z ? "商务报价单" : "Quotation", mgmt: "view+dl", eng: "-", op: "-" },
                      { doc: z ? "设备操作手册" : "Operation Manual", mgmt: "view+dl", eng: "view+dl", op: "view+dl" },
                      { doc: z ? "维护保养指南" : "Maintenance Guide", mgmt: "view+dl", eng: "view+dl", op: "view" },
                      { doc: z ? "电气原理图" : "Electrical Drawing", mgmt: "view", eng: "view", op: "-" },
                      { doc: z ? "BOM清单" : "BOM List", mgmt: "view", eng: "view", op: "-" },
                      { doc: z ? "备品备件清单" : "Spare Parts", mgmt: "view+dl", eng: "view+dl", op: "view" },
                      { doc: z ? "FAT/SAT报告" : "FAT/SAT Cert", mgmt: "view+dl", eng: "view", op: "-" },
                      { doc: z ? "PLC程序备份" : "PLC Backup", mgmt: "-", eng: z ? "授权后" : "Auth", op: "-" },
                    ].map((row, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-2 font-medium">{row.doc}</td>
                        {[row.mgmt, row.eng, row.op].map((cell, j) => (
                          <td key={j} className="text-center p-2">
                            {cell === "view+dl" ? <span className="text-green-600">✅ {z ? "查看+下载" : "View+DL"}</span> :
                             cell === "view" ? <span className="text-blue-600">👁 {z ? "仅查看" : "View"}</span> :
                             cell.includes("授权") || cell.includes("Auth") ? <span className="text-amber-600">🔐 {cell}</span> :
                             <span className="text-gray-400">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                {z ? "💡 GRT项目工程师可通过\"编辑权限\"按钮为特定客户授权下载/转发特定文档"
                  : "💡 GRT project engineers can authorize specific downloads/forwards via the 'Edit' button"}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Share Dialog */}
      {showShareDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowShareDialog(null)}>
          <div className="bg-white rounded-xl p-6 w-[420px] shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-4">{z ? "发送项目资料" : "Share Project Documents"}</h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>{z ? "选择发送对象角色" : "Select Recipient Role"}</Label>
                <div className="flex gap-2">
                  {Object.entries(DOC_BUNDLES).map(([key, b]) => (
                    <button key={key} className="flex-1 p-2 rounded-lg border hover:border-blue-400 text-center text-xs">
                      <span className="text-lg block">{b.icon}</span>
                      {z ? b.labelZh : b.labelEn}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{z ? "分享方式" : "Share Method"}</Label>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 gap-1.5 text-xs"><Link2 className="h-3.5 w-3.5" />{z ? "复制链接" : "Copy Link"}</Button>
                  <Button variant="outline" className="flex-1 gap-1.5 text-xs"><QrCode className="h-3.5 w-3.5" />{z ? "二维码" : "QR Code"}</Button>
                  <Button variant="outline" className="flex-1 gap-1.5 text-xs"><Send className="h-3.5 w-3.5" />{z ? "邮件" : "Email"}</Button>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700">
                {z ? "📌 客户通过链接注册后，将根据角色自动获得对应资料包的访问权限。管理层可下载报价和方案，工程师可查看技术文档，操作员仅获取操作手册。"
                  : "📌 Customers will automatically get role-based document access after registration."}
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowShareDialog(null)}>{z ? "关闭" : "Close"}</Button>
              <Button className="gap-1.5"><Send className="h-4 w-4" />{z ? "确认发送" : "Send"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
