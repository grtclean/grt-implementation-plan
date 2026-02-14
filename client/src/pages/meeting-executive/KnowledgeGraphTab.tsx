import { useState } from "react";
import {
  Brain,
  Search,
  RefreshCw,
  GitBranch,
  Users,
  Lightbulb,
  Target,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";

const entityTypeLabels: Record<string, string> = {
  decision: "决策",
  risk: "风险",
  opportunity: "机会",
  dependency: "依赖",
  insight: "洞察",
};

const entityTypeColors: Record<string, string> = {
  decision: "default",
  risk: "destructive",
  opportunity: "secondary",
  dependency: "outline",
  insight: "default",
};

const outcomeStatusLabels: Record<string, string> = {
  pending: "待定",
  implemented: "已实施",
  reversed: "已撤销",
  modified: "已修改",
  abandoned: "已放弃",
};

export function KnowledgeGraphTab() {
  // --- Entity extraction ---
  const [extractMeetingId, setExtractMeetingId] = useState("");
  const extractMutation = trpc.ime.extractEntities.useMutation();
  const buildRelMutation = trpc.ime.buildRelationships.useMutation();

  // --- Knowledge search ---
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState("all");
  const [searchSubmitted, setSearchSubmitted] = useState("");
  const searchResults = trpc.ime.searchKnowledge.useQuery(
    { query: searchSubmitted, entityType: searchType === "all" ? undefined : searchType },
    { enabled: !!searchSubmitted },
  );

  // --- Retrospective ---
  const [retroMeetingId, setRetroMeetingId] = useState("");
  const retroMutation = trpc.ime.generateRetrospective.useMutation();

  // --- Expert profiles ---
  const computeExpertsMutation = trpc.ime.computeExpertProfiles.useMutation();

  // --- Dashboard ---
  const dashboard = trpc.ime.knowledgeDashboard.useQuery({});

  return (
    <div className="space-y-6">
      {/* Dashboard Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "知识实体", value: dashboard.data?.summary?.totalEntities ?? 0, icon: Brain },
          { label: "实体关系", value: dashboard.data?.summary?.totalRelationships ?? 0, icon: GitBranch },
          { label: "决策追踪", value: dashboard.data?.summary?.totalDecisions ?? 0, icon: Target },
          { label: "会议回顾", value: dashboard.data?.summary?.totalRetrospectives ?? 0, icon: FileText },
          { label: "专家画像", value: (dashboard.data?.summary?.totalExperts as any)?.cnt ?? 0, icon: Users },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <stat.icon className="h-4 w-4" />
                {stat.label}
              </div>
              <div className="text-2xl font-bold">{String(stat.value)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Entity Extraction */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            知识实体提取
          </CardTitle>
          <CardDescription>从会议记录中自动提取决策、风险、机会、依赖和洞察实体，并建立跨会议关联</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground mb-1 block">会议ID</label>
              <Input
                placeholder="输入会议ID..."
                value={extractMeetingId}
                onChange={(e) => setExtractMeetingId(e.target.value)}
              />
            </div>
            <Button
              onClick={() => extractMutation.mutate({ meetingId: extractMeetingId })}
              disabled={!extractMeetingId.trim() || extractMutation.isPending}
            >
              {extractMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
              提取实体
            </Button>
            <Button
              variant="outline"
              onClick={() => buildRelMutation.mutate({ meetingId: extractMeetingId })}
              disabled={!extractMeetingId.trim() || buildRelMutation.isPending}
            >
              {buildRelMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <GitBranch className="h-4 w-4 mr-2" />}
              建立关联
            </Button>
          </div>
          {extractMutation.isSuccess && (
            <p className="text-sm text-green-600 mt-2">
              提取完成: {extractMutation.data.entitiesExtracted} 个实体
            </p>
          )}
          {buildRelMutation.isSuccess && (
            <p className="text-sm text-green-600 mt-2">
              关联完成: {buildRelMutation.data.relationshipsCreated} 个关系
            </p>
          )}
          {(extractMutation.isError || buildRelMutation.isError) && (
            <p className="text-sm text-destructive mt-2">
              {extractMutation.error?.message || buildRelMutation.error?.message}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Knowledge Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-600" />
            知识搜索
          </CardTitle>
          <CardDescription>搜索跨会议的知识实体，查找决策、风险和洞察</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end mb-4">
            <div className="flex-1">
              <Input
                placeholder="搜索关键词..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchQuery.trim() && setSearchSubmitted(searchQuery)}
              />
            </div>
            <div className="w-32">
              <Select value={searchType} onValueChange={setSearchType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="decision">决策</SelectItem>
                  <SelectItem value="risk">风险</SelectItem>
                  <SelectItem value="opportunity">机会</SelectItem>
                  <SelectItem value="dependency">依赖</SelectItem>
                  <SelectItem value="insight">洞察</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setSearchSubmitted(searchQuery)} disabled={!searchQuery.trim()}>
              <Search className="h-4 w-4 mr-2" />
              搜索
            </Button>
          </div>
          {searchResults.data && (searchResults.data as any[]).length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>类型</TableHead>
                  <TableHead>内容</TableHead>
                  <TableHead>来源会议</TableHead>
                  <TableHead>相关人员</TableHead>
                  <TableHead>置信度</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(searchResults.data as any[]).map((r: any, i: number) => (
                  <TableRow key={r.id || i}>
                    <TableCell>
                      <Badge variant={entityTypeColors[r.entity_type] as any || "default"}>
                        {entityTypeLabels[r.entity_type] || r.entity_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">{r.entity_value}</TableCell>
                    <TableCell className="text-sm">{r.meeting_title}</TableCell>
                    <TableCell className="text-sm">{r.related_speaker || "—"}</TableCell>
                    <TableCell className="text-sm">{r.confidence ? `${Math.round(Number(r.confidence) * 100)}%` : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : searchSubmitted ? (
            <p className="text-sm text-muted-foreground text-center py-4">未找到相关知识实体</p>
          ) : null}
        </CardContent>
      </Card>

      {/* Meeting Retrospective */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-600" />
            会议回顾
          </CardTitle>
          <CardDescription>AI自动生成会议回顾，包括关键学习、改进方向和可行建议</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end mb-4">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground mb-1 block">会议ID</label>
              <Input
                placeholder="输入会议ID..."
                value={retroMeetingId}
                onChange={(e) => setRetroMeetingId(e.target.value)}
              />
            </div>
            <Button
              onClick={() => retroMutation.mutate({ meetingId: retroMeetingId })}
              disabled={!retroMeetingId.trim() || retroMutation.isPending}
            >
              {retroMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lightbulb className="h-4 w-4 mr-2" />}
              生成回顾
            </Button>
          </div>
          {retroMutation.isError && (
            <p className="text-sm text-destructive">{retroMutation.error.message}</p>
          )}
          {retroMutation.isSuccess && (
            <div className="space-y-3 border rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Badge>{retroMutation.data.overallGrade}</Badge>
                <span className="text-sm font-medium">综合评级</span>
              </div>
              <p className="text-sm">{retroMutation.data.summary}</p>
              {retroMutation.data.whatWentWell.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-green-700 mb-1">做得好的方面:</p>
                  <ul className="text-sm space-y-1">
                    {retroMutation.data.whatWentWell.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {retroMutation.data.improvementAreas.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-amber-700 mb-1">改进方向:</p>
                  <ul className="text-sm space-y-1">
                    {retroMutation.data.improvementAreas.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {retroMutation.data.keyLearnings.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-blue-700 mb-1">关键学习:</p>
                  <ul className="text-sm list-disc list-inside space-y-1">
                    {retroMutation.data.keyLearnings.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {retroMutation.data.narrative && (
                <p className="text-sm text-muted-foreground italic">{retroMutation.data.narrative}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expert Profiles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            专家画像
          </CardTitle>
          <CardDescription>基于会议贡献、决策影响力和参与度自动识别组织专家</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end mb-4">
            <Button
              onClick={() => computeExpertsMutation.mutate({})}
              disabled={computeExpertsMutation.isPending}
            >
              {computeExpertsMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              重新计算专家画像
            </Button>
            {computeExpertsMutation.isSuccess && (
              <span className="text-sm text-green-600">计算完成: {computeExpertsMutation.data.profilesComputed} 个专家</span>
            )}
          </div>
          {dashboard.data?.topExperts && (dashboard.data.topExperts as any[]).length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>姓名</TableHead>
                  <TableHead>信誉分</TableHead>
                  <TableHead>会议数</TableHead>
                  <TableHead>专长领域</TableHead>
                  <TableHead>热门话题</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(dashboard.data.topExperts as any[]).map((expert: any, i: number) => (
                  <TableRow key={expert.employee_id || i}>
                    <TableCell className="font-medium">{expert.employee_name}</TableCell>
                    <TableCell>
                      <Badge variant={Number(expert.credibility_score) >= 80 ? "default" : "secondary"}>
                        {Math.round(Number(expert.credibility_score))}
                      </Badge>
                    </TableCell>
                    <TableCell>{expert.meeting_count}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {(expert.expertiseAreas || []).slice(0, 3).map((area: string, j: number) => (
                          <Badge key={j} variant="outline" className="text-xs">{area}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {(expert.topTopics || []).slice(0, 2).join(", ") || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">暂无专家数据，请先计算专家画像</p>
          )}
        </CardContent>
      </Card>

      {/* Entity Type Distribution */}
      {dashboard.data?.entityTypeStats && (dashboard.data.entityTypeStats as any[]).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-teal-600" />
              实体类型分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {(dashboard.data.entityTypeStats as any[]).map((stat: any) => (
                <div key={stat.type} className="border rounded-lg p-3 text-center">
                  <Badge variant={entityTypeColors[stat.type] as any || "default"} className="mb-2">
                    {entityTypeLabels[stat.type] || stat.type}
                  </Badge>
                  <div className="text-xl font-bold">{stat.count}</div>
                  <div className="text-xs text-muted-foreground">置信度 {Math.round(stat.avgConfidence * 100)}%</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Retrospectives */}
      {dashboard.data?.recentRetrospectives && (dashboard.data.recentRetrospectives as any[]).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-600" />
              最近会议回顾
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>会议</TableHead>
                  <TableHead>评级</TableHead>
                  <TableHead>摘要</TableHead>
                  <TableHead>生成时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(dashboard.data.recentRetrospectives as any[]).map((r: any, i: number) => (
                  <TableRow key={r.meeting_id || i}>
                    <TableCell className="font-medium">{r.title || r.meeting_id}</TableCell>
                    <TableCell><Badge>{r.overall_grade}</Badge></TableCell>
                    <TableCell className="max-w-[300px] truncate text-sm">{r.ai_summary}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.generated_at ? new Date(r.generated_at).toLocaleString("zh-CN") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
