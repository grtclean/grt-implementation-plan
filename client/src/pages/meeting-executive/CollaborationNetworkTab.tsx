import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Network, Users, Building2, AlertTriangle, FileQuestion, ChevronDown, ChevronUp, Play, Loader2 } from "lucide-react";
import { StatCard } from "@/components/grt";
import { trpc } from "@/lib/trpc";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
const GRADE_COLORS: Record<string, string> = {
  A: "bg-green-100 text-green-800",
  B: "bg-blue-100 text-blue-800",
  C: "bg-yellow-100 text-yellow-800",
  D: "bg-orange-100 text-orange-800",
  F: "bg-red-100 text-red-800",
};
const RISK_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-green-100 text-green-800",
};

export function CollaborationNetworkTab() {
  // Build network form
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Collaborator pairs filter
  const [pairsRelType, setPairsRelType] = useState("all");
  const [pairsDept, setPairsDept] = useState("");

  // Necessity analysis
  const [singleMeetingId, setSingleMeetingId] = useState("");
  const [batchIds, setBatchIds] = useState("");

  // Expanded rows
  const [expandedSilo, setExpandedSilo] = useState<number | null>(null);
  const [expandedNecessity, setExpandedNecessity] = useState<number | null>(null);

  // Queries
  const statsQuery = trpc.ime.collaborationNetworkStats.useQuery({});
  const pairsQuery = trpc.ime.topCollaboratorPairs.useQuery({
    limit: 20,
    relationshipType: pairsRelType === "all" ? undefined : pairsRelType,
    department: pairsDept || undefined,
  });
  const crossDeptQuery = trpc.ime.crossDepartmentMetrics.useQuery({});
  const silosQuery = trpc.ime.detectSilos.useQuery({});
  const necessityQuery = trpc.ime.meetingNecessityScores.useQuery({});

  // Mutations
  const buildMut = trpc.ime.buildCollaborationNetwork.useMutation({
    onSuccess: () => {
      statsQuery.refetch();
      pairsQuery.refetch();
      crossDeptQuery.refetch();
      silosQuery.refetch();
    },
  });
  const analyzeMut = trpc.ime.analyzeMeetingNecessity.useMutation({
    onSuccess: () => { necessityQuery.refetch(); setSingleMeetingId(""); },
  });
  const batchMut = trpc.ime.batchAnalyzeNecessity.useMutation({
    onSuccess: () => { necessityQuery.refetch(); setBatchIds(""); },
  });

  const stats = statsQuery.data as any;
  const pairs = (pairsQuery.data || []) as any[];
  const crossDeptData = (crossDeptQuery.data || []) as any[];
  const silos = (silosQuery.data || []) as any[];
  const necessityScores = (necessityQuery.data || []) as any[];

  // Silo risk distribution for pie chart
  const siloRiskDist = (() => {
    const counts = { high: 0, medium: 0, low: 0 };
    silos.forEach((s: any) => { counts[s.riskLevel as keyof typeof counts]++; });
    return [
      { name: "高风险", value: counts.high, color: "#ef4444" },
      { name: "中风险", value: counts.medium, color: "#f59e0b" },
      { name: "低风险", value: counts.low, color: "#22c55e" },
    ].filter(d => d.value > 0);
  })();

  // Necessity grade distribution for pie chart
  const gradeDist = (() => {
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    necessityScores.forEach((s: any) => { counts[s.necessity_grade]++; });
    return [
      { name: "A (必要)", value: counts.A, color: "#22c55e" },
      { name: "B (有价值)", value: counts.B, color: "#6366f1" },
      { name: "C (一般)", value: counts.C, color: "#f59e0b" },
      { name: "D (可疑)", value: counts.D, color: "#f97316" },
      { name: "F (不必要)", value: counts.F, color: "#ef4444" },
    ].filter(d => d.value > 0);
  })();

  // Cross-dept chart data
  const chartData = crossDeptData.map((d: any) => ({
    department: d.dept || "未知",
    内部协作: Number(d.internal_edges || 0),
    跨部门协作: Number(d.cross_dept_edges || 0),
  }));

  return (
    <div className="space-y-6">
      {/* Section 1: Header & Build Network */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Network className="h-5 w-5" /> 构建协作网络
          </CardTitle>
          <CardDescription>分析参会者之间的协作关系，构建协作网络图谱</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div>
              <label className="text-sm text-muted-foreground">开始日期</label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">结束日期</label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
            </div>
            <Button
              onClick={() => buildMut.mutate({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })}
              disabled={buildMut.isPending}
            >
              {buildMut.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
              构建协作网络
            </Button>
          </div>
          {buildMut.data && (
            <p className="mt-3 text-sm text-green-600">
              构建完成：扫描 {(buildMut.data as any).meetingsScanned} 场会议，创建 {(buildMut.data as any).edgesCreated} 条协作边
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Network}
          label="协作边总数"
          value={statsQuery.isLoading ? "..." : stats?.totalEdges ?? 0}
          subtitle="Total Collaboration Edges"
        />
        <StatCard
          icon={Users}
          label="活跃协作者"
          value={statsQuery.isLoading ? "..." : stats?.uniqueParticipants ?? 0}
          subtitle="Unique Participants"
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          icon={Building2}
          label="跨部门协作%"
          value={statsQuery.isLoading ? "..." : `${stats?.crossDeptPercentage ?? 0}%`}
          subtitle="Cross-Department Rate"
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <StatCard
          icon={Network}
          label="平均协作分"
          value={statsQuery.isLoading ? "..." : stats?.avgScore ?? 0}
          subtitle="Avg Collaboration Score"
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
      </div>

      {/* Section 3: Top Collaborator Pairs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">协作排行榜</CardTitle>
          <CardDescription>按协作分数排名的协作者配对</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-4">
            <Select value={pairsRelType} onValueChange={setPairsRelType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="关系类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="same_dept">同部门</SelectItem>
                <SelectItem value="cross_dept">跨部门</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="按部门筛选..."
              value={pairsDept}
              onChange={e => setPairsDept(e.target.value)}
              className="w-48"
            />
          </div>
          {pairs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>协作者 A</TableHead>
                  <TableHead>协作者 B</TableHead>
                  <TableHead>关系</TableHead>
                  <TableHead className="text-right">会议次数</TableHead>
                  <TableHead className="text-right">总时长(分钟)</TableHead>
                  <TableHead className="text-right">协作分</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pairs.map((p: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{i + 1}</TableCell>
                    <TableCell>
                      <div>{p.participant_a}</div>
                      <div className="text-xs text-muted-foreground">{p.department_a || "—"}</div>
                    </TableCell>
                    <TableCell>
                      <div>{p.participant_b}</div>
                      <div className="text-xs text-muted-foreground">{p.department_b || "—"}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={p.relationship_type === "cross_dept" ? "border-green-500 text-green-700" : ""}>
                        {p.relationship_type === "cross_dept" ? "跨部门" : "同部门"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{p.meeting_count}</TableCell>
                    <TableCell className="text-right">{p.total_co_meeting_minutes}</TableCell>
                    <TableCell className="text-right font-bold">{p.collaboration_score}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mb-3 opacity-30" />
              <p>暂无协作数据</p>
              <p className="text-sm">请先构建协作网络</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Cross-Department Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">跨部门协作分布</CardTitle>
          <CardDescription>各部门内部协作 vs 跨部门协作对比</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="department" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="内部协作" stackId="a" fill="#6366f1" />
                <Bar dataKey="跨部门协作" stackId="a" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mb-3 opacity-30" />
              <p>暂无跨部门数据</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 5: Silo Detection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" /> 协作孤岛检测
          </CardTitle>
          <CardDescription>检测跨部门协作不足的部门</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie chart */}
            {siloRiskDist.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">风险分布</h4>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={siloRiskDist}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {siloRiskDist.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            {/* Table */}
            <div>
              {silos.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>部门</TableHead>
                      <TableHead className="text-right">跨部门%</TableHead>
                      <TableHead className="text-right">内部</TableHead>
                      <TableHead className="text-right">外部</TableHead>
                      <TableHead>风险</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {silos.map((s: any, i: number) => (
                      <>
                        <TableRow key={i} className="cursor-pointer" onClick={() => setExpandedSilo(expandedSilo === i ? null : i)}>
                          <TableCell className="font-medium">{s.department}</TableCell>
                          <TableCell className="text-right">{s.crossCollabPercent}%</TableCell>
                          <TableCell className="text-right">{s.internalEdges}</TableCell>
                          <TableCell className="text-right">{s.crossDeptEdges}</TableCell>
                          <TableCell>
                            <Badge className={RISK_COLORS[s.riskLevel] || ""}>
                              {s.riskLevel === "high" ? "高" : s.riskLevel === "medium" ? "中" : "低"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {expandedSilo === i ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </TableCell>
                        </TableRow>
                        {expandedSilo === i && (
                          <TableRow key={`exp-${i}`}>
                            <TableCell colSpan={6} className="bg-muted/50">
                              <div className="p-3 text-sm space-y-1">
                                <p><strong>总协作边:</strong> {s.totalEdges}</p>
                                <p><strong>跨部门协作比:</strong> {s.crossCollabPercent}%</p>
                                <p><strong>建议:</strong> {s.riskLevel === "high"
                                  ? "该部门跨部门协作严重不足，建议组织跨部门会议和项目合作"
                                  : s.riskLevel === "medium"
                                  ? "可适当增加跨部门交流频次"
                                  : "跨部门协作状况良好"}</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">暂无孤岛数据</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 6: Meeting Necessity Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileQuestion className="h-5 w-5" /> 会议必要性分析
          </CardTitle>
          <CardDescription>AI评估会议是否有必要召开，是否可用邮件/消息替代</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Single analysis */}
            <div>
              <label className="text-sm text-muted-foreground">单次分析</label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="输入会议 ID..."
                  value={singleMeetingId}
                  onChange={e => setSingleMeetingId(e.target.value)}
                />
                <Button
                  onClick={() => analyzeMut.mutate({ meetingId: singleMeetingId })}
                  disabled={!singleMeetingId || analyzeMut.isPending}
                  size="sm"
                >
                  {analyzeMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "分析"}
                </Button>
              </div>
              {analyzeMut.data && (
                <p className="mt-2 text-sm text-green-600">
                  分析完成：{(analyzeMut.data as any).title} → 等级 {(analyzeMut.data as any).necessityGrade}
                </p>
              )}
            </div>
            {/* Batch analysis */}
            <div>
              <label className="text-sm text-muted-foreground">批量分析（逗号分隔 ID）</label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="id1, id2, id3..."
                  value={batchIds}
                  onChange={e => setBatchIds(e.target.value)}
                />
                <Button
                  onClick={() => {
                    const ids = batchIds.split(",").map(s => s.trim()).filter(Boolean);
                    if (ids.length > 0) batchMut.mutate({ meetingIds: ids });
                  }}
                  disabled={!batchIds || batchMut.isPending}
                  size="sm"
                >
                  {batchMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "批量分析"}
                </Button>
              </div>
              {batchMut.data && (
                <p className="mt-2 text-sm text-green-600">
                  批量完成：{(batchMut.data as any).analyzed} 成功，{(batchMut.data as any).errors} 失败
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 7: Necessity Scores Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">会议必要性评分</CardTitle>
          <CardDescription>已分析会议的必要性评级与详情</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Grade distribution pie chart */}
          {gradeDist.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium mb-2">等级分布</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={gradeDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {gradeDist.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {necessityScores.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>会议标题</TableHead>
                  <TableHead>日期</TableHead>
                  <TableHead className="text-right">分数</TableHead>
                  <TableHead>等级</TableHead>
                  <TableHead>替代方式</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {necessityScores.map((s: any, i: number) => {
                  const recs = (() => { try { return JSON.parse(s.recommendations || "[]"); } catch { return []; } })();
                  return (
                    <>
                      <TableRow key={i} className="cursor-pointer" onClick={() => setExpandedNecessity(expandedNecessity === i ? null : i)}>
                        <TableCell className="font-medium max-w-[200px] truncate">{s.meeting_title || s.meeting_id}</TableCell>
                        <TableCell className="text-sm">{s.meeting_date ? new Date(s.meeting_date).toLocaleDateString() : "—"}</TableCell>
                        <TableCell className="text-right font-bold">{s.necessity_score}</TableCell>
                        <TableCell>
                          <Badge className={GRADE_COLORS[s.necessity_grade] || ""}>{s.necessity_grade}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {s.alternative_viability === "email" ? "邮件" :
                             s.alternative_viability === "slack" ? "即时消息" :
                             s.alternative_viability === "doc" ? "文档" : "无替代"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {expandedNecessity === i ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </TableCell>
                      </TableRow>
                      {expandedNecessity === i && (
                        <TableRow key={`nexp-${i}`}>
                          <TableCell colSpan={6} className="bg-muted/50">
                            <div className="p-4 space-y-3">
                              {/* 6 dimension scores */}
                              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                                <div className="text-center p-2 bg-background rounded">
                                  <div className="text-lg font-bold">{s.decision_complexity}</div>
                                  <div className="text-xs text-muted-foreground">决策复杂度</div>
                                </div>
                                <div className="text-center p-2 bg-background rounded">
                                  <div className="text-lg font-bold">{s.collaboration_requirement}</div>
                                  <div className="text-xs text-muted-foreground">协作需求</div>
                                </div>
                                <div className="text-center p-2 bg-background rounded">
                                  <div className="text-lg font-bold">{s.information_richness}</div>
                                  <div className="text-xs text-muted-foreground">信息丰富度</div>
                                </div>
                                <div className="text-center p-2 bg-background rounded">
                                  <div className="text-lg font-bold">{s.outcome_impact}</div>
                                  <div className="text-xs text-muted-foreground">结果影响</div>
                                </div>
                                <div className="text-center p-2 bg-background rounded">
                                  <div className="text-lg font-bold">{s.participant_alignment}</div>
                                  <div className="text-xs text-muted-foreground">参会者契合</div>
                                </div>
                                <div className="text-center p-2 bg-background rounded">
                                  <div className="text-lg font-bold">{s.time_efficiency}</div>
                                  <div className="text-xs text-muted-foreground">时间效率</div>
                                </div>
                              </div>

                              {/* AI Narrative */}
                              {s.ai_narrative && (
                                <div>
                                  <h5 className="text-sm font-medium mb-1">AI 分析</h5>
                                  <p className="text-sm text-muted-foreground">{s.ai_narrative}</p>
                                </div>
                              )}

                              {/* Alternative rationale */}
                              {s.alternative_rationale && (
                                <div>
                                  <h5 className="text-sm font-medium mb-1">替代方案说明</h5>
                                  <p className="text-sm text-muted-foreground">{s.alternative_rationale}</p>
                                </div>
                              )}

                              {/* Recommendations */}
                              {recs.length > 0 && (
                                <div>
                                  <h5 className="text-sm font-medium mb-1">建议</h5>
                                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                    {recs.map((r: string, ri: number) => (
                                      <li key={ri}>{r}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileQuestion className="h-12 w-12 mb-3 opacity-30" />
              <p>暂无必要性评分数据</p>
              <p className="text-sm">请先对会议进行必要性分析</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
