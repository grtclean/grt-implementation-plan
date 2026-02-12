/**
 * 工时采集面板组件
 * Time Tracking Panel Component
 * 
 * 支持多种工时采集方式：
 * - 手动录入
 * - 打卡机同步
 * - UWB定位自动采集
 * - 移动APP打卡
 */

import { useState, useMemo } from 'react';
import { 
  Clock, Play, Pause, CheckCircle2, AlertTriangle,
  MapPin, Smartphone, CreditCard, Calculator, RefreshCw,
  Calendar, User, FileText, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';

// ============================================================================
// 类型定义
// ============================================================================

export type TimeSourceType = 'MANUAL' | 'CLOCK_IN' | 'UWB' | 'BADGE' | 'AUTO_CALC';
export type WorkType = 'REGULAR' | 'OVERTIME' | 'TRAINING' | 'MEETING' | 'OTHER';

export interface TimeRecord {
  id: number;
  userId: number;
  userName: string;
  projectId: number;
  stageCode: string;
  recordDate: string;
  startTime: string | null;
  endTime: string | null;
  duration: number;
  sourceType: TimeSourceType;
  workType: WorkType;
  isVerified: boolean;
  description?: string;
}

export interface TimeTrackingPanelProps {
  projectId: number;
  stageCode: string;
  stageName: string;
  currentUserId: number;
  currentUserName: string;
  records?: TimeRecord[];
  onRecordCreate?: (record: Partial<TimeRecord>) => void;
  onRecordUpdate?: (id: number, record: Partial<TimeRecord>) => void;
  isLoading?: boolean;
}

// ============================================================================
// 工时来源配置
// ============================================================================

const SOURCE_CONFIG: Record<TimeSourceType, { icon: any; label: string; labelZh: string; color: string }> = {
  MANUAL: { icon: FileText, label: 'Manual Entry', labelZh: '手动录入', color: 'text-blue-400' },
  CLOCK_IN: { icon: Clock, label: 'Clock Machine', labelZh: '打卡机', color: 'text-green-400' },
  UWB: { icon: MapPin, label: 'UWB Location', labelZh: 'UWB定位', color: 'text-purple-400' },
  BADGE: { icon: CreditCard, label: 'Badge Reader', labelZh: '门禁卡', color: 'text-orange-400' },
  AUTO_CALC: { icon: Calculator, label: 'Auto Calculated', labelZh: '自动计算', color: 'text-cyan-400' },
};

const WORK_TYPE_CONFIG: Record<WorkType, { label: string; labelZh: string }> = {
  REGULAR: { label: 'Regular Work', labelZh: '正常工时' },
  OVERTIME: { label: 'Overtime', labelZh: '加班' },
  TRAINING: { label: 'Training', labelZh: '培训' },
  MEETING: { label: 'Meeting', labelZh: '会议' },
  OTHER: { label: 'Other', labelZh: '其他' },
};

// ============================================================================
// 主组件
// ============================================================================

export default function TimeTrackingPanel({
  projectId,
  stageCode,
  stageName,
  currentUserId,
  currentUserName,
  records = [],
  onRecordCreate,
  onRecordUpdate,
  isLoading = false,
}: TimeTrackingPanelProps) {
  const { language } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingStartTime, setTrackingStartTime] = useState<Date | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  
  // 手动录入表单状态
  const [manualForm, setManualForm] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '18:00',
    workType: 'REGULAR' as WorkType,
    description: '',
  });

  // 计算今日工时统计
  const todayStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = records.filter(r => r.recordDate === today);
    const totalHours = todayRecords.reduce((sum, r) => sum + (r.duration || 0), 0);
    return {
      count: todayRecords.length,
      totalHours: totalHours.toFixed(1),
      verified: todayRecords.filter(r => r.isVerified).length,
    };
  }, [records]);

  // 计算本周工时统计
  const weekStats = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];
    
    const weekRecords = records.filter(r => r.recordDate >= weekStartStr);
    const totalHours = weekRecords.reduce((sum, r) => sum + (r.duration || 0), 0);
    return {
      count: weekRecords.length,
      totalHours: totalHours.toFixed(1),
    };
  }, [records]);

  // 开始计时
  const handleStartTracking = () => {
    setIsTracking(true);
    setTrackingStartTime(new Date());
  };

  // 停止计时并保存
  const handleStopTracking = () => {
    if (!trackingStartTime) return;
    
    const endTime = new Date();
    const duration = (endTime.getTime() - trackingStartTime.getTime()) / (1000 * 60 * 60); // 小时
    
    onRecordCreate?.({
      userId: currentUserId,
      userName: currentUserName,
      projectId,
      stageCode,
      recordDate: trackingStartTime.toISOString().split('T')[0],
      startTime: trackingStartTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: parseFloat(duration.toFixed(2)),
      sourceType: 'MANUAL',
      workType: 'REGULAR',
      isVerified: false,
    });
    
    setIsTracking(false);
    setTrackingStartTime(null);
  };

  // 提交手动录入
  const handleManualSubmit = () => {
    const startDateTime = new Date(`${manualForm.date}T${manualForm.startTime}`);
    const endDateTime = new Date(`${manualForm.date}T${manualForm.endTime}`);
    const duration = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
    
    if (duration <= 0) {
      alert(language === 'zh' ? '结束时间必须晚于开始时间' : 'End time must be after start time');
      return;
    }
    
    onRecordCreate?.({
      userId: currentUserId,
      userName: currentUserName,
      projectId,
      stageCode,
      recordDate: manualForm.date,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      duration: parseFloat(duration.toFixed(2)),
      sourceType: 'MANUAL',
      workType: manualForm.workType,
      isVerified: false,
      description: manualForm.description,
    });
    
    setShowManualEntry(false);
    setManualForm({
      date: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '18:00',
      workType: 'REGULAR',
      description: '',
    });
  };

  // 计算当前计时时长
  const currentDuration = useMemo(() => {
    if (!isTracking || !trackingStartTime) return '00:00:00';
    const now = new Date();
    const diff = now.getTime() - trackingStartTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [isTracking, trackingStartTime]);

  return (
    <Card className="bg-[#111827] border-slate-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-300 flex items-center gap-2">
            <Clock size={16} className="text-orange-400" />
            {language === 'zh' ? '工时采集' : 'Time Tracking'}
            <span className="text-xs text-slate-500">({stageCode})</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-400 hover:text-slate-200"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 快速统计 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
            <div className="text-[10px] text-slate-500 uppercase mb-1">
              {language === 'zh' ? '今日工时' : 'Today'}
            </div>
            <div className="text-lg font-bold text-orange-400">{todayStats.totalHours}h</div>
            <div className="text-[10px] text-slate-500">
              {todayStats.count} {language === 'zh' ? '条记录' : 'records'}
            </div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
            <div className="text-[10px] text-slate-500 uppercase mb-1">
              {language === 'zh' ? '本周工时' : 'This Week'}
            </div>
            <div className="text-lg font-bold text-emerald-400">{weekStats.totalHours}h</div>
            <div className="text-[10px] text-slate-500">
              {weekStats.count} {language === 'zh' ? '条记录' : 'records'}
            </div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
            <div className="text-[10px] text-slate-500 uppercase mb-1">
              {language === 'zh' ? '已审核' : 'Verified'}
            </div>
            <div className="text-lg font-bold text-blue-400">{todayStats.verified}</div>
            <div className="text-[10px] text-slate-500">
              / {todayStats.count} {language === 'zh' ? '条' : 'total'}
            </div>
          </div>
        </div>

        {/* 计时器控制 */}
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {isTracking ? (
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              ) : (
                <div className="w-3 h-3 rounded-full bg-slate-600" />
              )}
              <span className="text-sm text-slate-300">
                {isTracking 
                  ? (language === 'zh' ? '正在计时...' : 'Tracking...') 
                  : (language === 'zh' ? '准备就绪' : 'Ready')}
              </span>
            </div>
            <div className="text-2xl font-mono text-orange-400">
              {currentDuration}
            </div>
          </div>
          
          <div className="flex gap-2">
            {!isTracking ? (
              <Button
                onClick={handleStartTracking}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Play size={16} className="mr-2" />
                {language === 'zh' ? '开始计时' : 'Start'}
              </Button>
            ) : (
              <Button
                onClick={handleStopTracking}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                <Pause size={16} className="mr-2" />
                {language === 'zh' ? '停止并保存' : 'Stop & Save'}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setShowManualEntry(!showManualEntry)}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              <FileText size={16} className="mr-2" />
              {language === 'zh' ? '手动录入' : 'Manual'}
            </Button>
          </div>
        </div>

        {/* 手动录入表单 */}
        {showManualEntry && (
          <div className="bg-slate-900/50 rounded-lg p-4 border border-orange-600/30 space-y-3">
            <div className="text-xs text-orange-400 font-medium mb-2">
              {language === 'zh' ? '手动录入工时' : 'Manual Time Entry'}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-400">
                  {language === 'zh' ? '日期' : 'Date'}
                </Label>
                <Input
                  type="date"
                  value={manualForm.date}
                  onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-slate-200 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-400">
                  {language === 'zh' ? '工作类型' : 'Work Type'}
                </Label>
                <Select
                  value={manualForm.workType}
                  onValueChange={(value) => setManualForm({ ...manualForm, workType: value as WorkType })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {Object.entries(WORK_TYPE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key} className="text-slate-200">
                        {language === 'zh' ? config.labelZh : config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-400">
                  {language === 'zh' ? '开始时间' : 'Start Time'}
                </Label>
                <Input
                  type="time"
                  value={manualForm.startTime}
                  onChange={(e) => setManualForm({ ...manualForm, startTime: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-slate-200 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-400">
                  {language === 'zh' ? '结束时间' : 'End Time'}
                </Label>
                <Input
                  type="time"
                  value={manualForm.endTime}
                  onChange={(e) => setManualForm({ ...manualForm, endTime: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-slate-200 text-sm"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-xs text-slate-400">
                {language === 'zh' ? '备注' : 'Description'}
              </Label>
              <Input
                value={manualForm.description}
                onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                placeholder={language === 'zh' ? '工作内容描述...' : 'Work description...'}
                className="bg-slate-800 border-slate-700 text-slate-200 text-sm"
              />
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleManualSubmit}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-sm"
              >
                <CheckCircle2 size={14} className="mr-2" />
                {language === 'zh' ? '提交' : 'Submit'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowManualEntry(false)}
                className="border-slate-600 text-slate-300 hover:bg-slate-800 text-sm"
              >
                {language === 'zh' ? '取消' : 'Cancel'}
              </Button>
            </div>
          </div>
        )}

        {/* 展开的详细记录列表 */}
        {isExpanded && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>{language === 'zh' ? '最近记录' : 'Recent Records'}</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-slate-200 h-6 px-2"
              >
                <RefreshCw size={12} className="mr-1" />
                {language === 'zh' ? '刷新' : 'Refresh'}
              </Button>
            </div>
            
            {records.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-sm">
                {language === 'zh' ? '暂无工时记录' : 'No time records yet'}
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {records.slice(0, 10).map((record) => {
                  const sourceConfig = SOURCE_CONFIG[record.sourceType];
                  const SourceIcon = sourceConfig.icon;
                  
                  return (
                    <div
                      key={record.id}
                      className="bg-slate-900/30 rounded-lg p-3 border border-slate-700/50 hover:border-slate-600 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <SourceIcon size={12} className={sourceConfig.color} />
                          <span className="text-xs text-slate-400">
                            {language === 'zh' ? sourceConfig.labelZh : sourceConfig.label}
                          </span>
                          {record.isVerified && (
                            <CheckCircle2 size={12} className="text-emerald-400" />
                          )}
                        </div>
                        <span className="text-sm font-bold text-orange-400">
                          {record.duration.toFixed(1)}h
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <div className="flex items-center gap-2">
                          <Calendar size={10} />
                          <span>{record.recordDate}</span>
                          {record.startTime && record.endTime && (
                            <span>
                              {new Date(record.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                              {' - '}
                              {new Date(record.endTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <User size={10} />
                          <span>{record.userName}</span>
                        </div>
                      </div>
                      {record.description && (
                        <div className="mt-2 text-[10px] text-slate-400 truncate">
                          {record.description}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 数据来源指示器 */}
        <div className="flex items-center justify-center gap-4 pt-2 border-t border-slate-800">
          {Object.entries(SOURCE_CONFIG).slice(0, 4).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <div key={key} className="flex items-center gap-1 text-[10px] text-slate-500">
                <Icon size={10} className={config.color} />
                <span>{language === 'zh' ? config.labelZh : config.label}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
