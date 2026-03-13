/**
 * 360度反馈 — Employee-Facing 360° Feedback Page
 *
 * Sections:
 *  1. My Pending Reviews — list of reviews awaiting my input
 *  2. Questionnaire — Likert scale questions + free-text
 *  3. My Feedback Results — aggregated radar chart (anonymized)
 */

import React, { useState } from "react";
import { trpc } from "../lib/trpc";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ClipboardList, Send, BarChart3, CheckCircle2, Clock, Star } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

// ── Score Stars ──────────────────────────────────────────
function ScoreInput({ value, onChange, max = 10 }: { value: number; onChange: (v: number) => void; max?: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`w-7 h-7 rounded-full text-xs font-medium border transition-colors ${
            n <= value ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-gray-200 hover:bg-gray-100"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────
export default function Feedback360() {
  const [activeFeedback, setActiveFeedback] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [viewEmployeeId, setViewEmployeeId] = useState("");
  const [viewPeriod, setViewPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const { t } = useLanguage();

  // Fetch pending reviews
  const pendingReviews = trpc.perfCalibration.feedback360.getMyPending.useQuery();
  const submitFeedback = trpc.perfCalibration.feedback360.submit.useMutation();

  // Questionnaire for active review
  const activeReview = (pendingReviews.data ?? []).find((r) => r.id === activeFeedback);
  const questionnaire = trpc.perfCalibration.feedback360.generateQuestionnaire.useQuery(
    { relationship: activeReview?.relationship ?? "peer" },
    { enabled: !!activeReview },
  );

  // Aggregated results
  const aggregated = trpc.perfCalibration.feedback360.getAggregated.useQuery(
    { employeeId: Number(viewEmployeeId), period: viewPeriod },
    { enabled: !!viewEmployeeId && viewEmployeeId !== "" },
  );

  const handleSubmit = async () => {
    if (!activeFeedback || !questionnaire.data) return;
    const questionnaireData = questionnaire.data.map((q) => ({
      questionId: q.id,
      text: q.text,
      score: answers[q.id] ?? 0,
      maxScore: q.maxScore,
    }));
    const total = questionnaireData.reduce((s, q) => s + q.score, 0);
    const maxTotal = questionnaireData.reduce((s, q) => s + q.maxScore, 0);
    const overallScore = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 50;

    try {
      await submitFeedback.mutateAsync({
        feedbackId: activeFeedback,
        questionnaire: questionnaireData,
        overallScore: String(overallScore),
        strengths: strengths || undefined,
        improvements: improvements || undefined,
      });
      setActiveFeedback(null);
      setAnswers({});
      setStrengths("");
      setImprovements("");
      pendingReviews.refetch();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold">360度反馈</h1>
        <p className="text-sm text-muted-foreground">完成待评审的反馈问卷，查看自己的综合反馈结果</p>
      </div>

      {/* ── Section 1: Pending Reviews ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" /> 我的待评任务
            {(pendingReviews.data ?? []).length > 0 && (
              <span className="bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded-full">
                {pendingReviews.data?.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(pendingReviews.data ?? []).length === 0 ? (
            <div className="text-center text-muted-foreground py-6">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-400" />
              暂无待评反馈任务
            </div>
          ) : (
            <div className="space-y-2">
              {(pendingReviews.data ?? []).map((r) => (
                <div
                  key={r.id}
                  className={`flex items-center justify-between p-3 rounded border cursor-pointer transition-colors ${
                    activeFeedback === r.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  }`}
                  onClick={() => {
                    setActiveFeedback(r.id);
                    setAnswers({});
                    setStrengths("");
                    setImprovements("");
                  }}
                >
                  <div>
                    <div className="font-medium">{r.targetEmployeeName ?? `员工 #${r.targetEmployeeId}`}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>关系: {r.relationship}</span>
                      <span>周期: {r.period}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-yellow-500" />
                    <span className="text-xs text-yellow-600">待评</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section 2: Questionnaire ── */}
      {activeFeedback && questionnaire.data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4" /> 评价问卷 — {activeReview?.targetEmployeeName ?? `#${activeReview?.targetEmployeeId}`}
              <span className="text-xs text-muted-foreground ml-2">({activeReview?.relationship})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {questionnaire.data.map((q) => (
              <div key={q.id} className="space-y-1">
                <div className="text-sm font-medium">{q.id}. {q.text}</div>
                <ScoreInput
                  value={answers[q.id] ?? 0}
                  onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
                  max={q.maxScore}
                />
              </div>
            ))}
            <div className="space-y-2 pt-2 border-t">
              <div>
                <label className="text-sm font-medium">优势与亮点</label>
                <textarea
                  className="w-full border rounded px-3 py-2 text-sm mt-1"
                  rows={2}
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  placeholder="请描述该同事的突出优势..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">改进建议</label>
                <textarea
                  className="w-full border rounded px-3 py-2 text-sm mt-1"
                  rows={2}
                  value={improvements}
                  onChange={(e) => setImprovements(e.target.value)}
                  placeholder="请提出改进建议..."
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={submitFeedback.isPending}>
                <Send className="h-3.5 w-3.5 mr-1" /> 提交反馈
              </Button>
              <Button variant="outline" onClick={() => setActiveFeedback(null)}>取消</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Section 3: My Results ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> 反馈结果查看
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <input
              className="border rounded px-3 py-1.5 text-sm w-32"
              placeholder="员工ID"
              value={viewEmployeeId}
              onChange={(e) => setViewEmployeeId(e.target.value)}
            />
            <input
              type="month"
              className="border rounded px-3 py-1.5 text-sm"
              value={viewPeriod}
              onChange={(e) => setViewPeriod(e.target.value)}
            />
          </div>

          {aggregated.data && aggregated.data.length > 0 ? (
            <div className="space-y-2">
              {aggregated.data.map((a, i) => {
                const pct = Math.min(100, a.avgScore);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-24 text-sm font-medium capitalize">{a.relationship}</div>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 relative">
                      <div
                        className="bg-primary h-full rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="w-20 text-sm text-right">
                      {a.avgScore} <span className="text-xs text-muted-foreground">({a.responseCount}人)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : viewEmployeeId ? (
            <div className="text-center text-muted-foreground py-4">暂无反馈数据</div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
