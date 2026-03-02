/**
 * 消息队列服务 (Message Queue)
 *
 * 功能：提供异步任务处理和事件驱动架构支持
 *
 * 队列类型：
 * 1. 任务队列 - 异步任务处理
 * 2. 事件队列 - 事件发布订阅
 * 3. 延迟队列 - 定时任务
 * 4. 优先级队列 - 优先级任务处理
 */

import { createChildLogger } from "../lib/logger";

const log = createChildLogger("message-queue");

// 任务状态
export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

// 任务优先级
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';

// 任务定义
export interface Task<T = any> {
  id: string;
  type: string;
  payload: T;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: Date;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  retries: number;
  maxRetries: number;
  result?: any;
  error?: string;
  metadata?: Record<string, any>;
}

// 任务处理器
export type TaskHandler<T = any, R = any> = (task: Task<T>) => Promise<R>;

// 事件监听器
export type EventListener<T = any> = (event: T) => void | Promise<void>;

// 队列配置
export interface QueueConfig {
  maxConcurrency: number;
  defaultRetries: number;
  retryDelay: number;
  processInterval: number;
}

// 默认配置
const defaultConfig: QueueConfig = {
  maxConcurrency: 5,
  defaultRetries: 3,
  retryDelay: 5000,
  processInterval: 1000
};

// 优先级权重
const priorityWeights: Record<TaskPriority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1
};

let taskIdCounter = 0;

/**
 * 生成任务ID
 */
function generateTaskId(): string {
  taskIdCounter++;
  return `TASK_${Date.now().toString(36)}_${taskIdCounter.toString(36)}`;
}

/**
 * 任务队列类
 */
export class TaskQueue<T = any, R = any> {
  private queue: Task<T>[] = [];
  private handlers: Map<string, TaskHandler<T, R>> = new Map();
  private config: QueueConfig;
  private processing: number = 0;
  private processTimer?: NodeJS.Timeout;
  private paused: boolean = false;

  constructor(config: Partial<QueueConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * 注册任务处理器
   */
  registerHandler(type: string, handler: TaskHandler<T, R>): void {
    this.handlers.set(type, handler);
  }

  /**
   * 添加任务
   */
  enqueue(
    type: string,
    payload: T,
    options?: {
      priority?: TaskPriority;
      scheduledAt?: Date;
      maxRetries?: number;
      metadata?: Record<string, any>;
    }
  ): Task<T> {
    const task: Task<T> = {
      id: generateTaskId(),
      type,
      payload,
      priority: options?.priority || 'normal',
      status: 'pending',
      createdAt: new Date(),
      scheduledAt: options?.scheduledAt,
      retries: 0,
      maxRetries: options?.maxRetries ?? this.config.defaultRetries,
      metadata: options?.metadata
    };

    // 按优先级插入
    const insertIndex = this.findInsertIndex(task);
    this.queue.splice(insertIndex, 0, task);

    return task;
  }

  /**
   * 查找插入位置（按优先级排序）
   */
  private findInsertIndex(task: Task<T>): number {
    const weight = priorityWeights[task.priority];
    for (let i = 0; i < this.queue.length; i++) {
      if (priorityWeights[this.queue[i].priority] < weight) {
        return i;
      }
    }
    return this.queue.length;
  }

  /**
   * 启动队列处理
   */
  start(): void {
    if (this.processTimer) return;

    this.paused = false;
    this.processTimer = setInterval(() => {
      this.processNext();
    }, this.config.processInterval);
  }

  /**
   * 停止队列处理
   */
  stop(): void {
    if (this.processTimer) {
      clearInterval(this.processTimer);
      this.processTimer = undefined;
    }
    this.paused = true;
  }

  /**
   * 暂停队列
   */
  pause(): void {
    this.paused = true;
  }

  /**
   * 恢复队列
   */
  resume(): void {
    this.paused = false;
  }

  /**
   * 处理下一个任务
   */
  private async processNext(): Promise<void> {
    if (this.paused) return;
    if (this.processing >= this.config.maxConcurrency) return;

    // 查找可处理的任务
    const taskIndex = this.queue.findIndex(task => {
      if (task.status !== 'pending') return false;
      if (task.scheduledAt && task.scheduledAt > new Date()) return false;
      return true;
    });

    if (taskIndex === -1) return;

    const task = this.queue[taskIndex];
    const handler = this.handlers.get(task.type);

    if (!handler) {
      log.error({ taskType: task.type }, "No handler for task type");
      task.status = 'failed';
      task.error = `No handler registered for type: ${task.type}`;
      return;
    }

    // 开始处理
    task.status = 'processing';
    task.startedAt = new Date();
    this.processing++;

    try {
      const result = await handler(task);
      task.status = 'completed';
      task.completedAt = new Date();
      task.result = result;
    } catch (error) {
      task.retries++;
      task.error = error instanceof Error ? error.message : String(error);

      if (task.retries < task.maxRetries) {
        // 重试
        task.status = 'pending';
        task.scheduledAt = new Date(Date.now() + this.config.retryDelay);
      } else {
        task.status = 'failed';
        log.error({ taskId: task.id, error: task.error }, "Task failed");
      }
    } finally {
      this.processing--;
    }
  }

  /**
   * 获取任务状态
   */
  getTask(taskId: string): Task<T> | undefined {
    return this.queue.find(t => t.id === taskId);
  }

  /**
   * 取消任务
   */
  cancelTask(taskId: string): boolean {
    const task = this.queue.find(t => t.id === taskId);
    if (task && task.status === 'pending') {
      task.status = 'cancelled';
      return true;
    }
    return false;
  }

  /**
   * 获取队列统计
   */
  getStats(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    cancelled: number;
  } {
    const stats = {
      total: this.queue.length,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0
    };

    for (const task of this.queue) {
      stats[task.status]++;
    }

    return stats;
  }

  /**
   * 清理已完成的任务
   */
  cleanup(olderThan?: Date): number {
    const cutoff = olderThan || new Date(Date.now() - 3600000); // 默认1小时
    const initialLength = this.queue.length;

    this.queue = this.queue.filter(task => {
      if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
        return task.completedAt && task.completedAt > cutoff;
      }
      return true;
    });

    return initialLength - this.queue.length;
  }
}

/**
 * 事件总线类
 */
export class EventBus {
  private listeners: Map<string, Set<EventListener>> = new Map();

  /**
   * 订阅事件
   */
  on<T>(event: string, listener: EventListener<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as EventListener);

    // 返回取消订阅函数
    return () => {
      this.off(event, listener);
    };
  }

  /**
   * 取消订阅
   */
  off<T>(event: string, listener: EventListener<T>): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener as EventListener);
    }
  }

  /**
   * 发布事件
   */
  async emit<T>(event: string, data: T): Promise<void> {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners) return;

    const promises: Promise<void>[] = [];
    for (const listener of Array.from(eventListeners)) {
      try {
        const result = listener(data);
        if (result instanceof Promise) {
          promises.push(result);
        }
      } catch (error) {
        log.error({ err: error, event }, "Error in event listener");
      }
    }

    await Promise.all(promises);
  }

  /**
   * 一次性订阅
   */
  once<T>(event: string, listener: EventListener<T>): void {
    const wrapper: EventListener<T> = (data) => {
      this.off(event, wrapper);
      return listener(data);
    };
    this.on(event, wrapper);
  }

  /**
   * 获取事件列表
   */
  getEvents(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * 获取监听器数量
   */
  listenerCount(event: string): number {
    return this.listeners.get(event)?.size || 0;
  }
}

// 预定义队列实例
export const aiTaskQueue = new TaskQueue({ maxConcurrency: 3 });
export const notificationQueue = new TaskQueue({ maxConcurrency: 10 });
export const reportQueue = new TaskQueue({ maxConcurrency: 2 });

// 全局事件总线
export const eventBus = new EventBus();

// 预定义事件类型
export const Events = {
  // 项目事件
  PROJECT_CREATED: 'project:created',
  PROJECT_UPDATED: 'project:updated',
  PROJECT_STATE_CHANGED: 'project:state_changed',
  
  // AI事件
  AI_DECISION_MADE: 'ai:decision_made',
  AI_SUGGESTION_BLOCKED: 'ai:suggestion_blocked',
  
  // 用户事件
  USER_LOGIN: 'user:login',
  USER_LOGOUT: 'user:logout',
  
  // 系统事件
  SYSTEM_ALERT: 'system:alert',
  SYSTEM_ERROR: 'system:error'
} as const;
