import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import { DashboardWidget } from "@/components/dashboard/DashboardWidget";
import { Sparkles, TrendingUp, TrendingDown, Mail, FileText, Users } from "lucide-react";

interface DailyPerformance {
  date: string;
  score: number;
  feedback: string;
  metrics: {
    emailQuality: number;
    docQuality: number;
    meetingParticipation: number;
  };
}

interface PerformanceGeminiDashboardProps {
  authorized?: boolean;
  userPreferenceShow?: boolean;
}

const mockPerformance: DailyPerformance = {
  date: new Date().toISOString().split('T')[0],
  score: 87,
  feedback: '今日工作表现优秀！邮件沟通清晰专业，文档质量有所提升。建议增加会议参与度。',
  metrics: {
    emailQuality: 92,
    docQuality: 85,
    meetingParticipation: 78,
  },
};

const weeklyTrend = [75, 80, 82, 85, 87];

export default function PerformanceGeminiDashboard({ 
  authorized = true, 
  userPreferenceShow = true 
}: PerformanceGeminiDashboardProps) {
  const { language } = useLanguage();
  const trend = mockPerformance.score - weeklyTrend[weeklyTrend.length - 2];
  const isPositive = trend >= 0;

  return (
    <DashboardWidget
      title={language === 'zh' ? 'Gemini 绩效评估' : 'Gemini Performance'}
      authorized={authorized}
      userPreferenceShow={userPreferenceShow}
      icon={<Sparkles className="w-5 h-5" />}
      headerExtra={
        <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs">
          AI Powered
        </Badge>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-white">{mockPerformance.score}</p>
            <p className="text-xs text-muted-foreground">{language === 'zh' ? '今日得分' : "Today's Score"}</p>
          </div>
          <div className={`flex items-center gap-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="text-sm font-medium">{isPositive ? '+' : ''}{trend.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">{language === 'zh' ? '本周趋势' : 'Weekly'}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs flex-1 text-slate-300">{language === 'zh' ? '邮件质量' : 'Email Quality'}</span>
            <span className="text-xs font-medium text-white">{mockPerformance.metrics.emailQuality}%</span>
          </div>
          <Progress value={mockPerformance.metrics.emailQuality} className="h-1.5" />

          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs flex-1 text-slate-300">{language === 'zh' ? '文档质量' : 'Doc Quality'}</span>
            <span className="text-xs font-medium text-white">{mockPerformance.metrics.docQuality}%</span>
          </div>
          <Progress value={mockPerformance.metrics.docQuality} className="h-1.5" />

          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs flex-1 text-slate-300">{language === 'zh' ? '会议参与' : 'Meeting'}</span>
            <span className="text-xs font-medium text-white">{mockPerformance.metrics.meetingParticipation}%</span>
          </div>
          <Progress value={mockPerformance.metrics.meetingParticipation} className="h-1.5" />
        </div>

        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-xs text-primary flex items-start gap-1">
            <Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0" />
            {mockPerformance.feedback}
          </p>
        </div>

        {/* Gemini Branding */}
        <div className="text-[10px] text-purple-400 flex justify-end">
          Powered by Gemini Pro
        </div>
      </div>
    </DashboardWidget>
  );
}
