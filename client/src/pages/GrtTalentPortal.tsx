/**
 * GRT人才门户 (Talent Portal)
 *
 * 面向外部候选人+内部培训的公司介绍平台：
 *  ① 公司介绍 — GRT使命·产品·全球布局·发展路线
 *  ② 薪资树   — 按岗位族展示薪资范围+技能等级+优秀/良好标杆
 *  ③ 岗位地图 — 10大岗位族·67个岗位·职业发展路径
 *  ④ 文化价值 — 企业文化·管理理念·员工故事
 *  ⑤ 自学习   — KPI培训课程(面试前自学)·GRT System介绍
 */

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2, DollarSign, MapPin, Heart, BookOpen,
  Globe, Factory, Users, Award, TrendingUp, Star,
  ChevronRight, Sparkles, Shield, Rocket, Target,
  Wrench, Headphones, Crown, Calculator,
} from "lucide-react";

// ═══ 薪资树数据（源自202602薪资稿V4 + 岗位族分析）═══
const SALARY_TREE = [
  {
    family: "管理层", familyEn: "Management", icon: Crown, color: "#7c3aed",
    levels: [
      { level: "L11-L12", title: "总监/VP", range: "20,000-35,000", bonus: "6个月", benchmark: "倪微薇·杨勇" },
      { level: "L9-L10", title: "高级经理", range: "15,000-25,000", bonus: "6个月", benchmark: "曹二·金晓锋" },
      { level: "L8", title: "经理", range: "11,000-17,000", bonus: "4个月", benchmark: "洪香龙·朱品珍" },
    ],
  },
  {
    family: "销售族", familyEn: "Sales & Marketing", icon: TrendingUp, color: "#16a34a",
    levels: [
      { level: "L8-L10", title: "高级销售经理/总监", range: "15,000-25,000", bonus: "6个月", benchmark: "戴晓燕·刘坤" },
      { level: "L5-L7", title: "销售工程师", range: "8,000-15,000", bonus: "4个月", benchmark: "项目提成另计" },
      { level: "L3-L4", title: "市场专员/助理", range: "5,000-8,000", bonus: "2个月", benchmark: "朱文韬·李柯瑶" },
    ],
  },
  {
    family: "工程师族", familyEn: "Engineering", icon: Wrench, color: "#2563eb",
    levels: [
      { level: "L8-L10", title: "主任/高级工程师", range: "13,000-22,000", bonus: "4个月", benchmark: "李大鹏·孙坚" },
      { level: "L5-L7", title: "工程师", range: "8,000-13,000", bonus: "3个月", benchmark: "技能补贴按等级" },
      { level: "L3-L4", title: "助理工程师", range: "5,500-8,000", bonus: "2个月", benchmark: "陈加丽·王爱云" },
    ],
  },
  {
    family: "财务族", familyEn: "Finance", icon: Calculator, color: "#ea580c",
    levels: [
      { level: "L8+", title: "财务经理/总监", range: "15,000-35,000", bonus: "3个月", benchmark: "黄晓兰·倪微薇" },
      { level: "L5-L7", title: "会计/财务专员", range: "8,000-12,000", bonus: "3个月", benchmark: "王秀萍·王汝月" },
      { level: "L3-L4", title: "会计助理/出纳", range: "5,500-8,000", bonus: "2个月", benchmark: "" },
    ],
  },
  {
    family: "生产族", familyEn: "Production", icon: Factory, color: "#0891b2",
    levels: [
      { level: "L5-L7", title: "班组长/生产主管", range: "8,000-13,000", bonus: "2个月", benchmark: "带班津贴+夜班" },
      { level: "L3-L4", title: "技术工(中级)", range: "6,000-9,000", bonus: "2个月", benchmark: "CNC/焊工/激光" },
      { level: "L1-L2", title: "操作工(初级)", range: "4,500-6,500", bonus: "1.5个月", benchmark: "装配/冷作" },
    ],
  },
  {
    family: "售后族", familyEn: "After-Sales", icon: Headphones, color: "#dc2626",
    levels: [
      { level: "L6-L8", title: "售后主管/经理", range: "10,000-16,000", bonus: "3个月", benchmark: "海外出差补贴" },
      { level: "L3-L5", title: "售后工程师/技工", range: "7,000-12,000", bonus: "3个月", benchmark: "匡凯旋·余浩" },
    ],
  },
];

// ═══ 公司文化价值 ═══
const CULTURE_VALUES = [
  { icon: Target, titleZh: "使命", titleEn: "Mission", contentZh: "以超精密清洗技术赋能全球制造业，让每一个零部件都达到最高洁净标准", contentEn: "Empower global manufacturing with ultra-precision cleaning" },
  { icon: Globe, titleZh: "愿景", titleEn: "Vision", contentZh: "2030年成为全球工业清洗设备领导者，中国40%·北美20%·欧洲40%", contentEn: "Global leader by 2030: CN40% · NA20% · EU40%" },
  { icon: Star, titleZh: "价值观", titleEn: "Values", contentZh: "客户为先 · 技术创新 · 团队协作 · 持续改进 · 全球视野", contentEn: "Customer First · Innovation · Teamwork · Kaizen · Global Mindset" },
  { icon: Shield, titleZh: "质量承诺", titleEn: "Quality", contentZh: "IATF 16949体系·FAT一次通过率>95%·DPPM<500·零缺陷交付", contentEn: "IATF 16949 · FAT FPY>95% · DPPM<500" },
  { icon: Sparkles, titleZh: "创新基因", titleEn: "Innovation", contentZh: "GRT System数字化平台·AI Copilot·IoT设备监控·数字孪生", contentEn: "GRT System · AI Copilot · IoT · Digital Twin" },
  { icon: Heart, titleZh: "人才理念", titleEn: "Talent", contentZh: "每个员工都有导师(赋能引擎)·三条发展路线(职业灯塔)·能力可见(TSDCKL)", contentEn: "Mentor for all · 3 career paths · Visible growth" },
];

export default function GrtTalentPortal() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [tab, setTab] = useState("company");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-8 md:p-12 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-3">
          {isZh ? "加入 GRT · 共创未来" : "Join GRT · Shape the Future"}
        </h1>
        <p className="text-lg opacity-90 max-w-2xl mx-auto">
          {isZh
            ? "全球工业清洗设备领导者 · 96名精英 · 5大事业部 · 覆盖中美欧"
            : "Global Industrial Cleaning Leader · 96 Experts · 5 BUs · CN/NA/EU"}
        </p>
        <div className="flex justify-center gap-4 mt-6">
          <Badge className="bg-white/20 text-white border-white/30 text-sm px-3 py-1">🏭 {isZh ? "工业清洗设备" : "Industrial Cleaning"}</Badge>
          <Badge className="bg-white/20 text-white border-white/30 text-sm px-3 py-1">🌍 {isZh ? "中美欧三地" : "CN/NA/EU"}</Badge>
          <Badge className="bg-white/20 text-white border-white/30 text-sm px-3 py-1">📈 {isZh ? "2030年目标3-5亿" : "¥300-500M by 2030"}</Badge>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto gap-1 justify-center">
            <TabsTrigger value="company" className="gap-1"><Building2 className="w-3.5 h-3.5" />{isZh ? "公司介绍" : "About"}</TabsTrigger>
            <TabsTrigger value="salary" className="gap-1"><DollarSign className="w-3.5 h-3.5" />{isZh ? "薪资树" : "Salary Tree"}</TabsTrigger>
            <TabsTrigger value="roles" className="gap-1"><MapPin className="w-3.5 h-3.5" />{isZh ? "岗位地图" : "Roles"}</TabsTrigger>
            <TabsTrigger value="culture" className="gap-1"><Heart className="w-3.5 h-3.5" />{isZh ? "文化价值" : "Culture"}</TabsTrigger>
            <TabsTrigger value="learn" className="gap-1"><BookOpen className="w-3.5 h-3.5" />{isZh ? "自学习" : "Learn"}</TabsTrigger>
          </TabsList>

          <TabsContent value="company"><CompanyTab isZh={isZh} /></TabsContent>
          <TabsContent value="salary"><SalaryTreeTab isZh={isZh} /></TabsContent>
          <TabsContent value="roles"><RolesTab isZh={isZh} /></TabsContent>
          <TabsContent value="culture"><CultureTab isZh={isZh} /></TabsContent>
          <TabsContent value="learn"><LearnTab isZh={isZh} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function CompanyTab({ isZh }: { isZh: boolean }) {
  const stats = [
    { labelZh: "成立时间", labelEn: "Founded", value: "2015" },
    { labelZh: "员工人数", labelEn: "Team", value: "96+" },
    { labelZh: "事业部", labelEn: "BUs", value: "5" },
    { labelZh: "客户覆盖", labelEn: "Clients", value: isZh ? "中美欧" : "CN/NA/EU" },
    { labelZh: "主要产品", labelEn: "Product", value: isZh ? "超声清洗线" : "Ultrasonic Cleaning" },
    { labelZh: "年营收目标", labelEn: "Revenue", value: "1.5-5" + (isZh ? "亿" : "00M") },
  ];

  return (
    <div className="mt-4 space-y-6">
      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-bold mb-4">{isZh ? "杰瑞德自动化科技有限公司" : "GRT Automation Technology Co., Ltd."}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isZh
              ? "GRT专注于工业超精密清洗设备的研发、制造与全球交付。服务于汽车动力总成（齿轴/缸体）、铝压铸、新能源、半导体等行业的全球领先企业，包括博世、伊顿、采埃孚、美利信、比亚迪、宁德时代等。公司总部位于无锡，在北美和欧洲设有服务网络，致力于2030年成为全球工业清洗设备领导者。"
              : "GRT specializes in R&D, manufacturing and global delivery of industrial ultra-precision cleaning equipment. Serving global leaders in powertrain, die casting, new energy and semiconductor industries including Bosch, Eaton, ZF, Meilixin, BYD, CATL. Headquartered in Wuxi with NA/EU service network."}
          </p>
        </CardContent>
      </Card>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {stats.map((s, i) => (
          <Card key={i}><CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-primary">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{isZh ? s.labelZh : s.labelEn}</p>
          </CardContent></Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-2">{isZh ? "行业客户" : "Key Clients"}</h3>
          <div className="flex flex-wrap gap-2">
            {["Bosch", "Eaton", "ZF", isZh ? "美利信" : "Meilixin", isZh ? "比亚迪" : "BYD", "CATL", isZh ? "伊洛美克" : "Ilmac", isZh ? "宁德时代" : "CATL"].map((c, i) => (
              <Badge key={i} variant="outline" className="px-3 py-1">{c}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SalaryTreeTab({ isZh }: { isZh: boolean }) {
  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-muted-foreground text-center">{isZh ? "按岗位族展示薪资范围（月薪·含绩效·不含加班）" : "Monthly salary by role family (base+performance, excl. overtime)"}</p>
      {SALARY_TREE.map((fam) => (
        <Card key={fam.family}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2" style={{ color: fam.color }}>
              <fam.icon className="w-5 h-5" />
              {isZh ? fam.family : fam.familyEn}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {fam.levels.map((lv, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded hover:bg-muted/30">
                  <Badge variant="outline" className="text-[10px] w-16 justify-center">{lv.level}</Badge>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{lv.title}</p>
                    {lv.benchmark && <p className="text-[10px] text-muted-foreground">{lv.benchmark}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: fam.color }}>¥{lv.range}</p>
                    <p className="text-[10px] text-muted-foreground">{isZh ? "奖金" : "Bonus"}: {lv.bonus}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
      <p className="text-[10px] text-muted-foreground text-center">
        {isZh ? "* 薪资范围仅供参考，实际薪酬根据经验、能力和面试表现确定。绩效工资按ABCD档位发放。" : "* Ranges are indicative. Actual compensation based on experience and interview."}
      </p>
    </div>
  );
}

function RolesTab({ isZh }: { isZh: boolean }) {
  const families = [
    { name: isZh ? "工程师族(46人)" : "Engineering(46)", path: isZh ? "助理→工程师→高级→主任→技术总监" : "Jr→Eng→Sr→Principal→CTO", positions: isZh ? "机械研发·电气·IT·助理工程师" : "Mech/Elec/IT/Asst" },
    { name: isZh ? "生产族(14人)" : "Production(14)", path: isZh ? "操作工→技术工→班组长→生产主管" : "Operator→Tech→Lead→Supervisor", positions: isZh ? "装配·焊工·激光·CNC·数控" : "Assembly/Weld/Laser/CNC" },
    { name: isZh ? "销售族(9人)" : "Sales(9)", path: isZh ? "助理→销售工程师→经理→总监→VP" : "Asst→SE→Mgr→Dir→VP", positions: isZh ? "销售经理·市场主管·销售工程师" : "Sales Mgr/Marketing/SE" },
    { name: isZh ? "财务族(9人)" : "Finance(9)", path: isZh ? "助理→专员→经理→总监→CFO" : "Asst→Spec→Mgr→Dir→CFO", positions: isZh ? "会计·仓管·采购·供应链" : "Acctg/WH/Procurement" },
    { name: isZh ? "售后族(4人)" : "Service(4)", path: isZh ? "技工→工程师→主管→总监" : "Tech→Eng→Mgr→Dir", positions: isZh ? "售后技工·售后主管" : "Field Tech/Service Mgr" },
    { name: isZh ? "HR行政族(4人)" : "HR(4)", path: isZh ? "专员→主管→经理→总监" : "Spec→Supv→Mgr→Dir", positions: isZh ? "人事主管·前台·后勤" : "HR/Admin/Logistics" },
  ];

  return (
    <div className="mt-4 space-y-3">
      {families.map((f, i) => (
        <Card key={i}><CardContent className="p-4">
          <p className="font-semibold text-sm">{f.name}</p>
          <p className="text-xs font-mono text-primary mt-1">{f.path}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{f.positions}</p>
        </CardContent></Card>
      ))}
    </div>
  );
}

function CultureTab({ isZh }: { isZh: boolean }) {
  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CULTURE_VALUES.map((v, i) => (
          <Card key={i}><CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <v.icon className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-sm">{isZh ? v.titleZh : v.titleEn}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{isZh ? v.contentZh : v.contentEn}</p>
          </CardContent></Card>
        ))}
      </div>
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6 text-center">
          <Rocket className="w-8 h-8 mx-auto text-primary mb-2" />
          <h3 className="font-bold text-lg">{isZh ? "GRT独特优势" : "Why GRT?"}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs">
            <div className="p-2 rounded bg-background"><strong>{isZh ? "🎯 每日导师" : "🎯 Daily Mentor"}</strong><br/>{isZh ? "赋能引擎每天为你赋能" : "Empowerment Engine daily"}</div>
            <div className="p-2 rounded bg-background"><strong>{isZh ? "🧭 职业灯塔" : "🧭 Career Path"}</strong><br/>{isZh ? "3条路线·清晰方向" : "3 routes · clear direction"}</div>
            <div className="p-2 rounded bg-background"><strong>{isZh ? "📊 能力可见" : "📊 Visible Growth"}</strong><br/>{isZh ? "TSDCKL 6维雷达" : "TSDCKL 6D radar"}</div>
            <div className="p-2 rounded bg-background"><strong>{isZh ? "🌍 全球机会" : "🌍 Global Opp"}</strong><br/>{isZh ? "北美·欧洲项目参与" : "NA/EU project exposure"}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LearnTab({ isZh }: { isZh: boolean }) {
  const resources = [
    { titleZh: "KPI学习中心 — 面试前必看", titleEn: "KPI Learning (Pre-interview)", path: "/kpi-learning", desc: isZh ? "21门课程·了解GRT绩效体系" : "21 courses · GRT performance system" },
    { titleZh: "GRT 2026-2030发展路线", titleEn: "GRT 2026-2030 Roadmap", path: "/career-lighthouse", desc: isZh ? "3条路线·了解公司方向与你的机会" : "3 scenarios · your opportunities" },
    { titleZh: "GRT System功能总览", titleEn: "GRT System Overview", path: "/", desc: isZh ? "400+页面·数字化工作平台体验" : "400+ pages · digital workplace" },
    { titleZh: "岗位能力模型 (TSDCKL)", titleEn: "TSDCKL Capability Model", path: "/kpi-learning", desc: isZh ? "技术·软技能·设计·沟通·知识·领导力" : "Tech·Soft·Design·Comm·Knowledge·Leadership" },
  ];

  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm text-muted-foreground text-center">{isZh ? "面试候选人可提前了解以下内容，展示你对GRT的理解" : "Pre-interview resources to demonstrate your understanding of GRT"}</p>
      {resources.map((r, i) => (
        <Card key={i} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold">{isZh ? r.titleZh : r.titleEn}</p>
              <p className="text-xs text-muted-foreground">{r.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
