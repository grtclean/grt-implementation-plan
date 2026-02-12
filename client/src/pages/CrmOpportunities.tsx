import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  TrendingUp, 
  Plus, 
  Search, 
  DollarSign,
  Calendar,
  User,
  Building2,
  ArrowRight,
  Target,
  BarChart3,
  ArrowDownRight
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { Link } from "wouter";
import ProcessNotebook from "@/components/ProcessNotebook";
import { Eye } from "lucide-react";

// Pipeline stages
type StageType = "lead" | "qualification" | "needs_analysis" | "proposal" | "negotiation" | "closed_won" | "closed_lost";

export default function CrmOpportunities() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [newOpportunity, setNewOpportunity] = useState({
    name: "",
    customerId: 0,
    stage: "lead" as StageType,
    expectedAmount: 0,
    probability: 50,
    expectedCloseDate: "",
    description: "",
  });

  // Dynamic stages with translations
  const STAGES: { id: StageType; name: string; color: string }[] = [
    { id: "lead", name: t("crm.opp.stage.lead"), color: "bg-gray-500" },
    { id: "qualification", name: t("crm.opp.stage.qualification"), color: "bg-blue-500" },
    { id: "proposal", name: t("crm.opp.stage.proposal"), color: "bg-yellow-500" },
    { id: "negotiation", name: t("crm.opp.stage.negotiation"), color: "bg-orange-500" },
    { id: "closed_won", name: t("crm.opp.stage.closedWon"), color: "bg-green-500" },
    { id: "closed_lost", name: t("crm.opp.stage.closedLost"), color: "bg-red-500" },
  ];

  const { data: opportunities = [], isLoading, refetch } = (trpc.crm.opportunities as any).list.useQuery({
    search: search || undefined,
    stage: stageFilter !== "all" ? stageFilter : undefined,
  });

  const { data: customers = [] } = (trpc.crm.customers as any).list.useQuery({});

  const createMutation = (trpc.crm.opportunities as any).create.useMutation({
    onSuccess: () => {
      refetch();
      setIsCreateOpen(false);
      setNewOpportunity({
        name: "",
        customerId: 0,
        stage: "lead",
        expectedAmount: 0,
        probability: 50,
        expectedCloseDate: "",
        description: "",
      });
    },
  });

  const updateStageMutation = (trpc.crm.opportunities as any).update.useMutation({
    onSuccess: () => refetch(),
  });

  const handleCreate = () => {
    if (!newOpportunity.name || !newOpportunity.customerId) return;
    createMutation.mutate({
      name: newOpportunity.name,
      customerId: newOpportunity.customerId,
      stage: newOpportunity.stage,
      expectedAmount: newOpportunity.expectedAmount,
      probability: newOpportunity.probability,
      expectedCloseDate: newOpportunity.expectedCloseDate 
        ? new Date(newOpportunity.expectedCloseDate) 
        : undefined,
      remark: newOpportunity.description,
    });
  };

  const handleStageChange = (opportunityId: number, newStage: StageType) => {
    updateStageMutation.mutate({ id: opportunityId, stage: newStage });
  };

  // Group opportunities by stage
  const opportunitiesByStage = STAGES.reduce((acc, stage) => {
    acc[stage.id] = opportunities.filter(o => o.stage === stage.id);
    return acc;
  }, {} as Record<string, typeof opportunities>);

  // Calculate statistics
  const totalValue = opportunities.reduce((sum, o) => sum + (o.expectedAmount || 0), 0);
  const weightedValue = opportunities.reduce((sum, o) => 
    sum + (o.expectedAmount || 0) * (o.probability || 0) / 100, 0
  );
  const activeOpportunities = opportunities.filter(o => 
    !["closed_won", "closed_lost"].includes(o.stage || "")
  ).length;
  const wonOpportunities = opportunities.filter(o => o.stage === "closed_won").length;

  const formatCurrency = (value: number) => {
    if (value >= 10000) {
      return `¥${(value / 10000).toFixed(1)}万`;
    }
    return `¥${value.toLocaleString()}`;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
              <span className="w-1.5 h-6 bg-primary rounded-sm"></span>
              {t("crm.opp.title")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("crm.opp.subtitle")}
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                {t("crm.opp.newOpportunity")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t("crm.opp.newOpportunity")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>{t("crm.opp.opportunityName")} *</Label>
                  <Input
                    value={newOpportunity.name}
                    onChange={(e) => setNewOpportunity({ ...newOpportunity, name: e.target.value })}
                    placeholder={t("crm.opp.enterOpportunityName")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("crm.opp.relatedCustomer")} *</Label>
                  <Select
                    value={newOpportunity.customerId.toString()}
                    onValueChange={(v) => setNewOpportunity({ ...newOpportunity, customerId: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("crm.opp.selectCustomer")} />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("crm.opp.expectedAmount")}</Label>
                    <Input
                      type="number"
                      value={newOpportunity.expectedAmount}
                      onChange={(e) => setNewOpportunity({ ...newOpportunity, expectedAmount: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("crm.opp.probability")} (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={newOpportunity.probability}
                      onChange={(e) => setNewOpportunity({ ...newOpportunity, probability: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("crm.opp.expectedCloseDate")}</Label>
                  <Input
                    type="date"
                    value={newOpportunity.expectedCloseDate}
                    onChange={(e) => setNewOpportunity({ ...newOpportunity, expectedCloseDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("common.description")}</Label>
                  <Textarea
                    value={newOpportunity.description}
                    onChange={(e) => setNewOpportunity({ ...newOpportunity, description: e.target.value })}
                    placeholder={t("crm.opp.enterOpportunityName")}
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? t("crm.opp.creating") : t("common.create")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-sm bg-primary/10 text-primary">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("crm.opp.activeOpportunities")}</p>
                <p className="text-2xl font-bold">{activeOpportunities}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-sm bg-blue-500/10 text-blue-500">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("crm.opp.totalExpectedAmount")}</p>
                <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-sm bg-yellow-500/10 text-yellow-500">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("crm.opp.weightedAmount")}</p>
                <p className="text-2xl font-bold">{formatCurrency(weightedValue)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-sm bg-green-500/10 text-green-500">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("crm.opp.wonDeals")}</p>
                <p className="text-2xl font-bold">{wonOpportunities}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder={t("crm.opp.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="kanban">
          <TabsList>
            <TabsTrigger value="kanban">{t("crm.opp.kanbanView")}</TabsTrigger>
            <TabsTrigger value="list">{t("crm.opp.listView")}</TabsTrigger>
            <TabsTrigger value="funnel">{t("crm.opp.conversionAnalysis")}</TabsTrigger>
          </TabsList>

          {/* Kanban View */}
          <TabsContent value="kanban" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {STAGES.filter(s => !["closed_lost"].includes(s.id)).map((stage) => (
                <div key={stage.id} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${stage.color}`}></div>
                    <span className="font-medium text-sm">{stage.name}</span>
                    <Badge variant="secondary" className="ml-auto">
                      {opportunitiesByStage[stage.id]?.length || 0}
                    </Badge>
                  </div>
                  <div className="space-y-2 min-h-[200px] bg-muted/30 rounded-lg p-2">
                    {opportunitiesByStage[stage.id]?.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-8">
                        {t("crm.opp.noOpportunities")}
                      </p>
                    ) : (
                      opportunitiesByStage[stage.id]?.map((opp) => (
                        <Card 
                          key={opp.id} 
                          className="bg-card border-border cursor-pointer hover:border-primary/50 transition-colors"
                          onClick={() => {
                            setSelectedOpportunity(opp);
                            setIsDetailOpen(true);
                          }}
                        >
                          <CardContent className="p-3 space-y-2">
                            <p className="font-medium text-sm line-clamp-2">{opp.name}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Building2 className="w-3 h-3" />
                              <span className="truncate">
                                {customers.find(c => c.id === opp.customerId)?.name || "-"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-primary font-medium">
                                {formatCurrency(opp.expectedAmount || 0)}
                              </span>
                              <span className="text-muted-foreground">
                                {opp.probability}%
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* List View */}
          <TabsContent value="list" className="mt-4">
            <Card className="bg-card border-border">
              <CardContent className="p-0">
                <table className="w-full">
                  <thead className="border-b border-border">
                    <tr className="text-left text-sm text-muted-foreground">
                      <th className="p-4">{t("crm.opp.opportunityName")}</th>
                      <th className="p-4">{t("crm.opp.relatedCustomer")}</th>
                      <th className="p-4">{t("common.status")}</th>
                      <th className="p-4">{t("crm.opp.expectedAmount")}</th>
                      <th className="p-4">{t("crm.opp.probability")}</th>
                      <th className="p-4">{t("crm.opp.expectedCloseDate")}</th>
                      <th className="p-4">{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opportunities.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          {t("crm.opp.noOpportunities")}
                        </td>
                      </tr>
                    ) : (
                      opportunities.map((opp) => (
                        <tr key={opp.id} className="border-b border-border hover:bg-muted/30">
                          <td className="p-4 font-medium">{opp.name}</td>
                          <td className="p-4">
                            {customers.find(c => c.id === opp.customerId)?.name || "-"}
                          </td>
                          <td className="p-4">
                            <Badge className={STAGES.find(s => s.id === opp.stage)?.color}>
                              {STAGES.find(s => s.id === opp.stage)?.name}
                            </Badge>
                          </td>
                          <td className="p-4 text-primary font-medium">
                            {formatCurrency(opp.expectedAmount || 0)}
                          </td>
                          <td className="p-4">{opp.probability}%</td>
                          <td className="p-4 text-muted-foreground">
                            {opp.expectedCloseDate 
                              ? new Date(opp.expectedCloseDate).toLocaleDateString() 
                              : "-"}
                          </td>
                          <td className="p-4">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedOpportunity(opp);
                                setIsDetailOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Funnel View */}
          <TabsContent value="funnel" className="mt-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">{t("crm.opp.conversionAnalysis")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="funnel">
                  <TabsList className="mb-4">
                    <TabsTrigger value="funnel">{t("crm.opp.funnelChart")}</TabsTrigger>
                    <TabsTrigger value="rate">{t("crm.opp.conversionRate")}</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="funnel">
                    <div className="space-y-2">
                      {STAGES.filter(s => !["closed_lost"].includes(s.id)).map((stage, index) => {
                        const count = opportunitiesByStage[stage.id]?.length || 0;
                        const maxCount = Math.max(...STAGES.map(s => opportunitiesByStage[s.id]?.length || 0), 1);
                        const width = Math.max((count / maxCount) * 100, 10);
                        
                        return (
                          <div key={stage.id} className="flex items-center gap-4">
                            <div className="w-24 text-sm text-right">{stage.name}</div>
                            <div className="flex-1 h-10 bg-muted/30 rounded relative overflow-hidden">
                              <div 
                                className={`h-full ${stage.color} transition-all duration-500 flex items-center justify-end pr-3`}
                                style={{ width: `${width}%` }}
                              >
                                <span className="text-white font-medium text-sm">{count}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="rate">
                    <div className="space-y-4">
                      {STAGES.filter(s => !["closed_lost", "closed_won"].includes(s.id)).map((stage, index, arr) => {
                        const currentCount = opportunitiesByStage[stage.id]?.length || 0;
                        const nextStage = arr[index + 1] || STAGES.find(s => s.id === "closed_won");
                        const nextCount = nextStage ? (opportunitiesByStage[nextStage.id]?.length || 0) : 0;
                        const rate = currentCount > 0 ? ((nextCount / currentCount) * 100).toFixed(1) : "0";
                        
                        return (
                          <div key={stage.id} className="flex items-center gap-4">
                            <div className="flex items-center gap-2 w-40">
                              <div className={`w-3 h-3 rounded-full ${stage.color}`}></div>
                              <span className="text-sm">{stage.name}</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                            <div className="flex items-center gap-2 w-40">
                              <div className={`w-3 h-3 rounded-full ${nextStage?.color || "bg-green-500"}`}></div>
                              <span className="text-sm">{nextStage?.name || t("crm.opp.stage.closedWon")}</span>
                            </div>
                            <div className="flex-1">
                              <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary transition-all duration-500"
                                  style={{ width: `${rate}%` }}
                                ></div>
                              </div>
                            </div>
                            <span className="text-sm font-medium w-16 text-right">{rate}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Links */}
        <div className="flex gap-4">
          <Link href="/crm/customers">
            <Button variant="outline" className="gap-2">
              <Building2 className="w-4 h-4" />
              {t("crm.opportunities")}
            </Button>
          </Link>
          <Link href="/crm/contacts">
            <Button variant="outline" className="gap-2">
              <User className="w-4 h-4" />
              {t("crm.contactManagement")}
            </Button>
          </Link>
        </div>

        {/* Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedOpportunity?.name}</DialogTitle>
            </DialogHeader>
            {selectedOpportunity && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">{t("crm.opp.relatedCustomer")}</Label>
                    <p className="font-medium">
                      {customers.find(c => c.id === selectedOpportunity.customerId)?.name || "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("common.status")}</Label>
                    <div className="mt-1">
                      <Select
                        value={selectedOpportunity.stage}
                        onValueChange={(v) => handleStageChange(selectedOpportunity.id, v as StageType)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STAGES.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${stage.color}`}></div>
                                {stage.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("crm.opp.expectedAmount")}</Label>
                    <p className="font-medium text-primary">
                      {formatCurrency(selectedOpportunity.expectedAmount || 0)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("crm.opp.probability")}</Label>
                    <p className="font-medium">{selectedOpportunity.probability}%</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("crm.opp.expectedCloseDate")}</Label>
                    <p className="font-medium">
                      {selectedOpportunity.expectedCloseDate 
                        ? new Date(selectedOpportunity.expectedCloseDate).toLocaleDateString() 
                        : "-"}
                    </p>
                  </div>
                </div>
                
                {selectedOpportunity.remark && (
                  <div>
                    <Label className="text-muted-foreground">{t("common.description")}</Label>
                    <p className="mt-1">{selectedOpportunity.remark}</p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <ProcessNotebook
                    {...{ entityType: "opportunity", entityId: selectedOpportunity.id } as any}
                  />
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
