import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Star, TrendingUp, Lightbulb, Send, BarChart3, ThumbsUp, ThumbsDown, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} onClick={() => onChange(n)} className={`text-lg ${n <= value ? "text-yellow-500" : "text-gray-300"}`}>
          ★
        </button>
      ))}
    </div>
  );
}

export function FeedbackTab() {
  // Feedback form
  const [fbMeetingId, setFbMeetingId] = useState("");
  const [fbOverall, setFbOverall] = useState(0);
  const [fbContent, setFbContent] = useState(0);
  const [fbTime, setFbTime] = useState(0);
  const [fbFacilitation, setFbFacilitation] = useState(0);
  const [fbAction, setFbAction] = useState(0);
  const [fbRecommend, setFbRecommend] = useState<number | undefined>(undefined);
  const [fbHighlights, setFbHighlights] = useState("");
  const [fbImprovements, setFbImprovements] = useState("");
  const [fbAnonymous, setFbAnonymous] = useState(false);

  // Lookup
  const [lookupMeetingId, setLookupMeetingId] = useState("");

  // Trends period
  const [trendPeriod, setTrendPeriod] = useState("monthly");

  // Improvement scope
  const [improvScope, setImprovScope] = useState("organization");

  const dashboardQuery = trpc.ime.feedbackDashboard.useQuery({ period: trendPeriod });
  const improvementsQuery = trpc.ime.listImprovements.useQuery({});

  const submitMut = trpc.ime.submitFeedback.useMutation({
    onSuccess: () => { dashboardQuery.refetch(); setFbMeetingId(""); setFbOverall(0); setFbContent(0); setFbTime(0); setFbFacilitation(0); setFbAction(0); setFbHighlights(""); setFbImprovements(""); },
  });
  const lookupMut = trpc.ime.meetingFeedback.useQuery(
    { meetingId: lookupMeetingId },
    { enabled: lookupMeetingId.length > 0 }
  );
  const trendsMut = trpc.ime.feedbackTrends.useMutation();
  const improvMut = trpc.ime.generateImprovement.useMutation({
    onSuccess: () => improvementsQuery.refetch(),
  });
  const updateImprovMut = trpc.ime.updateImprovement.useMutation({
    onSuccess: () => improvementsQuery.refetch(),
  });

  const dashboard = dashboardQuery.data as any;
  const improvements = (improvementsQuery.data || []) as any[];

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <MessageCircle className="h-8 w-8 mx-auto text-blue-500 mb-1" />
            <div className="text-3xl font-bold">{dashboard?.stats?.totalResponses || 0}</div>
            <div className="text-sm text-muted-foreground">反馈总数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Star className="h-8 w-8 mx-auto text-yellow-500 mb-1" />
            <div className="text-3xl font-bold">{dashboard?.stats?.avgRating || 0}</div>
            <div className="text-sm text-muted-foreground">平均评分</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <ThumbsUp className="h-8 w-8 mx-auto text-green-500 mb-1" />
            <div className="text-3xl font-bold">{dashboard?.stats?.npsScore || 0}</div>
            <div className="text-sm text-muted-foreground">NPS得分</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Lightbulb className="h-8 w-8 mx-auto text-orange-500 mb-1" />
            <div className="text-3xl font-bold">{improvements.filter((i: any) => i.status === "proposed" || i.status === "in_progress").length}</div>
            <div className="text-sm text-muted-foreground">活跃改进项</div>
          </CardContent>
        </Card>
      </div>

      {/* Submit Feedback */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            提交会议反馈
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input placeholder="会议ID" value={fbMeetingId} onChange={e => setFbMeetingId(e.target.value)} className="mb-3" />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">总体评分 *</span>
                  <StarRating value={fbOverall} onChange={setFbOverall} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">内容相关性</span>
                  <StarRating value={fbContent} onChange={setFbContent} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">时间效率</span>
                  <StarRating value={fbTime} onChange={setFbTime} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">主持质量</span>
                  <StarRating value={fbFacilitation} onChange={setFbFacilitation} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">行动清晰度</span>
                  <StarRating value={fbAction} onChange={setFbAction} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">是否推荐</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant={fbRecommend === 1 ? "default" : "outline"} onClick={() => setFbRecommend(1)}>
                      <ThumbsUp className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant={fbRecommend === 0 ? "destructive" : "outline"} onClick={() => setFbRecommend(0)}>
                      <ThumbsDown className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <Input placeholder="亮点 — 哪些做得好？" value={fbHighlights} onChange={e => setFbHighlights(e.target.value)} />
              <Input placeholder="改进 — 哪些可以更好？" value={fbImprovements} onChange={e => setFbImprovements(e.target.value)} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={fbAnonymous} onChange={e => setFbAnonymous(e.target.checked)} />
                匿名提交
              </label>
              <Button
                className="w-full"
                onClick={() => submitMut.mutate({
                  meetingId: fbMeetingId, overallRating: fbOverall,
                  contentRelevance: fbContent || undefined, timeEfficiency: fbTime || undefined,
                  facilitation: fbFacilitation || undefined, actionClarity: fbAction || undefined,
                  wouldRecommend: fbRecommend, highlights: fbHighlights || undefined,
                  improvements: fbImprovements || undefined, anonymous: fbAnonymous,
                })}
                disabled={!fbMeetingId || !fbOverall || submitMut.isPending}
              >
                {submitMut.isPending ? "提交中..." : "提交反馈"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meeting Feedback Lookup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            会议反馈查询
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="会议ID" value={lookupMeetingId} onChange={e => setLookupMeetingId(e.target.value)} className="flex-1" />
          </div>
          {lookupMut.data && (
            <div className="p-3 bg-muted rounded space-y-2">
              <div className="flex items-center gap-4 text-sm">
                <span>反馈数: <strong>{(lookupMut.data as any).totalResponses}</strong></span>
                <span>平均评分: <strong>{(lookupMut.data as any).avgOverall}</strong>/5</span>
                <span>NPS: <strong>{(lookupMut.data as any).npsScore}</strong></span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div>内容: <strong>{(lookupMut.data as any).avgContent}</strong></div>
                <div>时间: <strong>{(lookupMut.data as any).avgTime}</strong></div>
                <div>主持: <strong>{(lookupMut.data as any).avgFacilitation}</strong></div>
                <div>行动: <strong>{(lookupMut.data as any).avgAction}</strong></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feedback Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            反馈趋势分析
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Select value={trendPeriod} onValueChange={setTrendPeriod}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">本周</SelectItem>
                <SelectItem value="monthly">本月</SelectItem>
                <SelectItem value="quarterly">本季</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => trendsMut.mutate({ period: trendPeriod })} disabled={trendsMut.isPending}>
              {trendsMut.isPending ? "分析中..." : "分析趋势"}
            </Button>
          </div>
          {trendsMut.data && (
            <div className="p-4 bg-muted rounded space-y-3">
              <div className="flex items-center gap-6 text-sm">
                <span>反馈数: <strong>{(trendsMut.data as any).totalResponses}</strong></span>
                <span>平均: <strong>{(trendsMut.data as any).avgOverall}</strong>/5</span>
                <span>NPS: <strong>{(trendsMut.data as any).npsScore}</strong></span>
                <Badge variant={(trendsMut.data as any).trend === "up" ? "default" : (trendsMut.data as any).trend === "down" ? "destructive" : "secondary"}>
                  {(trendsMut.data as any).trend === "up" ? "↑ 上升" : (trendsMut.data as any).trend === "down" ? "↓ 下降" : "→ 稳定"}
                </Badge>
              </div>
              {(trendsMut.data as any).topHighlights?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">常见亮点</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {(trendsMut.data as any).topHighlights.map((h: string, i: number) => <li key={i}>{h}</li>)}
                  </ul>
                </div>
              )}
              {(trendsMut.data as any).topImprovements?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">常见改进建议</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {(trendsMut.data as any).topImprovements.map((h: string, i: number) => <li key={i}>{h}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Improvement Initiatives */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            改进计划
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select value={improvScope} onValueChange={setImprovScope}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="organization">组织级</SelectItem>
                <SelectItem value="department">部门级</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => improvMut.mutate({ scope: improvScope })} disabled={improvMut.isPending}>
              {improvMut.isPending ? "生成中..." : "AI生成改进计划"}
            </Button>
          </div>

          {improvements.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>标题</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead>优先级</TableHead>
                  <TableHead>来源</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {improvements.map((init: any) => (
                  <TableRow key={init.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{init.title}</div>
                        {init.description && <div className="text-xs text-muted-foreground max-w-[300px] truncate">{init.description}</div>}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{init.category}</Badge></TableCell>
                    <TableCell>
                      <Badge className={init.priority === "P0" ? "bg-red-100 text-red-800" : init.priority === "P1" ? "bg-orange-100 text-orange-800" : "bg-blue-100 text-blue-800"}>
                        {init.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{init.source}</TableCell>
                    <TableCell>
                      <Badge variant={init.status === "completed" ? "default" : init.status === "in_progress" ? "outline" : "secondary"}>
                        {init.status === "proposed" ? "待审" : init.status === "approved" ? "已批" : init.status === "in_progress" ? "进行中" : init.status === "completed" ? "完成" : init.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {init.status === "proposed" && (
                          <Button size="sm" variant="outline" onClick={() => updateImprovMut.mutate({ id: init.id, status: "approved" })}>批准</Button>
                        )}
                        {(init.status === "approved" || init.status === "in_progress") && (
                          <Button size="sm" variant="outline" onClick={() => updateImprovMut.mutate({ id: init.id, status: "completed" })}>完成</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">暂无改进计划。点击上方按钮由AI生成。</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
