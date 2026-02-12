import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, 
  CheckCircle2, 
  Shield, 
  Zap, 
  Globe, 
  Award,
  Factory,
  Droplets,
  Cog,
  BarChart3,
  Users,
  Clock
} from "lucide-react";
import { Link } from "wouter";

// SEO优化的公开首页 - 面向客户AI和搜索引擎
export default function PublicHome() {
  return (
    <div className="min-h-screen bg-background">
      {/* SEO Header with structured data */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Droplets className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-lg">GRT智能系统</h1>
              <p className="text-xs text-muted-foreground">Industrial Cleaning Solutions</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/capabilities" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              能力展示
            </Link>
            <Link href="/solutions" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              解决方案
            </Link>
            <Link href="/case-studies" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              案例展示
            </Link>
            <Link href="/verify" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              资质验证
            </Link>
            <Link href="/">
              <Button variant="outline" size="sm">客户登录</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section - SEO optimized */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10"></div>
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <Badge variant="secondary" className="mb-4">
              <Shield className="w-3 h-3 mr-1" />
              VDA 19.1 认证 | ISO 9001:2015
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-heading font-bold tracking-tight">
              工业零部件清洗
              <span className="text-primary block mt-2">智能解决方案</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              专注汽车、航空航天、精密制造领域的清洁度解决方案。
              通过AI驱动的工艺优化和零知识证明技术，确保您的清洁度合规性可验证、可追溯。
            </p>
            
            <div className="flex flex-wrap gap-4 justify-center pt-4">
              <Link href="/capabilities">
                <Button size="lg" className="h-12 px-8">
                  探索能力 <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link href="/verify">
                <Button variant="outline" size="lg" className="h-12 px-8">
                  验证资质
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Key Metrics - Public Stats */}
      <section className="py-16 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: "15+", label: "年行业经验", icon: Clock },
              { value: "500+", label: "成功项目", icon: Factory },
              { value: "98%", label: "客户满意度", icon: Users },
              { value: "ISO/VDA", label: "国际认证", icon: Award },
            ].map((stat, i) => (
              <Card key={i} className="text-center bg-background/50">
                <CardContent className="pt-6">
                  <stat.icon className="w-8 h-8 mx-auto mb-3 text-primary" />
                  <div className="text-3xl font-bold font-heading">{stat.value}</div>
                  <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Core Capabilities - SEO structured */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-heading font-bold mb-4">核心能力</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              从方案设计到交付验收，提供全生命周期的清洁度解决方案
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Cog,
                title: "智能方案设计",
                titleEn: "AI-Powered Solution Design",
                description: "基于VDA 19.1标准，AI辅助分析零部件特性，推荐最优清洗工艺方案",
                features: ["清洁度等级分析", "工艺参数优化", "设备选型建议"]
              },
              {
                icon: Factory,
                title: "设备制造交付",
                titleEn: "Equipment Manufacturing",
                description: "从设计到制造、调试、验收的全流程管理，确保设备性能达标",
                features: ["M0-M12阶段管控", "FAT/SAT验收", "远程监控支持"]
              },
              {
                icon: BarChart3,
                title: "合规性验证",
                titleEn: "Compliance Verification",
                description: "通过零知识证明技术，验证清洁度合规性而不暴露核心工艺参数",
                features: ["ZKP验证接口", "区块链存证", "第三方审计支持"]
              }
            ].map((capability, i) => (
              <Card key={i} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <capability.icon className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-xl">{capability.title}</CardTitle>
                  <CardDescription className="text-xs font-mono">{capability.titleEn}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{capability.description}</p>
                  <ul className="space-y-2">
                    {capability.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Industry Solutions */}
      <section className="py-20 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-heading font-bold mb-4">行业解决方案</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              深耕多个工业领域，提供符合各行业标准的专业清洁度解决方案
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { 
                title: "汽车制造", 
                titleEn: "Automotive",
                standard: "VDA 19.1 / ISO 16232",
                description: "发动机、变速箱、制动系统零部件清洗"
              },
              { 
                title: "航空航天", 
                titleEn: "Aerospace",
                standard: "AS9100 / NADCAP",
                description: "航空发动机、液压系统精密清洗"
              },
              { 
                title: "医疗器械", 
                titleEn: "Medical Devices",
                standard: "ISO 13485",
                description: "植入物、手术器械超声波清洗"
              },
              { 
                title: "精密电子", 
                titleEn: "Electronics",
                standard: "IPC / JEDEC",
                description: "PCB、半导体元件清洗"
              }
            ].map((industry, i) => (
              <Card key={i} className="bg-background hover:border-primary/50 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{industry.title}</CardTitle>
                  <CardDescription className="text-xs font-mono">{industry.titleEn}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline" className="mb-3 text-xs">{industry.standard}</Badge>
                  <p className="text-sm text-muted-foreground">{industry.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* AI-AI Integration Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="secondary" className="mb-4">
                <Zap className="w-3 h-3 mr-1" />
                AI-AI 智能对接
              </Badge>
              <h2 className="text-3xl font-heading font-bold mb-4">
                与您的AI系统无缝对接
              </h2>
              <p className="text-muted-foreground mb-6">
                GRT智能系统支持与客户AI系统的直接对接，通过标准化API接口，
                实现需求分析、方案推荐、报价生成的自动化流程。
              </p>
              <ul className="space-y-3">
                {[
                  "RESTful API / GraphQL 接口",
                  "零知识证明验证接口",
                  "实时项目状态查询",
                  "自动化报价生成"
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link href="/api-docs">
                  <Button variant="outline">
                    查看API文档 <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="bg-card rounded-lg p-6 border border-border">
              <div className="font-mono text-sm">
                <div className="text-muted-foreground mb-2">// 示例：验证清洁度合规性</div>
                <pre className="text-xs overflow-x-auto">
{`POST /api/zkp/verify
{
  "requestType": "vda_19_1_compliance",
  "targetEntityType": "project",
  "claimType": "cleanliness_level_meets_standard",
  "claimParameters": {
    "standardCode": "CCC-A",
    "projectCode": "PRJ-2026-001"
  }
}

// Response
{
  "isVerified": true,
  "confidenceLevel": 98.5,
  "proofHash": "0x7f3a...",
  "publicSummary": {
    "result": "COMPLIANT",
    "standardReference": "VDA 19.1:2015"
  }
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-heading font-bold mb-4">
            开始您的清洁度解决方案之旅
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            无论您是寻求新项目咨询，还是需要验证现有供应商的资质，
            我们都能为您提供专业支持
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/contact">
              <Button size="lg" className="h-12 px-8">
                <Globe className="mr-2 w-4 h-4" />
                联系我们
              </Button>
            </Link>
            <Link href="/verify">
              <Button variant="outline" size="lg" className="h-12 px-8">
                <Shield className="mr-2 w-4 h-4" />
                验证资质
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer with SEO links */}
      <footer className="py-12 bg-card border-t border-border">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Droplets className="w-6 h-6 text-primary" />
                <span className="font-heading font-bold">GRT智能系统</span>
              </div>
              <p className="text-sm text-muted-foreground">
                专业工业清洗设备制造商，致力于提供智能化清洁度解决方案
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">产品与服务</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/capabilities" className="hover:text-foreground">能力展示</Link></li>
                <li><Link href="/solutions" className="hover:text-foreground">解决方案</Link></li>
                <li><Link href="/case-studies" className="hover:text-foreground">案例展示</Link></li>
                <li><Link href="/equipment" className="hover:text-foreground">设备产品</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">技术支持</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/api-docs" className="hover:text-foreground">API文档</Link></li>
                <li><Link href="/verify" className="hover:text-foreground">资质验证</Link></li>
                <li><Link href="/standards" className="hover:text-foreground">标准规范</Link></li>
                <li><Link href="/faq" className="hover:text-foreground">常见问题</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">联系方式</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>邮箱: info@grt-cleaning.com</li>
                <li>电话: +86 xxx-xxxx-xxxx</li>
                <li>地址: 中国上海</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>© 2026 GRT智能系统. All rights reserved.</p>
            <p className="mt-2">
              <Link href="/privacy" className="hover:text-foreground">隐私政策</Link>
              {" | "}
              <Link href="/terms" className="hover:text-foreground">服务条款</Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
