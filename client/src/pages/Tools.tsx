import DemoModal from "@/components/DemoModal";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAnalytics } from "@/hooks/useAnalytics";
import { ArrowUpRight, Box, Database, Eye, Glasses, LayoutTemplate, Server } from "lucide-react";

export default function Tools() {
  const { t } = useLanguage();
  const { trackEvent } = useAnalytics();

  const toolCategories = [
    {
      id: "core",
      label: t("tools.cat.core"),
      icon: LayoutTemplate,
      tools: [
        {
          name: "简道云 (JianDaoYun)",
          type: "低代码平台",
          desc: "已选定。平台灵活，API和Webhook功能完善，是实现业务流程数字化的快速通道。",
          tags: ["Core", "Low-Code", "BPM"],
          recommended: true,
          icon: Box
        },
        {
          name: "PostgreSQL + MinIO",
          type: "数据库 & 存储",
          desc: "覆盖关系型数据和非结构化对象存储，架构设计合理，满足未来智能化需求。",
          tags: ["Database", "Storage"],
          recommended: true,
          icon: Database
        }
      ]
    },
    {
      id: "ai",
      label: t("tools.cat.ai"),
      icon: Server,
      tools: [
        {
          name: "Google Vertex AI",
          type: "AI Agent中间件",
          desc: "与Gemini无缝集成，提供企业级安全与无代码构建能力，适合快速部署。",
          tags: ["LLM", "Agent", "Enterprise"],
          recommended: true,
          icon: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663272963509/lCylndVdtNgHVVQT.png"
        },
        {
          name: "LangChain",
          type: "AI开发框架",
          desc: "灵活性高，成本低，但需要更强的开发能力来自主搭建和维护。",
          tags: ["Open Source", "Framework"],
          recommended: false,
          icon: Server
        }
      ]
    },
    {
      id: "iot",
      label: t("tools.cat.iot"),
      icon: Eye,
      tools: [
        {
          name: "清研讯科 (Tsingyan)",
          type: "UWB定位系统",
          desc: "性价比高，本地化服务响应快，在工业制造领域有成熟案例。推荐优先POC。",
          tags: ["UWB", "Location", "Domestic"],
          recommended: true,
          icon: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663272963509/tezXduWWUuJCVkcO.png"
        },
        {
          name: "海康威视 (Hikvision)",
          type: "CCD视觉检测",
          desc: "国产龙头，产品线丰富，性价比高，易于集成。",
          tags: ["Vision", "CCD", "Quality"],
          recommended: true,
          icon: Eye
        },
        {
          name: "RealWear",
          type: "AR智能眼镜",
          desc: "专为工业环境设计，全语音控制，解放双手，适合远程专家指导。",
          tags: ["AR", "Wearable", "Remote"],
          recommended: true,
          icon: Glasses
        }
      ]
    },
    {
      id: "data",
      label: t("tools.cat.data"),
      icon: Database,
      tools: [
        {
          name: "FineDataLink",
          type: "ETL数据迁移",
          desc: "国产工具，界面友好，可视化操作，支持多种数据源，适合快速配置。",
          tags: ["ETL", "Migration"],
          recommended: true,
          icon: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663272963509/QmSjPjLZiPuOxQnG.png"
        },
        {
          name: "帆软 FineReport",
          type: "商业智能 BI",
          desc: "专业BI工具，支持复杂报表和数据可视化，可作为后期管理驾驶舱升级。",
          tags: ["BI", "Reporting"],
          recommended: false,
          icon: Database
        }
      ]
    }
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <div className="border-b border-border pb-6">
          <h1 className="text-3xl font-heading font-bold tracking-tight text-foreground">{t("tools.title")}</h1>
          <p className="text-muted-foreground mt-2">{t("tools.subtitle")}</p>
        </div>

        <Tabs defaultValue="core" className="space-y-8">
          <TabsList className="bg-card border border-border p-1 h-auto flex-wrap justify-start gap-2">
            {toolCategories.map((cat) => (
              <TabsTrigger 
                key={cat.id} 
                value={cat.id}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 h-10"
              >
                <cat.icon className="w-4 h-4 mr-2" />
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {toolCategories.map((cat) => (
            <TabsContent key={cat.id} value={cat.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cat.tools.map((tool, index) => (
                  <Card key={index} className={`flex flex-col h-full transition-all duration-300 hover:-translate-y-1 ${tool.recommended ? 'border-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.1)]' : 'border-border opacity-80 hover:opacity-100'}`}>
                    <CardHeader>
                      <div className="flex justify-between items-start mb-2">
                        {typeof tool.icon === 'string' ? (
                          <img src={tool.icon} alt={tool.name} className="w-10 h-10 object-contain rounded-sm bg-background p-1 border border-border" />
                        ) : (
                          <div className="w-10 h-10 rounded-sm bg-secondary flex items-center justify-center text-primary border border-border">
                            <tool.icon className="w-6 h-6" />
                          </div>
                        )}
                        {tool.recommended && (
                          <Badge className="bg-primary text-primary-foreground hover:bg-primary border-none">Recommended</Badge>
                        )}
                      </div>
                      <CardTitle className="font-heading text-lg">{tool.name}</CardTitle>
                      <CardDescription className="font-mono text-xs uppercase tracking-wider text-primary/80">{tool.type}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <p className="text-sm text-muted-foreground leading-relaxed">{tool.desc}</p>
                    </CardContent>
                    <CardFooter className="flex flex-col items-start gap-4 pt-0">
                      <div className="flex flex-wrap gap-2">
                        {tool.tags.map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] px-2 py-0.5 h-5 border-border text-muted-foreground">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      {tool.name.includes("简道云") ? (
                        <DemoModal toolName={tool.name} type="jiandaoyun" />
                      ) : tool.name.includes("Agent") ? (
                        <DemoModal toolName={tool.name} type="agent" />
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-between text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 group"
                          onClick={() => trackEvent("tool_learn_more_click", { toolName: tool.name, category: cat.id })}
                        >
                          {t("tools.btn.more")} <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Layout>
  );
}
