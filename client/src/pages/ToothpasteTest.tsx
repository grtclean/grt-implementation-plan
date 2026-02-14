import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt";
import ToothpasteTestDataEntry from "@/components/ToothpasteTestDataEntry";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TestTube } from "lucide-react";
import { Link } from "wouter";

export default function ToothpasteTest() {
  const handleSubmit = (data: any) => {
    console.log("牙膏试验数据提交:", data);
    // TODO: 调用API保存数据
  };

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

        <PageHeader icon={TestTube} title="牙膏试验数据录入" />

        {/* 牙膏试验数据录入组件 */}
        <ToothpasteTestDataEntry onSubmit={handleSubmit} />
      </div>
    </Layout>
  );
}
