/**
 * Meeting Service API Layer
 * Sprint 4: 数据持久化准备
 * 
 * 将本地存储mock替换为API调用，指向 process.env.REACT_APP_API_URL
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// 会议类型定义
export interface Meeting {
  id: string;
  title: string;
  type: 'production' | 'monthly' | 'project' | 'team' | 'individual';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  startTime: string;
  endTime?: string;
  participants: string[];
  agenda: AgendaItem[];
  notes: string;
  actionItems: ActionItem[];
  aiInsights?: AIInsight[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface AgendaItem {
  id: string;
  title: string;
  duration: number; // 分钟
  completed: boolean;
  notes?: string;
}

export interface ActionItem {
  id: string;
  content: string;
  assignee?: string;
  dueDate?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

export interface AIInsight {
  id: string;
  type: 'summary' | 'action' | 'decision' | 'risk' | 'followup';
  content: string;
  confidence: number;
  createdAt: string;
}

// API 响应类型
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 通用请求函数
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('API request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// 会议服务 API
export const meetingService = {
  // 获取所有会议
  async getMeetings(filters?: {
    type?: Meeting['type'];
    status?: Meeting['status'];
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<Meeting[]>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    const queryString = params.toString();
    return apiRequest<Meeting[]>(`/meetings${queryString ? `?${queryString}` : ''}`);
  },

  // 获取单个会议
  async getMeeting(id: string): Promise<ApiResponse<Meeting>> {
    return apiRequest<Meeting>(`/meetings/${id}`);
  },

  // 创建会议
  async createMeeting(meeting: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Meeting>> {
    return apiRequest<Meeting>('/meetings', {
      method: 'POST',
      body: JSON.stringify(meeting),
    });
  },

  // 更新会议
  async updateMeeting(id: string, updates: Partial<Meeting>): Promise<ApiResponse<Meeting>> {
    return apiRequest<Meeting>(`/meetings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  // 删除会议
  async deleteMeeting(id: string): Promise<ApiResponse<void>> {
    return apiRequest<void>(`/meetings/${id}`, {
      method: 'DELETE',
    });
  },

  // 更新会议笔记
  async updateNotes(id: string, notes: string): Promise<ApiResponse<Meeting>> {
    return apiRequest<Meeting>(`/meetings/${id}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    });
  },

  // 添加行动项
  async addActionItem(meetingId: string, actionItem: Omit<ActionItem, 'id' | 'createdAt'>): Promise<ApiResponse<ActionItem>> {
    return apiRequest<ActionItem>(`/meetings/${meetingId}/action-items`, {
      method: 'POST',
      body: JSON.stringify(actionItem),
    });
  },

  // 更新行动项状态
  async updateActionItem(
    meetingId: string,
    actionItemId: string,
    updates: Partial<ActionItem>
  ): Promise<ApiResponse<ActionItem>> {
    return apiRequest<ActionItem>(`/meetings/${meetingId}/action-items/${actionItemId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  // 提取行动项（AI）
  async extractActionItems(meetingId: string, notes: string): Promise<ApiResponse<ActionItem[]>> {
    return apiRequest<ActionItem[]>(`/meetings/${meetingId}/extract-actions`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },

  // 生成AI洞察
  async generateInsights(meetingId: string): Promise<ApiResponse<AIInsight[]>> {
    return apiRequest<AIInsight[]>(`/meetings/${meetingId}/insights`, {
      method: 'POST',
    });
  },

  // 更新议程项状态
  async updateAgendaItem(
    meetingId: string,
    agendaItemId: string,
    updates: Partial<AgendaItem>
  ): Promise<ApiResponse<AgendaItem>> {
    return apiRequest<AgendaItem>(`/meetings/${meetingId}/agenda/${agendaItemId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },
};

// 本地存储回退（用于离线或API不可用时）
export const localMeetingStorage = {
  STORAGE_KEY: 'grt_meetings',

  getMeetings(): Meeting[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  saveMeeting(meeting: Meeting): void {
    const meetings = this.getMeetings();
    const index = meetings.findIndex(m => m.id === meeting.id);
    if (index >= 0) {
      meetings[index] = meeting;
    } else {
      meetings.push(meeting);
    }
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(meetings));
  },

  deleteMeeting(id: string): void {
    const meetings = this.getMeetings().filter(m => m.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(meetings));
  },
};

export default meetingService;
