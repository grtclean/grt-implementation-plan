import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { DashboardWidget } from "@/components/dashboard/DashboardWidget";
import { CalendarDays, Clock, MapPin, Users } from "lucide-react";

interface AgendaEvent {
  id: string;
  title: string;
  time: string;
  location?: string;
  attendees?: number;
  type: 'meeting' | 'deadline' | 'reminder' | 'event';
}

interface AgendaDashboardProps {
  authorized?: boolean;
  userPreferenceShow?: boolean;
}

const mockEvents: AgendaEvent[] = [
  { id: '1', title: '项目启动会议', time: '09:00 - 10:00', location: '会议室A', attendees: 8, type: 'meeting' },
  { id: '2', title: '设计评审截止', time: '12:00', type: 'deadline' },
  { id: '3', title: '客户电话会议', time: '14:00 - 15:00', attendees: 3, type: 'meeting' },
  { id: '4', title: '周报提交', time: '17:00', type: 'reminder' },
];

const typeColors: Record<string, string> = {
  meeting: 'bg-blue-500/20 text-blue-500',
  deadline: 'bg-red-500/20 text-red-500',
  reminder: 'bg-yellow-500/20 text-yellow-500',
  event: 'bg-green-500/20 text-green-500',
};

const typeLabels: Record<string, { zh: string; en: string }> = {
  meeting: { zh: '会议', en: 'Meeting' },
  deadline: { zh: '截止', en: 'Deadline' },
  reminder: { zh: '提醒', en: 'Reminder' },
  event: { zh: '事件', en: 'Event' },
};

export default function AgendaDashboard({ 
  authorized = true, 
  userPreferenceShow = true 
}: AgendaDashboardProps) {
  const { language } = useLanguage();
  const today = new Date().toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', { 
    weekday: 'long', month: 'long', day: 'numeric' 
  });

  return (
    <DashboardWidget
      title={language === 'zh' ? '今日日程' : "Today's Agenda"}
      authorized={authorized}
      userPreferenceShow={userPreferenceShow}
      icon={<CalendarDays className="w-5 h-5" />}
      headerExtra={<span className="text-xs text-muted-foreground">{today}</span>}
    >
      <div className="space-y-3">
        {mockEvents.map(event => (
          <div key={event.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/30 transition-colors border-l-2 border-primary/50">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-slate-200">{event.title}</p>
                <Badge className={`text-[10px] px-1.5 py-0 ${typeColors[event.type]}`}>
                  {typeLabels[event.type]?.[language === 'zh' ? 'zh' : 'en']}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {event.time}
                </span>
                {event.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {event.location}
                  </span>
                )}
                {event.attendees && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {event.attendees}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardWidget>
  );
}
