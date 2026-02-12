import React from 'react';
import { CheckCircle2, Calendar, MessageSquare, Clock, AlertCircle } from 'lucide-react';
import { DashboardWidget } from './DashboardWidget';

interface Task {
  id: string;
  title: string;
  source: string;
  time: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
}

const defaultTasks: Task[] = [
  {
    id: '1',
    title: '完成Q1销售报告',
    source: 'Annual Plan',
    time: '09:00',
    priority: 'high',
    completed: false
  },
  {
    id: '2',
    title: '项目A设计评审',
    source: 'Project Task',
    time: '10:30',
    priority: 'high',
    completed: false
  },
  {
    id: '3',
    title: '客户电话会议',
    source: 'CRM',
    time: '14:00',
    priority: 'medium',
    completed: false
  },
  {
    id: '4',
    title: '团队周会',
    source: 'Teams',
    time: '16:00',
    priority: 'low',
    completed: false
  }
];

interface DailyPlanWidgetProps {
  tasks?: Task[];
  authorized?: boolean;
  userPreferenceShow?: boolean;
  onTaskComplete?: (taskId: string) => void;
}

export const DailyPlanWidget = ({ 
  tasks = defaultTasks, 
  authorized = true,
  userPreferenceShow = true,
  onTaskComplete 
}: DailyPlanWidgetProps) => {
  const pendingCount = tasks.filter(t => !t.completed).length;

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
    }
  };

  const handleTaskClick = (taskId: string) => {
    if (onTaskComplete) {
      onTaskComplete(taskId);
    }
  };

  return (
    <DashboardWidget 
      title="Today's Mission" 
      authorized={authorized}
      userPreferenceShow={userPreferenceShow}
    >
      <div className="bg-[#0f172a] rounded-xl border border-[#1e293b] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#1e293b] flex justify-between items-center bg-[#162032]">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Clock size={16} className="text-orange-500" />
            Today's Mission
          </h3>
          <span className="text-xs bg-orange-600/20 text-orange-400 px-2 py-0.5 rounded">
            {pendingCount} Pending
          </span>
        </div>

        {/* Task List */}
        <div className="divide-y divide-[#1e293b] max-h-[300px] overflow-y-auto">
          {tasks.map(task => (
            <div 
              key={task.id} 
              className={`p-4 flex gap-3 hover:bg-[#1e293b] transition-colors group cursor-pointer ${
                task.completed ? 'opacity-50' : ''
              }`}
              onClick={() => handleTaskClick(task.id)}
            >
              <button 
                className={`mt-0.5 transition-colors ${
                  task.completed 
                    ? 'text-green-500' 
                    : 'text-slate-600 hover:text-green-500'
                }`}
              >
                <CheckCircle2 size={18} />
              </button>
              <div className="flex-1">
                <div className={`text-sm group-hover:text-white transition-colors ${
                  task.completed ? 'text-slate-500 line-through' : 'text-slate-200'
                }`}>
                  {task.title}
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${getPriorityColor(task.priority)}`}></div>
                    {task.source}
                  </span>
                  <span className="text-[10px] text-slate-500">{task.time}</span>
                  {task.priority === 'high' && (
                    <AlertCircle size={12} className="text-red-500" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Copilot Integration Footer */}
        <div className="p-3 bg-[#0a0f1c] border-t border-[#1e293b] flex items-center justify-between">
          <div className="flex gap-2">
            <button 
              className="text-slate-500 hover:text-blue-400 transition-colors" 
              title="Open in Outlook"
            >
              <Calendar size={14}/>
            </button>
            <button 
              className="text-slate-500 hover:text-purple-400 transition-colors" 
              title="Chat in Teams"
            >
              <MessageSquare size={14}/>
            </button>
          </div>
          <span className="text-[10px] text-slate-600 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            Synced via Copilot 365
          </span>
        </div>
      </div>
    </DashboardWidget>
  );
};

export default DailyPlanWidget;
