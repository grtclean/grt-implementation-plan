import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Plus, Trash2, Search, FileText, AlertTriangle, CheckCircle, XCircle, BarChart3 } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function ComplianceTab() {
  const { t } = useLanguage();
  // Policy form
  const [polName, setPolName] = useState("");
  const [polType, setPolType] = useState("max_duration");
  const [polField, setPolField] = useState("duration_minutes");
  const [polOp, setPolOp] = useState("<=");
  const [polThreshold, setPolThreshold] = useState("");
  const [polSeverity, setPolSeverity] = useState("warning");

  // Audit form
  const [auditMeetingId, setAuditMeetingId] = useState("");

  // Governance
  const [govPeriod, setGovPeriod] = useState("monthly");

  const policiesQuery = trpc.ime.listPolicies.useQuery({});
  const overviewQuery = trpc.ime.complianceOverview.useQuery({});
  const historyQuery = trpc.ime.complianceHistory.useQuery({});

  const createPolMut = trpc.ime.createPolicy.useMutation({
    onSuccess: () => { policiesQuery.refetch(); setPolName(""); setPolThreshold(""); },
  });
  const deletePolMut = trpc.ime.deletePolicy.useMutation({
    onSuccess: () => policiesQuery.refetch(),
  });
  const auditMut = trpc.ime.auditMeeting.useMutation({
    onSuccess: () => { overviewQuery.refetch(); historyQuery.refetch(); },
  });
  const govMut = trpc.ime.generateGovernanceReport.useMutation({
    onSuccess: () => historyQuery.refetch(),
  });

  const policies = (policiesQuery.data || []) as any[];
  const overview = overviewQuery.data as any;
  const history = (historyQuery.data || []) as any[];

  const severityColor = (s: string) => {
    switch (s) {
      case "critical": return "bg-red-200 text-red-900";
      case "violation": return "bg-red-100 text-red-800";
      case "warning": return "bg-yellow-100 text-yellow-800";
      default: return "bg-blue-100 text-blue-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <Shield className="h-7 w-7 mx-auto text-blue-500 mb-1" />
            <div className="text-2xl font-bold">{overview?.stats?.complianceRate || 0}%</div>
            <div className="text-xs text-muted-foreground">{t("meeting.compliance.complianceRate")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{overview?.stats?.meetingsAudited || 0}</div>
            <div className="text-xs text-muted-foreground">{t("meeting.compliance.meetingsAudited")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <CheckCircle className="h-7 w-7 mx-auto text-green-500 mb-1" />
            <div className="text-2xl font-bold">{overview?.stats?.passed || 0}</div>
            <div className="text-xs text-muted-foreground">{t("meeting.compliance.passedItems")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <XCircle className="h-7 w-7 mx-auto text-red-500 mb-1" />
            <div className="text-2xl font-bold">{overview?.stats?.failed || 0}</div>
            <div className="text-xs text-muted-foreground">{t("meeting.compliance.failedItems")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <AlertTriangle className="h-7 w-7 mx-auto text-orange-500 mb-1" />
            <div className="text-2xl font-bold">{overview?.stats?.critical || 0}</div>
            <div className="text-xs text-muted-foreground">{t("meeting.compliance.criticalViolations")}</div>
          </CardContent>
        </Card>
      </div>

      {/* Policy Manager */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t("meeting.compliance.policyManagement")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            <Input placeholder={t("meeting.compliance.policyName")} value={polName} onChange={e => setPolName(e.target.value)} />
            <Select value={polType} onValueChange={(v) => { setPolType(v); setPolField(v === "max_duration" ? "duration_minutes" : v === "min_participants" ? "participant_count" : v === "require_agenda" ? "has_agenda" : v === "require_action_items" ? "action_item_count" : v === "min_effectiveness" ? "effectiveness_score" : "duration_minutes"); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="max_duration">{t("meeting.compliance.maxDuration")}</SelectItem>
                <SelectItem value="min_participants">{t("meeting.compliance.minParticipants")}</SelectItem>
                <SelectItem value="require_agenda">{t("meeting.compliance.requireAgenda")}</SelectItem>
                <SelectItem value="require_action_items">{t("meeting.compliance.requireActionItems")}</SelectItem>
                <SelectItem value="min_effectiveness">{t("meeting.compliance.minEffectiveness")}</SelectItem>
                <SelectItem value="max_frequency">{t("meeting.compliance.maxFrequency")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={polOp} onValueChange={setPolOp}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="<=">{"≤"}</SelectItem>
                <SelectItem value=">=">{"≥"}</SelectItem>
                <SelectItem value="<">{"<"}</SelectItem>
                <SelectItem value=">">{">"}</SelectItem>
                <SelectItem value="exists">exists</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder={t("meeting.compliance.thExpected")} value={polThreshold} onChange={e => setPolThreshold(e.target.value)} />
            <Select value={polSeverity} onValueChange={setPolSeverity}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="info">{t("meeting.compliance.severityInfo")}</SelectItem>
                <SelectItem value="warning">{t("meeting.compliance.severityWarning")}</SelectItem>
                <SelectItem value="violation">{t("meeting.compliance.severityViolation")}</SelectItem>
                <SelectItem value="critical">{t("meeting.compliance.severityCritical")}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => createPolMut.mutate({ name: polName, policyType: polType, checkField: polField, operator: polOp, threshold: polThreshold, severity: polSeverity })} disabled={!polName || createPolMut.isPending}>
              <Plus className="h-4 w-4 mr-1" />
              {createPolMut.isPending ? t("meeting.compliance.adding") : t("meeting.compliance.addPolicy")}
            </Button>
          </div>

          {policies.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("meeting.compliance.thPolicyName")}</TableHead>
                  <TableHead>{t("meeting.compliance.thType")}</TableHead>
                  <TableHead>{t("meeting.compliance.thCondition")}</TableHead>
                  <TableHead>{t("meeting.compliance.thSeverity")}</TableHead>
                  <TableHead>{t("meeting.compliance.thScope")}</TableHead>
                  <TableHead>{t("meeting.compliance.thActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell><Badge variant="outline">{p.policy_type}</Badge></TableCell>
                    <TableCell className="text-sm">{p.check_field} {p.operator} {p.threshold}</TableCell>
                    <TableCell><Badge className={severityColor(p.severity)}>{p.severity}</Badge></TableCell>
                    <TableCell>{p.scope}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => deletePolMut.mutate({ id: p.id })}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Audit Meeting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            {t("meeting.compliance.auditTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder={t("meeting.compliance.auditMeetingIdPlaceholder")} value={auditMeetingId} onChange={e => setAuditMeetingId(e.target.value)} className="flex-1" />
            <Button onClick={() => auditMut.mutate({ meetingId: auditMeetingId })} disabled={!auditMeetingId || auditMut.isPending}>
              {auditMut.isPending ? t("meeting.compliance.auditing") : t("meeting.compliance.executeAudit")}
            </Button>
          </div>
          {auditMut.data && (
            <div className="p-4 bg-muted rounded space-y-3">
              <div className="flex items-center gap-4 text-sm">
                <span>{t("meeting.compliance.meeting")}: <strong>{(auditMut.data as any).meetingTitle}</strong></span>
                <span>{t("meeting.compliance.policyChecks")}: <strong>{(auditMut.data as any).totalPolicies}</strong></span>
                <span>{t("meeting.compliance.passed")}: <strong className="text-green-600">{(auditMut.data as any).passed}</strong></span>
                <span>{t("meeting.compliance.failed")}: <strong className="text-red-600">{(auditMut.data as any).failed}</strong></span>
                <Badge variant={(auditMut.data as any).complianceRate >= 80 ? "default" : "destructive"}>
                  {t("meeting.compliance.complianceRateLabel")} {(auditMut.data as any).complianceRate}%
                </Badge>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("meeting.compliance.thPolicy")}</TableHead>
                    <TableHead>{t("meeting.compliance.thResult")}</TableHead>
                    <TableHead>{t("meeting.compliance.thSeverityLevel")}</TableHead>
                    <TableHead>{t("meeting.compliance.thActualValue")}</TableHead>
                    <TableHead>{t("meeting.compliance.thExpected")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {((auditMut.data as any).results || []).map((r: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.policyName}</TableCell>
                      <TableCell>
                        {r.result === "pass" ? <Badge className="bg-green-100 text-green-800">{t("meeting.compliance.resultPass")}</Badge>
                          : r.result === "fail" ? <Badge variant="destructive">{t("meeting.compliance.resultFail")}</Badge>
                          : <Badge variant="secondary">{t("meeting.compliance.resultNA")}</Badge>}
                      </TableCell>
                      <TableCell><Badge className={severityColor(r.severity)}>{r.severity}</Badge></TableCell>
                      <TableCell>{r.actual}</TableCell>
                      <TableCell>{r.expected}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Violations */}
      {overview?.topViolations?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {t("meeting.compliance.topViolations")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("meeting.compliance.thPolicy")}</TableHead>
                  <TableHead>{t("meeting.compliance.thType")}</TableHead>
                  <TableHead>{t("meeting.compliance.thSeverityLevel")}</TableHead>
                  <TableHead>{t("meeting.compliance.thCount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(overview.topViolations as any[]).map((v: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{v.policy_name}</TableCell>
                    <TableCell><Badge variant="outline">{v.policy_type}</Badge></TableCell>
                    <TableCell><Badge className={severityColor(v.severity)}>{v.severity}</Badge></TableCell>
                    <TableCell className="font-semibold">{v.cnt}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Governance Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t("meeting.compliance.governanceReport")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Select value={govPeriod} onValueChange={setGovPeriod}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">{t("meeting.compliance.periodWeekly")}</SelectItem>
                <SelectItem value="monthly">{t("meeting.compliance.periodMonthly")}</SelectItem>
                <SelectItem value="quarterly">{t("meeting.compliance.periodQuarterly")}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => govMut.mutate({ period: govPeriod })} disabled={govMut.isPending}>
              {govMut.isPending ? t("meeting.compliance.generating") : t("meeting.compliance.generateReport")}
            </Button>
          </div>
          {govMut.data && (
            <div className="p-4 bg-muted rounded space-y-3">
              <div className="flex items-center gap-4 text-sm">
                <span>{t("meeting.compliance.auditedMeetings")}: <strong>{(govMut.data as any).meetingsAudited}</strong></span>
                <span>{t("meeting.compliance.complianceRateLabel")}: <strong>{(govMut.data as any).complianceRate}%</strong></span>
                <span>{t("meeting.compliance.violationCount")}: <strong className="text-red-600">{(govMut.data as any).totalViolations}</strong></span>
              </div>
              {(govMut.data as any).riskAreas?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">{t("meeting.compliance.riskAreas")}</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {(govMut.data as any).riskAreas.map((r: string, i: number) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
              {(govMut.data as any).recommendations?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">{t("meeting.compliance.improvementSuggestions")}</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {(govMut.data as any).recommendations.map((r: string, i: number) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
              {(govMut.data as any).narrative && (
                <p className="text-sm text-muted-foreground italic">{(govMut.data as any).narrative}</p>
              )}
            </div>
          )}

          {/* Report History */}
          {history.length > 0 && (history as any[])[0]?.compliance_rate !== undefined && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("meeting.compliance.thPeriod")}</TableHead>
                  <TableHead>{t("meeting.compliance.complianceRateLabel")}</TableHead>
                  <TableHead>{t("meeting.compliance.thMeetingsAudited")}</TableHead>
                  <TableHead>{t("meeting.compliance.thViolations")}</TableHead>
                  <TableHead>{t("meeting.compliance.thGeneratedAt")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(history as any[]).map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.period}</TableCell>
                    <TableCell><Badge variant={Number(r.compliance_rate) >= 80 ? "default" : "destructive"}>{r.compliance_rate}%</Badge></TableCell>
                    <TableCell>{r.total_meetings_audited}</TableCell>
                    <TableCell>{r.total_violations}</TableCell>
                    <TableCell className="text-xs">{r.generated_at ? new Date(r.generated_at).toLocaleString("zh-CN") : ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
