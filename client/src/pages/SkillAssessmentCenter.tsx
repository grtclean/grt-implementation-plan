/**
 * Skill Assessment Center — 岗位能力等级测评中心
 *
 * CEO指令: 给每个岗位创造可以测试能力等级专业程度，包括人为输入题目
 *
 * Tabs:
 *  1. 测评总览 — Dashboard with stats, level distribution
 *  2. 岗位模型 — Position profiles (22 types) with skill domains
 *  3. 题库管理 — Question bank CRUD + manual entry
 *  4. 组卷管理 — Paper composition + publish
 *  5. 我的考试 — Take assessments, view results
 *  6. 证书管理 — Skill level certifications
 *  7. 评分中心 — Grade subjective questions
 */
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  GraduationCap, BookOpen, FileText, ClipboardCheck,
  Award, Users, BarChart3, Plus, Search, Edit2,
  CheckCircle2, XCircle, Clock, Star, Target,
  PenTool, Lightbulb,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";

// ── Constants ──
const LEVEL_COLORS: Record<string, string> = {
  L1: "bg-green-100 text-green-800",
  L2: "bg-blue-100 text-blue-800",
  L3: "bg-purple-100 text-purple-800",
  L4: "bg-orange-100 text-orange-800",
  L5: "bg-red-100 text-red-800",
};

const LEVEL_LABELS: Record<string, string> = {
  L1: "L1 入门 (60分)", L2: "L2 熟练 (70分)", L3: "L3 精通 (80分)",
  L4: "L4 专家 (85分)", L5: "L5 大师 (90分)",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  basic: "基础", intermediate: "中级", advanced: "高级", expert: "专家",
};

const QUESTION_TYPE_LABELS: Record<string, string> = {
  single_choice: "单选题", multi_choice: "多选题", true_false: "判断题",
  fill_blank: "填空题", short_answer: "简答题", practical: "实操题",
  case_analysis: "案例分析",
};

export default function SkillAssessmentCenter() {
  const { t } = useLanguage();
  const [selectedPosition, setSelectedPosition] = useState<string>("");
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [search, setSearch] = useState("");

  // ── New question form state ──
  const [newQ, setNewQ] = useState({
    questionType: "single_choice" as string,
    difficulty: "basic" as string,
    targetLevels: ["L1"] as string[],
    content: "",
    optionA: "", optionB: "", optionC: "", optionD: "",
    correctAnswer: "A",
    explanation: "",
    points: 2,
  });

  // ── Queries ──
  const statsQuery = trpc.skillAssessment.certs.dashboard.useQuery();
  const profilesQuery = trpc.skillAssessment.positions.list.useQuery({});
  const questionsQuery = trpc.skillAssessment.questions.list.useQuery(
    { positionKey: selectedPosition },
    { enabled: !!selectedPosition },
  );
  const mySessionsQuery = trpc.skillAssessment.sessions.myList.useQuery({});
  const myCertsQuery = trpc.skillAssessment.certs.myCerts.useQuery();
  const pendingGradingQuery = trpc.skillAssessment.sessions.pendingGrading.useQuery({});

  // ── Mutations ──
  const createQuestionMutation = trpc.skillAssessment.questions.create.useMutation({
    onSuccess: () => {
      setShowQuestionDialog(false);
      questionsQuery.refetch();
      setNewQ({
        questionType: "single_choice", difficulty: "basic", targetLevels: ["L1"],
        content: "", optionA: "", optionB: "", optionC: "", optionD: "",
        correctAnswer: "A", explanation: "", points: 2,
      });
    },
  });

  const stats = statsQuery.data;
  const profiles = profilesQuery.data ?? [];
  const questions = questionsQuery.data ?? [];
  const mySessions = mySessionsQuery.data ?? [];
  const myCerts = myCertsQuery.data ?? [];
  const pendingGrading = pendingGradingQuery.data ?? [];

  // ── Question submit handler ──
  function handleCreateQuestion() {
    if (!selectedPosition || !newQ.content) return;

    const isChoice = ["single_choice", "multi_choice", "true_false"].includes(newQ.questionType);
    const options = isChoice ? [
      { key: "A", text: newQ.optionA, isCorrect: newQ.correctAnswer.includes("A") },
      { key: "B", text: newQ.optionB, isCorrect: newQ.correctAnswer.includes("B") },
      ...(newQ.optionC ? [{ key: "C", text: newQ.optionC, isCorrect: newQ.correctAnswer.includes("C") }] : []),
      ...(newQ.optionD ? [{ key: "D", text: newQ.optionD, isCorrect: newQ.correctAnswer.includes("D") }] : []),
    ].filter(o => o.text) : undefined;

    createQuestionMutation.mutate({
      positionKey: selectedPosition,
      domainKey: "general",
      questionType: newQ.questionType as any,
      difficulty: newQ.difficulty as any,
      targetLevels: newQ.targetLevels as any,
      content: newQ.content,
      options,
      correctAnswer: isChoice ? newQ.correctAnswer : undefined,
      explanation: newQ.explanation || undefined,
      points: newQ.points,
    });
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <GraduationCap className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">岗位能力等级测评中心</h1>
          <p className="text-muted-foreground text-sm">
            22个岗位模型 · {stats?.totalQuestions ?? 0} 道题库 · {stats?.manualQuestions ?? 0} 道人工题目 · L1-L5 五级认证
          </p>
        </div>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList className="flex-wrap">
          <TabsTrigger value="dashboard"><BarChart3 className="h-4 w-4 mr-1" />测评总览</TabsTrigger>
          <TabsTrigger value="profiles"><Target className="h-4 w-4 mr-1" />岗位模型</TabsTrigger>
          <TabsTrigger value="questions"><BookOpen className="h-4 w-4 mr-1" />题库管理</TabsTrigger>
          <TabsTrigger value="papers"><FileText className="h-4 w-4 mr-1" />组卷管理</TabsTrigger>
          <TabsTrigger value="my-exams"><ClipboardCheck className="h-4 w-4 mr-1" />我的考试</TabsTrigger>
          <TabsTrigger value="certs"><Award className="h-4 w-4 mr-1" />证书管理</TabsTrigger>
          <TabsTrigger value="grading"><PenTool className="h-4 w-4 mr-1" />评分中心</TabsTrigger>
        </TabsList>

        {/* ── Dashboard ── */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">岗位模型</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold">{stats?.positionProfiles ?? 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">总题目数</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold">{stats?.totalQuestions ?? 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">人工输入题目</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold text-orange-600">{stats?.manualQuestions ?? 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">有效证书</CardTitle></CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {(stats?.activeCertsByLevel ?? []).reduce((s: number, c: any) => s + c.count, 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">待评分</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold text-amber-600">{pendingGrading.length}</div></CardContent>
            </Card>
          </div>

          {/* Level distribution */}
          <Card>
            <CardHeader><CardTitle>能力等级分布</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
                {["L1", "L2", "L3", "L4", "L5"].map(level => {
                  const count = (stats?.activeCertsByLevel ?? []).find((c: any) => c.level === level)?.count ?? 0;
                  return (
                    <div key={level} className="text-center p-4 rounded-lg border">
                      <Badge className={LEVEL_COLORS[level]}>{level}</Badge>
                      <div className="text-2xl font-bold mt-2">{count}</div>
                      <div className="text-xs text-muted-foreground">{LEVEL_LABELS[level]?.split(" ")[1]}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* CEO Policy */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-yellow-500" />测评制度说明</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <p><strong>等级标准:</strong> L1入门(60分) → L2熟练(70分) → L3精通(80分) → L4专家(85分) → L5大师(90分)</p>
              <p><strong>题目来源:</strong> 系统预设题库 + 管理者/专家人为输入题目</p>
              <p><strong>评分方式:</strong> 客观题自动评分，主观题(简答/实操/案例分析)由主管手动评分</p>
              <p><strong>证书效力:</strong> 通过测评即获对应等级证书，升级后原证书自动标记为"已替代"</p>
              <p><strong>积分联动:</strong> 通过L3及以上测评可获积分奖励，技能等级达L3可申请精英福利(大小休)</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Position Profiles ── */}
        <TabsContent value="profiles" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>22个岗位能力模型</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>岗位</TableHead>
                    <TableHead>部门</TableHead>
                    <TableHead>能力域</TableHead>
                    <TableHead>通过标准</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((p: any) => (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-accent"
                      onClick={() => setSelectedPosition(p.positionKey)}>
                      <TableCell className="font-medium">{p.positionName}</TableCell>
                      <TableCell>{p.department}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {((p.skillDomains as any[]) ?? []).map((d: any) => (
                            <Badge key={d.key} variant="outline" className="text-xs">
                              {d.name} ({d.weight}%)
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {Object.entries((p.passThresholds as Record<string, number>) ?? {}).map(([l, s]) => (
                            <Badge key={l} className={`${LEVEL_COLORS[l]} text-xs`}>{l}:{s}</Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Question Bank + Manual Entry (人为输入题目) ── */}
        <TabsContent value="questions" className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={selectedPosition} onValueChange={setSelectedPosition}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="选择岗位..." />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p: any) => (
                  <SelectItem key={p.positionKey} value={p.positionKey}>{p.positionName}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={() => setShowQuestionDialog(true)} disabled={!selectedPosition}>
              <Plus className="h-4 w-4 mr-1" />人为输入题目
            </Button>

            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="搜索题目..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {selectedPosition && (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>题目</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>难度</TableHead>
                      <TableHead>等级</TableHead>
                      <TableHead>分值</TableHead>
                      <TableHead>来源</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questions
                      .filter((q: any) => !search || q.content?.toLowerCase().includes(search.toLowerCase()))
                      .map((q: any, i: number) => (
                      <TableRow key={q.id}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="max-w-sm truncate">{q.content}</TableCell>
                        <TableCell><Badge variant="outline">{QUESTION_TYPE_LABELS[q.questionType] ?? q.questionType}</Badge></TableCell>
                        <TableCell><Badge variant="secondary">{DIFFICULTY_LABELS[q.difficulty] ?? q.difficulty}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-0.5">
                            {((q.targetLevels as string[]) ?? []).map(l => (
                              <Badge key={l} className={`${LEVEL_COLORS[l]} text-xs`}>{l}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{q.points}分</TableCell>
                        <TableCell>
                          {q.isManualEntry
                            ? <Badge className="bg-orange-100 text-orange-700">人工</Badge>
                            : <Badge variant="outline">系统</Badge>
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* ── Manual Question Entry Dialog (人为输入题目) ── */}
          <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Edit2 className="h-5 w-5" />人为输入题目
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>题目类型</Label>
                    <Select value={newQ.questionType} onValueChange={v => setNewQ({ ...newQ, questionType: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>难度等级</Label>
                    <Select value={newQ.difficulty} onValueChange={v => setNewQ({ ...newQ, difficulty: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>分值</Label>
                    <Input type="number" min={1} max={50} value={newQ.points}
                      onChange={e => setNewQ({ ...newQ, points: parseInt(e.target.value) || 1 })} />
                  </div>
                </div>

                <div>
                  <Label>适用等级（多选）</Label>
                  <div className="flex gap-2 mt-1">
                    {["L1", "L2", "L3", "L4", "L5"].map(l => (
                      <Badge
                        key={l}
                        className={`cursor-pointer ${newQ.targetLevels.includes(l) ? LEVEL_COLORS[l] : "bg-gray-100 text-gray-500"}`}
                        onClick={() => {
                          const levels = newQ.targetLevels.includes(l)
                            ? newQ.targetLevels.filter(x => x !== l)
                            : [...newQ.targetLevels, l];
                          setNewQ({ ...newQ, targetLevels: levels });
                        }}
                      >
                        {l}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>题目内容</Label>
                  <Textarea
                    rows={4} placeholder="请输入题目内容（支持换行）..."
                    value={newQ.content} onChange={e => setNewQ({ ...newQ, content: e.target.value })}
                  />
                </div>

                {["single_choice", "multi_choice", "true_false"].includes(newQ.questionType) && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>选项A</Label>
                        <Input value={newQ.optionA} onChange={e => setNewQ({ ...newQ, optionA: e.target.value })} />
                      </div>
                      <div>
                        <Label>选项B</Label>
                        <Input value={newQ.optionB} onChange={e => setNewQ({ ...newQ, optionB: e.target.value })} />
                      </div>
                      {newQ.questionType !== "true_false" && (
                        <>
                          <div>
                            <Label>选项C</Label>
                            <Input value={newQ.optionC} onChange={e => setNewQ({ ...newQ, optionC: e.target.value })} />
                          </div>
                          <div>
                            <Label>选项D</Label>
                            <Input value={newQ.optionD} onChange={e => setNewQ({ ...newQ, optionD: e.target.value })} />
                          </div>
                        </>
                      )}
                    </div>
                    <div>
                      <Label>正确答案 {newQ.questionType === "multi_choice" ? "(多个用逗号分隔，如 A,C)" : ""}</Label>
                      <Input value={newQ.correctAnswer}
                        onChange={e => setNewQ({ ...newQ, correctAnswer: e.target.value })}
                        placeholder={newQ.questionType === "true_false" ? "A=正确 / B=错误" : "A"} />
                    </div>
                  </>
                )}

                <div>
                  <Label>答案解析（可选）</Label>
                  <Textarea rows={2} value={newQ.explanation}
                    onChange={e => setNewQ({ ...newQ, explanation: e.target.value })} />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowQuestionDialog(false)}>取消</Button>
                <Button onClick={handleCreateQuestion}
                  disabled={!newQ.content || createQuestionMutation.isPending}>
                  <Plus className="h-4 w-4 mr-1" />添加题目
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ── Papers ── */}
        <TabsContent value="papers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>试卷模板管理</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                从题库中选择题目组合成试卷，设置总分和通过分数，发布后员工可参加测评。
              </p>
              <div className="bg-muted p-4 rounded text-sm space-y-1">
                <div><strong>组卷规则:</strong></div>
                <div>• 每级试卷按能力域权重分配题目数量</div>
                <div>• L1: 20题/45分钟 | L2: 30题/60分钟 | L3: 40题/90分钟 | L4: 40题/90分钟 | L5: 50题/120分钟</div>
                <div>• 客观题(单选/多选/判断)占60-70%，主观题(简答/实操/案例)占30-40%</div>
                <div>• 试卷需发布后方可使用</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── My Exams ── */}
        <TabsContent value="my-exams" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>我的测评记录</CardTitle></CardHeader>
            <CardContent>
              {mySessions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">暂无测评记录，请选择岗位开始测评</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>岗位</TableHead>
                      <TableHead>等级</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>得分</TableHead>
                      <TableHead>结果</TableHead>
                      <TableHead>时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mySessions.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.positionKey}</TableCell>
                        <TableCell><Badge className={LEVEL_COLORS[s.targetLevel]}>{s.targetLevel}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={s.status === "completed" ? "default" : "outline"}>
                            {s.status === "completed" ? "已完成" : s.status === "grading" ? "评分中" : s.status === "in_progress" ? "进行中" : s.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">{s.finalScore ?? "-"}</TableCell>
                        <TableCell>
                          {s.passed === true && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                          {s.passed === false && <XCircle className="h-5 w-5 text-red-500" />}
                          {s.passed == null && <Clock className="h-5 w-5 text-gray-400" />}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {s.createdAt ? new Date(s.createdAt).toLocaleDateString("zh-CN") : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Certs ── */}
        <TabsContent value="certs" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-yellow-500" />我的能力证书</CardTitle></CardHeader>
            <CardContent>
              {myCerts.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">暂无证书，通过岗位测评即可获得能力等级认证</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myCerts.map((c: any) => (
                    <Card key={c.id} className={c.status !== "active" ? "opacity-50" : ""}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <Badge className={LEVEL_COLORS[c.level] + " text-lg px-3 py-1"}>{c.level}</Badge>
                          <Badge variant={c.status === "active" ? "default" : "outline"}>
                            {c.status === "active" ? "有效" : c.status === "superseded" ? "已升级" : c.status}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="font-medium">{c.positionKey}</div>
                          <div className="text-muted-foreground">得分: {c.score}</div>
                          <div className="text-muted-foreground">证书号: {c.certNumber}</div>
                          <div className="text-muted-foreground">
                            颁发: {c.issuedAt ? new Date(c.issuedAt).toLocaleDateString("zh-CN") : "-"}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Grading Center ── */}
        <TabsContent value="grading" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>主观题评分中心</CardTitle></CardHeader>
            <CardContent>
              {pendingGrading.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">当前无待评分试卷</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>考试ID</TableHead>
                      <TableHead>岗位</TableHead>
                      <TableHead>等级</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingGrading.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono">#{s.id}</TableCell>
                        <TableCell>{s.positionKey}</TableCell>
                        <TableCell><Badge className={LEVEL_COLORS[s.targetLevel]}>{s.targetLevel}</Badge></TableCell>
                        <TableCell><Badge className="bg-amber-100 text-amber-800">待评分</Badge></TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            <PenTool className="h-3 w-3 mr-1" />评分
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
