import Layout from "@/components/Layout";
import CleaningTrajectory3DViewer from "@/components/CleaningTrajectory3DViewer";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
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
          <h1 className="text-2xl font-bold">清洗轨迹3D可视化</h1>
        </div>

        {/* 3D可视化组件 */}
        <CleaningTrajectory3DViewer height={500} />
      </div>
    </Layout>
  );
}
