/**
 * 证书模板管理页面
 * 管理培训证书、能力认证证书的模板设计和生成
 */
import { useState } from "react";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Award, Plus, Eye, Edit, Copy, Trash2, Download, FileText, CheckCircle, Clock, Loader2 } from "lucide-react";

// 模拟证书模板数据
const mockTemplates = [
  {
    id: 1,
    name: "高级超声波调试工程师证书",
    type: "capability",
    category: "L4-Technical",
    description: "颁发给通过L4级超声波设备调试能力认证的工程师",
    variables: ["{{name}}", "{{date}}", "{{cert_no}}", "{{skill_level}}", "{{valid_until}}"],
    isActive: true,
    usageCount: 45,
    lastUsed: "2025-01-30T14:00:00Z",
    previewUrl: "/templates/cert-ultrasonic-l4.png"
  },
  {
    id: 2,
    name: "项目交付能力认证证书",
    type: "capability",
    category: "L3-Delivery",
    description: "颁发给完成Tier 1客户项目交付的工程师",
    variables: ["{{name}}", "{{date}}", "{{cert_no}}", "{{project_name}}", "{{customer}}"],
    isActive: true,
    usageCount: 23,
    lastUsed: "2025-01-28T10:30:00Z",
    previewUrl: "/templates/cert-delivery-l3.png"
  },
  {
    id: 3,
    name: "安全操作培训合格证",
    type: "training",
    category: "Safety",
    description: "完成安全操作培训并通过考核",
    variables: ["{{name}}", "{{date}}", "{{cert_no}}", "{{training_hours}}", "{{score}}"],
    isActive: true,
    usageCount: 156,
    lastUsed: "2025-01-31T09:00:00Z",
    previewUrl: "/templates/cert-safety.png"
  },
  {
    id: 4,
    name: "VDA 19.1清洁度标准培训证书",
    type: "training",
    category: "Quality",
    description: "VDA 19.1清洁度检测标准培训合格证书",
    variables: ["{{name}}", "{{date}}", "{{cert_no}}", "{{instructor}}", "{{valid_years}}"],
    isActive: false,
    usageCount: 12,
    lastUsed: "2025-01-15T16:00:00Z",
    previewUrl: "/templates/cert-vda19.png"
  }
];

// 模拟已颁发证书
const mockIssuedCerts = [
  { id: 1, templateId: 1, recipientName: "张三", certNo: "GRT-2025-001", issuedAt: "2025-01-30T14:00:00Z", status: "valid" },
  { id: 2, templateId: 3, recipientName: "李四", certNo: "GRT-2025-002", issuedAt: "2025-01-31T09:00:00Z", status: "valid" },
  { id: 3, templateId: 2, recipientName: "王五", certNo: "GRT-2025-003", issuedAt: "2025-01-28T10:30:00Z", status: "valid" },
  { id: 4, templateId: 4, recipientName: "赵六", certNo: "GRT-2024-156", issuedAt: "2024-12-15T11:00:00Z", status: "expired" }
];

export default function CertificateTemplates() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isIssueDialogOpen, setIsIssueDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<typeof mockTemplates[0] | null>(null);
  const [templates, setTemplates] = useState(mockTemplates);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    type: "capability" as "capability" | "training",
    category: "",
    description: "",
    variables: ""
  });
  const [issueForm, setIssueForm] = useState({
    recipientName: "",
    customValues: {} as Record<string, string>
  });

  const handleCreateTemplate = () => {
    const newId = Math.max(...templates.map(t => t.id)) + 1;
    setTemplates([...templates, {
      id: newId,
      name: newTemplate.name,
      type: newTemplate.type,
      category: newTemplate.category,
      description: newTemplate.description,
      variables: newTemplate.variables.split(",").map(v => v.trim()),
      isActive: true,
      usageCount: 0,
      lastUsed: null as any,
      previewUrl: "/templates/default.png"
    }]);
    toast.success("证书模板创建成功");
    setIsAddDialogOpen(false);
    setNewTemplate({ name: "", type: "capability", category: "", description: "", variables: "" });
  };

  const handleIssueCertificate = () => {
    if (!selectedTemplate) return;
    const certNo = `GRT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
    toast.success(`证书已颁发！证书编号: ${certNo}`);
    setIsIssueDialogOpen(false);
    setIssueForm({ recipientName: "", customValues: {} });
  };

  const handleDeleteTemplate = (id: number) => {
    setTemplates(templates.filter(t => t.id !== id));
    toast.success("模板已删除");
  };

  const getTypeBadge = (type: string) => {
    return type === "capability" 
      ? <Badge className="bg-purple-500">能力认证</Badge>
      : <Badge className="bg-blue-500">培训证书</Badge>;
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      "L4-Technical": "bg-red-500",
      "L3-Delivery": "bg-orange-500",
      "Safety": "bg-yellow-500",
      "Quality": "bg-green-500"
    };
    return <Badge variant="outline" className={`border-2 ${colors[category] ? `border-${colors[category].replace('bg-', '')}` : ''}`}>{category}</Badge>;
  };

  return (
    <Layout>
    <div className="space-y-6">
      <PageHeader
        icon={Award}
        title="证书模板管理"
        description="管理培训证书、能力认证证书的模板设计和颁发"
        actions={
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              创建模板
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>创建证书模板</DialogTitle>
              <DialogDescription>设计新的证书模板</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>模板名称</Label>
                <Input
                  placeholder="例如：高级工程师认证证书"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>证书类型</Label>
                <Select
                  value={newTemplate.type}
                  onValueChange={(value: any) => setNewTemplate({ ...newTemplate, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="capability">能力认证</SelectItem>
                    <SelectItem value="training">培训证书</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>分类</Label>
                <Input
                  placeholder="例如：L4-Technical, Safety"
                  value={newTemplate.category}
                  onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>描述</Label>
                <Textarea
                  placeholder="证书用途说明"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>变量字段 (逗号分隔)</Label>
                <Input
                  placeholder="{{name}}, {{date}}, {{cert_no}}"
                  value={newTemplate.variables}
                  onChange={(e) => setNewTemplate({ ...newTemplate, variables: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">使用双花括号定义变量，颁发时填充实际值</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>取消</Button>
              <Button onClick={handleCreateTemplate}>创建</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        }
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{templates.length}</div>
            <p className="text-sm text-muted-foreground">证书模板</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">{templates.filter(t => t.type === "capability").length}</div>
            <p className="text-sm text-muted-foreground">能力认证</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{templates.filter(t => t.type === "training").length}</div>
            <p className="text-sm text-muted-foreground">培训证书</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{templates.reduce((sum, t) => sum + t.usageCount, 0)}</div>
            <p className="text-sm text-muted-foreground">已颁发总数</p>
          </CardContent>
        </Card>
      </div>

      {/* 模板列表 */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">全部模板</TabsTrigger>
          <TabsTrigger value="capability">能力认证</TabsTrigger>
          <TabsTrigger value="training">培训证书</TabsTrigger>
          <TabsTrigger value="issued">已颁发记录</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {templates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-primary" />
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                    </div>
                    {template.isActive ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">启用</Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-400">停用</Badge>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2">
                    {getTypeBadge(template.type)}
                    {getCategoryBadge(template.category)}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {template.variables.map((v, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{v}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>已颁发 {template.usageCount} 次</span>
                    {template.lastUsed && (
                      <span>最近: {new Date(template.lastUsed).toLocaleDateString()}</span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setIsPreviewOpen(true);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      预览
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setIsIssueDialogOpen(true);
                      }}
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      颁发
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4 mr-1" />
                      编辑
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="capability" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {templates.filter(t => t.type === "capability").map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-500" />
                    {template.name}
                  </CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => { setSelectedTemplate(template); setIsIssueDialogOpen(true); }}>
                      颁发证书
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="training" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {templates.filter(t => t.type === "training").map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="w-5 h-5 text-blue-500" />
                    {template.name}
                  </CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => { setSelectedTemplate(template); setIsIssueDialogOpen(true); }}>
                      颁发证书
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="issued" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>证书编号</TableHead>
                  <TableHead>证书名称</TableHead>
                  <TableHead>获得者</TableHead>
                  <TableHead>颁发日期</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockIssuedCerts.map((cert) => {
                  const template = templates.find(t => t.id === cert.templateId);
                  return (
                    <TableRow key={cert.id}>
                      <TableCell className="font-mono">{cert.certNo}</TableCell>
                      <TableCell>{template?.name || "未知模板"}</TableCell>
                      <TableCell>{cert.recipientName}</TableCell>
                      <TableCell>{new Date(cert.issuedAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {cert.status === "valid" ? (
                          <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />有效</Badge>
                        ) : (
                          <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />已过期</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-1" />
                            下载
                          </Button>
                          <Button variant="outline" size="sm">
                            <Copy className="w-4 h-4 mr-1" />
                            复制链接
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 预览对话框 */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>证书预览</DialogTitle>
            <DialogDescription>{selectedTemplate?.name}</DialogDescription>
          </DialogHeader>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 border-4 border-amber-200 rounded-lg p-8 text-center">
            <div className="text-4xl font-serif text-amber-800 mb-4">证 书</div>
            <div className="text-lg mb-6">
              兹证明 <span className="font-bold text-amber-900 border-b-2 border-amber-400 px-4">{"{{name}}"}</span>
            </div>
            <div className="text-base text-gray-700 mb-6">
              {selectedTemplate?.description}
            </div>
            <div className="text-sm text-gray-600 mb-4">
              证书编号: {"{{cert_no}}"}
            </div>
            <div className="flex justify-between text-sm text-gray-500 mt-8">
              <span>颁发日期: {"{{date}}"}</span>
              <span>有效期至: {"{{valid_until}}"}</span>
            </div>
            <div className="mt-6 flex justify-center">
              <div className="w-24 h-24 border-2 border-dashed border-amber-300 rounded-full flex items-center justify-center text-amber-400">
                公章
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 颁发证书对话框 */}
      <Dialog open={isIssueDialogOpen} onOpenChange={setIsIssueDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>颁发证书</DialogTitle>
            <DialogDescription>{selectedTemplate?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>获得者姓名</Label>
              <Input
                placeholder="请输入姓名"
                value={issueForm.recipientName}
                onChange={(e) => setIssueForm({ ...issueForm, recipientName: e.target.value })}
              />
            </div>
            {selectedTemplate?.variables.filter(v => v !== "{{name}}" && v !== "{{date}}" && v !== "{{cert_no}}").map((variable) => (
              <div key={variable} className="space-y-2">
                <Label>{variable.replace(/\{\{|\}\}/g, "")}</Label>
                <Input
                  placeholder={`请输入${variable.replace(/\{\{|\}\}/g, "")}`}
                  value={issueForm.customValues[variable] || ""}
                  onChange={(e) => setIssueForm({
                    ...issueForm,
                    customValues: { ...issueForm.customValues, [variable]: e.target.value }
                  })}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsIssueDialogOpen(false)}>取消</Button>
            <Button onClick={handleIssueCertificate}>
              <Award className="w-4 h-4 mr-2" />
              颁发证书
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </Layout>
  );
}
