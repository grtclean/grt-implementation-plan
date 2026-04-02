/**
 * KPI学习中心 (KPI Learning Center)
 *
 * 每个员工基于岗位自动推荐课程 + 最佳学习时间 + 进度追踪
 * 7大模块21门课程，覆盖全公司45个岗位
 */

import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen, Play, FileText, Wrench, Clock, Star,
  GraduationCap, Target, Users, Factory, Headphones,
  Crown, CheckCircle2, ChevronRight, Lightbulb, Calendar,
  TrendingUp, Award, Shield, Zap,
} from "lucide-react";

// 岗位→角色族映射（覆盖45个岗位）
const POSITION_ROLE_MAP: Record<string, string[]> = {
  // 销售族
  "高级销售经理": ["all", "bu_sales", "sales_director"],
  "市场主管": ["all", "bu_sales", "sales_director"],
  "销售与项目工程师": ["all", "bu_sales", "bu_pm"],
  "市场专员": ["all", "bu_sales"],
  // 工程族
  "机械研发工程师": ["all", "bu_mech", "engineer"],
  "助理机械研发工程师": ["all", "bu_mech", "engineer"],
  "机械设计经理": ["all", "bu_mech", "engineer", "dept_manager"],
  "电气工程师": ["all", "bu_elec", "engineer"],
  "助理电气工程师": ["all", "bu_elec", "engineer"],
  "电气主管": ["all", "bu_elec", "engineer", "dept_manager"],
  "IT工程师": ["all", "engineer"],
  "生产工程师兼项目经理": ["all", "bu_pm", "engineer", "project_manager"],
  // 项目管理
  "采购与项目工程师": ["all", "bu_pm", "procurement_eng"],
  // 财务族
  "会计": ["all", "finance_specialist"],
  "会计助理": ["all", "finance_specialist"],
  "财务": ["all", "finance_specialist"],
  // HR族
  "人事行政主管": ["all", "hr_manager"],
  "AI数智&人事行政部经理": ["all", "hr_manager", "director"],
  // 采购供应链
  "供应链工程师": ["all", "procurement_eng"],
  "供应链助理工程师": ["all", "procurement_eng"],
  "PMC专员": ["all", "procurement_eng"],
  "仓库管理员": ["all", "procurement_eng"],
  // 生产族
  "激光切作班组长": ["all", "team_lead", "production_worker"],
  "机械装配": ["all", "production_worker"],
  "激光": ["all", "production_worker"],
  "冷作": ["all", "production_worker"],
  "焊工": ["all", "production_worker"],
  "CNC操作工": ["all", "production_worker"],
  "数控车工": ["all", "production_worker"],
  "机加工铣工": ["all", "production_worker"],
  "机加工": ["all", "production_worker"],
  "装配班组长": ["all", "team_lead", "production_worker"],
  "电气班组班长": ["all", "team_lead", "production_worker"],
  "电气班组副班长": ["all", "team_lead", "production_worker"],
  // 质量族
  "制造质量经理": ["all", "quality_eng", "qc_manager", "dept_manager"],
  "质量专员": ["all", "quality_eng"],
  // 售后
  "售后技工": ["all", "cs_engineer"],
  // 管理层
  "董事长": ["all", "director", "bu_gm", "sales_director", "project_manager"],
  "运营总监": ["all", "director", "bu_gm"],
  "事业二部经理": ["all", "bu_gm", "dept_manager"],
  "董事长助理": ["all", "director"],
  // 行政
  "文员": ["all"],
  "行政前台": ["all"],
  "后勤助理": ["all"],
  "后勤": ["all"],
  "协作辅助": ["all"],
};

const MODULE_CONFIG = [
  { cat: "kpi_foundation", labelZh: "KPI基础", labelEn: "Foundation", icon: BookOpen, color: "#2563eb" },
  { cat: "kpi_sales", labelZh: "销售KPI", labelEn: "Sales", icon: TrendingUp, color: "#16a34a" },
  { cat: "kpi_engineering", labelZh: "工程师KPI", labelEn: "Engineering", icon: Wrench, color: "#9333ea" },
  { cat: "kpi_support", labelZh: "职能KPI", labelEn: "Support", icon: Shield, color: "#ea580c" },
  { cat: "kpi_production", labelZh: "生产KPI", labelEn: "Production", icon: Factory, color: "#0891b2" },
  { cat: "kpi_service", labelZh: "售后KPI", labelEn: "Service", icon: Headphones, color: "#dc2626" },
  { cat: "kpi_management", labelZh: "管理者KPI", labelEn: "Management", icon: Crown, color: "#7c3aed" },
];

const FORMAT_ICONS: Record<string, typeof Play> = { video: Play, document: FileText, practice: Wrench, quiz: Star };
const DIFF_COLORS: Record<string, string> = { beginner: "bg-green-100 text-green-700", intermediate: "bg-blue-100 text-blue-700", advanced: "bg-purple-100 text-purple-700", expert: "bg-red-100 text-red-700" };

// 最佳学习时间推荐
function getBestLearningTime(): { timeZh: string; timeEn: string; reasonZh: string; reasonEn: string } {
  const hour = new Date().getHours();
  const dow = new Date().getDay();
  if (dow === 0 || dow === 6) return { timeZh: "周末自主学习时间", timeEn: "Weekend self-study", reasonZh: "周末无会议干扰，适合深度学习进阶课程", reasonEn: "No meetings, ideal for deep learning" };
  if (hour < 9) return { timeZh: "上午 8:30-9:00 晨间学习", timeEn: "8:30-9:00 Morning", reasonZh: "开工前30分钟，大脑最清醒，适合基础概念课", reasonEn: "Brain freshest before work starts" };
  if (hour < 12) return { timeZh: "上午 10:30-11:00 间隙学习", timeEn: "10:30-11:00 Mid-morning", reasonZh: "上午工作间隙，适合15分钟短视频课程", reasonEn: "Work break, good for 15min videos" };
  if (hour < 14) return { timeZh: "午休 12:30-13:00 轻松学习", timeEn: "12:30-13:00 Lunch", reasonZh: "午休时间，适合浏览文档类课程", reasonEn: "Lunch break, good for document reading" };
  if (hour < 17) return { timeZh: "下午 15:00-15:30 实操练习", timeEn: "15:00-15:30 Afternoon", reasonZh: "下午精力回升，适合系统实操类课程", reasonEn: "Energy rebounds, good for practice" };
  return { timeZh: "下班前 17:00-17:30 总结学习", timeEn: "17:00-17:30 Wrap-up", reasonZh: "工作收尾时段，适合回顾管理类课程", reasonEn: "Wrap-up time, good for review" };
}

export default function KpiLearningCenter() {
  const { user } = useAuth();
  const { currentUserRole } = useUserProfile();
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [tab, setTab] = useState("recommended");

  // 获取所有课程
  const coursesQ = trpc.employeeGrowth.material.list.useQuery(undefined, { retry: false });
  const allCourses = ((coursesQ.data as any)?.items ?? coursesQ.data ?? []) as any[];

  // 基于岗位过滤推荐课程
  const myRoles = useMemo(() => {
    // Try to match by position name first
    for (const [pos, roles] of Object.entries(POSITION_ROLE_MAP)) {
      if (user?.position === pos || user?.name?.includes(pos)) return roles;
    }
    // Fallback to system role
    return ["all", currentUserRole || "employee"];
  }, [user, currentUserRole]);

  const recommendedCourses = useMemo(() => {
    return allCourses.filter((c: any) => {
      const targetRoles = c.target_roles || c.targetRoles || [];
      if (Array.isArray(targetRoles)) {
        return targetRoles.includes("all") || targetRoles.some((r: string) => myRoles.includes(r));
      }
      return true;
    });
  }, [allCourses, myRoles]);

  const bestTime = getBestLearningTime();
  const kpiCourses = allCourses.filter((c: any) => (c.category || "").startsWith("kpi_"));

  return (
    <div className="space-y-4 p-4 md:p-6 pb-20">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-primary" />
          {isZh ? "KPI学习中心" : "KPI Learning Center"}
        </h1>
        <p className="text-sm text-muted-foreground">{isZh ? "7大模块·21门课程·覆盖全岗位·智能推荐" : "7 modules · 21 courses · all positions · smart recommendations"}</p>
      </header>

      {/* 最佳学习时间推荐 */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">{isZh ? "推荐学习时间" : "Best Learning Time"}: {isZh ? bestTime.timeZh : bestTime.timeEn}</p>
            <p className="text-xs text-muted-foreground">{isZh ? bestTime.reasonZh : bestTime.reasonEn}</p>
          </div>
          <Badge variant="outline" className="text-[10px]">{recommendedCourses.length}{isZh ? "门推荐" : " for you"}</Badge>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="recommended" className="gap-1"><Lightbulb className="w-3.5 h-3.5" />{isZh ? "我的推荐" : "For You"}</TabsTrigger>
          <TabsTrigger value="all" className="gap-1"><BookOpen className="w-3.5 h-3.5" />{isZh ? "全部课程" : "All"}</TabsTrigger>
          <TabsTrigger value="path" className="gap-1"><Target className="w-3.5 h-3.5" />{isZh ? "学习路径" : "Path"}</TabsTrigger>
        </TabsList>

        {/* 我的推荐 */}
        <TabsContent value="recommended" className="mt-4 space-y-3">
          {/* 必修：基础5门 */}
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            {isZh ? "必修课程（全员）" : "Required (All Staff)"}
          </h3>
          {recommendedCourses.filter((c: any) => c.category === "kpi_foundation").map((c: any) => (
            <CourseCard key={c.id || c.code} course={c} isZh={isZh} />
          ))}

          {/* 岗位专属 */}
          <h3 className="text-sm font-semibold flex items-center gap-2 mt-4">
            <Zap className="w-4 h-4 text-blue-500" />
            {isZh ? "岗位专属课程" : "Role-Specific"}
          </h3>
          {recommendedCourses.filter((c: any) => c.category !== "kpi_foundation").map((c: any) => (
            <CourseCard key={c.id || c.code} course={c} isZh={isZh} />
          ))}

          {recommendedCourses.length === 0 && (
            <p className="text-center text-muted-foreground py-8">{isZh ? "暂无推荐课程" : "No courses yet"}</p>
          )}
        </TabsContent>

        {/* 全部课程 */}
        <TabsContent value="all" className="mt-4 space-y-4">
          {MODULE_CONFIG.map((mod) => {
            const modCourses = kpiCourses.filter((c: any) => c.category === mod.cat);
            if (modCourses.length === 0) return null;
            return (
              <div key={mod.cat}>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-2" style={{ color: mod.color }}>
                  <mod.icon className="w-4 h-4" />
                  {isZh ? mod.labelZh : mod.labelEn} ({modCourses.length})
                </h3>
                {modCourses.map((c: any) => <CourseCard key={c.id || c.code} course={c} isZh={isZh} />)}
              </div>
            );
          })}
        </TabsContent>

        {/* 学习路径 */}
        <TabsContent value="path" className="mt-4">
          <LearningPath isZh={isZh} role={currentUserRole} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CourseCard({ course, isZh }: { course: any; isZh: boolean }) {
  const FormatIcon = FORMAT_ICONS[course.format] || BookOpen;
  const diffClass = DIFF_COLORS[course.difficulty] || DIFF_COLORS.beginner;
  const tags = Array.isArray(course.tags) ? course.tags : [];

  return (
    <Card className="hover:shadow-md transition-shadow touch-feedback">
      <CardContent className="p-3 flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          <FormatIcon className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">{course.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{course.description || course.desc}</p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <Badge className={`text-[9px] ${diffClass}`}>{course.difficulty}</Badge>
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{course.duration_minutes || course.dur}{isZh ? "分钟" : "min"}</span>
            {tags.slice(0, 3).map((tag: string, i: number) => (
              <Badge key={i} variant="outline" className="text-[9px]">{tag}</Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LearningPath({ isZh, role }: { isZh: boolean; role: string }) {
  const stages = [
    { week: "Week 1-2", labelZh: "KPI认知", labelEn: "KPI Basics", courses: ["KPI-101", "KPI-102", "KPI-105"], icon: BookOpen, color: "#2563eb" },
    { week: "Week 3-4", labelZh: "系统实操", labelEn: "System Practice", courses: ["KPI-103", "KPI-104", "KPI-704"], icon: Wrench, color: "#16a34a" },
    { week: "Month 2", labelZh: "岗位专项", labelEn: "Role Specific", courses: ["KPI-2xx/3xx/4xx/5xx/6xx"], icon: Target, color: "#9333ea" },
    { week: "Month 3+", labelZh: "进阶管理", labelEn: "Advanced", courses: ["KPI-701", "KPI-702", "KPI-703"], icon: Crown, color: "#ea580c" },
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{isZh ? "建议学习路径 — 12周完成全部课程" : "Recommended 12-week learning path"}</p>
      {stages.map((s, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: s.color + "15", color: s.color }}>
              <s.icon className="w-4 h-4" />
            </div>
            {i < stages.length - 1 && <div className="w-0.5 h-8 bg-muted" />}
          </div>
          <div className="flex-1 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold" style={{ color: s.color }}>{s.week}</span>
              <span className="text-sm font-semibold">{isZh ? s.labelZh : s.labelEn}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{s.courses.join(" → ")}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
