import { PageHeader } from "@/components/grt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  Award, BookOpen, Briefcase, Camera, CheckCircle2, Clock, FileText,
  Lightbulb, Loader2, Mic, Plus, RefreshCw, Send, Settings, Shield, Target, TrendingUp,
  Upload, Users, Wrench, XCircle, AlertCircle, History
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const DOMAIN_ICONS: Record<string, any> = {
  'T': Wrench,
  'S': Settings,
  'D': Target,
  'C': Users,
  'K': BookOpen,
  'L': Award,
};

const DOMAIN_COLORS: Record<string, string> = {
  'T': 'bg-blue-500',
  'S': 'bg-purple-500',
  'D': 'bg-green-500',
  'C': 'bg-orange-500',
  'K': 'bg-cyan-500',
  'L': 'bg-red-500',
};

const TYPE_ICONS: Record<string, any> = {
  'PROJECT_COMPLETE': Briefcase,
  'SERVICE_REPORT': FileText,
  'PROBLEM_SOLVED': Lightbulb,
  'KNOWLEDGE_SHARE': BookOpen,
  'CUSTOMER_FEEDBACK': Users,
  'DESIGN_REVIEW': CheckCircle2,
  'TRAINING_DELIVER': Award,
  'TIER1_DELIVERY': Shield,
  'RED_BLUE_PASS': Target,
  'SPEC_UPDATE': FileText,
};

export default function EvidenceSubmission() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState("submit");
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);

  // tRPC queries
  const { data: domains, isLoading: domainsLoading } = trpc.capabilityOs.getDomains.useQuery();
  const { data: evidenceTypes, isLoading: typesLoading } = trpc.capabilityOs.getEvidenceTypes.useQuery();
  const { data: myCapabilities, isLoading: capLoading, refetch: refetchCapabilities } = trpc.capabilityOs.getMyCapabilities.useQuery();
  const { data: myEvidences, isLoading: evidencesLoading, refetch: refetchEvidences } = trpc.capabilityOs.getMyEvidences.useQuery();

  // tRPC mutations
  const submitEvidence = trpc.capabilityOs.submitEvidence.useMutation({
    onSuccess: () => {
      toast.success(language === 'zh' ? '证据提交成功！' : 'Evidence submitted successfully!');
      setSubmitDialogOpen(false);
      resetForm();
      refetchEvidences();
      refetchCapabilities();
    },
    onError: (error) => {
      toast.error(language === 'zh' ? `提交失败：${error.message}` : `Submission failed: ${error.message}`);
    },
  });

  const resetForm = () => {
    setSelectedType("");
    setSelectedDomain("");
    setEvidenceTitle("");
    setEvidenceDescription("");
    setProjectId("");
  };

  const getDomainInfo = (code: string) => domains?.find((d: any) => d.code === code);
  const getTypeInfo = (code: string) => evidenceTypes?.find((t: any) => t.code === code);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" /> {language === 'zh' ? '已通过' : 'Approved'}</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" /> {language === 'zh' ? '待审核' : 'Pending'}</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" /> {language === 'zh' ? '已拒绝' : 'Rejected'}</Badge>;
      default:
        return null;
    }
  };

  const handleSubmit = async () => {
    const typeInfo = getTypeInfo(selectedType);
    if (!typeInfo) return;

    submitEvidence.mutate({
      evidenceTypeId: typeInfo.id,
      domainId: getDomainInfo(selectedDomain)?.id || 1,
      title: evidenceTitle,
      description: evidenceDescription,
      projectId: projectId || undefined,
    });
  };

  const calculateEstimatedScore = () => {
    const typeInfo = getTypeInfo(selectedType);
    return typeInfo ? typeInfo.baseScore : 0;
  };

  const getTypeDomains = (typeCode: string): string[] => {
    const typeInfo = getTypeInfo(typeCode);
    if (!typeInfo || !typeInfo.domains) return [];
    return typeInfo.domains.split(',');
  };

  const isLoading = domainsLoading || typesLoading || capLoading;

  if (isLoading) {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
      <div className="space-y-6">
        <PageHeader
          icon={TrendingUp}
          title={language === 'zh' ? '能力证据提交' : 'Evidence Submission'}
          description={language === 'zh' ? '提交您的能力证据，系统将自动计算积分并更新能力等级' : 'Submit your capability evidence, the system will automatically calculate scores and update levels'}
          actions={
            <Button variant="outline" size="sm" onClick={() => { refetchCapabilities(); refetchEvidences(); }}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {language === 'zh' ? '刷新' : 'Refresh'}
            </Button>
          }
        />

        {/* 能力概览 */}
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              {language === 'zh' ? '我的能力概览' : 'My Capability Overview'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {domains?.map((domain: any) => {
                const cap = myCapabilities?.find((c: any) => c.domainId === domain.id);
                const Icon = DOMAIN_ICONS[domain.code] || Award;
                const color = DOMAIN_COLORS[domain.code] || 'bg-gray-500';
                const level = cap?.currentLevel || 1;
                const score = cap?.totalPoints || 0;
                const nextLevelScore = level === 1 ? 100 : level === 2 ? 300 : level === 3 ? 600 : level === 4 ? 1000 : 9999;
                const progress = Math.min((score / nextLevelScore) * 100, 100);
                
                return (
                  <div key={domain.id} className="p-3 rounded-lg bg-background/50 border border-border hover:border-primary/50 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded ${color}`}>
                        <Icon className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-xs font-medium">{language === 'zh' ? domain.name : domain.code}</span>
                    </div>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-xl font-bold">L{level}</span>
                      <span className="text-xs text-muted-foreground">{score}/{nextLevelScore}</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="submit" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              {language === 'zh' ? '提交证据' : 'Submit Evidence'}
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              {language === 'zh' ? '提交历史' : 'History'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="submit" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <Card className="bg-card/50 border-border">
                  <CardHeader>
                    <CardTitle className="text-lg">{language === 'zh' ? '选择证据类型' : 'Select Evidence Type'}</CardTitle>
                    <CardDescription>{language === 'zh' ? '选择与您完成的工作最匹配的证据类型' : 'Choose the evidence type that best matches your completed work'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {evidenceTypes?.map((type: any) => {
                        const Icon = TYPE_ICONS[type.code] || FileText;
                        const isSelected = selectedType === type.code;
                        const typeDomains = type.domains ? type.domains.split(',') : [];
                        return (
                          <div key={type.code} onClick={() => { setSelectedType(type.code); setSelectedDomain(""); }}
                            className={`p-4 rounded-lg border cursor-pointer transition-all ${isSelected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 bg-background/50'}`}>
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm">{language === 'zh' ? type.name : type.code}</div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-muted-foreground">{language === 'zh' ? '基础分：' : 'Base: '}{type.baseScore}</span>
                                  <div className="flex gap-1">
                                    {typeDomains.map((d: string) => (
                                      <span key={d} className={`w-4 h-4 rounded text-[10px] flex items-center justify-center text-white ${DOMAIN_COLORS[d] || 'bg-gray-500'}`}>{d}</span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {selectedType && (
                  <Card className="bg-card/50 border-border">
                    <CardHeader>
                      <CardTitle className="text-lg">{language === 'zh' ? '填写证据详情' : 'Evidence Details'}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{language === 'zh' ? '证据标题' : 'Evidence Title'} *</Label>
                          <Input placeholder={language === 'zh' ? '请输入证据标题' : 'Enter evidence title'} value={evidenceTitle} onChange={(e) => setEvidenceTitle(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>{language === 'zh' ? '关联项目/服务' : 'Related Project/Service'}</Label>
                          <Input placeholder={language === 'zh' ? '项目编号（可选）' : 'Project ID (optional)'} value={projectId} onChange={(e) => setProjectId(e.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>{language === 'zh' ? '主要能力域' : 'Primary Domain'} *</Label>
                        <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                          <SelectTrigger><SelectValue placeholder={language === 'zh' ? '选择主要能力域' : 'Select primary domain'} /></SelectTrigger>
                          <SelectContent>
                            {getTypeDomains(selectedType).map((d: string) => {
                              const domain = getDomainInfo(d);
                              return domain ? (
                                <SelectItem key={d} value={d}>
                                  <div className="flex items-center gap-2">
                                    <span className={`w-5 h-5 rounded flex items-center justify-center text-white text-xs ${DOMAIN_COLORS[d] || 'bg-gray-500'}`}>{d}</span>
                                    {language === 'zh' ? domain.name : (domain as any).code}
                                  </div>
                                </SelectItem>
                              ) : null;
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{language === 'zh' ? '详细描述' : 'Description'} *</Label>
                        <Textarea placeholder={language === 'zh' ? '请详细描述您完成的工作内容、解决的问题、产生的价值等...' : 'Please describe in detail the work you completed...'} value={evidenceDescription} onChange={(e) => setEvidenceDescription(e.target.value)} rows={4} />
                      </div>
                      <div className="space-y-2">
                        <Label>{language === 'zh' ? '附件（可选）' : 'Attachments (Optional)'}</Label>
                        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                          <div className="flex flex-col items-center gap-2">
                            <Upload className="w-8 h-8 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">{language === 'zh' ? '拖拽文件到此处或点击上传' : 'Drag files here or click to upload'}</p>
                            <div className="flex gap-2 mt-2">
                              <Button variant="outline" size="sm" className="gap-1"><Camera className="w-4 h-4" />{language === 'zh' ? '拍照' : 'Photo'}</Button>
                              <Button variant="outline" size="sm" className="gap-1"><FileText className="w-4 h-4" />{language === 'zh' ? '文件' : 'File'}</Button>
                              <Button variant="outline" size="sm" className="gap-1"><Mic className="w-4 h-4" />{language === 'zh' ? '录音' : 'Audio'}</Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-4">
                <Card className="bg-card/50 border-border sticky top-4">
                  <CardHeader><CardTitle className="text-lg">{language === 'zh' ? '提交预览' : 'Submission Preview'}</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {selectedType ? (
                      <>
                        <div className="p-4 rounded-lg bg-background/50 border border-border">
                          <div className="text-sm text-muted-foreground mb-1">{language === 'zh' ? '证据类型' : 'Evidence Type'}</div>
                          <div className="font-medium">{language === 'zh' ? getTypeInfo(selectedType)?.name : getTypeInfo(selectedType)?.code}</div>
                        </div>
                        {selectedDomain && (
                          <div className="p-4 rounded-lg bg-background/50 border border-border">
                            <div className="text-sm text-muted-foreground mb-1">{language === 'zh' ? '主要能力域' : 'Primary Domain'}</div>
                            <div className="flex items-center gap-2">
                              {(() => {
                                const domain = getDomainInfo(selectedDomain);
                                if (!domain) return null;
                                const Icon = DOMAIN_ICONS[selectedDomain] || Award;
                                return (<><div className={`p-1.5 rounded ${DOMAIN_COLORS[selectedDomain] || 'bg-gray-500'}`}><Icon className="w-4 h-4 text-white" /></div><span className="font-medium">{language === 'zh' ? domain.name : (domain as any).code}</span></>);
                              })()}
                            </div>
                          </div>
                        )}
                        <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                          <div className="text-sm text-muted-foreground mb-1">{language === 'zh' ? '预估积分' : 'Estimated Score'}</div>
                          <div className="text-2xl font-bold text-primary">+{calculateEstimatedScore()}</div>
                          <div className="text-xs text-muted-foreground mt-1">{language === 'zh' ? '* 最终积分由系统根据证据质量计算' : '* Final score calculated by system based on evidence quality'}</div>
                        </div>
                        <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
                          <DialogTrigger asChild>
                            <Button className="w-full gap-2" size="lg" disabled={!evidenceTitle || !selectedDomain || !evidenceDescription}>
                              <Send className="w-4 h-4" />{language === 'zh' ? '提交证据' : 'Submit Evidence'}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{language === 'zh' ? '确认提交' : 'Confirm Submission'}</DialogTitle>
                              <DialogDescription>{language === 'zh' ? '提交后将进入审核流程，审核通过后积分将自动计入您的能力账户。' : 'After submission, it will enter the review process.'}</DialogDescription>
                            </DialogHeader>
                            <div className="py-4 space-y-3">
                              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{language === 'zh' ? '证据标题' : 'Title'}</span><span className="font-medium">{evidenceTitle}</span></div>
                              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{language === 'zh' ? '证据类型' : 'Type'}</span><span className="font-medium">{language === 'zh' ? getTypeInfo(selectedType)?.name : getTypeInfo(selectedType)?.code}</span></div>
                              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{language === 'zh' ? '预估积分' : 'Est. Score'}</span><span className="font-medium text-primary">+{calculateEstimatedScore()}</span></div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>{language === 'zh' ? '取消' : 'Cancel'}</Button>
                              <Button onClick={handleSubmit} disabled={submitEvidence.isPending}>
                                {submitEvidence.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                {submitEvidence.isPending ? (language === 'zh' ? '提交中...' : 'Submitting...') : (language === 'zh' ? '确认提交' : 'Confirm')}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>{language === 'zh' ? '请先选择证据类型' : 'Please select an evidence type first'}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{language === 'zh' ? '提交历史' : 'Submission History'}</span>
                  <Badge variant="outline">{myEvidences?.length || 0} {language === 'zh' ? '条记录' : 'records'}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {evidencesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : myEvidences && myEvidences.length > 0 ? (
                  <div className="space-y-3">
                    {myEvidences.map((evidence: any) => {
                      const Icon = TYPE_ICONS[evidence.evidenceTypeCode] || FileText;
                      return (
                        <div key={evidence.id} className="p-4 rounded-lg border border-border bg-background/50 hover:border-primary/50 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="p-2 rounded-lg bg-muted"><Icon className="w-5 h-5" /></div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{evidence.title}</div>
                                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                  <span>{new Date(evidence.createdAt).toLocaleDateString()}</span>
                                  {evidence.projectId && <><span>•</span><span>{evidence.projectId}</span></>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {getStatusBadge(evidence.status)}
                              <div className="text-right">
                                <div className={`font-bold ${evidence.status === 'approved' ? 'text-green-400' : 'text-muted-foreground'}`}>
                                  {evidence.status === 'approved' ? `+${evidence.score}` : `~${evidence.score}`}
                                </div>
                                <div className="text-xs text-muted-foreground">{language === 'zh' ? '积分' : 'pts'}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>{language === 'zh' ? '暂无提交记录' : 'No submission records yet'}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
