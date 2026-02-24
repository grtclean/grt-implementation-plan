import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { PageHeader, StatCard } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Package, MapPin, ArrowRight, AlertTriangle, Clock,
  Plus, RefreshCw, Truck, Warehouse, Activity
} from "lucide-react";

const PROCESS_CODES = Array.from({ length: 15 }, (_, i) => `T${i + 1}`);

export default function MaterialFlowTracking() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedProject] = useState("PRJ-2026-001");
  const [showRecordDialog, setShowRecordDialog] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);

  const STATUS_MAP: Record<string, { label: string; color: string }> = {
    in_storage: { label: t("supply.materialFlow.statusInStorage"), color: "bg-blue-100 text-blue-800" },
    in_transit: { label: t("supply.materialFlow.statusInTransit"), color: "bg-yellow-100 text-yellow-800" },
    at_station: { label: t("supply.materialFlow.statusAtStation"), color: "bg-green-100 text-green-800" },
    in_process: { label: t("supply.materialFlow.statusInProcess"), color: "bg-purple-100 text-purple-800" },
    completed: { label: t("supply.materialFlow.statusCompleted"), color: "bg-gray-100 text-gray-800" },
    defective: { label: t("supply.materialFlow.statusDefective"), color: "bg-red-100 text-red-800" },
  };

  const [newFlowRecord, setNewFlowRecord] = useState({
    materialId: "", materialName: "", fromProcess: "T1", toProcess: "T2",
    quantity: 1, batchNumber: "",
  });
  const [newLocation, setNewLocation] = useState({
    materialId: "", currentProcess: "T1", locationZone: "",
    positionX: 0, positionY: 0, positionZ: 0,
  });

  // Queries
  const flowRecordsQuery = (trpc.qualityMaterialPerformance as any).getMaterialFlowRecords.useQuery(
    { projectId: selectedProject },
    { enabled: activeTab === "flow" }
  );
  const locationsQuery = (trpc.qualityMaterialPerformance as any).getMaterialLocations.useQuery(
    { projectId: selectedProject },
    { enabled: activeTab === "locations" }
  );
  const bottlenecksQuery = trpc.qualityMaterialPerformance.getBottlenecks.useQuery(
    { projectId: selectedProject },
    { enabled: activeTab === "bottlenecks" }
  );
  const flowSummaryQuery = (trpc.qualityMaterialPerformance as any).materialFlowSummary.useQuery(
    { projectId: selectedProject },
    { enabled: activeTab === "overview" }
  );

  // Mutations
  const recordFlowMut = (trpc.qualityMaterialPerformance as any).recordMaterialFlow.useMutation({
    onSuccess: () => {
      toast({ title: t("supply.materialFlow.flowRecorded") });
      setShowRecordDialog(false);
      flowRecordsQuery.refetch();
    },
  });
  const updateLocationMut = (trpc.qualityMaterialPerformance as any).updateMaterialLocation.useMutation({
    onSuccess: () => {
      toast({ title: t("supply.materialFlow.locationUpdated") });
      setShowLocationDialog(false);
      locationsQuery.refetch();
    },
  });
  const detectBottlenecksMut = trpc.qualityMaterialPerformance.detectBottlenecks.useMutation({
    onSuccess: () => {
      toast({ title: t("supply.materialFlow.bottleneckDetected") });
      bottlenecksQuery.refetch();
    },
  });

  const summary = flowSummaryQuery.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={Truck}
        title={t("supply.materialFlow.pageTitle")}
        description={t("supply.materialFlow.pageDesc")}
        actions={
          <Button variant="outline" onClick={() => detectBottlenecksMut.mutate({ projectId: selectedProject })}>
            <Activity className="w-4 h-4 mr-2" />{t("supply.materialFlow.detectBottleneck")}
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="overview">{t("supply.materialFlow.tabOverview")}</TabsTrigger>
          <TabsTrigger value="flow">{t("supply.materialFlow.tabFlowRecords")}</TabsTrigger>
          <TabsTrigger value="locations">{t("supply.materialFlow.tabLocations")}</TabsTrigger>
          <TabsTrigger value="bottlenecks">{t("supply.materialFlow.tabBottlenecks")}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Package} label={t("supply.materialFlow.totalMaterials")} value={summary?.totalMaterials || 0} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
            <StatCard icon={RefreshCw} label={t("supply.materialFlow.flowCount")} value={summary?.totalFlows || 0} iconColor="text-green-500" iconBg="bg-green-500/10" />
            <StatCard icon={Clock} label={t("supply.materialFlow.avgTransitTime")} value={summary?.avgTransitTime ? Math.round(Number(summary.avgTransitTime)) : 0} iconColor="text-yellow-500" iconBg="bg-yellow-500/10" />
            <StatCard icon={AlertTriangle} label={t("supply.materialFlow.activeBottlenecks")} value={summary?.activeBottlenecks || 0} iconColor="text-red-500" iconBg="bg-red-500/10" />
          </div>

          {/* Process Flow Visualization */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("supply.materialFlow.processFlowChart")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between overflow-x-auto pb-4">
                {PROCESS_CODES.map((code, i) => {
                  const processData = (summary?.processMaterialCounts as any[] || []).find((p: any) => p.process_code === code);
                  const count = processData?.material_count || 0;
                  return (
                    <div key={code} className="flex items-center">
                      <div className={`flex flex-col items-center min-w-[60px] p-2 rounded-lg border ${count > 0 ? 'border-primary bg-primary/5' : 'border-border'}`}>
                        <span className="font-mono font-bold text-xs">{code}</span>
                        <span className={`text-lg font-bold ${count > 0 ? 'text-primary' : 'text-muted-foreground'}`}>{count}</span>
                        <span className="text-[10px] text-muted-foreground">{t("supply.materialFlow.materialUnit")}</span>
                      </div>
                      {i < 14 && <ArrowRight className="w-4 h-4 text-muted-foreground mx-1 flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Flow Records Tab */}
        <TabsContent value="flow" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{t("supply.materialFlow.flowRecordTitle")}</h3>
            <Dialog open={showRecordDialog} onOpenChange={setShowRecordDialog}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />{t("supply.materialFlow.recordFlow")}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t("supply.materialFlow.recordFlowDialog")}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t("supply.materialFlow.materialId")}</Label>
                      <Input value={newFlowRecord.materialId} onChange={e => setNewFlowRecord(p => ({ ...p, materialId: e.target.value }))} placeholder="MAT-001" />
                    </div>
                    <div>
                      <Label>{t("supply.materialFlow.materialName")}</Label>
                      <Input value={newFlowRecord.materialName} onChange={e => setNewFlowRecord(p => ({ ...p, materialName: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t("supply.materialFlow.fromProcess")}</Label>
                      <Select value={newFlowRecord.fromProcess} onValueChange={v => setNewFlowRecord(p => ({ ...p, fromProcess: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PROCESS_CODES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{t("supply.materialFlow.toProcess")}</Label>
                      <Select value={newFlowRecord.toProcess} onValueChange={v => setNewFlowRecord(p => ({ ...p, toProcess: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PROCESS_CODES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t("supply.materialFlow.quantity")}</Label>
                      <Input type="number" min={1} value={newFlowRecord.quantity} onChange={e => setNewFlowRecord(p => ({ ...p, quantity: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <Label>{t("supply.materialFlow.batchNumber")}</Label>
                      <Input value={newFlowRecord.batchNumber} onChange={e => setNewFlowRecord(p => ({ ...p, batchNumber: e.target.value }))} placeholder="BATCH-001" />
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => recordFlowMut.mutate({ ...newFlowRecord, projectId: selectedProject })}
                    disabled={recordFlowMut.isPending || !newFlowRecord.materialId}
                  >
                    {recordFlowMut.isPending ? t("supply.materialFlow.recording") : t("supply.materialFlow.recordFlow")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {(flowRecordsQuery.data as any[] || []).map((r: any) => (
              <Card key={r.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Package className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{r.material_name || r.material_id}</div>
                      <div className="text-sm text-muted-foreground">{t("supply.materialFlow.batchLabel")}: {r.batch_number || '-'} · {t("supply.materialFlow.quantityLabel")}: {r.quantity}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono">{r.from_process}</Badge>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <Badge variant="outline" className="font-mono">{r.to_process}</Badge>
                    <Badge className={STATUS_MAP[r.status]?.color || ""}>
                      {STATUS_MAP[r.status]?.label || r.status}
                    </Badge>
                    {r.transit_time_minutes && (
                      <span className="text-xs text-muted-foreground">{r.transit_time_minutes}{t("supply.materialFlow.minutes")}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!flowRecordsQuery.data || (flowRecordsQuery.data as any[]).length === 0) && (
              <p className="text-center text-muted-foreground py-8">{t("supply.materialFlow.noFlowRecords")}</p>
            )}
          </div>
        </TabsContent>

        {/* Locations Tab */}
        <TabsContent value="locations" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{t("supply.materialFlow.realtimeLocations")}</h3>
            <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
              <DialogTrigger asChild>
                <Button variant="outline"><MapPin className="w-4 h-4 mr-2" />{t("supply.materialFlow.updateLocation")}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t("supply.materialFlow.updateLocationDialog")}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>{t("supply.materialFlow.materialId")}</Label>
                    <Input value={newLocation.materialId} onChange={e => setNewLocation(p => ({ ...p, materialId: e.target.value }))} placeholder="MAT-001" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t("supply.materialFlow.currentProcess")}</Label>
                      <Select value={newLocation.currentProcess} onValueChange={v => setNewLocation(p => ({ ...p, currentProcess: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PROCESS_CODES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{t("supply.materialFlow.zoneLabel")}</Label>
                      <Input value={newLocation.locationZone} onChange={e => setNewLocation(p => ({ ...p, locationZone: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>{t("supply.materialFlow.coordX")}</Label>
                      <Input type="number" value={newLocation.positionX} onChange={e => setNewLocation(p => ({ ...p, positionX: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <Label>{t("supply.materialFlow.coordY")}</Label>
                      <Input type="number" value={newLocation.positionY} onChange={e => setNewLocation(p => ({ ...p, positionY: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <Label>{t("supply.materialFlow.coordZ")}</Label>
                      <Input type="number" value={newLocation.positionZ} onChange={e => setNewLocation(p => ({ ...p, positionZ: Number(e.target.value) }))} />
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => updateLocationMut.mutate({ ...newLocation, projectId: selectedProject })}
                    disabled={updateLocationMut.isPending || !newLocation.materialId}
                  >
                    {updateLocationMut.isPending ? t("supply.materialFlow.updating") : t("supply.materialFlow.updateLocation")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Location Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(locationsQuery.data as any[] || []).map((loc: any) => (
              <Card key={loc.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="font-medium">{loc.material_id}</span>
                    </div>
                    <Badge variant="outline" className="font-mono">{loc.current_process}</Badge>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Warehouse className="w-3 h-3" />
                      <span>{loc.location_zone || t("supply.materialFlow.unknownZone")}</span>
                    </div>
                    <div className="font-mono text-xs">
                      {t("supply.materialFlow.coordinates")}: ({loc.position_x}, {loc.position_y}, {loc.position_z})
                    </div>
                    <div className="text-xs">
                      {t("supply.materialFlow.updated")}: {new Date(Number(loc.updated_at)).toLocaleString()}
                    </div>
                  </div>
                  {loc.uwb_tag_id && (
                    <Badge variant="secondary" className="mt-2 text-xs">UWB: {loc.uwb_tag_id}</Badge>
                  )}
                </CardContent>
              </Card>
            ))}
            {(!locationsQuery.data || (locationsQuery.data as any[]).length === 0) && (
              <div className="col-span-full text-center text-muted-foreground py-8">{t("supply.materialFlow.noLocationData")}</div>
            )}
          </div>
        </TabsContent>

        {/* Bottlenecks Tab */}
        <TabsContent value="bottlenecks" className="space-y-4">
          <h3 className="text-lg font-semibold">{t("supply.materialFlow.bottleneckAnalysis")}</h3>
          <div className="space-y-3">
            {(bottlenecksQuery.data as any[] || []).map((b: any) => (
              <Card key={b.id} className={b.severity === 'critical' ? 'border-red-300' : b.severity === 'high' ? 'border-orange-300' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className={`w-5 h-5 ${b.severity === 'critical' ? 'text-red-500' : b.severity === 'high' ? 'text-orange-500' : 'text-yellow-500'}`} />
                      <Badge variant="outline" className="font-mono">{b.process_code}</Badge>
                      <span className="font-medium capitalize">{b.bottleneck_type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={b.status === 'active' ? 'destructive' : b.status === 'monitoring' ? 'secondary' : 'default'}>
                        {b.status === 'active' ? t("supply.materialFlow.bottleneckActive") : b.status === 'monitoring' ? t("supply.materialFlow.bottleneckMonitoring") : t("supply.materialFlow.bottleneckResolved")}
                      </Badge>
                      {b.impact_score && (
                        <span className="text-sm font-mono">{t("supply.materialFlow.impact")}: {b.impact_score}/10</span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{b.description}</p>
                  {b.suggested_action && (
                    <div className="mt-2 p-2 bg-muted rounded text-sm">
                      <span className="font-medium">{t("supply.materialFlow.suggestedAction")}: </span>{b.suggested_action}
                    </div>
                  )}
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    {b.wait_time_minutes && <span>{t("supply.materialFlow.waitTime")}: {b.wait_time_minutes}{t("supply.materialFlow.minutes")}</span>}
                    {b.queue_length && <span>{t("supply.materialFlow.queueLength")}: {b.queue_length}</span>}
                    <span>{t("supply.materialFlow.detectedAt")}: {new Date(Number(b.detected_at)).toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!bottlenecksQuery.data || (bottlenecksQuery.data as any[]).length === 0) && (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 mx-auto text-green-500 mb-3" />
                <p className="text-lg font-medium text-green-600">{t("supply.materialFlow.lineNormal")}</p>
                <p className="text-muted-foreground">{t("supply.materialFlow.noBottlenecks")}</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
