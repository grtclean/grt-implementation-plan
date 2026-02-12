import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { 
  AlertTriangle, Award, CheckCircle2, Clock, Eye, FileText, 
  Filter, Loader2, RefreshCw, Search, Shield, ThumbsDown, 
  ThumbsUp, User, XCircle 
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const DOMAIN_CONFIG: Record<string, { color: string; bgColor: string }> = {
  'T': { color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  'S': { color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  'D': { color: 'text-green-400', bgColor: 'bg-green-500/20' },
  'C': { color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  'K': { color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
  'L': { color: 'text-red-400', bgColor: 'bg-red-500/20' },
};

export default function EvidenceReview() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedEvidence, setSelectedEvidence] = useState<any>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewPoints, setReviewPoints] = useState("");
  const [filterDomain, setFilterDomain] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // tRPC queries
  const { data: domains } = trpc.capabilityOs.getDomains.useQuery();
  const { data: evidenceTypes } = trpc.capabilityOs.getEvidenceTypes.useQuery();
  const { data: pendingEvidences, isLoading: pendingLoading, refetch: refetchPending } = 
    trpc.capabilityOs.getPendingEvidences.useQuery();
  const { data: allEvidences, isLoading: allLoading, refetch: refetchAll } = 
    trpc.capabilityOs.getAllEvidences.useQuery();

  // tRPC mutations
  const reviewMutation = trpc.capabilityOs.reviewEvidence.useMutation({
    onSuccess: () => {
      toast.success(language === 'zh' ? '审核完成' : 'Review completed');
      setReviewDialogOpen(false);
      setSelectedEvidence(null);
      setReviewComment("");
      setReviewPoints("");
      refetchPending();
      refetchAll();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleReview = (status: 'approved' | 'rejected') => {
    if (!selectedEvidence) return;
    
    reviewMutation.mutate({
      evidenceId: selectedEvidence.id,
      status,
      reviewComment,
      awardedPoints: status === 'approved' ? parseInt(reviewPoints) || selectedEvidence.requestedPoints : 0
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" /> {language === 'zh' ? '已通过' : 'Approved'}</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" /> {language === 'zh' ? '已拒绝' : 'Rejected'}</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" /> {language === 'zh' ? '待审核' : 'Pending'}</Badge>;
      default:
        return null;
    }
  };

  const getDomainBadge = (domainId: number) => {
    const domain = domains?.find((d: any) => d.id === domainId);
    if (!domain) return null;
    const config = DOMAIN_CONFIG[(domain as any).code] || { color: 'text-gray-400', bgColor: 'bg-gray-500/20' };
    return (
      <Badge className={`${config.bgColor} ${config.color} border-transparent`}>
        {(domain as any).code} - {domain.name}
      </Badge>
    );
  };

  const getEvidenceTypeName = (typeId: number) => {
    const type = evidenceTypes?.find((t: any) => t.id === typeId);
    return type?.name || '-';
  };

  const filterEvidences = (evidences: any[]) => {
    if (!evidences) return [];
    return evidences.filter((e: any) => {
      const matchesDomain = filterDomain === 'all' || e.domainId?.toString() === filterDomain;
      const matchesSearch = !searchQuery || 
        e.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDomain && matchesSearch;
    });
  };

  const handleRefresh = () => {
    refetchPending();
    refetchAll();
  };

  const isLoading = pendingLoading || allLoading;

  // Calculate stats
  const stats = {
    pending: pendingEvidences?.length || 0,
    approved: allEvidences?.filter((e: any) => e.status === 'approved').length || 0,
    rejected: allEvidences?.filter((e: any) => e.status === 'rejected').length || 0,
    total: allEvidences?.length || 0
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              {language === 'zh' ? '证据审核管理' : 'Evidence Review Management'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {language === 'zh' ? '审核能力证据，管理积分发放，确保能力评估的公正性' : 'Review capability evidence, manage points, ensure fair assessment'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {language === 'zh' ? '刷新' : 'Refresh'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 border-yellow-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'zh' ? '待审核' : 'Pending'}</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'zh' ? '已通过' : 'Approved'}</p>
                  <p className="text-2xl font-bold">{stats.approved}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-red-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'zh' ? '已拒绝' : 'Rejected'}</p>
                  <p className="text-2xl font-bold">{stats.rejected}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'zh' ? '总计' : 'Total'}</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={language === 'zh' ? '搜索证据标题或描述...' : 'Search evidence title or description...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full md:w-[200px]">
                <Select value={filterDomain} onValueChange={setFilterDomain}>
                  <SelectTrigger>
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder={language === 'zh' ? '筛选能力域' : 'Filter Domain'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === 'zh' ? '全部能力域' : 'All Domains'}</SelectItem>
                    {domains?.map((domain: any) => (
                      <SelectItem key={domain.id} value={domain.id.toString()}>
                        {domain.code} - {domain.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Evidence List */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {language === 'zh' ? '待审核' : 'Pending'}
              {stats.pending > 0 && <Badge variant="secondary" className="ml-1">{stats.pending}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {language === 'zh' ? '已通过' : 'Approved'}
            </TabsTrigger>
            <TabsTrigger value="rejected" className="flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              {language === 'zh' ? '已拒绝' : 'Rejected'}
            </TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <TabsContent value="pending">
                <Card className="bg-card/50 border-border">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      {language === 'zh' ? '待审核证据' : 'Pending Evidence'}
                    </CardTitle>
                    <CardDescription>
                      {language === 'zh' ? '需要您审核的能力证据列表' : 'Evidence requiring your review'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {filterEvidences(pendingEvidences || []).map((evidence: any) => (
                        <div key={evidence.id} className="p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5 hover:border-yellow-500/40 transition-colors">
                          <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                {getDomainBadge(evidence.domainId)}
                                <Badge variant="outline">{getEvidenceTypeName(evidence.evidenceTypeId)}</Badge>
                              </div>
                              <h4 className="font-medium">{evidence.title}</h4>
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{evidence.description}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><User className="w-3 h-3" /> {evidence.submitterName || 'Unknown'}</span>
                                <span>{new Date(evidence.createdAt).toLocaleDateString()}</span>
                                <span className="flex items-center gap-1"><Award className="w-3 h-3" /> {language === 'zh' ? '申请' : 'Request'}: {evidence.requestedPoints} {language === 'zh' ? '积分' : 'pts'}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Dialog open={reviewDialogOpen && selectedEvidence?.id === evidence.id} onOpenChange={(open) => {
                                setReviewDialogOpen(open);
                                if (open) {
                                  setSelectedEvidence(evidence);
                                  setReviewPoints(evidence.requestedPoints?.toString() || "");
                                }
                              }}>
                                <DialogTrigger asChild>
                                  <Button size="sm" className="gap-2">
                                    <Eye className="w-4 h-4" />
                                    {language === 'zh' ? '审核' : 'Review'}
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>{language === 'zh' ? '审核能力证据' : 'Review Capability Evidence'}</DialogTitle>
                                    <DialogDescription>
                                      {language === 'zh' ? '请仔细审核证据内容，决定是否通过并分配积分' : 'Review evidence carefully and decide approval with points'}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div className="flex items-center gap-2">
                                      {getDomainBadge(evidence.domainId)}
                                      <Badge variant="outline">{getEvidenceTypeName(evidence.evidenceTypeId)}</Badge>
                                      {getStatusBadge(evidence.status)}
                                    </div>
                                    <div>
                                      <Label className="text-muted-foreground">{language === 'zh' ? '证据标题' : 'Title'}</Label>
                                      <p className="font-medium">{evidence.title}</p>
                                    </div>
                                    <div>
                                      <Label className="text-muted-foreground">{language === 'zh' ? '证据描述' : 'Description'}</Label>
                                      <p className="text-sm">{evidence.description}</p>
                                    </div>
                                    {evidence.projectReference && (
                                      <div>
                                        <Label className="text-muted-foreground">{language === 'zh' ? '项目参考' : 'Project Reference'}</Label>
                                        <p className="text-sm">{evidence.projectReference}</p>
                                      </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label className="text-muted-foreground">{language === 'zh' ? '提交人' : 'Submitter'}</Label>
                                        <p className="text-sm">{evidence.submitterName || 'Unknown'}</p>
                                      </div>
                                      <div>
                                        <Label className="text-muted-foreground">{language === 'zh' ? '申请积分' : 'Requested Points'}</Label>
                                        <p className="text-sm font-medium">{evidence.requestedPoints}</p>
                                      </div>
                                    </div>
                                    <div className="border-t pt-4 space-y-4">
                                      <div>
                                        <Label htmlFor="points">{language === 'zh' ? '授予积分' : 'Award Points'}</Label>
                                        <Input
                                          id="points"
                                          type="number"
                                          value={reviewPoints}
                                          onChange={(e) => setReviewPoints(e.target.value)}
                                          placeholder={language === 'zh' ? '输入授予积分' : 'Enter points to award'}
                                          min="0"
                                          max="100"
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor="comment">{language === 'zh' ? '审核意见' : 'Review Comment'}</Label>
                                        <Textarea
                                          id="comment"
                                          value={reviewComment}
                                          onChange={(e) => setReviewComment(e.target.value)}
                                          placeholder={language === 'zh' ? '输入审核意见（可选）' : 'Enter review comment (optional)'}
                                          rows={3}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                  <DialogFooter className="flex gap-2">
                                    <Button variant="outline" onClick={() => handleReview('rejected')} disabled={reviewMutation.isPending} className="gap-2 text-red-500 hover:text-red-600">
                                      <ThumbsDown className="w-4 h-4" />
                                      {language === 'zh' ? '拒绝' : 'Reject'}
                                    </Button>
                                    <Button onClick={() => handleReview('approved')} disabled={reviewMutation.isPending} className="gap-2">
                                      {reviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                                      {language === 'zh' ? '通过' : 'Approve'}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                        </div>
                      ))}
                      {filterEvidences(pendingEvidences || []).length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                          <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>{language === 'zh' ? '没有待审核的证据' : 'No pending evidence'}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="approved">
                <Card className="bg-card/50 border-border">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      {language === 'zh' ? '已通过证据' : 'Approved Evidence'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {filterEvidences(allEvidences?.filter((e: any) => e.status === 'approved') || []).map((evidence: any) => (
                        <div key={evidence.id} className="p-4 rounded-lg border border-green-500/20 bg-green-500/5">
                          <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                {getDomainBadge(evidence.domainId)}
                                <Badge variant="outline">{getEvidenceTypeName(evidence.evidenceTypeId)}</Badge>
                                {getStatusBadge(evidence.status)}
                              </div>
                              <h4 className="font-medium">{evidence.title}</h4>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><User className="w-3 h-3" /> {evidence.submitterName || 'Unknown'}</span>
                                <span>{new Date(evidence.createdAt).toLocaleDateString()}</span>
                                <span className="flex items-center gap-1 text-green-400"><Award className="w-3 h-3" /> +{evidence.awardedPoints} {language === 'zh' ? '积分' : 'pts'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {filterEvidences(allEvidences?.filter((e: any) => e.status === 'approved') || []).length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>{language === 'zh' ? '没有已通过的证据' : 'No approved evidence'}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="rejected">
                <Card className="bg-card/50 border-border">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-500" />
                      {language === 'zh' ? '已拒绝证据' : 'Rejected Evidence'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {filterEvidences(allEvidences?.filter((e: any) => e.status === 'rejected') || []).map((evidence: any) => (
                        <div key={evidence.id} className="p-4 rounded-lg border border-red-500/20 bg-red-500/5">
                          <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                {getDomainBadge(evidence.domainId)}
                                <Badge variant="outline">{getEvidenceTypeName(evidence.evidenceTypeId)}</Badge>
                                {getStatusBadge(evidence.status)}
                              </div>
                              <h4 className="font-medium">{evidence.title}</h4>
                              {evidence.reviewComment && (
                                <p className="text-sm text-red-400 mt-1">{language === 'zh' ? '拒绝原因' : 'Reason'}: {evidence.reviewComment}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><User className="w-3 h-3" /> {evidence.submitterName || 'Unknown'}</span>
                                <span>{new Date(evidence.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {filterEvidences(allEvidences?.filter((e: any) => e.status === 'rejected') || []).length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>{language === 'zh' ? '没有已拒绝的证据' : 'No rejected evidence'}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}
