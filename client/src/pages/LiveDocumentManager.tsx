/**
 * 活文档管理页面
 * 
 * 基于Nocobase架构的活文档管理系统
 * 支持GTR/CSR文档、图形规范、M0-M12全阶段文档
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  FileText,
  FolderOpen, 
  Image, 
  Plus, 
  Search, 
  Upload,
  Download,
  Eye,
  Edit,
  Trash2,
  Filter,
  Grid,
  List,
  BookOpen,
  Settings,
  Tag,
  Clock,
  User
} from "lucide-react";

// 模拟GTR通用技术要求文档
const mockGTRDocuments = [
  { id: "GTR-001", code: "GTR-2024-001", title: "超声波清洗设备通用技术规范", version: "V2.1", status: "active", category: "equipment", updatedAt: "2024-01-20" },
  { id: "GTR-002", code: "GTR-2024-002", title: "高压喷淋系统技术标准", version: "V1.5", status: "active", category: "equipment", updatedAt: "2024-01-18" },
  { id: "GTR-003", code: "GTR-2024-003", title: "清洁度检测方法规范", version: "V3.0", status: "active", category: "testing", updatedAt: "2024-01-15" },
  { id: "GTR-004", code: "GTR-2024-004", title: "干燥设备技术要求", version: "V1.2", status: "draft", category: "equipment", updatedAt: "2024-01-22" },
];

// 模拟CSR客户特定要求文档
const mockCSRDocuments = [
  { id: "CSR-001", code: "CSR-SH-2024-001", customer: "上海汽车", title: "发动机缸体清洗技术要求", version: "V1.0", status: "active", updatedAt: "2024-01-19" },
  { id: "CSR-002", code: "CSR-BJ-2024-001", customer: "北京新能源", title: "电池壳体清洗规范", version: "V2.0", status: "active", updatedAt: "2024-01-17" },
  { id: "CSR-003", code: "CSR-GZ-2024-001", customer: "广州精密", title: "精密零件清洗标准", version: "V1.5", status: "review", updatedAt: "2024-01-21" },
];

// 模拟图形记录
const mockGraphics = [
  { id: "GFX-001", name: "清洗工艺流程图", originalName: "图1-清洗工艺流程", type: "flowchart", documentRef: "GTR-001", position: "第3页", hasPlaceholder: false },
  { id: "GFX-002", name: "设备布局图", originalName: "图2-设备平面布置", type: "layout", documentRef: "GTR-001", position: "第5页", hasPlaceholder: true },
  { id: "GFX-003", name: "清洁度检测流程", originalName: "图3-检测流程图", type: "flowchart", documentRef: "GTR-003", position: "第8页", hasPlaceholder: false },
  { id: "GFX-004", name: "电气原理图", originalName: "图4-电气系统原理", type: "schematic", documentRef: "CSR-001", position: "附录A", hasPlaceholder: true },
];

// 模拟M0-M12阶段文档
const mockPhaseDocuments = [
  { phase: "M0", name: "项目立项", documents: ["立项申请书", "可行性分析报告", "初步预算"], count: 3 },
  { phase: "M1", name: "需求确认", documents: ["客户需求规格书", "技术方案书", "报价单"], count: 5 },
  { phase: "M2", name: "合同签订", documents: ["销售合同", "技术协议", "付款计划"], count: 4 },
  { phase: "M3", name: "方案设计", documents: ["详细设计方案", "BOM清单", "工艺流程"], count: 8 },
  { phase: "M4", name: "设计评审", documents: ["设计评审记录", "变更申请", "风险评估"], count: 6 },
  { phase: "M5", name: "采购制造", documents: ["采购订单", "生产计划", "质量检验"], count: 12 },
  { phase: "M6", name: "组装调试", documents: ["组装记录", "调试报告", "FAT测试"], count: 8 },
  { phase: "M7", name: "出厂验收", documents: ["FAT报告", "出厂检验单", "发货清单"], count: 5 },
  { phase: "M8", name: "现场安装", documents: ["安装计划", "安装记录", "调试日志"], count: 7 },
  { phase: "M9", name: "现场验收", documents: ["SAT报告", "验收记录", "培训记录"], count: 6 },
  { phase: "M10", name: "质保服务", documents: ["质保协议", "维护计划", "服务记录"], count: 4 },
  { phase: "M11", name: "项目结算", documents: ["结算清单", "发票记录", "回款确认"], count: 3 },
  { phase: "M12", name: "项目归档", documents: ["项目总结", "经验教训", "归档清单"], count: 5 },
];

export default function LiveDocumentManager() {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("gtr");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-green-500">{t("admin.liveDoc.statusActive")}</Badge>;
      case "draft": return <Badge variant="secondary">{t("admin.liveDoc.statusDraft")}</Badge>;
      case "review": return <Badge className="bg-yellow-500">{t("admin.liveDoc.statusReview")}</Badge>;
      case "archived": return <Badge variant="outline">{t("admin.liveDoc.statusArchived")}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    );
  }

  return (
      <div className="space-y-6">
        <PageHeader
          icon={FileText}
          title={t("admin.liveDoc.title")}
          description={t("admin.liveDoc.description")}
          actions={
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  {t("admin.liveDoc.uploadDocument")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("admin.liveDoc.uploadTitle")}</DialogTitle>
                  <DialogDescription>
                    {t("admin.liveDoc.uploadDesc")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">
                      {t("admin.liveDoc.dragOrClick")}
                    </p>
                    <Button variant="outline" size="sm">{t("admin.liveDoc.selectFile")}</Button>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("admin.liveDoc.documentType")}</Label>
                    <Select defaultValue="gtr">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gtr">{t("admin.liveDoc.typeGTR")}</SelectItem>
                        <SelectItem value="csr">{t("admin.liveDoc.typeCSR")}</SelectItem>
                        <SelectItem value="phase">{t("admin.liveDoc.typePhase")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
                    {t("admin.liveDoc.cancel")}
                  </Button>
                  <Button onClick={() => {
                    toast.success(t("admin.liveDoc.uploadSuccess"));
                    setIsUploadOpen(false);
                  }}>
                    {t("admin.liveDoc.upload")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          }
        />

        {/* 搜索和筛选 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder={t("admin.liveDoc.searchDocuments")}
                  className="pl-10"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={t("admin.liveDoc.statusPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("admin.liveDoc.allStatus")}</SelectItem>
                  <SelectItem value="active">{t("admin.liveDoc.statusActive")}</SelectItem>
                  <SelectItem value="draft">{t("admin.liveDoc.statusDraft")}</SelectItem>
                  <SelectItem value="review">{t("admin.liveDoc.statusReview")}</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center border rounded-md">
                <Button 
                  variant={viewMode === "list" ? "secondary" : "ghost"} 
                  size="icon"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button 
                  variant={viewMode === "grid" ? "secondary" : "ghost"} 
                  size="icon"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="gtr" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              {t("admin.liveDoc.tabGTR")}
            </TabsTrigger>
            <TabsTrigger value="csr" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t("admin.liveDoc.tabCSR")}
            </TabsTrigger>
            <TabsTrigger value="graphics" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              {t("admin.liveDoc.tabGraphics")}
            </TabsTrigger>
            <TabsTrigger value="phases" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              {t("admin.liveDoc.tabPhases")}
            </TabsTrigger>
          </TabsList>

          {/* GTR 通用技术要求 */}
          <TabsContent value="gtr" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.liveDoc.gtrTitle")}</CardTitle>
                <CardDescription>{t("admin.liveDoc.gtrDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin.liveDoc.colDocCode")}</TableHead>
                      <TableHead>{t("admin.liveDoc.colDocTitle")}</TableHead>
                      <TableHead>{t("admin.liveDoc.colVersion")}</TableHead>
                      <TableHead>{t("admin.liveDoc.colCategory")}</TableHead>
                      <TableHead>{t("admin.liveDoc.colStatus")}</TableHead>
                      <TableHead>{t("admin.liveDoc.colUpdatedAt")}</TableHead>
                      <TableHead>{t("admin.liveDoc.colActions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockGTRDocuments.map(doc => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-mono">{doc.code}</TableCell>
                        <TableCell>{doc.title}</TableCell>
                        <TableCell>{doc.version}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{doc.category}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(doc.status)}</TableCell>
                        <TableCell>{doc.updatedAt}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon"
                              onClick={() => toast.info(`${t("admin.liveDoc.viewDoc")}: ${doc.title}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon"
                              onClick={() => toast.info(`${t("admin.liveDoc.editDoc")}: ${doc.title}`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon"
                              onClick={() => toast.info(`${t("admin.liveDoc.downloadDoc")}: ${doc.title}`)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CSR */}
          <TabsContent value="csr" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.liveDoc.csrTitle")}</CardTitle>
                <CardDescription>{t("admin.liveDoc.csrDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin.liveDoc.colDocCode")}</TableHead>
                      <TableHead>{t("admin.liveDoc.colCustomer")}</TableHead>
                      <TableHead>{t("admin.liveDoc.colDocTitle")}</TableHead>
                      <TableHead>{t("admin.liveDoc.colVersion")}</TableHead>
                      <TableHead>{t("admin.liveDoc.colStatus")}</TableHead>
                      <TableHead>{t("admin.liveDoc.colUpdatedAt")}</TableHead>
                      <TableHead>{t("admin.liveDoc.colActions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockCSRDocuments.map(doc => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-mono">{doc.code}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{doc.customer}</Badge>
                        </TableCell>
                        <TableCell>{doc.title}</TableCell>
                        <TableCell>{doc.version}</TableCell>
                        <TableCell>{getStatusBadge(doc.status)}</TableCell>
                        <TableCell>{doc.updatedAt}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon"
                              onClick={() => toast.info(`${t("admin.liveDoc.viewDoc")}: ${doc.title}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon"
                              onClick={() => toast.info(`${t("admin.liveDoc.editDoc")}: ${doc.title}`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon"
                              onClick={() => toast.info(`${t("admin.liveDoc.downloadDoc")}: ${doc.title}`)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 图形规范 */}
          <TabsContent value="graphics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.liveDoc.graphicsTitle")}</CardTitle>
                <CardDescription>{t("admin.liveDoc.graphicsDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mockGraphics.map(graphic => (
                    <Card key={graphic.id} className="overflow-hidden">
                      <div className="aspect-video bg-muted flex items-center justify-center relative">
                        {graphic.hasPlaceholder ? (
                          <div className="text-center p-4">
                            <Image className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">{t("admin.liveDoc.graphicPlaceholder")}</p>
                            <p className="text-xs text-muted-foreground">{t("admin.liveDoc.graphicPending")}</p>
                          </div>
                        ) : (
                          <Image className="h-16 w-16 text-muted-foreground" />
                        )}
                        {graphic.hasPlaceholder && (
                          <Badge className="absolute top-2 right-2 bg-yellow-500">{t("admin.liveDoc.graphicPendingBadge")}</Badge>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h4 className="font-medium mb-1">{graphic.name}</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          {t("admin.liveDoc.originalName")}: {graphic.originalName}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{t("admin.liveDoc.source")}: {graphic.documentRef}</span>
                          <span>{t("admin.liveDoc.position")}: {graphic.position}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* M0-M12 阶段文档 */}
          <TabsContent value="phases" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.liveDoc.phasesTitle")}</CardTitle>
                <CardDescription>{t("admin.liveDoc.phasesDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {mockPhaseDocuments.map(phase => (
                    <Card 
                      key={phase.phase} 
                      className={`cursor-pointer transition-colors ${
                        selectedPhase === phase.phase ? "border-primary" : "hover:border-primary/50"
                      }`}
                      onClick={() => setSelectedPhase(selectedPhase === phase.phase ? null : phase.phase)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="font-mono">{phase.phase}</Badge>
                          <span className="text-sm text-muted-foreground">{phase.count} {t("admin.liveDoc.documentCount")}</span>
                        </div>
                        <h4 className="font-medium mb-2">{phase.name}</h4>
                        {selectedPhase === phase.phase && (
                          <ul className="text-sm text-muted-foreground space-y-1 mt-3 pt-3 border-t">
                            {phase.documents.map((doc, idx) => (
                              <li key={idx} className="flex items-center gap-2">
                                <FileText className="h-3 w-3" />
                                {doc}
                              </li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
