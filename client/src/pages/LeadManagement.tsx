/**
 * 商机管理页面
 * 包含商机列表、跟进任务看板、销售漏斗可视化、数据导入、分析报表
 */

import { useState, useRef, useEffect } from "react";
import { PageHeader, StatCard } from "@/components/grt";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  Users, TrendingUp, Target, Clock, Phone, Mail, Building2, 
  Calendar, CheckCircle2, AlertCircle, ArrowRight, Filter,
  BarChart3, PieChart, Activity, Zap, MessageSquare, RefreshCw,
  Upload, FileSpreadsheet, Download, LineChart, ArrowUpRight, ArrowDownRight,
  FileDown, FileText
} from "lucide-react";
import { ReportTemplateManagerWithGuide } from "@/components/ReportTemplateEditor";
import ImportHistoryManager from "@/components/ImportHistoryManager";

// 类型定义
type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
type LeadPriority = 'low' | 'medium' | 'high' | 'urgent';

interface Lead {
  id: number;
  customerName: string;
  companyName?: string;
  contactPhone?: string;
  contactEmail?: string;
  source: string;
  originalContent: string;
  aiAnalysis?: string;
  confidence: number;
  priority: LeadPriority;
  status: LeadStatus;
  assignedTo?: string;
  assignedToName?: string;
  estimatedValue?: number;
  productInterest?: string[];
  tags?: string[];
  createdAt: Date;
}

interface FollowUpTask {
  id: number;
  leadId: number;
  taskType: string;
  title: string;
  description?: string;
  dueDate: Date;
  assignedTo: string;
  status: 'pending' | 'completed' | 'cancelled';
}

// 状态配置
const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; icon: React.ReactNode }> = {
  new: { label: '新商机', color: 'bg-blue-500', icon: <Zap className="w-4 h-4" /> },
  contacted: { label: '已联系', color: 'bg-cyan-500', icon: <Phone className="w-4 h-4" /> },
  qualified: { label: '已确认', color: 'bg-green-500', icon: <CheckCircle2 className="w-4 h-4" /> },
  proposal: { label: '方案中', color: 'bg-yellow-500', icon: <Target className="w-4 h-4" /> },
  negotiation: { label: '谈判中', color: 'bg-orange-500', icon: <MessageSquare className="w-4 h-4" /> },
  won: { label: '已成交', color: 'bg-emerald-500', icon: <TrendingUp className="w-4 h-4" /> },
  lost: { label: '已流失', color: 'bg-gray-500', icon: <AlertCircle className="w-4 h-4" /> }
};

const PRIORITY_CONFIG: Record<LeadPriority, { label: string; color: string }> = {
  low: { label: '低', color: 'bg-gray-400' },
  medium: { label: '中', color: 'bg-blue-400' },
  high: { label: '高', color: 'bg-orange-400' },
  urgent: { label: '紧急', color: 'bg-red-500' }
};

const SOURCE_LABELS: Record<string, string> = {
  community_chat: '社群聊天',
  website_inquiry: '官网咨询',
  phone_call: '电话咨询',
  exhibition: '展会',
  referral: '转介绍',
  ai_identified: 'AI识别',
  excel_import: 'Excel导入',
  csv_import: 'CSV导入'
};

export default function LeadManagement() {
  const [activeTab, setActiveTab] = useState("list");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<LeadPriority | "all">("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // 导入相关状态
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<'idle' | 'uploading' | 'processing' | 'done' | 'error'>('idle');
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importTab, setImportTab] = useState<'upload' | 'history'>('upload');
  
  // 获取导入历史
  const { data: importHistory, refetch: refetchHistory } = (trpc.leadImport.getImportHistory as any).useQuery({ limit: 20 });

  // 获取商机列表
  const { data: leadsData, isLoading: leadsLoading, refetch: refetchLeads } = (trpc.leadAutoFollow as any).getLeads.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    priority: priorityFilter === "all" ? undefined : priorityFilter,
    limit: 50
  });

  // 获取跟进任务
  const { data: tasksData } = (trpc.leadAutoFollow as any).getFollowUpTasks.useQuery({
    status: 'pending'
  });

  // 获取分析数据
  const { data: funnelAnalytics } = (trpc.leadAnalytics as any).getFunnelData.useQuery({});
  const { data: trendData } = (trpc.leadAnalytics as any).getTrendData.useQuery({ period: 'month', months: 6 });
  const { data: sourceAnalysis } = (trpc.leadAnalytics as any).getSourceAnalysis.useQuery({});
  const { data: salesPerformance } = (trpc.leadAnalytics as any).getSalesPerformance.useQuery({});

  // 导入商机
  const importMutation = (trpc.leadImport as any).importFromCSV.useMutation({
    onSuccess: (result) => {
      setImportStatus('done');
      setImportProgress(100);
      setImportResult({
        success: result.successCount,
        failed: result.failedCount,
        errors: result.errors || []
      });
      toast.success(`成功导入 ${result.successCount} 条商机`);
      refetchLeads();
    },
    onError: (error) => {
      setImportStatus('error');
      toast.error(`导入失败: ${error.message}`);
    }
  });

  // 更新商机状态
  const updateStatusMutation = (trpc.leadAutoFollow as any).updateStatus.useMutation({
    onSuccess: () => {
      toast.success("状态更新成功");
      refetchLeads();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    }
  });

  // 计算销售漏斗数据
  const funnelData = leadsData?.leads ? {
    new: leadsData.leads.filter(l => l.status === 'new').length,
    contacted: leadsData.leads.filter(l => l.status === 'contacted').length,
    qualified: leadsData.leads.filter(l => l.status === 'qualified').length,
    proposal: leadsData.leads.filter(l => l.status === 'proposal').length,
    negotiation: leadsData.leads.filter(l => l.status === 'negotiation').length,
    won: leadsData.leads.filter(l => l.status === 'won').length,
    lost: leadsData.leads.filter(l => l.status === 'lost').length
  } : null;

  // 计算统计数据
  const stats = leadsData?.leads ? {
    total: leadsData.total,
    highPriority: leadsData.leads.filter(l => l.priority === 'high' || l.priority === 'urgent').length,
    avgConfidence: leadsData.leads.length > 0 
      ? (leadsData.leads.reduce((sum, l) => sum + l.confidence, 0) / leadsData.leads.length * 100).toFixed(1)
      : 0,
    totalValue: leadsData.leads.reduce((sum, l) => sum + (l.estimatedValue || 0), 0)
  } : null;

  const handleStatusChange = (leadId: number, newStatus: LeadStatus) => {
    updateStatusMutation.mutate({ leadId, status: newStatus });
  };

  const openLeadDetail = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDetailOpen(true);
  };

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'csv' && ext !== 'xlsx' && ext !== 'xls') {
        toast.error('请选择 CSV 或 Excel 文件');
        return;
      }
      setImportFile(file);
      setImportStatus('idle');
      setImportResult(null);
    }
  };

  // 处理导入
  const handleImport = async () => {
    if (!importFile) return;
    
    setImportStatus('uploading');
    setImportProgress(20);
    
    try {
      // 读取文件内容
      const text = await importFile.text();
      setImportProgress(50);
      setImportStatus('processing');
      
      // 解析CSV数据
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        toast.error('文件内容为空或格式不正确');
        setImportStatus('error');
        return;
      }
      
      // 调用导入API
      importMutation.mutate({
        csvContent: text,
        fileName: importFile.name
      });
    } catch (error) {
      setImportStatus('error');
      toast.error('文件读取失败');
    }
  };

  // 下载导入模板
  const downloadTemplate = () => {
    const template = `客户名称,联系人,电话,邮箱,公司,来源,状态,优先级,预估金额,备注
张经理,张三,13800138000,zhang@example.com,某某科技有限公司,展会,new,high,500000,对超声波清洗设备感兴趣
李总,李四,13900139000,li@example.com,某某制造有限公司,转介绍,contacted,medium,300000,需要定制化方案`;
    
    const blob = new Blob(['\ufeff' + template], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '商机导入模板.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('模板下载成功');
  };

  // 导出分析报表为CSV
  const exportReportAsCSV = () => {
    const now = new Date().toLocaleDateString('zh-CN');
    let csvContent = '\ufeff'; // BOM for Excel
    
    // 销售漏斗数据
    csvContent += '销售漏斗分析\n';
    csvContent += '阶段,数量,转化率\n';
    if (funnelAnalytics) {
      const stages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
      const stageLabels: Record<string, string> = {
        new: '新商机', contacted: '已联系', qualified: '已确认',
        proposal: '方案中', negotiation: '谈判中', won: '已成交', lost: '已流失'
      };
      stages.forEach((stage, i) => {
        const count = (funnelAnalytics as any)[stage] || 0;
        const prevCount = i > 0 ? (funnelAnalytics as any)[stages[i-1]] || 0 : count;
        const rate = prevCount > 0 ? ((count / prevCount) * 100).toFixed(1) : '0';
        csvContent += `${stageLabels[stage]},${count},${rate}%\n`;
      });
    }
    
    csvContent += '\n趋势分析\n';
    csvContent += '月份,新增商机,转化成交\n';
    if (trendData) {
      trendData.forEach(item => {
        csvContent += `${item.period},${item.newLeads},${item.convertedLeads}\n`;
      });
    }
    
    csvContent += '\n来源分析\n';
    csvContent += '来源,数量,占比\n';
    if (sourceAnalysis) {
      const total = sourceAnalysis.reduce((sum, s) => sum + s.count, 0);
      sourceAnalysis.forEach(item => {
        const percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : '0';
        csvContent += `${SOURCE_LABELS[item.source] || item.source},${item.count},${percentage}%\n`;
      });
    }
    
    csvContent += '\n销售业绩\n';
    csvContent += '销售人员,总商机,成交数,转化率,总金额\n';
    if (salesPerformance) {
      salesPerformance.forEach(item => {
        csvContent += `${item.salesName},${item.totalLeads},${item.wonLeads},${item.conversionRate.toFixed(1)}%,${item.totalValue}\n`;
      });
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `商机分析报表_${now}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('报表导出成功');
  };

  // 导出分析报表为PDF（生成HTML并打印）
  const exportReportAsPDF = () => {
    const now = new Date().toLocaleDateString('zh-CN');
    
    // 创建HTML内容
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>商机分析报表 - ${now}</title>
        <style>
          body { font-family: 'Microsoft YaHei', sans-serif; padding: 20px; }
          h1 { color: #333; border-bottom: 2px solid #f97316; padding-bottom: 10px; }
          h2 { color: #666; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #f5f5f5; }
          .summary { background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .highlight { color: #f97316; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>商机分析报表</h1>
        <p>生成时间: ${now}</p>
        
        <div class="summary">
          <strong>摘要:</strong> 
          总商机 <span class="highlight">${stats?.total || 0}</span> 个, 
          高优先级 <span class="highlight">${stats?.highPriority || 0}</span> 个,
          平均置信度 <span class="highlight">${stats?.avgConfidence || 0}%</span>,
          预估总金额 <span class="highlight">¥${((stats?.totalValue || 0) / 10000).toFixed(1)}万</span>
        </div>
    `;
    
    // 销售漏斗
    htmlContent += '<h2>销售漏斗</h2><table><tr><th>阶段</th><th>数量</th></tr>';
    if (funnelData) {
      const stageLabels: Record<string, string> = {
        new: '新商机', contacted: '已联系', qualified: '已确认',
        proposal: '方案中', negotiation: '谈判中', won: '已成交', lost: '已流失'
      };
      Object.entries(funnelData).forEach(([stage, count]) => {
        htmlContent += `<tr><td>${stageLabels[stage] || stage}</td><td>${count}</td></tr>`;
      });
    }
    htmlContent += '</table>';
    
    // 趋势分析
    htmlContent += '<h2>趋势分析</h2><table><tr><th>月份</th><th>新增商机</th><th>转化成交</th></tr>';
    if (trendData) {
      trendData.forEach(item => {
        htmlContent += `<tr><td>${item.period}</td><td>${item.newLeads}</td><td>${item.convertedLeads}</td></tr>`;
      });
    }
    htmlContent += '</table>';
    
    // 来源分析
    htmlContent += '<h2>来源分析</h2><table><tr><th>来源</th><th>数量</th><th>占比</th></tr>';
    if (sourceAnalysis) {
      const total = sourceAnalysis.reduce((sum, s) => sum + s.count, 0);
      sourceAnalysis.forEach(item => {
        const percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : '0';
        htmlContent += `<tr><td>${SOURCE_LABELS[item.source] || item.source}</td><td>${item.count}</td><td>${percentage}%</td></tr>`;
      });
    }
    htmlContent += '</table>';
    
    // 销售业绩
    htmlContent += '<h2>销售业绩排行</h2><table><tr><th>排名</th><th>销售人员</th><th>总商机</th><th>成交数</th><th>转化率</th><th>总金额</th></tr>';
    if (salesPerformance) {
      salesPerformance.slice(0, 10).forEach((item, index) => {
        htmlContent += `<tr><td>${index + 1}</td><td>${item.salesName}</td><td>${item.totalLeads}</td><td>${item.wonLeads}</td><td>${item.conversionRate.toFixed(1)}%</td><td>¥${(item.totalValue / 10000).toFixed(1)}万</td></tr>`;
      });
    }
    htmlContent += '</table></body></html>';
    
    // 打开新窗口并打印
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();
      toast.success('已打开打印页面，请选择“另存为PDF”');
    } else {
      toast.error('无法打开打印窗口，请检查浏览器设置');
    }
  };

  return (
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={Target}
          title="商机管理"
          description="AI智能识别高意向客户，自动创建并跟进商机"
          actions={
            <div className="flex gap-2">
              <Button onClick={() => setIsImportOpen(true)} variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                导入商机
              </Button>
              <Button onClick={() => refetchLeads()} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                刷新
              </Button>
            </div>
          }
        />

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard icon={Users} label="总商机数" value={stats?.total || 0} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
          <StatCard icon={AlertCircle} label="高优先级" value={stats?.highPriority || 0} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
          <StatCard icon={Activity} label="平均置信度" value={`${stats?.avgConfidence || 0}%`} iconColor="text-green-500" iconBg="bg-green-500/10" />
          <StatCard icon={TrendingUp} label="预估总金额" value={`¥${((stats?.totalValue || 0) / 10000).toFixed(1)}万`} iconColor="text-primary" iconBg="bg-primary/10" />
        </div>

        {/* 主要内容区 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="list" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
              <Users className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">商机</span>列表
            </TabsTrigger>
            <TabsTrigger value="kanban" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
              <Target className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">跟进</span>看板
            </TabsTrigger>
            <TabsTrigger value="funnel" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">销售</span>漏斗
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
              <LineChart className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">分析</span>报表
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
              <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">报表</span>模板
            </TabsTrigger>
            <TabsTrigger value="importHistory" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
              <FileSpreadsheet className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">导入</span>历史
            </TabsTrigger>
          </TabsList>

          {/* 商机列表 */}
          <TabsContent value="list" className="space-y-4">
            {/* 筛选器 */}
            <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as LeadStatus | "all")}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as LeadPriority | "all")}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="优先级筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部优先级</SelectItem>
                  {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 商机卡片列表 */}
            {leadsLoading ? (
              <div className="text-center py-8 text-muted-foreground">加载中...</div>
            ) : leadsData?.leads && leadsData.leads.length > 0 ? (
              <div className="grid gap-4">
                {leadsData.leads.map((lead) => (
                  <Card key={lead.id} className="bg-card/50 border-border hover:border-primary/50 transition-colors cursor-pointer" onClick={() => openLeadDetail(lead as Lead)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{lead.customerName}</h3>
                            <Badge className={`${STATUS_CONFIG[lead.status as LeadStatus]?.color} text-white`}>
                              {STATUS_CONFIG[lead.status as LeadStatus]?.label}
                            </Badge>
                            <Badge variant="outline" className={PRIORITY_CONFIG[lead.priority as LeadPriority]?.color.replace('bg-', 'border-')}>
                              {PRIORITY_CONFIG[lead.priority as LeadPriority]?.label}优先级
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                            {lead.companyName && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-4 h-4" />
                                {lead.companyName}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Zap className="w-4 h-4" />
                              {SOURCE_LABELS[lead.source] || lead.source}
                            </span>
                            <span className="flex items-center gap-1">
                              <Activity className="w-4 h-4" />
                              置信度 {(lead.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{lead.originalContent}</p>
                          {lead.productInterest && lead.productInterest.length > 0 && (
                            <div className="flex gap-2 mt-2">
                              {lead.productInterest.map((product, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">{product}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          {lead.estimatedValue && (
                            <p className="text-lg font-bold text-primary">¥{(lead.estimatedValue / 10000).toFixed(1)}万</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(lead.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>暂无商机数据</p>
                <p className="text-sm mt-2">点击"导入商机"按钮批量导入，或等待AI自动识别</p>
              </div>
            )}
          </TabsContent>

          {/* 跟进看板 */}
          <TabsContent value="kanban" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 待处理 */}
              <Card className="bg-card/50 border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-500" />
                    待处理
                    <Badge variant="secondary">{tasksData?.filter(t => t.status === 'pending').length || 0}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {tasksData?.filter(t => t.status === 'pending').map((task) => (
                    <div key={task.id} className="p-3 bg-muted/30 rounded-lg">
                      <p className="font-medium text-sm">{task.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        截止: {new Date(task.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                  {(!tasksData || tasksData.filter(t => t.status === 'pending').length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">暂无待处理任务</p>
                  )}
                </CardContent>
              </Card>

              {/* 进行中 */}
              <Card className="bg-card/50 border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-500" />
                    进行中
                    <Badge variant="secondary">0</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground text-center py-4">暂无进行中任务</p>
                </CardContent>
              </Card>

              {/* 已完成 */}
              <Card className="bg-card/50 border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    已完成
                    <Badge variant="secondary">{tasksData?.filter(t => t.status === 'completed').length || 0}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {tasksData?.filter(t => t.status === 'completed').map((task) => (
                    <div key={task.id} className="p-3 bg-muted/30 rounded-lg opacity-60">
                      <p className="font-medium text-sm line-through">{task.title}</p>
                    </div>
                  ))}
                  {(!tasksData || tasksData.filter(t => t.status === 'completed').length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">暂无已完成任务</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 销售漏斗 */}
          <TabsContent value="funnel" className="space-y-4">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  销售漏斗
                </CardTitle>
                <CardDescription>商机各阶段分布情况</CardDescription>
              </CardHeader>
              <CardContent>
                {funnelData ? (
                  <div className="space-y-4">
                    {/* 漏斗可视化 */}
                    <div className="flex flex-col items-center space-y-2">
                      {(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won'] as LeadStatus[]).map((status, index) => {
                        const count = funnelData[status];
                        const maxCount = Math.max(...Object.values(funnelData));
                        const width = maxCount > 0 ? Math.max(30, (count / maxCount) * 100) : 30;
                        const config = STATUS_CONFIG[status];
                        
                        return (
                          <div key={status} className="w-full flex items-center gap-4">
                            <div className="w-24 text-right text-sm font-medium">{config.label}</div>
                            <div className="flex-1 relative">
                              <div 
                                className={`h-10 ${config.color} rounded-lg flex items-center justify-center text-white font-bold transition-all duration-500`}
                                style={{ width: `${width}%` }}
                              >
                                {count}
                              </div>
                            </div>
                            <div className="w-16 text-sm text-muted-foreground">
                              {maxCount > 0 ? ((count / maxCount) * 100).toFixed(0) : 0}%
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* 转化率 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-border">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">
                          {funnelData.new > 0 ? ((funnelData.contacted / funnelData.new) * 100).toFixed(0) : 0}%
                        </p>
                        <p className="text-sm text-muted-foreground">新商机→已联系</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">
                          {funnelData.contacted > 0 ? ((funnelData.qualified / funnelData.contacted) * 100).toFixed(0) : 0}%
                        </p>
                        <p className="text-sm text-muted-foreground">已联系→已确认</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">
                          {funnelData.proposal > 0 ? ((funnelData.negotiation / funnelData.proposal) * 100).toFixed(0) : 0}%
                        </p>
                        <p className="text-sm text-muted-foreground">方案→谈判</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-emerald-500">
                          {funnelData.negotiation > 0 ? ((funnelData.won / funnelData.negotiation) * 100).toFixed(0) : 0}%
                        </p>
                        <p className="text-sm text-muted-foreground">谈判→成交</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <PieChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>暂无数据</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 分析报表 */}
          <TabsContent value="analytics" className="space-y-4">
            {/* 导出按钮区域 */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => exportReportAsCSV()}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                导出CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportReportAsPDF()}>
                <FileText className="w-4 h-4 mr-2" />
                导出PDF
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 趋势分析 */}
              <Card className="bg-card/50 border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="w-5 h-5" />
                    商机趋势
                  </CardTitle>
                  <CardDescription>近6个月商机数量变化</CardDescription>
                </CardHeader>
                <CardContent>
                  {trendData && trendData.length > 0 ? (
                    <div className="space-y-4">
                      {/* 简单的趋势图 */}
                      <div className="h-48 flex items-end justify-between gap-2">
                        {trendData.map((item, index) => {
                          const maxValue = Math.max(...trendData.map(d => d.newLeads + d.convertedLeads));
                          const newHeight = maxValue > 0 ? (item.newLeads / maxValue) * 100 : 0;
                          const convertedHeight = maxValue > 0 ? (item.convertedLeads / maxValue) * 100 : 0;
                          
                          return (
                            <div key={index} className="flex-1 flex flex-col items-center gap-1">
                              <div className="w-full flex gap-1 items-end h-40">
                                <div 
                                  className="flex-1 bg-blue-500 rounded-t transition-all"
                                  style={{ height: `${newHeight}%` }}
                                  title={`新增: ${item.newLeads}`}
                                />
                                <div 
                                  className="flex-1 bg-emerald-500 rounded-t transition-all"
                                  style={{ height: `${convertedHeight}%` }}
                                  title={`转化: ${item.convertedLeads}`}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">{item.period}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-center gap-6 text-sm">
                        <span className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-500 rounded" />
                          新增商机
                        </span>
                        <span className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-emerald-500 rounded" />
                          转化成交
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <LineChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>暂无趋势数据</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 来源分析 */}
              <Card className="bg-card/50 border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    来源分析
                  </CardTitle>
                  <CardDescription>商机来源渠道分布</CardDescription>
                </CardHeader>
                <CardContent>
                  {sourceAnalysis && sourceAnalysis.length > 0 ? (
                    <div className="space-y-3">
                      {sourceAnalysis.map((item, index) => {
                        const total = sourceAnalysis.reduce((sum, s) => sum + s.count, 0);
                        const percentage = total > 0 ? (item.count / total) * 100 : 0;
                        const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-orange-500', 'bg-purple-500', 'bg-cyan-500', 'bg-pink-500'];
                        
                        return (
                          <div key={index} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{SOURCE_LABELS[item.source] || item.source}</span>
                              <span className="text-muted-foreground">{item.count} ({percentage.toFixed(0)}%)</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${colors[index % colors.length]} transition-all`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <PieChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>暂无来源数据</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 销售业绩 */}
              <Card className="bg-card/50 border-border md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    销售业绩排行
                  </CardTitle>
                  <CardDescription>各销售人员商机转化情况</CardDescription>
                </CardHeader>
                <CardContent>
                  {salesPerformance && salesPerformance.length > 0 ? (
                    <div className="space-y-4">
                      {salesPerformance.slice(0, 5).map((item, index) => (
                        <div key={index} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                            index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-muted-foreground'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{item.salesName || '未分配'}</p>
                            <p className="text-sm text-muted-foreground">
                              总商机: {item.totalLeads} | 成交: {item.wonLeads} | 转化率: {item.conversionRate.toFixed(0)}%
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-primary">¥{(item.totalValue / 10000).toFixed(1)}万</p>
                            <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                              {item.conversionRate > 30 ? (
                                <><ArrowUpRight className="w-3 h-3 text-green-500" /> 优秀</>
                              ) : item.conversionRate > 15 ? (
                                <><ArrowUpRight className="w-3 h-3 text-blue-500" /> 良好</>
                              ) : (
                                <><ArrowDownRight className="w-3 h-3 text-orange-500" /> 待提升</>
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>暂无销售业绩数据</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 报表模板 */}
          <TabsContent value="templates" className="space-y-4">
            <ReportTemplateManagerWithGuide />
          </TabsContent>

          {/* 导入历史 */}
          <TabsContent value="importHistory" className="space-y-4">
            <ImportHistoryManager open={true} onOpenChange={() => {}} />
          </TabsContent>
        </Tabs>

        {/* 商机详情弹窗 */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-2xl">
            {selectedLead && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    {selectedLead.customerName}
                    <Badge className={`${STATUS_CONFIG[selectedLead.status]?.color} text-white`}>
                      {STATUS_CONFIG[selectedLead.status]?.label}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription>
                    商机ID: #{selectedLead.id} | 创建时间: {new Date(selectedLead.createdAt).toLocaleString()}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* 基本信息 */}
                  <div className="grid grid-cols-2 gap-4">
                    {selectedLead.companyName && (
                      <div>
                        <p className="text-sm text-muted-foreground">公司</p>
                        <p className="font-medium flex items-center gap-1">
                          <Building2 className="w-4 h-4" />
                          {selectedLead.companyName}
                        </p>
                      </div>
                    )}
                    {selectedLead.contactPhone && (
                      <div>
                        <p className="text-sm text-muted-foreground">电话</p>
                        <p className="font-medium flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {selectedLead.contactPhone}
                        </p>
                      </div>
                    )}
                    {selectedLead.contactEmail && (
                      <div>
                        <p className="text-sm text-muted-foreground">邮箱</p>
                        <p className="font-medium flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {selectedLead.contactEmail}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">来源</p>
                      <p className="font-medium">{SOURCE_LABELS[selectedLead.source] || selectedLead.source}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">AI置信度</p>
                      <p className="font-medium text-primary">{(selectedLead.confidence * 100).toFixed(0)}%</p>
                    </div>
                    {selectedLead.estimatedValue && (
                      <div>
                        <p className="text-sm text-muted-foreground">预估金额</p>
                        <p className="font-medium text-primary">¥{(selectedLead.estimatedValue / 10000).toFixed(1)}万</p>
                      </div>
                    )}
                  </div>

                  {/* 原始内容 */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">原始消息</p>
                    <div className="p-3 bg-muted/30 rounded-lg text-sm">
                      {selectedLead.originalContent}
                    </div>
                  </div>

                  {/* AI分析 */}
                  {selectedLead.aiAnalysis && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">AI分析</p>
                      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm">
                        {selectedLead.aiAnalysis}
                      </div>
                    </div>
                  )}

                  {/* 感兴趣的产品 */}
                  {selectedLead.productInterest && selectedLead.productInterest.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">感兴趣的产品</p>
                      <div className="flex gap-2 flex-wrap">
                        {selectedLead.productInterest.map((product, i) => (
                          <Badge key={i} variant="secondary">{product}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 状态更新 */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">更新状态</p>
                    <div className="flex gap-2 flex-wrap">
                      {(['contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as LeadStatus[]).map((status) => (
                        <Button
                          key={status}
                          variant={selectedLead.status === status ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleStatusChange(selectedLead.id, status)}
                          disabled={updateStatusMutation.isPending}
                        >
                          {STATUS_CONFIG[status].icon}
                          <span className="ml-1">{STATUS_CONFIG[status].label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* 导入商机弹窗 */}
        <Dialog open={isImportOpen} onOpenChange={(open) => { setIsImportOpen(open); if (open) refetchHistory(); }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                导入商机
              </DialogTitle>
              <DialogDescription>
                支持 CSV 和 Excel 格式，请先下载模板填写数据
              </DialogDescription>
            </DialogHeader>
            
            {/* Tab切换 */}
            <div className="flex border-b border-border">
              <button
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  importTab === 'upload' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setImportTab('upload')}
              >
                上传文件
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  importTab === 'history' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setImportTab('history')}
              >
                导入历史
              </button>
            </div>
            
            {importTab === 'upload' ? (
              <div className="space-y-4">
                {/* 下载模板 */}
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm">商机导入模板.csv</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={downloadTemplate}>
                    <Download className="w-4 h-4 mr-1" />
                    下载模板
                  </Button>
                </div>

                {/* 文件上传 */}
                <div 
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  {importFile ? (
                    <div className="space-y-2">
                      <FileSpreadsheet className="w-12 h-12 mx-auto text-primary" />
                      <p className="font-medium">{importFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(importFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground">点击或拖拽文件到此处</p>
                      <p className="text-sm text-muted-foreground">支持 .csv, .xlsx, .xls 格式</p>
                    </div>
                  )}
                </div>

                {/* 导入进度 */}
                {importStatus !== 'idle' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>
                        {importStatus === 'uploading' && '上传中...'}
                        {importStatus === 'processing' && '处理中...'}
                        {importStatus === 'done' && '导入完成'}
                        {importStatus === 'error' && '导入失败'}
                      </span>
                      <span>{importProgress}%</span>
                    </div>
                    <Progress value={importProgress} />
                  </div>
                )}

                {/* 导入结果 */}
                {importResult && (
                  <div className={`p-3 rounded-lg ${importResult.failed > 0 ? 'bg-orange-500/10' : 'bg-green-500/10'}`}>
                    <p className="font-medium">
                      成功导入 {importResult.success} 条，失败 {importResult.failed} 条
                    </p>
                    {importResult.errors.length > 0 && (
                      <div className="mt-2 text-sm text-muted-foreground max-h-24 overflow-y-auto">
                        {importResult.errors.slice(0, 5).map((err, i) => (
                          <p key={i}>• {err}</p>
                        ))}
                        {importResult.errors.length > 5 && (
                          <p>... 还有 {importResult.errors.length - 5} 条错误</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* 导入历史Tab */
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {!(importHistory as any)?.logs || (importHistory as any).logs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无导入记录
                  </div>
                ) : (
                  (importHistory as any).logs.map((log: any) => (
                    <div key={log.id} className="p-4 bg-muted/30 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{log.fileName}</span>
                        </div>
                        <Badge className={log.status === 'completed' ? 'bg-green-500/20 text-green-400' : log.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}>
                          {log.status === 'completed' ? '完成' : log.status === 'failed' ? '失败' : '处理中'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>时间: {new Date(log.createdAt).toLocaleString('zh-CN')}</span>
                        <span>成功: {log.successCount}</span>
                        <span>失败: {log.failedCount}</span>
                        <span>总计: {log.totalCount}</span>
                      </div>
                      {log.errors && log.errors.length > 0 && (
                        <div className="mt-2 p-2 bg-red-500/10 rounded text-sm">
                          <p className="font-medium text-red-400 mb-1">错误详情:</p>
                          <div className="max-h-20 overflow-y-auto text-muted-foreground">
                            {log.errors.slice(0, 3).map((err: string, i: number) => (
                              <p key={i}>• {err}</p>
                            ))}
                            {log.errors.length > 3 && (
                              <p className="text-muted-foreground">... 还有 {log.errors.length - 3} 条错误</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsImportOpen(false)}>
                关闭
              </Button>
              {importTab === 'upload' && (
                <Button 
                  onClick={handleImport} 
                  disabled={!importFile || importStatus === 'uploading' || importStatus === 'processing'}
                >
                  {importStatus === 'uploading' || importStatus === 'processing' ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      处理中...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      开始导入
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
