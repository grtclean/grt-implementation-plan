import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/LanguageContext";
import { CheckCircle2, Circle, Flag, Rocket } from "lucide-react";

export default function Roadmap() {
  const { t } = useLanguage();

  const phases = [
    {
      id: 1,
      title: t("roadmap.phase1.title"),
      period: "Week 1-4",
      status: "pending",
      goal: t("roadmap.phase1.goal"),
      tasks: [
        { week: "W1", name: "项目启动与环境配置", output: "项目章程、简道云环境、企微集成" },
        { week: "W2", name: "核心主数据表单设计", output: "客户/项目/BOM主数据表 V1.0" },
        { week: "W3", name: "历史数据清洗与迁移", output: "清洗标准、ETL迁移脚本" },
        { week: "W4", name: "数据导入与验证", output: "主数据上线、校验报告" },
      ]
    },
    {
      id: 2,
      title: t("roadmap.phase2.title"),
      period: "Week 5-8",
      status: "pending",
      goal: t("roadmap.phase2.goal"),
      tasks: [
        { week: "W5", name: "CRM销售漏斗搭建", output: "销售漏斗、BANT评分模型" },
        { week: "W6", name: "项目立项审批 (M0)", output: "M0审批流、可行性评估表" },
        { week: "W7", name: "方案与设计评审 (M1-M2)", output: "Gate1/Gate2评审流程" },
        { week: "W8", name: "试运行与培训", output: "用户培训、问题反馈清单" },
      ]
    },
    {
      id: 3,
      title: t("roadmap.phase3.title"),
      period: "Week 9-12",
      status: "pending",
      goal: t("roadmap.phase3.goal"),
      tasks: [
        { week: "W9", name: "里程碑与任务管理", output: "里程碑表单、任务分发系统" },
        { week: "W10", name: "工时填报与统计", output: "工时记录表、统计仪表盘" },
        { week: "W11", name: "采购申请与BOM管理", output: "采购流程、MBOM管理" },
        { week: "W12", name: "项目看板与报表", output: "项目总览看板、成本报表" },
      ]
    },
    {
      id: 4,
      title: t("roadmap.phase4.title"),
      period: "Week 13-16",
      status: "pending",
      goal: t("roadmap.phase4.goal"),
      tasks: [
        { week: "W13", name: "AI中间件与API联调", output: "AI Agent中间件 V1.0" },
        { week: "W14", name: "销售助手Agent MVP", output: "自动评分、跟进提醒Bot" },
        { week: "W15", name: "UWB定位工时采集试点", output: "1-2个工位UWB部署测试" },
        { week: "W16", name: "MVP复盘与规划", output: "MVP总结报告、下阶段计划" },
      ]
    }
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
          <div>
            <h1 className="text-3xl font-heading font-bold tracking-tight text-foreground">{t("roadmap.title")}</h1>
            <p className="text-muted-foreground mt-2">{t("roadmap.subtitle")}</p>
          </div>
          <Badge variant="outline" className="px-4 py-1.5 text-sm font-mono border-primary text-primary bg-primary/5">
            {t("roadmap.duration")}
          </Badge>
        </div>

        <div className="relative">
          {/* Timeline Background Image */}
          <div className="absolute inset-0 bg-[url('https://files.manuscdn.com/user_upload_by_module/session_file/310519663272963509/oFamDiwqYyBGpnTw.jpg')] bg-cover bg-center opacity-10 rounded-lg pointer-events-none"></div>
          
          <div className="relative grid grid-cols-1 gap-8">
            {phases.map((phase, index) => (
              <div key={phase.id} className="relative pl-8 md:pl-0">
                {/* Connector Line (Desktop) */}
                <div className="hidden md:block absolute left-[23px] top-14 bottom-[-32px] w-0.5 bg-border last:hidden"></div>
                
                <Card className="bg-card/80 backdrop-blur-sm border-border hover:border-primary/50 transition-all duration-300">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-sm bg-secondary border border-border text-primary font-heading font-bold text-xl shadow-sm">
                          0{phase.id}
                        </div>
                        <div>
                          <CardTitle className="text-xl font-heading tracking-wide">{phase.title}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="font-mono text-xs rounded-sm">{phase.period}</Badge>
                            <span className="text-xs text-muted-foreground hidden md:inline-block">|</span>
                            <span className="text-xs text-muted-foreground font-medium">{phase.goal}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {index === 3 ? <Rocket className="w-5 h-5 text-primary" /> : <Flag className="w-5 h-5 text-muted-foreground" />}
                      </div>
                    </div>
                  </CardHeader>
                  <Separator className="bg-border/50" />
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {phase.tasks.map((task, i) => (
                        <div key={i} className="bg-background/50 border border-border/50 p-3 rounded-sm hover:bg-background hover:border-primary/30 transition-colors group">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-mono text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded-sm">{task.week}</span>
                            <Circle className="w-3 h-3 text-muted-foreground group-hover:text-primary group-hover:fill-primary transition-colors" />
                          </div>
                          <h4 className="font-medium text-sm mb-1 group-hover:text-primary transition-colors">{task.name}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2">{task.output}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
