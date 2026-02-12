// types/grt-system.ts

// 用户角色定义
export type UserRole = 'CEO' | 'CTO' | 'ENGINEER_MECH' | 'ENGINEER_ELEC' | 'WORKSHOP_LEAD';

// 权限状态
export type AccessStatus = 'GRANTED' | 'DENIED_VIEW' | 'DENIED_EDIT';

// Dashboard 卡片类型
export type WidgetType = 
  | 'DAILY_PLAN' 
  | 'AGENDA' 
  | 'NEWS_INFO' 
  | 'COPILOT_TEAMS' 
  | 'PERFORMANCE_GEMINI'
  | 'PROJECT_STATUS_12STEP'
  | 'SYSTEM_LOAD'
  | 'TRAINING_STATS'
  | 'EQUIPMENT_MAINTENANCE'
  | 'HERO_SECTION'
  | 'CORE_MODULES';

// 12步流程枚举
export enum ProjectStage {
  INITIATION = 1,
  REQUIREMENTS = 2,
  DESIGN_MECH = 3,
  DESIGN_ELEC = 4,
  PROCUREMENT = 5,
  BOM_RELEASE = 6,
  MANUFACTURING = 7,
  ASSEMBLY = 8,
  TESTING = 9,
  COMMISSIONING = 10,
  DELIVERY = 11,
  FINAL_ACCEPTANCE = 12
}

// 项目阶段名称映射（多语言）
export const ProjectStageNames: Record<ProjectStage, { zh: string; en: string; de: string; fr: string }> = {
  [ProjectStage.INITIATION]: { zh: '立项', en: 'Initiation', de: 'Initiierung', fr: 'Lancement' },
  [ProjectStage.REQUIREMENTS]: { zh: '需求', en: 'Requirements', de: 'Anforderungen', fr: 'Exigences' },
  [ProjectStage.DESIGN_MECH]: { zh: '机械设计', en: 'Mech Design', de: 'Mech. Design', fr: 'Conception méca.' },
  [ProjectStage.DESIGN_ELEC]: { zh: '电气设计', en: 'Elec Design', de: 'Elek. Design', fr: 'Conception élec.' },
  [ProjectStage.PROCUREMENT]: { zh: '采购', en: 'Procurement', de: 'Beschaffung', fr: 'Approvisionnement' },
  [ProjectStage.BOM_RELEASE]: { zh: 'BOM发布', en: 'BOM Release', de: 'BOM-Freigabe', fr: 'Publication BOM' },
  [ProjectStage.MANUFACTURING]: { zh: '制造', en: 'Manufacturing', de: 'Fertigung', fr: 'Fabrication' },
  [ProjectStage.ASSEMBLY]: { zh: '装配', en: 'Assembly', de: 'Montage', fr: 'Assemblage' },
  [ProjectStage.TESTING]: { zh: '测试', en: 'Testing', de: 'Test', fr: 'Test' },
  [ProjectStage.COMMISSIONING]: { zh: '调试', en: 'Commissioning', de: 'Inbetriebnahme', fr: 'Mise en service' },
  [ProjectStage.DELIVERY]: { zh: '交付', en: 'Delivery', de: 'Lieferung', fr: 'Livraison' },
  [ProjectStage.FINAL_ACCEPTANCE]: { zh: '终验', en: 'Final Acceptance', de: 'Endabnahme', fr: 'Réception finale' }
};

// 任务来源类型
export type TaskSource = 'ANNUAL_PLAN' | 'PROJECT_CMS' | 'MEETING_ACTION' | 'AD_HOC' | 'LEAVE';

// 任务优先级
export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';

// 任务状态
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

// 每日任务结构 (Step 5 & 6)
export interface DailyTask {
  id: string;
  title: string;
  source: TaskSource;
  priority: TaskPriority;
  status: TaskStatus;
  linkedArtifact?: string;
  aiSuggestion?: string;
  dueDate?: string;
  assignee?: string;
}

// 绩效评价结构 (Step 7 & 8)
export interface DailyPerformance {
  date: string;
  score: number;
  feedback: string;
  metrics: {
    emailQuality: number;
    docQuality: number;
    meetingParticipation: number;
  };
  trend?: number;
}

// 仪表盘小部件配置
export interface DashboardWidget {
  id: string;
  type: WidgetType;
  visible: boolean;
  order: number;
  size?: 'small' | 'medium' | 'large' | 'full';
}

// 用户仪表盘布局
export interface DashboardLayout {
  widgets: DashboardWidget[];
  lastUpdated: string;
}

// 翻译建议
export interface TranslationSuggestion {
  id: string;
  translationKey: string;
  language: 'zh' | 'en' | 'de' | 'fr';
  originalText: string;
  suggestedText: string;
  submittedBy: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
}

// 日程事件
export interface AgendaEvent {
  id: string;
  title: string;
  type: 'meeting' | 'call' | 'training' | 'standup' | 'other' | 'deadline' | 'reminder' | 'task' | 'event';
  startTime: string;
  endTime: string;
  location?: string;
  attendees?: number | Array<{ name: string; email: string; status: string }>;
  isOnline?: boolean;
  isAllDay?: boolean;
  organizer?: { name: string; email: string };
  importance?: 'low' | 'normal' | 'high';
}

// 新闻资讯
export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  category: 'company' | 'product' | 'industry' | 'internal';
  publishedAt: string;
  author?: string;
  imageUrl?: string;
}

// Teams消息
export interface TeamsMessage {
  id: string;
  sender?: string | { name: string; id: string };
  senderAvatar?: string;
  channel?: string;
  chatId?: string;
  chatName?: string;
  chatType?: 'oneOnOne' | 'group' | 'meeting';
  content: string;
  timestamp: string;
  importance?: 'normal' | 'high' | 'urgent';
  isMention?: boolean;
  isUnread?: boolean;
  isRead?: boolean;
  attachments?: Array<{ id: string; name: string; contentType: string; url: string }>;
}

// 项目状态（12步）
export interface Project12Step {
  id: string;
  name: string;
  customer: string;
  industry: string;
  currentStage: ProjectStage;
  progress: number;
  dueDate: string;
  isDelayed?: boolean;
  stageStatuses: Record<ProjectStage, 'completed' | 'current' | 'pending'>;
}
