/**
 * 客户反馈页面
 * 客户满意度、反馈收集、NPS追踪
 */
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt/PageHeader";
import { StatCard } from "@/components/grt/StatCard";
import { StatusBadge, createStatusColorMap } from "@/components/grt/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Plus, Star, ThumbsUp, TrendingUp, Users } from "lucide-react";

const feedbackColorMap = createStatusColorMap({
  "好评": "green",
  "建议": "blue",
  "投诉": "red",
});

// TODO: 接入 tRPC 后端接口替换
const MOCK_FEEDBACK = [
  { id: 1, customer: "上海大众", project: "缸体清洗线", rating: 5, comment: "设备性能稳定，清洗效果很好", date: "2026-02-08", type: "好评" },
  { id: 2, customer: "宝马慕尼黑", project: "变速箱清洗", rating: 4, comment: "整体满意，HMI界面可进一步优化", date: "2026-02-06", type: "建议" },
  { id: 3, customer: "潍柴动力", project: "柴油机清洗", rating: 3, comment: "安装周期偏长，建议优化", date: "2026-02-03", type: "建议" },
  { id: 4, customer: "英飞凌", project: "晶圆清洗", rating: 5, comment: "洁净度远超标准要求，非常满意", date: "2026-01-28", type: "好评" },
];

export default function CustomerFeedback() {
  return (
    <Layout>
    <div className="space-y-6">
      <PageHeader
        icon={MessageCircle}
        title="客户反馈"
        description="客户满意度追踪与NPS管理"
        actions={<Button><Plus className="h-4 w-4 mr-2" />录入反馈</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Star} label="平均评分" value="4.6" iconColor="text-yellow-500" iconBg="bg-yellow-500/10" />
        <StatCard icon={TrendingUp} label="NPS得分" value={72} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={Users} label="总反馈数" value={156} />
        <StatCard icon={ThumbsUp} label="满意率" value="92%" iconColor="text-primary" iconBg="bg-primary/10" />
      </div>

      <Card>
        <CardHeader><CardTitle>最新反馈</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {MOCK_FEEDBACK.map(f => (
              <div key={f.id} className="p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{f.customer}</span>
                    <Badge variant="outline">{f.project}</Badge>
                    <StatusBadge color={feedbackColorMap[f.type as keyof typeof feedbackColorMap] ?? "gray"}>{f.type}</StatusBadge>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(i => <Star key={i} className={`h-3 w-3 ${i <= f.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />)}
                  </div>
                </div>
                <p className="text-sm mt-2">{f.comment}</p>
                <p className="text-xs text-muted-foreground mt-1">{f.date}</p>
              </div>
            ))}
            {MOCK_FEEDBACK.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <MessageCircle className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">暂无反馈</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    </Layout>
  );
}
