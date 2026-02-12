import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { DashboardWidget } from "@/components/dashboard/DashboardWidget";
import { MessageSquare, AtSign, Reply } from "lucide-react";

interface TeamsMessage {
  id: string;
  sender: string;
  avatar: string;
  content: string;
  channel: string;
  time: string;
  isUnread?: boolean;
  isMention?: boolean;
}

interface TeamsMessagesDashboardProps {
  authorized?: boolean;
  userPreferenceShow?: boolean;
}

const mockMessages: TeamsMessage[] = [
  { id: '1', sender: '张经理', avatar: 'ZJ', content: '@你 请查看最新的项目进度报告', channel: '项目组', time: '10:30', isUnread: true, isMention: true },
  { id: '2', sender: '李工程师', avatar: 'LG', content: '设计图纸已更新，请审核', channel: '技术部', time: '09:45', isUnread: true },
  { id: '3', sender: '王助理', avatar: 'WZ', content: '会议室已预订成功', channel: '行政', time: '09:00' },
];

export default function TeamsMessagesDashboard({ 
  authorized = true, 
  userPreferenceShow = true 
}: TeamsMessagesDashboardProps) {
  const { language } = useLanguage();
  const unreadCount = mockMessages.filter(m => m.isUnread).length;
  const mentionCount = mockMessages.filter(m => m.isMention).length;

  return (
    <DashboardWidget
      title={language === 'zh' ? 'Teams 消息' : 'Teams Messages'}
      authorized={authorized}
      userPreferenceShow={userPreferenceShow}
      icon={<MessageSquare className="w-5 h-5" />}
      headerExtra={
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Badge className="bg-blue-500 text-white text-xs">{unreadCount} {language === 'zh' ? '未读' : 'unread'}</Badge>
          )}
          {mentionCount > 0 && (
            <Badge className="bg-red-500 text-white text-xs flex items-center gap-1">
              <AtSign className="w-3 h-3" />{mentionCount}
            </Badge>
          )}
        </div>
      }
    >
      <div className="space-y-3">
        {mockMessages.map(msg => (
          <div key={msg.id} className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${msg.isUnread ? 'bg-accent/30' : 'hover:bg-accent/20'}`}>
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-primary/20 text-primary text-xs">{msg.avatar}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-200">{msg.sender}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{msg.channel}</Badge>
                <span className="text-[10px] text-muted-foreground ml-auto">{msg.time}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{msg.content}</p>
            </div>
            <button className="p-1 hover:bg-accent rounded">
              <Reply className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        ))}
      </div>
    </DashboardWidget>
  );
}
