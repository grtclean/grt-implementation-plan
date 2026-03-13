import { useState, useMemo } from "react";
import { PageHeader, StatCard } from "@/components/grt";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Database, Upload, FileSpreadsheet, CheckCircle2, XCircle,
  AlertTriangle, Clock, RefreshCw, Download, Package,
  ArrowRight, List, History, FileText
} from "lucide-react";

const PROCESS_NAME_KEYS: Record<string, string> = {
  T1: "manufacturing.bom.import.processT1", T2: "manufacturing.bom.import.processT2", T3: "manufacturing.bom.import.processT3",
  T4: "manufacturing.bom.import.processT4", T5: "manufacturing.bom.import.processT5", T6: "manufacturing.bom.import.processT6",
  T7: "manufacturing.bom.import.processT7", T8: "manufacturing.bom.import.processT8", T9: "manufacturing.bom.import.processT9",
  T10: "manufacturing.bom.import.processT10", T11: "manufacturing.bom.import.processT11", T12: "manufacturing.bom.import.processT12",
  T13: "manufacturing.bom.import.processT13", T14: "manufacturing.bom.import.processT14", T15: "manufacturing.bom.import.processT15",
};

const STATUS_STYLE_KEYS: Record<string, { bg: string; text: string; labelKey: string }> = {
  completed: { bg: "bg-green-500/20", text: "text-green-400", labelKey: "manufacturing.bom.import.statusCompleted" },
  partial: { bg: "bg-yellow-500/20", text: "text-yellow-400", labelKey: "manufacturing.bom.import.statusPartial" },
  failed: { bg: "bg-red-500/20", text: "text-red-400", labelKey: "manufacturing.bom.import.statusFailed" },
  processing: { bg: "bg-blue-500/20", text: "text-blue-400", labelKey: "manufacturing.bom.import.statusProcessing" },
};

export default function BomImport() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("import");
  const [selectedProject] = useState("PRJ-2026-001");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  // Import form state
  const [importForm, setImportForm] = useState({
    processCode: "T4",
    source: "manual" as string,
    csvData: "",
  });

  // Queries
  const importHistoryQuery = (trpc.bomImport as any).getImportHistory.useQuery({
    projectId: selectedProject,
    limit: 50,
  });
  const statsQuery = (trpc.bomImport as any).getImportStats.useQuery({
    projectId: selectedProject,
  });

  // Mutations
  const batchImportMutation = (trpc.bomImport as any).batchImport.useMutation({
    onSuccess: (data) => {
      toast({
        title: t("manufacturing.bom.import.complete"),
        description: `${t("manufacturing.bom.import.success")}: ${data.successCount}, ${t("manufacturing.bom.import.failed")}: ${data.failedCount}, ${t("manufacturing.bom.import.skipped")}: ${data.skippedCount}`,
      });
      importHistoryQuery.refetch();
      statsQuery.refetch();
      setShowImportDialog(false);
    },
    onError: (err: any) => toast({ title: t("manufacturing.bom.import.failedTitle"), description: err.message, variant: "destructive" }),
  });

  const downloadTemplateMutation = (trpc.bomImport as any).downloadTemplate.useMutation({
    onSuccess: (data) => {
      // Create and download CSV file
      const blob = new Blob([data.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bom_template_${importForm.processCode}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: t("manufacturing.bom.import.successTitle"), description: t("manufacturing.bom.import.templateDownloaded") });
    },
    onError: (err: any) => toast({ title: t("manufacturing.bom.import.errorTitle"), description: err.message, variant: "destructive" }),
  });

  const history = (importHistoryQuery.data ?? []) as any[];
  const stats = (statsQuery.data ?? {}) as any;

  // Parse CSV data into items
  const parseCSV = (csv: string) => {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];

    return lines.slice(1).map(line => {
      const cols = line.split(',').map(c => c.trim());
      return {
        materialCode: cols[0] || '',
        materialName: cols[1] || '',
        specification: cols[2] || '',
        unit: cols[3] || t("manufacturing.bom.import.unitPiece"),
        requiredQty: Number(cols[4]) || 1,
        category: cols[5] || 'standard',
      };
    }).filter(item => item.materialCode && item.materialName);
  };

  const handleImport = () => {
    const items = parseCSV(importForm.csvData);
    if (items.length === 0) {
      toast({ title: t("manufacturing.bom.import.errorTitle"), description: t("manufacturing.bom.import.invalidCsvData"), variant: "destructive" });
      return;
    }
    batchImportMutation.mutate({
      projectId: selectedProject,
      processCode: importForm.processCode,
      source: importForm.source,
      items,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={Database}
        title={t("manufacturing.bom.import.title")}
        description={t("manufacturing.bom.import.description")}
        actions={
          <>
            <Button variant="outline" onClick={() => importHistoryQuery.refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" /> {t("manufacturing.common.refresh")}
            </Button>
            <Button
              variant="outline"
              onClick={() => downloadTemplateMutation.mutate({ processCode: importForm.processCode })}
            >
              <Download className="w-4 h-4 mr-2" /> {t("manufacturing.bom.import.downloadTemplate")}
            </Button>
            <Button onClick={() => setShowImportDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Upload className="w-4 h-4 mr-2" /> {t("manufacturing.bom.import.batchImport")}
            </Button>
          </>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={History} label={t("manufacturing.bom.import.totalImports")} value={stats.totalImports ?? 0} iconColor="text-emerald-400" iconBg="bg-emerald-500/20" />
        <StatCard icon={CheckCircle2} label={t("manufacturing.bom.import.successItems")} value={stats.totalSuccess ?? 0} iconColor="text-green-400" iconBg="bg-green-500/20" />
        <StatCard icon={XCircle} label={t("manufacturing.bom.import.failedItems")} value={stats.totalFailed ?? 0} iconColor="text-red-400" iconBg="bg-red-500/20" />
        <StatCard icon={Package} label={t("manufacturing.bom.import.processCount")} value={stats.processCount ?? 0} iconColor="text-blue-400" iconBg="bg-blue-500/20" />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="import"><Upload className="w-4 h-4 mr-1" /> {t("manufacturing.bom.import.tabImport")}</TabsTrigger>
          <TabsTrigger value="history"><History className="w-4 h-4 mr-1" /> {t("manufacturing.bom.import.tabHistory")}</TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-4">
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                {t("manufacturing.bom.import.csvImport")}
              </CardTitle>
              <CardDescription>
                {t("manufacturing.bom.import.csvDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("manufacturing.bom.import.targetProcess")}</Label>
                  <Select value={importForm.processCode} onValueChange={(v) => setImportForm(p => ({ ...p, processCode: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROCESS_NAME_KEYS).map(([code, key]) => (
                        <SelectItem key={code} value={code}>{code} - {t(key)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("manufacturing.bom.import.dataSource")}</Label>
                  <Select value={importForm.source} onValueChange={(v) => setImportForm(p => ({ ...p, source: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">{t("manufacturing.bom.import.sourceManual")}</SelectItem>
                      <SelectItem value="erp">{t("manufacturing.bom.import.sourceErp")}</SelectItem>
                      <SelectItem value="externalSync">{t("manufacturing.bom.import.sourceExternalSync")}</SelectItem>
                      <SelectItem value="excel">{t("manufacturing.bom.import.sourceExcel")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>{t("manufacturing.bom.import.csvData")}</Label>
                <Textarea
                  value={importForm.csvData}
                  onChange={(e) => setImportForm(p => ({ ...p, csvData: e.target.value }))}
                  rows={10}
                  placeholder={`${t("manufacturing.bom.import.csvPlaceholder")}\nMAT-001,${t("manufacturing.bom.import.sampleBolt")},M10x30,${t("manufacturing.bom.import.unitPiece")},24,standard\nMAT-002,${t("manufacturing.bom.import.sampleSeal")},DN50,${t("manufacturing.bom.import.unitPiece")},8,critical\nMAT-003,${t("manufacturing.bom.import.sampleBearing")},6205-2RS,${t("manufacturing.bom.import.unitPiece")},4,standard`}
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {importForm.csvData ? `${t("manufacturing.bom.import.preview")}: ${parseCSV(importForm.csvData).length} ${t("manufacturing.bom.import.records")}` : t("manufacturing.bom.import.pasteCsvData")}
                </p>
                <Button
                  onClick={handleImport}
                  disabled={batchImportMutation.isPending || !importForm.csvData}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {batchImportMutation.isPending ? t("manufacturing.bom.import.importing") : t("manufacturing.bom.import.startImport")}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Import Guide */}
          <Card className="bg-card/30 border-border">
            <CardHeader>
              <CardTitle className="text-base">{t("manufacturing.bom.import.guide")}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>1. <strong className="text-foreground">{t("manufacturing.bom.import.guideCsvFormat")}</strong>{t("manufacturing.bom.import.guideCsvFormatDesc")}</p>
              <p>2. <strong className="text-foreground">{t("manufacturing.bom.import.guideRequired")}</strong>{t("manufacturing.bom.import.guideRequiredDesc")}</p>
              <p>3. <strong className="text-foreground">{t("manufacturing.bom.import.guideOptional")}</strong>{t("manufacturing.bom.import.guideOptionalDesc")}</p>
              <p>4. <strong className="text-foreground">{t("manufacturing.bom.import.guideCategory")}</strong>{t("manufacturing.bom.import.guideCategoryDesc")}</p>
              <p>5. <strong className="text-foreground">{t("manufacturing.bom.import.guideDedupe")}</strong>{t("manufacturing.bom.import.guideDedupeDesc")}</p>
              <p>6. {t("manufacturing.bom.import.guideAutoLink")}</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <h3 className="text-lg font-semibold">{t("manufacturing.bom.import.historyTitle")}</h3>
          {history.length === 0 ? (
            <Card className="bg-card/30 border-dashed border-border">
              <CardContent className="p-8 text-center">
                <History className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">{t("manufacturing.bom.import.noHistory")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {history.map((record: any) => {
                const status = STATUS_STYLE_KEYS[record.status] || STATUS_STYLE_KEYS.completed;
                return (
                  <Card key={record.id} className="bg-card/50 border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${status.bg}`}>
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {record.process_code} ({PROCESS_NAME_KEYS[record.process_code] ? t(PROCESS_NAME_KEYS[record.process_code]) : ''})
                              <span className="text-muted-foreground ml-2">{t("manufacturing.bom.import.source")}: {record.source}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t("manufacturing.bom.import.total")}: {record.total_items} · {t("manufacturing.bom.import.success")}: {record.success_count} · {t("manufacturing.bom.import.failed")}: {record.failed_count} · {t("manufacturing.bom.import.skipped")}: {record.skipped_count}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={`${status.bg} ${status.text} border-0`}>{t(status.labelKey)}</Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {record.created_at ? new Date(Number(record.created_at)).toLocaleString() : ''}
                          </p>
                        </div>
                      </div>
                      {record.error_details && (
                        <div className="mt-2 p-2 bg-red-500/10 rounded text-xs text-red-300 max-h-20 overflow-auto">
                          {record.error_details}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Import Dialog (for quick access) */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("manufacturing.bom.import.quickImport")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("manufacturing.bom.import.targetProcess")}</Label>
                <Select value={importForm.processCode} onValueChange={(v) => setImportForm(p => ({ ...p, processCode: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROCESS_NAME_KEYS).map(([code, key]) => (
                      <SelectItem key={code} value={code}>{code} - {t(key)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("manufacturing.bom.import.dataSource")}</Label>
                <Select value={importForm.source} onValueChange={(v) => setImportForm(p => ({ ...p, source: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">{t("manufacturing.bom.import.sourceManual")}</SelectItem>
                    <SelectItem value="erp">{t("manufacturing.bom.import.sourceErp")}</SelectItem>
                    <SelectItem value="externalSync">{t("manufacturing.bom.import.sourceExternalSync")}</SelectItem>
                    <SelectItem value="excel">{t("manufacturing.bom.import.sourceExcel")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{t("manufacturing.bom.import.csvData")}</Label>
              <Textarea
                value={importForm.csvData}
                onChange={(e) => setImportForm(p => ({ ...p, csvData: e.target.value }))}
                rows={8}
                placeholder={t("manufacturing.bom.import.csvPlaceholder")}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t("manufacturing.common.cancel")}</Button></DialogClose>
            <Button
              onClick={handleImport}
              disabled={batchImportMutation.isPending || !importForm.csvData}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {batchImportMutation.isPending ? t("manufacturing.bom.import.importing") : t("manufacturing.bom.import.startImport")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
