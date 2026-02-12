import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useEffect, useRef, useCallback } from "react";
import { 
  Settings2, 
  GripVertical, 
  Eye, 
  EyeOff, 
  RotateCcw,
  Activity,
  GraduationCap,
  CalendarDays,
  Newspaper,
  MessageSquare,
  Brain,
  GitBranch,
  ListTodo,
  X,
  Check,
  Move
} from "lucide-react";
import { toast } from "sonner";

export type WidgetType = 
  | 'SYSTEM_LOAD'
  | 'TRAINING_STATS'
  | 'DAILY_PLAN'
  | 'AGENDA'
  | 'NEWS_INFO'
  | 'COPILOT_TEAMS'
  | 'PERFORMANCE_GEMINI'
  | 'PROJECT_STATUS_12STEP';

export interface DashboardWidget {
  id: WidgetType;
  visible: boolean;
  order: number;
}

const defaultWidgets: DashboardWidget[] = [
  { id: 'SYSTEM_LOAD', visible: true, order: 0 },
  { id: 'TRAINING_STATS', visible: true, order: 1 },
  { id: 'DAILY_PLAN', visible: true, order: 2 },
  { id: 'AGENDA', visible: true, order: 3 },
  { id: 'NEWS_INFO', visible: true, order: 4 },
  { id: 'COPILOT_TEAMS', visible: true, order: 5 },
  { id: 'PERFORMANCE_GEMINI', visible: true, order: 6 },
  { id: 'PROJECT_STATUS_12STEP', visible: true, order: 7 },
];

const widgetIcons: Record<WidgetType, React.ComponentType<any>> = {
  SYSTEM_LOAD: Activity,
  TRAINING_STATS: GraduationCap,
  DAILY_PLAN: ListTodo,
  AGENDA: CalendarDays,
  NEWS_INFO: Newspaper,
  COPILOT_TEAMS: MessageSquare,
  PERFORMANCE_GEMINI: Brain,
  PROJECT_STATUS_12STEP: GitBranch,
};

const widgetNames: Record<WidgetType, { zh: string; en: string; de: string; fr: string }> = {
  SYSTEM_LOAD: { zh: '系统负载', en: 'System Load', de: 'Systemlast', fr: 'Charge système' },
  TRAINING_STATS: { zh: '培训统计', en: 'Training Stats', de: 'Schulungsstatistiken', fr: 'Statistiques de formation' },
  DAILY_PLAN: { zh: '每日计划', en: 'Daily Plan', de: 'Tagesplan', fr: 'Plan quotidien' },
  AGENDA: { zh: '日程管理', en: 'Agenda', de: 'Terminkalender', fr: 'Agenda' },
  NEWS_INFO: { zh: '新闻资讯', en: 'News & Info', de: 'Nachrichten', fr: 'Actualités' },
  COPILOT_TEAMS: { zh: 'Teams消息', en: 'Teams Messages', de: 'Teams-Nachrichten', fr: 'Messages Teams' },
  PERFORMANCE_GEMINI: { zh: 'Gemini绩效', en: 'Gemini Performance', de: 'Gemini-Leistung', fr: 'Performance Gemini' },
  PROJECT_STATUS_12STEP: { zh: '12步项目状态', en: '12-Step Project', de: '12-Stufen-Projekt', fr: 'Projet 12 étapes' },
};

interface DashboardLayoutCustomizerProps {
  widgets: DashboardWidget[];
  onWidgetsChange: (widgets: DashboardWidget[]) => void;
}

export function DashboardLayoutCustomizer({ widgets, onWidgetsChange }: DashboardLayoutCustomizerProps) {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [dragOverItem, setDragOverItem] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);
  const initialWidgetsRef = useRef<DashboardWidget[]>([]);

  useEffect(() => {
    if (isOpen) {
      initialWidgetsRef.current = [...widgets];
      setHasChanges(false);
    }
  }, [isOpen]);

  const toggleVisibility = (id: WidgetType) => {
    const updated = widgets.map(w => 
      w.id === id ? { ...w, visible: !w.visible } : w
    );
    onWidgetsChange(updated);
    setHasChanges(true);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItem(index);
    setIsDragging(true);
    dragNodeRef.current = e.target as HTMLDivElement;
    
    // 设置拖拽效果
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    
    // 添加拖拽样式
    setTimeout(() => {
      if (dragNodeRef.current) {
        dragNodeRef.current.style.opacity = '0.5';
      }
    }, 0);
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === index) return;
    setDragOverItem(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === index) return;
    
    const newWidgets = [...widgets];
    const draggedWidget = newWidgets[draggedItem];
    newWidgets.splice(draggedItem, 1);
    newWidgets.splice(index, 0, draggedWidget);
    
    const reordered = newWidgets.map((w, i) => ({ ...w, order: i }));
    onWidgetsChange(reordered);
    setHasChanges(true);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
    setIsDragging(false);
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = '1';
    }
  };

  // 触摸设备支持
  const handleTouchStart = (index: number) => {
    setDraggedItem(index);
  };

  const handleTouchMove = useCallback((e: React.TouchEvent, index: number) => {
    if (draggedItem === null) return;
    
    const touch = e.touches[0];
    const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
    const targetElement = elements.find(el => el.getAttribute('data-drag-index'));
    
    if (targetElement) {
      const targetIndex = parseInt(targetElement.getAttribute('data-drag-index') || '-1');
      if (targetIndex !== -1 && targetIndex !== draggedItem) {
        setDragOverItem(targetIndex);
      }
    }
  }, [draggedItem]);

  const handleTouchEnd = () => {
    if (draggedItem !== null && dragOverItem !== null && draggedItem !== dragOverItem) {
      const newWidgets = [...widgets];
      const draggedWidget = newWidgets[draggedItem];
      newWidgets.splice(draggedItem, 1);
      newWidgets.splice(dragOverItem, 0, draggedWidget);
      
      const reordered = newWidgets.map((w, i) => ({ ...w, order: i }));
      onWidgetsChange(reordered);
      setHasChanges(true);
    }
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const resetToDefault = () => {
    onWidgetsChange([...defaultWidgets]);
    setHasChanges(true);
    toast.success(language === 'zh' ? '已重置为默认布局' : 'Reset to default layout');
  };

  const cancelChanges = () => {
    onWidgetsChange(initialWidgetsRef.current);
    setIsOpen(false);
    setHasChanges(false);
  };

  const saveAndClose = () => {
    setIsOpen(false);
    if (hasChanges) {
      toast.success(language === 'zh' ? '布局已保存' : 'Layout saved');
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newWidgets = [...widgets];
    [newWidgets[index - 1], newWidgets[index]] = [newWidgets[index], newWidgets[index - 1]];
    const reordered = newWidgets.map((w, i) => ({ ...w, order: i }));
    onWidgetsChange(reordered);
    setHasChanges(true);
  };

  const moveDown = (index: number) => {
    if (index === widgets.length - 1) return;
    const newWidgets = [...widgets];
    [newWidgets[index], newWidgets[index + 1]] = [newWidgets[index + 1], newWidgets[index]];
    const reordered = newWidgets.map((w, i) => ({ ...w, order: i }));
    onWidgetsChange(reordered);
    setHasChanges(true);
  };

  const getWidgetName = (id: WidgetType) => {
    const names = widgetNames[id];
    return names[language as keyof typeof names] || names.en;
  };

  const sortedWidgets = [...widgets].sort((a, b) => a.order - b.order);

  if (!isOpen) {
    return (
      <Button 
        variant="outline" 
        size="icon" 
        onClick={() => setIsOpen(true)} 
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 border-0"
        title={language === 'zh' ? '自定义布局' : 'Customize Layout'}
      >
        <Settings2 className="w-5 h-5" />
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4 max-h-[80vh] flex flex-col shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between py-4 border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            {language === 'zh' ? '仪表盘布局设置' : 'Dashboard Layout'}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={cancelChanges}>
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto py-4">
          <div className="space-y-2">
            {sortedWidgets.map((widget, index) => {
              const Icon = widgetIcons[widget.id];
              const isBeingDragged = draggedItem === index;
              const isDragOver = dragOverItem === index;
              
              return (
                <div
                  key={widget.id}
                  data-drag-index={index}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  onTouchStart={() => handleTouchStart(index)}
                  onTouchMove={(e) => handleTouchMove(e, index)}
                  onTouchEnd={handleTouchEnd}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 select-none
                    ${isBeingDragged ? 'opacity-50 scale-95 border-primary bg-primary/10' : ''}
                    ${isDragOver && !isBeingDragged ? 'border-primary border-2 bg-primary/5 scale-[1.02]' : ''}
                    ${!isBeingDragged && !isDragOver ? 'bg-card hover:bg-accent/50 border-border' : ''}
                    ${!widget.visible ? 'opacity-60' : ''}
                  `}
                >
                  <div className="flex flex-col gap-1">
                    <button 
                      onClick={() => moveUp(index)} 
                      disabled={index === 0}
                      className="p-0.5 hover:bg-accent rounded disabled:opacity-30"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 15l-6-6-6 6"/>
                      </svg>
                    </button>
                    <button 
                      onClick={() => moveDown(index)} 
                      disabled={index === sortedWidgets.length - 1}
                      className="p-0.5 hover:bg-accent rounded disabled:opacity-30"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </button>
                  </div>
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                  <Icon className={`w-5 h-5 ${widget.visible ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`flex-1 text-sm font-medium ${!widget.visible ? 'text-muted-foreground' : ''}`}>
                    {getWidgetName(widget.id)}
                  </span>
                  <div className="flex items-center gap-2">
                    {widget.visible ? (
                      <Eye className="w-4 h-4 text-green-500" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    )}
                    <Switch 
                      checked={widget.visible} 
                      onCheckedChange={() => toggleVisibility(widget.id)} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 mt-4 p-3 bg-muted/50 rounded-lg">
            <Move className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              {language === 'zh' 
                ? '拖拽或使用箭头调整顺序，开关控制显示/隐藏' 
                : 'Drag or use arrows to reorder, toggle to show/hide'}
            </p>
          </div>
        </CardContent>
        <div className="flex items-center justify-between p-4 border-t bg-muted/30">
          <Button variant="outline" size="sm" onClick={resetToDefault} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            {language === 'zh' ? '重置' : 'Reset'}
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={cancelChanges}>
              {language === 'zh' ? '取消' : 'Cancel'}
            </Button>
            <Button size="sm" onClick={saveAndClose} className="gap-2">
              <Check className="w-4 h-4" />
              {language === 'zh' ? '保存' : 'Save'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function useDashboardLayout() {
  const { user } = useAuth();
  const [widgets, setWidgets] = useState<DashboardWidget[]>(defaultWidgets);
  const [isLoaded, setIsLoaded] = useState(false);
  const updatePreferencesMutation = trpc.auth.updatePreferences.useMutation();

  useEffect(() => {
    // 首先从localStorage加载
    const saved = localStorage.getItem('dashboardLayout');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        // 验证数据结构
        if (Array.isArray(parsed) && parsed.every(w => w.id && typeof w.visible === 'boolean' && typeof w.order === 'number')) {
          setWidgets(parsed); 
        }
      } catch (e) { 
        console.error('Failed to parse dashboard layout', e); 
      }
    }
    setIsLoaded(true);
  }, []);

  const updateWidgets = useCallback((newWidgets: DashboardWidget[]) => {
    setWidgets(newWidgets);
    localStorage.setItem('dashboardLayout', JSON.stringify(newWidgets));
    if (user) { 
      updatePreferencesMutation.mutate({ dashboardLayout: JSON.stringify(newWidgets) } as any); 
    }
  }, [user, updatePreferencesMutation]);

  return { widgets, updateWidgets, isLoaded };
}

export { defaultWidgets };
