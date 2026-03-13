/**
 * 403 Forbidden Page
 * Shown when authenticated user lacks permission for a resource.
 */
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, Home, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ForbiddenPage() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-lg mx-4 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-orange-100 rounded-full scale-150 animate-pulse" />
              <ShieldAlert className="relative h-16 w-16 text-orange-500" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">403</h1>
          <h2 className="text-xl font-semibold text-slate-700 mb-4">
            权限不足
          </h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            您已登录，但没有访问此页面的权限。
            <br />
            如需访问，请联系系统管理员。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => window.history.back()} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回上页
            </Button>
            <Button onClick={() => setLocation("/")}>
              <Home className="w-4 h-4 mr-2" />
              返回首页
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
