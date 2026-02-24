import { PageHeader } from "@/components/grt";
import CleaningTrajectory3DViewer from "@/components/CleaningTrajectory3DViewer";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft, Box } from "lucide-react";
import { Link } from "wouter";

export default function CleaningTrajectory3D() {
  const { t } = useLanguage();
  return (
      <div className="space-y-6">
        {/* 返回按钮 */}
        <div className="flex items-center gap-4">
          <Link href="/grt-cleaning-strategy">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("manufacturing.cleaning3d.backToStrategy")}
            </Button>
          </Link>
        </div>

        <PageHeader icon={Box} title={t("manufacturing.cleaning3d.title")} />

        {/* 3D可视化组件 */}
        <CleaningTrajectory3DViewer height={500} />
      </div>
  );
}
