/**
 * 客户反馈页面
 * 客户满意度、反馈收集、NPS追踪
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Plus, Star, ThumbsUp, ThumbsDown, TrendingUp } from "lucide-react";

const MOCK_FEEDBACK = [
  { id: 1, customer: "上海大众", project: "缸体清洗线", rating: 5, comment: "设备性能稳定，清洗效果很好", date: "2026-02-08", type: "好评" },
  { id: 2, customer: "宝马慕尼黑", project: "变速箱清洗", rating: 4, comment: "整体满意，HMI界面可进一步优化", date: "2026-02-06", type: "建议" },
  { id: 3, customer: "潍柴动力", project: "柴油机清洗", rating: 3, comment: "安装周期偏长，建议优化", date: "2026-02-03", type: "建议" },
  { id: 4, customer: "英飞凌", project: "晶圆清洗", rating: 5, comment: "洁净度远超标准要求，非常满意", date: "2026-01-28", type: "好评" },
];

export default function CustomerFeedback() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><MessageCircle className="h-6 w-6 text-primary" />客户反馈</h1>
          <p className="text-muted-foreground mt-1">客户满意度追踪与NPS管理</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />录入反馈</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold">4.6</p><div className="flex justify-center mt-1">{[1,2,3,4,5].map(i => <Star key={i} className={`h-4 w-4 ${i <= 4 ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />)}</div><p className="text-xs text-muted-foreground mt-1">平均评分</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-green-600">72</p><p className="text-xs text-muted-foreground">NPS得分</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold">156</p><p className="text-xs text-muted-foreground">总反馈数</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-primary">92%</p><p className="text-xs text-muted-foreground">满意率</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>最新反馈</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {MOCK_FEEDBACK.map(f => (
              <div key={f.id} className="p-4 rounded-lg border hover:bg-accent/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{f.customer}</span>
                    <Badge variant="outline">{f.project}</Badge>
                    <Badge className={f.type === "好评" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>{f.type}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(i => <Star key={i} className={`h-3 w-3 ${i <= f.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />)}
                  </div>
                </div>
                <p className="text-sm mt-2">{f.comment}</p>
                <p className="text-xs text-muted-foreground mt-1">{f.date}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
