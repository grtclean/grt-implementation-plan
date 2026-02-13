/**
 * AI Early Warning Center - 3-Layer Dashboard
 */

import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle, Bell, Activity, FileText, Shield, RefreshCw,
  CheckCircle2, XCircle, AlertCircle, TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
function getRiskColor(level: string): string {
  switch (level) {
    case "critical": return "bg-red-500/20 text-red-400 border-red-500/30";
    case "high": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "low": return "bg-green-500/20 text-green-400 border-green-500/30";
    default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  }
}

function getHealthColor(score: number): string {
  if (score >= 90) return "text-green-400";
  if (score >= 70) return "text-yellow-400";
  if (score >= 50) return "text-orange-400";
  return "text-red-400";
}
function getHealthBadgeVariant(score: number): "default" | "secondary" | "destructive" | "outline" {
  if (score >= 80) return "default";
  if (score >= 60) return "secondary";
  return "destructive";
}

// ===== Main Component =====

export default function AIEarlyWarning() {
  const [activeTab, setActiveTab] = useState("risk");
  const [showNotifications, setShowNotifications] = useState(false);
  // Layer 1: Health Scanner
  const healthScanQuery = trpc.aiEarlyWarning.healthScanner.scanAll.useQuery(undefined, { enabled: false });
  // Layer 2: Risk Dashboard
  const riskDashboardQuery = trpc.aiEarlyWarning.riskScorer.getDashboard.useQuery(undefined, { enabled: false });
  // Layer 3: Weekly Digest
  const weeklyDigestQuery = trpc.aiEarlyWarning.narrative.weeklyDigest.useQuery(undefined, { enabled: false });
  // Notifications
  const notificationsQuery = trpc.aiEarlyWarning.notifications.list.useQuery({}, { enabled: showNotifications });
  const markReadMutation = trpc.aiEarlyWarning.notifications.markRead.useMutation();
  const handleScan = () => {
    healthScanQuery.refetch();
    toast.success("Health scan started");
  };

  const handleRiskDashboard = () => {
    riskDashboardQuery.refetch();
    toast.success("Risk dashboard refreshing");
  };

  const handleWeeklyDigest = () => {
    weeklyDigestQuery.refetch();
    toast.success("Generating weekly digest");
  };

  const handleMarkRead = (id: number) => {
    markReadMutation.mutate({ id }, {
      onSuccess: () => {
        notificationsQuery.refetch();
        toast.success("Notification marked as read");
      },
    });
  };
  const notifications = notificationsQuery.data || [];
  const unreadCount = notifications.filter((n) => n.isRead === false).length;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
              AI Early Warning Center
            </h1>
            <p className="text-muted-foreground mt-1">
              3-Layer AI monitoring: Health Scanner, Risk Scorer, Narrative Engine
            </p>
          </div>
          <div className="flex items-center gap-2">            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNotifications((v) => !v)}
              className="relative"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center text-white">
                  {unreadCount}
                </span>
              )}
            </Button>
          </div>
        </div>
        {/* Notification Panel */}
        {showNotifications && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5" /> Notifications
              </CardTitle>
              <CardDescription>Risk alerts and warnings</CardDescription>
            </CardHeader>
            <CardContent>
              {notificationsQuery.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No notifications</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={"flex items-start justify-between p-3 rounded-lg border " + (n.isRead ? "opacity-60" : getRiskColor(n.riskLevel))}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
                      </div>
                      {!n.isRead && (
                        <Button size="sm" variant="ghost" onClick={() => handleMarkRead(n.id)}>
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="risk" className="flex items-center gap-2">
              <Shield className="h-4 w-4" /> Risk Heatmap
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Activity className="h-4 w-4" /> Health Scanner
            </TabsTrigger>
            <TabsTrigger value="narrative" className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> AI Narratives
            </TabsTrigger>
          </TabsList>
          {/* Tab 1: Risk Heatmap */}
          <TabsContent value="risk" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Risk Heatmap</CardTitle>
                    <CardDescription>Projects colored by risk level</CardDescription>
                  </div>
                  <Button onClick={handleRiskDashboard} size="sm">
                    <RefreshCw className={"h-4 w-4 mr-2" + (riskDashboardQuery.isFetching ? " animate-spin" : "")} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {riskDashboardQuery.isFetching ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-28 rounded-lg" />
                    ))}
                  </div>
                ) : riskDashboardQuery.data && riskDashboardQuery.data.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {riskDashboardQuery.data.map((item) => (
                      <Card key={item.projectId} className={"border " + getRiskColor(item.riskLevel)}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-sm font-bold">#{item.projectId}</span>
                            <Badge variant={item.riskLevel === "critical" || item.riskLevel === "high" ? "destructive" : "secondary"}>
                              {item.riskLevel.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="text-2xl font-bold mb-1">{item.riskScore}</div>
                          <div className="text-xs text-muted-foreground">Risk Score</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Shield className="mx-auto h-12 w-12 mb-3 opacity-50" />
                    <p>Click Refresh to load risk heatmap data.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          {/* Tab 2: Health Scanner */}
          <TabsContent value="health" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Health Scanner Results</CardTitle>
                    <CardDescription>Project health indicators and issues</CardDescription>
                  </div>
                  <Button onClick={handleScan} size="sm">
                    <RefreshCw className={"h-4 w-4 mr-2" + (healthScanQuery.isFetching ? " animate-spin" : "")} />
                    Scan All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {healthScanQuery.isFetching ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded" />
                    ))}
                  </div>                ) : healthScanQuery.data && healthScanQuery.data.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project</TableHead>
                        <TableHead>Health Score</TableHead>
                        <TableHead>Issues</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {healthScanQuery.data.map((row) => {
                        const critCount = row.issues.filter((i) => i.severity === "critical").length;
                        const warnCount = row.issues.filter((i) => i.severity === "warning").length;
                        return (
                          <TableRow key={row.projectId}>
                            <TableCell className="font-mono font-bold">{row.projectCode}</TableCell>
                            <TableCell>
                              <Badge variant={getHealthBadgeVariant(row.healthScore)}>
                                <span className={getHealthColor(row.healthScore)}>{row.healthScore}/100</span>
                              </Badge>
                            </TableCell>
                            <TableCell>{row.issues.length}</TableCell>
                            <TableCell>
                              {critCount > 0 ? (
                                <span className="flex items-center gap-1 text-red-400">
                                  <XCircle className="h-4 w-4" /> {critCount} critical
                                </span>
                              ) : warnCount > 0 ? (
                                <span className="flex items-center gap-1 text-yellow-400">
                                  <AlertCircle className="h-4 w-4" /> {warnCount} warnings
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-green-400">
                                  <CheckCircle2 className="h-4 w-4" /> OK
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-xs text-muted-foreground max-w-xs truncate">
                                {row.issues.length > 0
                                  ? row.issues.map((i) => i.message).join("; ")
                                  : "All clear"}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Activity className="mx-auto h-12 w-12 mb-3 opacity-50" />
                    <p>Click Scan All to analyze project health.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          {/* Tab 3: AI Narratives */}
          <TabsContent value="narrative" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>AI Narratives - Weekly Digest</CardTitle>
                    <CardDescription>AI-generated project status summaries</CardDescription>
                  </div>
                  <Button onClick={handleWeeklyDigest} size="sm">
                    <RefreshCw className={"h-4 w-4 mr-2" + (weeklyDigestQuery.isFetching ? " animate-spin" : "")} />
                    Generate Digest
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {weeklyDigestQuery.isFetching ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full rounded-lg" />
                    ))}
                  </div>
                ) : weeklyDigestQuery.data && weeklyDigestQuery.data.length > 0 ? (
                  <div className="space-y-3">
                    {weeklyDigestQuery.data.map((entry) => (
                      <Card key={entry.projectId} className="border">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold">{entry.projectCode}</span>
                              <Badge variant={entry.riskLevel === "critical" || entry.riskLevel === "high" ? "destructive" : entry.riskLevel === "medium" ? "secondary" : "default"}>
                                {entry.riskLevel.toUpperCase()}
                              </Badge>
                            </div>
                            <span className={"text-lg font-bold " + getHealthColor(entry.healthScore)}>
                              {entry.healthScore}/100
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{entry.summary}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="mx-auto h-12 w-12 mb-3 opacity-50" />
                    <p>Click Generate Digest to create AI narratives.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>        </Tabs>
      </div>
    </DashboardLayout>
  );
}
