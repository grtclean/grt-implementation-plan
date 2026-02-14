import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt";
import CleaningTrajectory3DViewer from "@/components/CleaningTrajectory3DViewer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Box } from "lucide-react";
import { Link } from "wouter";

export default function CleaningTrajectory3D() {
  return (
    <Layout>
      <div className="space-y-6">
        {/* 返回按钮 */}
        <div className="flex items-center gap-4">
          <Link href="/grt-cleaning-strategy">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回清洗策略
            </Button>
          </Link>
        </div>

        <PageHeader icon={Box} title="清洗轨迹3D可视化" />

        {/* 3D可视化组件 */}
        <CleaningTrajectory3DViewer height={500} />
      </div>
    </Layout>
  );
}
