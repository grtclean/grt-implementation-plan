/**
 * InterpretationResults — Display structured AI analysis of KPIs
 *
 * Receives parsed analysis data from analyzeKPIs procedure.
 * Shows: score/grade, risks, category distribution, correlations, recommendations, benchmarks.
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertTriangle, CheckCircle2, XCircle, Info, TrendingUp,
  BarChart3, Link2, Lightbulb, ArrowRight, Shield,
} from 'lucide-react';

interface AnalysisResult {
  score: number;
  grade: string;
  totalKPIs: number;
  year: number;
  categoryDistribution: Array<{ category: string; count: number; percentage: number }>;
  missingCategories: string[];
  risks: Array<{ level: "high" | "medium" | "low"; message: string; kpiName?: string }>;
  correlations: Array<{ kpi1: string; kpi2: string; relationship: string }>;
  recommendations: string[];
  benchmarks: Array<{ metric: string; yourValue: number; industryAvg: number; status: string }>;
  analyzedAt: string;
}

interface InterpretationResultsProps {
  interpretation: any;
  onApprove: () => void;
}

const RISK_ICONS = { high: XCircle, medium: AlertTriangle, low: Info };
const RISK_COLORS = {
  high: "text-red-500 bg-red-500/10 border-red-500/20",
  medium: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
  low: "text-blue-500 bg-blue-500/10 border-blue-500/20",
};

const GRADE_COLORS: Record<string, string> = {
  A: "text-green-500 border-green-500",
  B: "text-blue-500 border-blue-500",
  C: "text-yellow-500 border-yellow-500",
  D: "text-orange-500 border-orange-500",
  F: "text-red-500 border-red-500",
};

export default function InterpretationResults({ interpretation, onApprove }: InterpretationResultsProps) {
  // Parse if string (from onSubmit JSON.stringify)
  let data: AnalysisResult | null = null;
  try {
    data = typeof interpretation === 'string' ? JSON.parse(interpretation) : interpretation;
  } catch {
    data = null;
  }

  if (!data || !data.score) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Analysis Results</CardTitle>
          <CardDescription>No analysis data yet — submit KPIs first</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Go to the "Data Input" tab, add KPIs, and click "Submit for AI Analysis".
          </p>
        </CardContent>
      </Card>
    );
  }

  const highRisks = data.risks.filter(r => r.level === "high");
  const mediumRisks = data.risks.filter(r => r.level === "medium");
  const lowRisks = data.risks.filter(r => r.level === "low");

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                KPI Quality Score — {data.year}
              </CardTitle>
              <CardDescription>
                {data.totalKPIs} KPIs analyzed at {new Date(data.analyzedAt).toLocaleString()}
              </CardDescription>
            </div>
            <div className={`text-4xl font-bold border-2 rounded-xl px-4 py-2 ${GRADE_COLORS[data.grade] ?? "text-gray-500 border-gray-500"}`}>
              {data.grade}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Overall Quality Score</span>
              <span className="font-bold">{data.score}/100</span>
            </div>
            <Progress value={data.score} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Risk Flags */}
      {data.risks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Risk Analysis
              <Badge variant="destructive" className="ml-2">{highRisks.length} High</Badge>
              <Badge variant="secondary">{mediumRisks.length} Medium</Badge>
              <Badge variant="outline">{lowRisks.length} Low</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.risks.map((risk, i) => {
              const Icon = RISK_ICONS[risk.level];
              return (
                <Alert key={i} className={RISK_COLORS[risk.level]}>
                  <Icon className="h-4 w-4" />
                  <AlertTitle className="capitalize">{risk.level} Risk</AlertTitle>
                  <AlertDescription>
                    {risk.message}
                    {risk.kpiName && (
                      <span className="block text-xs mt-1 opacity-70">
                        Affected: {risk.kpiName}
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Category Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Category Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.categoryDistribution.map((cat) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{cat.category}</span>
                  <span className="text-muted-foreground">{cat.count} KPI(s) — {cat.percentage}%</span>
                </div>
                <Progress value={cat.percentage} className="h-2" />
              </div>
            ))}
          </div>
          {data.missingCategories.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm">
              <span className="font-medium text-yellow-600">Missing categories:</span>{' '}
              {data.missingCategories.join(', ')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cross-KPI Correlations */}
      {data.correlations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              Cross-KPI Correlations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.correlations.map((corr, i) => (
              <div key={i} className="p-3 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium mb-1">
                  <Badge variant="outline">{corr.kpi1}</Badge>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <Badge variant="outline">{corr.kpi2}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{corr.relationship}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Benchmarks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Industry Benchmarks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.benchmarks.map((b) => (
              <div key={b.metric} className="p-3 border rounded-lg text-center">
                <div className="text-xs text-muted-foreground mb-1">{b.metric}</div>
                <div className="text-2xl font-bold">{b.yourValue}{typeof b.yourValue === 'number' && b.metric.includes('%') ? '%' : ''}</div>
                <div className="text-xs text-muted-foreground">
                  Industry avg: {b.industryAvg}{b.metric.includes('%') ? '%' : ''}
                </div>
                <Badge variant={b.status === "good" ? "default" : "secondary"} className="mt-1 text-xs">
                  {b.status === "good" ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                  {b.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              AI Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Approve button */}
      <div className="flex gap-4">
        <Button onClick={onApprove} className="flex-1" size="lg">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Approve & Proceed to Confirmation / 批准并进入确认流程
        </Button>
      </div>
    </div>
  );
}
