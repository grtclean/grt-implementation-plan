import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { DashboardWidget } from "@/components/dashboard/DashboardWidget";
import { Newspaper, ExternalLink, TrendingUp, Building2, Globe } from "lucide-react";

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  category: 'company' | 'industry' | 'product' | 'announcement';
  date: string;
  isNew?: boolean;
}

interface NewsInfoDashboardProps {
  authorized?: boolean;
  userPreferenceShow?: boolean;
}

const mockNews: NewsItem[] = [
  { id: '1', title: '公司获得ISO 9001认证', summary: '质量管理体系通过国际认证审核', category: 'company', date: '2024-01-31', isNew: true },
  { id: '2', title: '新产品线发布', summary: '超声波清洗设备系列正式上市', category: 'product', date: '2024-01-30', isNew: true },
  { id: '3', title: '行业展会参展通知', summary: '将参加2024年清洗设备国际展览会', category: 'industry', date: '2024-01-29' },
  { id: '4', title: '春节放假安排', summary: '2024年春节假期安排通知', category: 'announcement', date: '2024-01-28' },
];

const categoryIcons: Record<string, React.ReactNode> = {
  company: <Building2 className="w-4 h-4" />,
  industry: <Globe className="w-4 h-4" />,
  product: <TrendingUp className="w-4 h-4" />,
  announcement: <Newspaper className="w-4 h-4" />,
};

const categoryLabels: Record<string, { zh: string; en: string }> = {
  company: { zh: '公司动态', en: 'Company' },
  industry: { zh: '行业资讯', en: 'Industry' },
  product: { zh: '产品发布', en: 'Product' },
  announcement: { zh: '公告通知', en: 'Announcement' },
};

const categoryColors: Record<string, string> = {
  company: 'bg-blue-500/20 text-blue-500',
  industry: 'bg-purple-500/20 text-purple-500',
  product: 'bg-green-500/20 text-green-500',
  announcement: 'bg-orange-500/20 text-orange-500',
};

export default function NewsInfoDashboard({ 
  authorized = true, 
  userPreferenceShow = true 
}: NewsInfoDashboardProps) {
  const { language } = useLanguage();

  return (
    <DashboardWidget
      title={language === 'zh' ? '新闻资讯' : 'News & Info'}
      authorized={authorized}
      userPreferenceShow={userPreferenceShow}
      icon={<Newspaper className="w-5 h-5" />}
      headerExtra={
        <a href="#" className="text-xs text-primary hover:underline flex items-center gap-1">
          {language === 'zh' ? '查看全部' : 'View All'}
          <ExternalLink className="w-3 h-3" />
        </a>
      }
    >
      <div className="space-y-3">
        {mockNews.map(news => (
          <div key={news.id} className="p-2 rounded-lg hover:bg-accent/30 transition-colors cursor-pointer">
            <div className="flex items-start gap-2">
              <div className={`p-1.5 rounded ${categoryColors[news.category]}`}>
                {categoryIcons[news.category]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate text-slate-200">{news.title}</p>
                  {news.isNew && (
                    <Badge className="bg-red-500 text-white text-[10px] px-1 py-0">NEW</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{news.summary}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${categoryColors[news.category]}`}>
                    {categoryLabels[news.category]?.[language === 'zh' ? 'zh' : 'en']}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{news.date}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardWidget>
  );
}
