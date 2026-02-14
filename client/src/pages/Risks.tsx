import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { AlertTriangle, ShieldAlert, Users, Zap } from "lucide-react";

export default function Risks() {
  const { t } = useLanguage();

  return (
    <Layout>
      <div className="space-y-8">
        <PageHeader icon={ShieldAlert} title={t("risks.title")} description={t("risks.subtitle")} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Risk Strategies */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-l-4 border-l-primary bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading text-xl">
                  <ShieldAlert className="w-5 h-5 text-primary" />
                  {t("risks.core.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="bg-primary/10 border-primary/20 text-foreground">
                  <Zap className="h-4 w-4 text-primary" />
                  <AlertTitle className="text-primary font-bold">{t("risks.alert.agile")}</AlertTitle>
                  <AlertDescription className="text-muted-foreground text-sm mt-1">
                    严格执行“MVP范围冻结”原则。在16周内，非核心紧急需求一律放入需求池，待MVP上线后再评估。成立变更控制委员会（CCB），对任何范围变更进行评审。
                  </AlertDescription>
                </Alert>
                
                <Alert className="bg-background border-border">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <AlertTitle className="font-bold">{t("risks.alert.user")}</AlertTitle>
                  <AlertDescription className="text-muted-foreground text-sm mt-1">
                    在每个阶段末邀请核心业务部门的“超级用户”参与评审和试用，及时获取反馈。他们的认可是项目成功的关键。
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="text-lg font-heading font-bold text-muted-foreground uppercase tracking-wider">{t("risks.matrix.title")}</h3>
              <Accordion type="single" collapsible className="w-full">
                {[
                  {
                    risk: "需求变更频繁",
                    prob: "高",
                    impact: "中",
                    mitigation: "采用敏捷迭代模式，每2周一个Sprint；建立严格的变更审批流程（CCB）。"
                  },
                  {
                    risk: "数据质量差，迁移困难",
                    prob: "中",
                    impact: "高",
                    mitigation: "提前3周启动数据清洗；制定明确的数据标准；使用ETL工具进行自动化迁移与校验。"
                  },
                  {
                    risk: "一线用户抗拒使用",
                    prob: "中",
                    impact: "中",
                    mitigation: "选拔“关键用户”作为推广大使；提供充分的培训与操作手册；将系统使用情况纳入绩效激励。"
                  },
                  {
                    risk: "外部系统集成失败",
                    prob: "低",
                    impact: "高",
                    mitigation: "优先使用官方标准API/连接器；在正式集成前进行充分的POC验证；预留手动导入导出作为备选方案。"
                  }
                ].map((item, i) => (
                  <AccordionItem key={i} value={`item-${i}`} className="border-border bg-card px-4 rounded-sm mb-2">
                    <AccordionTrigger className="hover:no-underline hover:text-primary transition-colors">
                      <div className="flex items-center gap-4 text-left">
                        <AlertTriangle className={`w-4 h-4 ${item.prob === '高' ? 'text-destructive' : 'text-orange-400'}`} />
                        <span className="font-medium">{item.risk}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pl-8 border-t border-border/50 pt-4">
                      <div className="grid grid-cols-2 gap-4 mb-2 text-xs font-mono uppercase">
                        <div>概率: <span className={item.prob === '高' ? 'text-destructive' : 'text-foreground'}>{item.prob}</span></div>
                        <div>影响: <span className={item.impact === '高' ? 'text-destructive' : 'text-foreground'}>{item.impact}</span></div>
                      </div>
                      <p className="text-sm"><span className="font-bold text-primary">应对措施：</span>{item.mitigation}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <Card className="bg-secondary/20 border-border">
              <CardHeader>
                <CardTitle className="font-heading text-lg">{t("risks.framework.title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  <li className="relative pl-6 border-l-2 border-primary/30 pb-4 last:pb-0">
                    <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-primary"></div>
                    <h4 className="font-bold text-sm">Awareness (认知)</h4>
                    <p className="text-xs text-muted-foreground mt-1">沟通变革必要性，启动会宣讲</p>
                  </li>
                  <li className="relative pl-6 border-l-2 border-primary/30 pb-4 last:pb-0">
                    <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-primary/80"></div>
                    <h4 className="font-bold text-sm">Desire (意愿)</h4>
                    <p className="text-xs text-muted-foreground mt-1">激发参与热情，设立激励机制</p>
                  </li>
                  <li className="relative pl-6 border-l-2 border-primary/30 pb-4 last:pb-0">
                    <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-primary/60"></div>
                    <h4 className="font-bold text-sm">Knowledge (知识)</h4>
                    <p className="text-xs text-muted-foreground mt-1">全员培训，操作手册分发</p>
                  </li>
                  <li className="relative pl-6 border-l-2 border-primary/30 pb-4 last:pb-0">
                    <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-primary/40"></div>
                    <h4 className="font-bold text-sm">Ability (能力)</h4>
                    <p className="text-xs text-muted-foreground mt-1">辅导练习，沙箱环境演练</p>
                  </li>
                  <li className="relative pl-6 border-l-2 border-transparent">
                    <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-primary/20"></div>
                    <h4 className="font-bold text-sm">Reinforcement (巩固)</h4>
                    <p className="text-xs text-muted-foreground mt-1">持续反馈，优秀案例表彰</p>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
