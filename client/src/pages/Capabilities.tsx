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
import { useLanguage } from "@/contexts/LanguageContext";

// 能力介绍页面 - SEO优化
export default function Capabilities() {
  const { t } = useLanguage();
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
              <h1 className="font-heading font-bold text-lg">{t("hr.capability.systemTitle")}</h1>
              <p className="text-xs text-muted-foreground">{t("hr.capability.systemSubtitle")}</p>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/public" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t("hr.capability.navHome")}
            </Link>
            <Link href="/capabilities" className="text-sm text-foreground font-medium">
              {t("hr.capability.navCapabilities")}
            </Link>
            <Link href="/certificate-verify" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t("hr.capability.navCertVerify")}
            </Link>
            <Link href="/">
              <Button variant="outline" size="sm">{t("hr.capability.navLogin")}</Button>
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
              {t("hr.capability.heroBadge")}
            </Badge>
            <h1 className="text-4xl font-heading font-bold mb-4">
              {t("hr.capability.heroTitle")}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t("hr.capability.heroDesc")}
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
                {t("hr.capability.tabTechnology")}
              </TabsTrigger>
              <TabsTrigger value="quality" className="py-3">
                <FileCheck className="w-4 h-4 mr-2" />
                {t("hr.capability.tabQuality")}
              </TabsTrigger>
              <TabsTrigger value="equipment" className="py-3">
                <Factory className="w-4 h-4 mr-2" />
                {t("hr.capability.tabEquipment")}
              </TabsTrigger>
              <TabsTrigger value="ai" className="py-3">
                <Brain className="w-4 h-4 mr-2" />
                {t("hr.capability.tabAI")}
              </TabsTrigger>
              <TabsTrigger value="verification" className="py-3">
                <Shield className="w-4 h-4 mr-2" />
                {t("hr.capability.tabVerification")}
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
                    <CardTitle>{t("hr.capability.aqueousTitle")}</CardTitle>
                    <CardDescription>{t("hr.capability.aqueousSubtitle")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      {t("hr.capability.aqueousDesc")}
                    </p>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">{t("hr.capability.techFeatures")}</h4>
                      <ul className="space-y-1">
                        {[
                          t("hr.capability.aqueousFeat1"),
                          t("hr.capability.aqueousFeat2"),
                          t("hr.capability.aqueousFeat3"),
                          t("hr.capability.aqueousFeat4"),
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
                    <CardTitle>{t("hr.capability.ultrasonicTitle")}</CardTitle>
                    <CardDescription>{t("hr.capability.ultrasonicSubtitle")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      {t("hr.capability.ultrasonicDesc")}
                    </p>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">{t("hr.capability.techParams")}</h4>
                      <ul className="space-y-1">
                        {[
                          t("hr.capability.ultrasonicParam1"),
                          t("hr.capability.ultrasonicParam2"),
                          t("hr.capability.ultrasonicParam3"),
                          t("hr.capability.ultrasonicParam4"),
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
                    <CardTitle>{t("hr.capability.sprayTitle")}</CardTitle>
                    <CardDescription>{t("hr.capability.spraySubtitle")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      {t("hr.capability.sprayDesc")}
                    </p>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">{t("hr.capability.techParams")}</h4>
                      <ul className="space-y-1">
                        {[
                          t("hr.capability.sprayParam1"),
                          t("hr.capability.sprayParam2"),
                          t("hr.capability.sprayParam3"),
                          t("hr.capability.sprayParam4"),
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
                    <CardTitle>{t("hr.capability.vacuumTitle")}</CardTitle>
                    <CardDescription>{t("hr.capability.vacuumSubtitle")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      {t("hr.capability.vacuumDesc")}
                    </p>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">{t("hr.capability.techParams")}</h4>
                      <ul className="space-y-1">
                        {[
                          t("hr.capability.vacuumParam1"),
                          t("hr.capability.vacuumParam2"),
                          t("hr.capability.vacuumParam3"),
                          t("hr.capability.vacuumParam4"),
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
                    title: t("hr.capability.vda19Title"),
                    description: t("hr.capability.vda19Desc"),
                    details: [
                      t("hr.capability.vda19Detail1"),
                      t("hr.capability.vda19Detail2"),
                      t("hr.capability.vda19Detail3"),
                      t("hr.capability.vda19Detail4"),
                    ]
                  },
                  {
                    title: t("hr.capability.iso16232Title"),
                    description: t("hr.capability.iso16232Desc"),
                    details: [
                      t("hr.capability.iso16232Detail1"),
                      t("hr.capability.iso16232Detail2"),
                      t("hr.capability.iso16232Detail3"),
                      t("hr.capability.iso16232Detail4"),
                    ]
                  },
                  {
                    title: t("hr.capability.iso9001Title"),
                    description: t("hr.capability.iso9001Desc"),
                    details: [
                      t("hr.capability.iso9001Detail1"),
                      t("hr.capability.iso9001Detail2"),
                      t("hr.capability.iso9001Detail3"),
                      t("hr.capability.iso9001Detail4"),
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
                  <CardTitle>{t("hr.capability.cleanLevelTitle")}</CardTitle>
                  <CardDescription>{t("hr.capability.cleanLevelDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">{t("hr.capability.colLevel")}</th>
                          <th className="text-left py-3 px-4">{t("hr.capability.colParticleSize")}</th>
                          <th className="text-left py-3 px-4">{t("hr.capability.colTypicalApp")}</th>
                          <th className="text-left py-3 px-4">{t("hr.capability.colStatus")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { level: "CCC-A", size: "≤100μm", app: t("hr.capability.appEngine"), status: t("hr.capability.verified") },
                          { level: "CCC-B", size: "≤200μm", app: t("hr.capability.appTransmission"), status: t("hr.capability.verified") },
                          { level: "CCC-C", size: "≤400μm", app: t("hr.capability.appBrake"), status: t("hr.capability.verified") },
                          { level: "CCC-D", size: "≤600μm", app: t("hr.capability.appChassis"), status: t("hr.capability.verified") },
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
                    <CardTitle>{t("hr.capability.equipTypeTitle")}</CardTitle>
                    <CardDescription>{t("hr.capability.equipTypeDesc")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {[
                        { name: t("hr.capability.equipPassThrough"), desc: t("hr.capability.equipPassThroughDesc") },
                        { name: t("hr.capability.equipRotary"), desc: t("hr.capability.equipRotaryDesc") },
                        { name: t("hr.capability.equipRobot"), desc: t("hr.capability.equipRobotDesc") },
                        { name: t("hr.capability.equipUltrasonic"), desc: t("hr.capability.equipUltrasonicDesc") },
                        { name: t("hr.capability.equipVacuum"), desc: t("hr.capability.equipVacuumDesc") },
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
                    <CardTitle>{t("hr.capability.projMgmtTitle")}</CardTitle>
                    <CardDescription>{t("hr.capability.projMgmtDesc")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { phase: "M0-M2", name: t("hr.capability.phaseReqDesign"), duration: "2-4周" },
                        { phase: "M3-M4", name: t("hr.capability.phaseDetailDesign"), duration: "3-6周" },
                        { phase: "M5-M8", name: t("hr.capability.phaseMfg"), duration: "8-16周" },
                        { phase: "M9-M10", name: t("hr.capability.phaseFAT"), duration: "2-4周" },
                        { phase: "M11-M12", name: t("hr.capability.phaseSAT"), duration: "2-4周" },
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
                    title: t("hr.capability.aiRecommendTitle"),
                    description: t("hr.capability.aiRecommendDesc"),
                    features: [t("hr.capability.aiRecommendFeat1"), t("hr.capability.aiRecommendFeat2"), t("hr.capability.aiRecommendFeat3")]
                  },
                  {
                    icon: BarChart3,
                    title: t("hr.capability.aiParamOptTitle"),
                    description: t("hr.capability.aiParamOptDesc"),
                    features: [t("hr.capability.aiParamOptFeat1"), t("hr.capability.aiParamOptFeat2"), t("hr.capability.aiParamOptFeat3")]
                  },
                  {
                    icon: Zap,
                    title: t("hr.capability.aiQuoteTitle"),
                    description: t("hr.capability.aiQuoteDesc"),
                    features: [t("hr.capability.aiQuoteFeat1"), t("hr.capability.aiQuoteFeat2"), t("hr.capability.aiQuoteFeat3")]
                  },
                  {
                    icon: FileCheck,
                    title: t("hr.capability.aiQualityTitle"),
                    description: t("hr.capability.aiQualityDesc"),
                    features: [t("hr.capability.aiQualityFeat1"), t("hr.capability.aiQualityFeat2"), t("hr.capability.aiQualityFeat3")]
                  },
                  {
                    icon: Workflow,
                    title: t("hr.capability.aiScheduleTitle"),
                    description: t("hr.capability.aiScheduleDesc"),
                    features: [t("hr.capability.aiScheduleFeat1"), t("hr.capability.aiScheduleFeat2"), t("hr.capability.aiScheduleFeat3")]
                  },
                  {
                    icon: Shield,
                    title: t("hr.capability.aiComplianceTitle"),
                    description: t("hr.capability.aiComplianceDesc"),
                    features: [t("hr.capability.aiComplianceFeat1"), t("hr.capability.aiComplianceFeat2"), t("hr.capability.aiComplianceFeat3")]
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
                      <CardTitle>{t("hr.capability.zkpTitle")}</CardTitle>
                      <CardDescription>{t("hr.capability.zkpSubtitle")}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-muted-foreground">
                    {t("hr.capability.zkpDesc")}
                  </p>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-semibold">{t("hr.capability.zkpVerifiable")}</h4>
                      <ul className="space-y-2">
                        {[
                          t("hr.capability.zkpVerify1"),
                          t("hr.capability.zkpVerify2"),
                          t("hr.capability.zkpVerify3"),
                          t("hr.capability.zkpVerify4"),
                        ].map((item, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-semibold">{t("hr.capability.zkpProtected")}</h4>
                      <ul className="space-y-2">
                        {[
                          t("hr.capability.zkpProtect1"),
                          t("hr.capability.zkpProtect2"),
                          t("hr.capability.zkpProtect3"),
                          t("hr.capability.zkpProtect4"),
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
                    <Link href="/certificate-verify">
                      <Button>
                        {t("hr.capability.startVerify")} <ArrowRight className="ml-2 w-4 h-4" />
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
            {t("hr.capability.ctaTitle")}
          </h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            {t("hr.capability.ctaDesc")}
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/help">
              <Button size="lg">{t("hr.capability.contactUs")}</Button>
            </Link>
            <Link href="/public">
              <Button variant="outline" size="lg">{t("hr.capability.backHome")}</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
