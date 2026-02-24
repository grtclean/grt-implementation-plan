import ErrorBoundary from "@/components/ErrorBoundary";
import LiveDashboard from "@/components/LiveDashboard";
import MaintenanceAlertDashboard from "@/components/MaintenanceAlertDashboard";
import TrainingStatsDashboard from "@/components/TrainingStatsDashboard";
import DailyPlanDashboard from "@/components/DailyPlanDashboard";
import AgendaDashboard from "@/components/AgendaDashboard";
import NewsInfoDashboard from "@/components/NewsInfoDashboard";
import TeamsMessagesDashboard from "@/components/TeamsMessagesDashboard";
import PerformanceGeminiDashboard from "@/components/PerformanceGeminiDashboard";
import ProjectStatus12StepDashboard from "@/components/ProjectStatus12StepDashboard";
import OffboardingProgressDashboard from "@/components/OffboardingProgressDashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { ArrowRight, CheckCircle2, Clock, Target, Zap, LogIn, AlertCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect } from "react";

const isLocalAuth = import.meta.env.VITE_LOCAL_AUTH === "true";

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const { t } = useLanguage();
  const [, navigate] = useLocation();

  // In local auth mode, redirect unauthenticated users to /login immediately
  useEffect(() => {
    if (!loading && !isAuthenticated && isLocalAuth) {
      navigate("/login", { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  // Show nothing while auth is loading or redirecting
  if (loading || (!isAuthenticated && isLocalAuth)) {
    return null;
  }

  return (
      <div className="relative z-10 space-y-10">
        {/* Login Prompt for Unauthenticated Users (OAuth mode only) */}
        {!loading && !isAuthenticated && !isLocalAuth && (
          <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                <CardTitle className="text-amber-900 dark:text-amber-100">{t("home.loginRequired")}</CardTitle>
              </div>
              <CardDescription className="text-amber-800/70 dark:text-amber-200/70">
                {t("home.loginBenefits")}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button
                onClick={() => window.location.href = getLoginUrl()}
                className="gap-2"
              >
                <LogIn className="w-4 h-4" />
                {t("home.loginNow")}
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = getLoginUrl()}
              >
                {t("home.loginOAuth")}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Live Dashboard Section */}
        <ErrorBoundary level="section" onError={(error, info) => console.error('LiveDashboard error:', error, info)}>
          <LiveDashboard />
        </ErrorBoundary>

        {/* New Dashboard Widgets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ErrorBoundary level="component">
            <DailyPlanDashboard />
          </ErrorBoundary>
          <ErrorBoundary level="component">
            <AgendaDashboard />
          </ErrorBoundary>
          <ErrorBoundary level="component">
            <PerformanceGeminiDashboard />
          </ErrorBoundary>
        </div>

        {/* Training Statistics Dashboard */}
        <ErrorBoundary level="section">
          <TrainingStatsDashboard />
        </ErrorBoundary>

        {/* Second Row of New Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ErrorBoundary level="component">
            <NewsInfoDashboard />
          </ErrorBoundary>
          <ErrorBoundary level="component">
            <TeamsMessagesDashboard />
          </ErrorBoundary>
          <ErrorBoundary level="component">
            <ProjectStatus12StepDashboard />
          </ErrorBoundary>
        </div>

        {/* Offboarding Progress Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ErrorBoundary level="component">
            <OffboardingProgressDashboard />
          </ErrorBoundary>
        </div>

        {/* Maintenance Alert Dashboard */}
        <ErrorBoundary level="section">
          <MaintenanceAlertDashboard />
        </ErrorBoundary>

        {/* Hero Section */}
        <section className="relative rounded-lg overflow-hidden border border-border shadow-2xl group">
          <div className="absolute inset-0 bg-[url('https://files.manuscdn.com/user_upload_by_module/session_file/310519663272963509/JpFeAQoWYwRpkgmA.jpg')] bg-cover bg-center opacity-40 group-hover:scale-105 transition-transform duration-700 ease-out"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent"></div>
          
          <div className="relative p-8 md:p-16 max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono tracking-wider uppercase">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              {t("home.hero.tag")}
            </div>
            
            <h1 className="text-4xl md:text-6xl font-heading font-bold tracking-tight text-foreground leading-tight">
              {t("home.hero.title")}
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              {t("home.hero.desc")}
            </p>
            
            <div className="flex flex-wrap gap-4 pt-4">
              <Link href="/roadmap">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold tracking-wide rounded-sm h-12 px-8 shadow-[0_0_20px_rgba(249,115,22,0.3)] border border-primary/50">
                  {t("home.hero.btn.roadmap")} <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link href="/tools">
                <Button variant="outline" size="lg" className="bg-background/50 backdrop-blur-sm border-primary/30 hover:bg-primary/10 hover:text-primary hover:border-primary font-medium tracking-wide rounded-sm h-12 px-8">
                  {t("home.hero.btn.tools")}
                </Button>
              </Link>
            </div>
          </div>
          
          {/* Decorative UI Elements */}
          <div className="absolute top-8 right-8 hidden md:block">
            <div className="grid grid-cols-2 gap-2 opacity-50">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-2 h-2 bg-primary/50 rounded-full"></div>
              ))}
            </div>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-transparent to-primary opacity-50"></div>
        </section>

        {/* Key Metrics / Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: t("home.metrics.duration"), value: "16 Weeks", icon: Clock, desc: "MVP Launch" },
            { label: t("home.metrics.modules"), value: "6 Core Modules", icon: Layers, desc: "CRM / PM / Cost..." },
            { label: t("home.metrics.smart"), value: "AI + IoT", icon: Zap, desc: "Agent / UWB / CCD" },
            { label: t("home.metrics.goal"), value: "100% Digital", icon: Target, desc: "Closed Loop" },
          ].map((stat, index) => (
            <Card key={index} className="bg-card/50 border-border hover:border-primary/50 transition-colors group">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-sm bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-mono uppercase">{stat.label}</p>
                  <p className="text-xl font-bold font-heading tracking-wide">{stat.value}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">{stat.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Core Modules Preview */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
              <span className="w-1.5 h-6 bg-primary rounded-sm"></span>
              {t("home.modules.title")}
            </h2>
            <span className="text-xs font-mono text-muted-foreground">{t("home.modules.overview")}</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: t("home.modules.crm.title"),
                desc: t("home.modules.crm.desc"),
                features: [t("home.modules.crm.feature1"), t("home.modules.crm.feature2"), t("home.modules.crm.feature3")],
                phase: "Phase 2"
              },
              {
                title: t("home.modules.project.title"),
                desc: t("home.modules.project.desc"),
                features: [t("home.modules.project.feature1"), t("home.modules.project.feature2"), t("home.modules.project.feature3")],
                phase: "Phase 2-3"
              },
              {
                title: t("home.modules.ai.title"),
                desc: t("home.modules.ai.desc"),
                features: [t("home.modules.ai.feature1"), t("home.modules.ai.feature2"), t("home.modules.ai.feature3")],
                phase: "Phase 4"
              }
            ].map((module, i) => (
              <Card key={i} className="bg-card border-border hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <div className="px-2 py-1 rounded-sm bg-secondary text-secondary-foreground text-[10px] font-mono uppercase border border-border">
                      {module.phase}
                    </div>
                    <Layers className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <CardTitle className="font-heading text-xl tracking-wide">{module.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{module.desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {module.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
  );
}

// Helper component for icons
function Layers(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
    </svg>
  )
}
