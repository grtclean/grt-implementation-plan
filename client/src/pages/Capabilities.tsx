import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowRight, 
  CheckCircle2, 
  Shield, 
  Zap, 
  Award,
  Factory,
  Droplets,
  Cog,
  BarChart3,
  FileCheck,
  Microscope,
  Gauge,
  Workflow,
  Brain,
  Lock
} from "lucide-react";
import { Link } from "wouter";

// 能力介绍页面 - SEO优化
export default function Capabilities() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/public" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Droplets className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-lg">GRT智能系统</h1>
              <p className="text-xs text-muted-foreground">Industrial Cleaning Solutions</p>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/public" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              首页
            </Link>
            <Link href="/capabilities" className="text-sm text-foreground font-medium">
              能力展示
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

      {/* Hero */}
      <section className="py-16 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="mb-4">
              <Award className="w-3 h-3 mr-1" />
              核心能力展示
            </Badge>
            <h1 className="text-4xl font-heading font-bold mb-4">
              专业清洁度解决方案能力
            </h1>
            <p className="text-lg text-muted-foreground">
              从工艺设计到设备制造、从质量验证到智能运维，
              全方位展示GRT在工业清洗领域的核心竞争力
            </p>
          </div>
        </div>
      </section>

      {/* Capability Tabs */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <Tabs defaultValue="technology" className="space-y-8">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto gap-2">
              <TabsTrigger value="technology" className="py-3">
                <Cog className="w-4 h-4 mr-2" />
                清洗技术
              </TabsTrigger>
              <TabsTrigger value="quality" className="py-3">
                <FileCheck className="w-4 h-4 mr-2" />
                质量保证
              </TabsTrigger>
              <TabsTrigger value="equipment" className="py-3">
                <Factory className="w-4 h-4 mr-2" />
                设备制造
              </TabsTrigger>
              <TabsTrigger value="ai" className="py-3">
                <Brain className="w-4 h-4 mr-2" />
                AI能力
              </TabsTrigger>
              <TabsTrigger value="verification" className="py-3">
                <Shield className="w-4 h-4 mr-2" />
                合规验证
              </TabsTrigger>
            </TabsList>

            {/* 清洗技术 */}
            <TabsContent value="technology" className="space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                <Card>
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                      <Droplets className="w-6 h-6 text-blue-500" />
                    </div>
                    <CardTitle>水基清洗技术</CardTitle>
                    <CardDescription>Aqueous Cleaning Technology</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      采用环保水基清洗剂，结合喷淋、浸泡、超声波等工艺，
                      满足VDA 19.1各等级清洁度要求
                    </p>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">技术特点</h4>
                      <ul className="space-y-1">
                        {[
                          "多级过滤系统，确保清洗液洁净度",
                          "温度精确控制 ±2°C",
                          "清洗剂浓度在线监测",
                          "节能环保，废水可处理回用"
                        ].map((item, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                      <Microscope className="w-6 h-6 text-purple-500" />
                    </div>
                    <CardTitle>超声波清洗技术</CardTitle>
                    <CardDescription>Ultrasonic Cleaning Technology</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      多频超声波技术，针对复杂几何形状零部件，
                      实现盲孔、深孔、微小缝隙的有效清洗
                    </p>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">技术参数</h4>
                      <ul className="space-y-1">
                        {[
                          "频率范围: 25kHz - 130kHz 可选",
                          "功率密度: 10-50W/L 可调",
                          "多频切换，避免驻波死角",
                          "脉冲/连续模式可选"
                        ].map((item, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center mb-4">
                      <Gauge className="w-6 h-6 text-orange-500" />
                    </div>
                    <CardTitle>高压喷淋技术</CardTitle>
                    <CardDescription>High-Pressure Spray Technology</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      高压定向喷淋，针对油污、切屑等顽固污染物，
                      实现高效去除
                    </p>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">技术参数</h4>
                      <ul className="space-y-1">
                        {[
                          "压力范围: 3-150 bar 可调",
                          "流量: 10-500 L/min",
                          "喷嘴角度: 15°-90° 可选",
                          "旋转喷淋臂，360°覆盖"
                        ].map((item, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4">
                      <Workflow className="w-6 h-6 text-cyan-500" />
                    </div>
                    <CardTitle>真空干燥技术</CardTitle>
                    <CardDescription>Vacuum Drying Technology</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      低温真空干燥，避免热变形，确保零部件表面无水渍残留
                    </p>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">技术参数</h4>
                      <ul className="space-y-1">
                        {[
                          "真空度: 10-100 mbar",
                          "干燥温度: 40-80°C 可调",
                          "干燥时间: 根据工件自动调节",
                          "无水渍、无氧化"
                        ].map((item, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* 质量保证 */}
            <TabsContent value="quality" className="space-y-8">
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    title: "VDA 19.1 认证",
                    description: "德国汽车工业协会清洁度标准认证",
                    details: [
                      "颗粒物计数分析",
                      "重量法测定",
                      "显微镜分析",
                      "萃取液分析"
                    ]
                  },
                  {
                    title: "ISO 16232 认证",
                    description: "国际标准化组织清洁度标准",
                    details: [
                      "零部件清洁度规范",
                      "测试方法标准化",
                      "报告格式统一",
                      "可追溯性要求"
                    ]
                  },
                  {
                    title: "ISO 9001:2015",
                    description: "质量管理体系认证",
                    details: [
                      "过程控制",
                      "持续改进",
                      "客户满意度",
                      "风险管理"
                    ]
                  }
                ].map((cert, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Award className="w-8 h-8 text-primary mb-2" />
                      <CardTitle>{cert.title}</CardTitle>
                      <CardDescription>{cert.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {cert.details.map((detail, j) => (
                          <li key={j} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>清洁度等级能力</CardTitle>
                  <CardDescription>可实现的VDA 19.1清洁度等级范围</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">清洁度等级</th>
                          <th className="text-left py-3 px-4">颗粒尺寸限制</th>
                          <th className="text-left py-3 px-4">典型应用</th>
                          <th className="text-left py-3 px-4">能力状态</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { level: "CCC-A", size: "≤100μm", app: "发动机核心部件", status: "已验证" },
                          { level: "CCC-B", size: "≤200μm", app: "变速箱部件", status: "已验证" },
                          { level: "CCC-C", size: "≤400μm", app: "制动系统", status: "已验证" },
                          { level: "CCC-D", size: "≤600μm", app: "底盘部件", status: "已验证" },
                        ].map((row, i) => (
                          <tr key={i} className="border-b">
                            <td className="py-3 px-4 font-mono">{row.level}</td>
                            <td className="py-3 px-4">{row.size}</td>
                            <td className="py-3 px-4">{row.app}</td>
                            <td className="py-3 px-4">
                              <Badge variant="outline" className="bg-green-500/10 text-green-600">
                                {row.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 设备制造 */}
            <TabsContent value="equipment" className="space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                <Card>
                  <CardHeader>
                    <CardTitle>设备类型</CardTitle>
                    <CardDescription>可提供的清洗设备产品线</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {[
                        { name: "通过式清洗机", desc: "适用于大批量连续生产" },
                        { name: "转台式清洗机", desc: "适用于中批量多品种" },
                        { name: "机器人清洗单元", desc: "适用于柔性生产线" },
                        { name: "超声波清洗线", desc: "适用于精密零部件" },
                        { name: "真空清洗干燥机", desc: "适用于高洁净度要求" },
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                          <Factory className="w-5 h-5 text-primary mt-0.5" />
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-muted-foreground">{item.desc}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>项目管理能力</CardTitle>
                    <CardDescription>M0-M12全生命周期管理</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { phase: "M0-M2", name: "需求分析与方案设计", duration: "2-4周" },
                        { phase: "M3-M4", name: "详细设计与评审", duration: "3-6周" },
                        { phase: "M5-M8", name: "制造与装配", duration: "8-16周" },
                        { phase: "M9-M10", name: "调试与FAT", duration: "2-4周" },
                        { phase: "M11-M12", name: "发运与SAT", duration: "2-4周" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <Badge variant="outline" className="w-20 justify-center">{item.phase}</Badge>
                          <div className="flex-1">
                            <div className="font-medium text-sm">{item.name}</div>
                            <div className="text-xs text-muted-foreground">{item.duration}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* AI能力 */}
            <TabsContent value="ai" className="space-y-8">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  {
                    icon: Brain,
                    title: "AI方案推荐",
                    description: "基于历史项目数据和客户需求，智能推荐最优清洗方案",
                    features: ["需求智能分析", "方案自动生成", "成本预估"]
                  },
                  {
                    icon: BarChart3,
                    title: "工艺参数优化",
                    description: "通过机器学习持续优化清洗工艺参数",
                    features: ["参数自适应调整", "能耗优化", "质量预测"]
                  },
                  {
                    icon: Zap,
                    title: "智能报价",
                    description: "AI辅助快速生成准确报价",
                    features: ["成本自动计算", "利润分析", "竞争力评估"]
                  },
                  {
                    icon: FileCheck,
                    title: "质量预测",
                    description: "基于过程数据预测清洁度结果",
                    features: ["实时监控", "异常预警", "趋势分析"]
                  },
                  {
                    icon: Workflow,
                    title: "生产排程",
                    description: "智能优化生产计划和资源分配",
                    features: ["产能优化", "交期预测", "瓶颈识别"]
                  },
                  {
                    icon: Shield,
                    title: "合规检查",
                    description: "自动检查项目是否符合各项标准要求",
                    features: ["标准匹配", "差距分析", "改进建议"]
                  }
                ].map((item, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                        <item.icon className="w-5 h-5 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {item.features.map((f, j) => (
                          <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="w-3 h-3 text-primary" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* 合规验证 */}
            <TabsContent value="verification" className="space-y-8">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Lock className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>零知识证明验证</CardTitle>
                      <CardDescription>Zero-Knowledge Proof Verification</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-muted-foreground">
                    通过零知识证明技术，客户可以验证GRT的能力和项目合规性，
                    而无需暴露核心工艺参数和商业机密。
                  </p>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-semibold">可验证内容</h4>
                      <ul className="space-y-2">
                        {[
                          "清洁度等级达标证明",
                          "工艺参数合规性",
                          "设备能力验证",
                          "质量体系认证状态"
                        ].map((item, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-semibold">保护内容</h4>
                      <ul className="space-y-2">
                        {[
                          "具体工艺参数值",
                          "化学配方细节",
                          "设备核心技术",
                          "成本结构信息"
                        ].map((item, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <Shield className="w-4 h-4 text-primary" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Link href="/verify">
                      <Button>
                        开始验证 <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-heading font-bold mb-4">
            需要了解更多？
          </h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            我们的技术团队随时准备为您提供专业咨询
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/contact">
              <Button size="lg">联系我们</Button>
            </Link>
            <Link href="/public">
              <Button variant="outline" size="lg">返回首页</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
