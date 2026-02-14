import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/grt";
import Layout from "@/components/Layout";
import {
  Target,
  Loader2,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Users,
  Award,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  RefreshCw
} from "lucide-react";

interface KPIMetric {
  id: string;
  name: string;
  category: string;
  current: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  status: 'excellent' | 'good' | 'warning' | 'critical';
  aiInsight?: string;
}

interface TeamPerformance {
  team: string;
  score: number;
  members: number;
  topPerformer: string;
  improvement: number;
}

export default function AIKPIAssistant() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [period, setPeriod] = useState('month');
  const [department, setDepartment] = useState('all');
  const [metrics, setMetrics] = useState<KPIMetric[]>([]);
  const [teams, setTeams] = useState<TeamPerformance[]>([]);

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      'title': { zh: 'AI KPI 助手', en: 'AI KPI Assistant', de: 'KI-KPI-Assistent', fr: 'Assistant KPI IA' },
      'description': { zh: '智能分析绩效指标，提供改进建议', en: 'Intelligently analyze performance metrics and provide improvement suggestions', de: 'Intelligente Analyse von Leistungskennzahlen', fr: 'Analyse intelligente des indicateurs de performance' },
      'period': { zh: '时间周期', en: 'Period', de: 'Zeitraum', fr: 'Période' },
      'department': { zh: '部门', en: 'Department', de: 'Abteilung', fr: 'Département' },
      'analyze': { zh: '分析KPI', en: 'Analyze KPI', de: 'KPI analysieren', fr: 'Analyser KPI' },
      'analyzing': { zh: '正在分析...', en: 'Analyzing...', de: 'Analysiere...', fr: 'Analyse en cours...' },
      'overview': { zh: '总览', en: 'Overview', de: 'Übersicht', fr: 'Aperçu' },
      'teamPerformance': { zh: '团队绩效', en: 'Team Performance', de: 'Teamleistung', fr: 'Performance équipe' },
      'insights': { zh: 'AI洞察', en: 'AI Insights', de: 'KI-Einblicke', fr: 'Insights IA' },
      'current': { zh: '当前', en: 'Current', de: 'Aktuell', fr: 'Actuel' },
      'target': { zh: '目标', en: 'Target', de: 'Ziel', fr: 'Objectif' },
      'trend': { zh: '趋势', en: 'Trend', de: 'Trend', fr: 'Tendance' },
      'week': { zh: '本周', en: 'This Week', de: 'Diese Woche', fr: 'Cette semaine' },
      'month': { zh: '本月', en: 'This Month', de: 'Dieser Monat', fr: 'Ce mois' },
      'quarter': { zh: '本季度', en: 'This Quarter', de: 'Dieses Quartal', fr: 'Ce trimestre' },
      'year': { zh: '本年', en: 'This Year', de: 'Dieses Jahr', fr: 'Cette année' },
      'all': { zh: '全部门', en: 'All Departments', de: 'Alle Abteilungen', fr: 'Tous les départements' },
      'sales': { zh: '销售部', en: 'Sales', de: 'Vertrieb', fr: 'Ventes' },
      'engineering': { zh: '工程部', en: 'Engineering', de: 'Technik', fr: 'Ingénierie' },
      'production': { zh: '生产部', en: 'Production', de: 'Produktion', fr: 'Production' },
      'quality': { zh: '质量部', en: 'Quality', de: 'Qualität', fr: 'Qualité' },
      'excellent': { zh: '优秀', en: 'Excellent', de: 'Ausgezeichnet', fr: 'Excellent' },
      'good': { zh: '良好', en: 'Good', de: 'Gut', fr: 'Bon' },
      'warning': { zh: '警告', en: 'Warning', de: 'Warnung', fr: 'Avertissement' },
      'critical': { zh: '危险', en: 'Critical', de: 'Kritisch', fr: 'Critique' },
      'topPerformer': { zh: '最佳员工', en: 'Top Performer', de: 'Beste Leistung', fr: 'Meilleur performeur' },
      'improvement': { zh: '较上期', en: 'vs Last Period', de: 'vs. Vorperiode', fr: 'vs Période précédente' },
    };
    return translations[key]?.[language] || translations[key]?.['en'] || key;
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock KPI metrics
      setMetrics([
        { id: '1', name: '项目交付准时率', category: '项目管理', current: 92, target: 95, unit: '%', trend: 'up', status: 'good', aiInsight: '近3个月持续改善，建议关注M5采购环节' },
        { id: '2', name: '客户满意度', category: '客户服务', current: 4.6, target: 4.5, unit: '分', trend: 'up', status: 'excellent' },
        { id: '3', name: '设备一次合格率', category: '质量', current: 88, target: 92, unit: '%', trend: 'down', status: 'warning', aiInsight: '电气调试环节问题较多，建议加强培训' },
        { id: '4', name: '人均产值', category: '效率', current: 125, target: 120, unit: '万元', trend: 'up', status: 'excellent' },
        { id: '5', name: '安全事故率', category: '安全', current: 0, target: 0, unit: '次', trend: 'stable', status: 'excellent' },
        { id: '6', name: '员工流失率', category: '人力资源', current: 8, target: 5, unit: '%', trend: 'up', status: 'critical', aiInsight: '技术岗位流失较高，建议优化薪酬结构' },
      ]);

      setTeams([
        { team: '销售一部', score: 95, members: 8, topPerformer: '张明', improvement: 12 },
        { team: '机械设计组', score: 88, members: 12, topPerformer: '李华', improvement: 5 },
        { team: '电气设计组', score: 82, members: 8, topPerformer: '王强', improvement: -3 },
        { team: '装配车间', score: 90, members: 25, topPerformer: '刘伟', improvement: 8 },
        { team: '质量部', score: 85, members: 6, topPerformer: '陈静', improvement: 2 },
      ]);

      toast({
        title: language === 'zh' ? '分析完成' : 'Analysis Complete',
        description: language === 'zh' ? '已分析6个KPI指标' : '6 KPI metrics analyzed',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Analysis failed',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const statusColors: Record<string, string> = {
    excellent: 'bg-green-500/20 text-green-500',
    good: 'bg-blue-500/20 text-blue-500',
    warning: 'bg-yellow-500/20 text-yellow-500',
    critical: 'bg-red-500/20 text-red-500',
  };

  const getProgressColor = (current: number, target: number, isLowerBetter: boolean = false) => {
    const ratio = current / target;
    if (isLowerBetter) {
      if (ratio <= 1) return 'bg-green-500';
      if (ratio <= 1.2) return 'bg-yellow-500';
      return 'bg-red-500';
    }
    if (ratio >= 1) return 'bg-green-500';
    if (ratio >= 0.9) return 'bg-blue-500';
    if (ratio >= 0.8) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Layout>
    <div className="space-y-6">
      <PageHeader
        icon={Target}
        title={t('title')}
        description={t('description')}
      />

      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t('period')}:</span>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">{t('week')}</SelectItem>
                  <SelectItem value="month">{t('month')}</SelectItem>
                  <SelectItem value="quarter">{t('quarter')}</SelectItem>
                  <SelectItem value="year">{t('year')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t('department')}:</span>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all')}</SelectItem>
                  <SelectItem value="sales">{t('sales')}</SelectItem>
                  <SelectItem value="engineering">{t('engineering')}</SelectItem>
                  <SelectItem value="production">{t('production')}</SelectItem>
                  <SelectItem value="quality">{t('quality')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleAnalyze} disabled={isAnalyzing}>
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('analyzing')}
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t('analyze')}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {metrics.length > 0 && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              {t('overview')}
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {t('teamPerformance')}
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              {t('insights')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {metrics.map((metric) => (
                <Card key={metric.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm text-muted-foreground">{metric.category}</p>
                        <h3 className="font-medium">{metric.name}</h3>
                      </div>
                      <Badge className={statusColors[metric.status]}>{t(metric.status)}</Badge>
                    </div>
                    
                    <div className="flex items-end gap-2 mb-2">
                      <span className="text-3xl font-bold">{metric.current}</span>
                      <span className="text-sm text-muted-foreground mb-1">{metric.unit}</span>
                      <span className="flex items-center gap-1 text-sm ml-auto">
                        {metric.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
                        {metric.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{t('target')}: {metric.target}{metric.unit}</span>
                        <span>{Math.round((metric.current / metric.target) * 100)}%</span>
                      </div>
                      <Progress 
                        value={Math.min((metric.current / metric.target) * 100, 100)} 
                        className="h-2"
                      />
                    </div>

                    {metric.aiInsight && (
                      <div className="flex items-start gap-1 mt-3 text-xs text-primary">
                        <Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>{metric.aiInsight}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="teams" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teams.map((team) => (
                <Card key={team.team}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium">{team.team}</h3>
                        <p className="text-sm text-muted-foreground">{team.members} {language === 'zh' ? '人' : 'members'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{team.score}</p>
                        <p className={`text-xs ${team.improvement >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {team.improvement >= 0 ? '+' : ''}{team.improvement}% {t('improvement')}
                        </p>
                      </div>
                    </div>
                    
                    <Progress value={team.score} className="h-2 mb-3" />
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Award className="w-4 h-4 text-yellow-500" />
                      <span className="text-muted-foreground">{t('topPerformer')}:</span>
                      <span className="font-medium">{team.topPerformer}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  {language === 'zh' ? 'AI绩效洞察' : 'AI Performance Insights'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {metrics.filter(m => m.aiInsight).map((metric) => (
                  <div key={metric.id} className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                    <div className="flex items-start gap-3">
                      {metric.status === 'critical' || metric.status === 'warning' ? (
                        <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                      )}
                      <div>
                        <p className="font-medium">{metric.name}</p>
                        <p className="text-sm text-muted-foreground mt-1">{metric.aiInsight}</p>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="p-4 rounded-lg border bg-muted/50">
                  <h4 className="font-medium mb-2">{language === 'zh' ? '整体建议' : 'Overall Recommendations'}</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                      {language === 'zh' ? '客户满意度和人均产值表现优秀，继续保持' : 'Customer satisfaction and productivity are excellent, keep it up'}
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
                      {language === 'zh' ? '员工流失率需要重点关注，建议进行薪酬调研' : 'Employee turnover needs attention, recommend salary survey'}
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
                      {language === 'zh' ? '设备一次合格率下降，建议加强电气调试培训' : 'First-pass yield declining, recommend electrical commissioning training'}
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
    </Layout>
  );
}
