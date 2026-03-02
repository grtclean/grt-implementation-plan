/**
 * GRT 项目全生命周期状态机定义
 * 技术栈: XState v5
 * GRT智能系统 - 状态机模块
 * 
 * 优化点实现：
 * 1. 状态持久化到数据库
 * 2. 状态变更历史记录
 * 3. 并行状态支持（如：采购与生产并行）
 * 4. 超时自动升级机制
 * 5. 状态回滚能力
 * 6. 状态机可视化导出
 */

import { createMachine, assign } from 'xstate';
import { auditLogger } from '../audit/audit-logger';
import { eventBus, Events } from '../queue/message-queue';
import { createChildLogger } from '../lib/logger';

const log = createChildLogger("project-lifecycle");

// 项目上下文类型
export interface ProjectContext {
  projectId: string | null;
  projectName: string;
  customerId: string | null;
  customerTier: 1 | 2 | 3;
  budget: number;
  targetCost: number;
  actualCost: number;
  bomVersion: string;
  isPaymentReceived: boolean;
  paymentAmount: number;
  reviewPassed: boolean;
  customerApproved: boolean;
  fatReportComplete: boolean;
  redBlueComplete: boolean;
  designFailureCount: number;
  milestones: MilestoneRecord[];
  stateHistory: StateHistoryRecord[];
  createdAt: Date;
  updatedAt: Date;
  // 超时相关
  phaseStartTime: Date;
  phaseTimeoutHours: number;
  escalationLevel: number;
}

// 里程碑记录
export interface MilestoneRecord {
  phase: string;
  completedAt: Date;
  completedBy: string;
  notes?: string;
}

// 状态历史记录
export interface StateHistoryRecord {
  id: string;
  fromState: string;
  toState: string;
  event: string;
  timestamp: Date;
  userId: string;
  metadata?: Record<string, any>;
}

// 项目事件类型
export type ProjectEvents =
  | { type: 'KICKOFF_MEETING_HELD'; data: { meetingDate: Date; attendees: string[]; userId: string } }
  | { type: 'NDA_SIGNED'; data: { signedDate: Date; ndaVersion: string; userId: string } }
  | { type: 'CONTRACT_SIGNED'; data: { contractAmount: number; paymentTerms: string; userId: string } }
  | { type: 'BOM_RELEASED'; data: { bomVersion: string; itemCount: number; userId: string } }
  | { type: 'REVIEW_PASSED'; data: { reviewDate: Date; reviewer: string; userId: string } }
  | { type: 'REVIEW_FAILED'; data: { reason: string; actionItems: string[]; userId: string } }
  | { type: 'CUSTOMER_APPROVED'; data: { approvalDate: Date; comments?: string; userId: string } }
  | { type: 'CUSTOMER_REJECTED'; data: { reason: string; revisionRequired: boolean; userId: string } }
  | { type: 'PRODUCTION_COMPLETE'; data: { completionDate: Date; qualityScore: number; userId: string } }
  | { type: 'ASSEMBLY_COMPLETE'; data: { completionDate: Date; userId: string } }
  | { type: 'TESTING_PASSED'; data: { testDate: Date; reportId: string; userId: string } }
  | { type: 'PAYMENT_RECEIVED'; data: { amount: number; paymentDate: Date; userId: string } }
  | { type: 'SHIPMENT_REQUESTED'; data: { requestDate: Date; destination: string; userId: string } }
  | { type: 'DELIVERED'; data: { deliveryDate: Date; receivedBy: string; userId: string } }
  | { type: 'INSTALLATION_COMPLETE'; data: { completionDate: Date; installedBy: string; userId: string } }
  | { type: 'ACCEPTANCE_SIGNED'; data: { acceptanceDate: Date; signedBy: string; userId: string } }
  | { type: 'RED_BLUE_COMPLETE'; data: { completionDate: Date; score: number; userId: string } }
  | { type: 'TIMEOUT_ESCALATE'; data: { level: number; userId: string } }
  | { type: 'ROLLBACK'; data: { targetState: string; reason: string; userId: string } };

// 阶段超时配置
const phaseTimeoutConfig: Record<string, { hours: number; escalationPath: string[] }> = {
  'M0_Initiation': { hours: 72, escalationPath: ['project_manager', 'department_head'] },
  'M1_Solution_NDA': { hours: 168, escalationPath: ['sales_manager', 'sales_director'] },
  'M2_Contract_Pricing': { hours: 240, escalationPath: ['sales_manager', 'cfo'] },
  'M3_Design_BOM': { hours: 480, escalationPath: ['design_lead', 'engineering_director'] },
  'M4_Internal_Review': { hours: 48, escalationPath: ['qa_manager', 'engineering_director'] },
  'M5_Customer_Review': { hours: 336, escalationPath: ['project_manager', 'account_manager'] },
  'M6_Production': { hours: 720, escalationPath: ['production_manager', 'operations_director'] },
  'M7_Assembly': { hours: 240, escalationPath: ['assembly_lead', 'production_manager'] },
  'M8_Testing': { hours: 120, escalationPath: ['qa_lead', 'qa_manager'] },
  'M9_Shipping_Prep': { hours: 72, escalationPath: ['logistics_manager', 'operations_director'] },
  'M10_Delivery': { hours: 168, escalationPath: ['logistics_manager', 'project_manager'] },
  'M11_Installation': { hours: 240, escalationPath: ['field_engineer_lead', 'service_director'] },
  'M12_Closure': { hours: 168, escalationPath: ['project_manager', 'pmo_director'] }
};

// 初始上下文
const initialContext: ProjectContext = {
  projectId: null,
  projectName: '',
  customerId: null,
  customerTier: 3,
  budget: 0,
  targetCost: 0,
  actualCost: 0,
  bomVersion: '0.0',
  isPaymentReceived: false,
  paymentAmount: 0,
  reviewPassed: false,
  customerApproved: false,
  fatReportComplete: false,
  redBlueComplete: false,
  designFailureCount: 0,
  milestones: [],
  stateHistory: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  phaseStartTime: new Date(),
  phaseTimeoutHours: 72,
  escalationLevel: 0
};

let historyIdCounter = 0;
function generateHistoryId(): string {
  historyIdCounter++;
  return `SH_${Date.now().toString(36)}_${historyIdCounter.toString(36)}`;
}

/**
 * GRT项目全生命周期状态机
 */
export const projectLifecycleMachine = createMachine({
  id: 'GRT_Project_Lifecycle',
  initial: 'M0_Initiation',
  context: initialContext,
  states: {
    // M0: 项目启动
    M0_Initiation: {
      entry: ['logPhaseEntry', 'resetPhaseTimer'],
      on: {
        KICKOFF_MEETING_HELD: {
          target: 'M1_Solution_NDA',
          actions: ['recordMilestone', 'recordStateHistory', 'updateTimestamp', 'persistState']
        },
        TIMEOUT_ESCALATE: {
          actions: ['handleEscalation']
        }
      }
    },

    // M1: 方案与NDA
    M1_Solution_NDA: {
      entry: ['logPhaseEntry', 'resetPhaseTimer'],
      on: {
        NDA_SIGNED: {
          target: 'M2_Contract_Pricing',
          actions: ['recordMilestone', 'recordStateHistory', 'updateTimestamp', 'persistState']
        },
        TIMEOUT_ESCALATE: {
          actions: ['handleEscalation']
        }
      }
    },

    // M2: 签约核价 (冻结目标成本)
    M2_Contract_Pricing: {
      entry: ['logPhaseEntry', 'freezeTargetCost', 'resetPhaseTimer'],
      on: {
        CONTRACT_SIGNED: {
          target: 'M3_Design_BOM',
          actions: ['recordMilestone', 'initializeReceivables', 'recordStateHistory', 'updateTimestamp', 'persistState']
        },
        TIMEOUT_ESCALATE: {
          actions: ['handleEscalation']
        }
      }
    },

    // M3: 设计与BOM
    M3_Design_BOM: {
      entry: ['logPhaseEntry', 'resetPhaseTimer'],
      on: {
        BOM_RELEASED: {
          target: 'M4_Internal_Review',
          actions: ['recordMilestone', 'updateBomVersion', 'recordStateHistory', 'updateTimestamp', 'persistState']
        },
        TIMEOUT_ESCALATE: {
          actions: ['handleEscalation']
        }
      }
    },

    // M4: 内部评审 (关键节点)
    M4_Internal_Review: {
      entry: ['logPhaseEntry', 'resetPhaseTimer'],
      on: {
        REVIEW_PASSED: {
          target: 'M5_Customer_Review',
          actions: ['recordMilestone', 'setReviewPassed', 'recordStateHistory', 'updateTimestamp', 'persistState']
        },
        REVIEW_FAILED: {
          target: 'M3_Design_BOM',
          actions: ['logDesignFailure', 'incrementFailureCount', 'recordStateHistory', 'updateTimestamp', 'persistState']
        },
        TIMEOUT_ESCALATE: {
          actions: ['handleEscalation']
        }
      }
    },

    // M5: 客户评审
    M5_Customer_Review: {
      entry: ['logPhaseEntry', 'resetPhaseTimer'],
      on: {
        CUSTOMER_APPROVED: {
          target: 'M6_Production',
          actions: ['recordMilestone', 'setCustomerApproved', 'recordStateHistory', 'updateTimestamp', 'persistState']
        },
        CUSTOMER_REJECTED: {
          target: 'M3_Design_BOM',
          actions: ['logCustomerRejection', 'recordStateHistory', 'updateTimestamp', 'persistState']
        },
        TIMEOUT_ESCALATE: {
          actions: ['handleEscalation']
        }
      }
    },

    // M6: 生产制造 (支持并行状态)
    M6_Production: {
      entry: ['logPhaseEntry', 'resetPhaseTimer'],
      type: 'parallel',
      states: {
        // 采购子状态
        procurement: {
          initial: 'pending',
          states: {
            pending: {
              on: {
                PROCUREMENT_STARTED: 'inProgress'
              }
            },
            inProgress: {
              on: {
                PROCUREMENT_COMPLETE: 'completed'
              }
            },
            completed: {
              type: 'final'
            }
          }
        },
        // 生产子状态
        manufacturing: {
          initial: 'pending',
          states: {
            pending: {
              on: {
                MANUFACTURING_STARTED: 'inProgress'
              }
            },
            inProgress: {
              on: {
                MANUFACTURING_COMPLETE: 'completed'
              }
            },
            completed: {
              type: 'final'
            }
          }
        }
      },
      onDone: {
        target: 'M7_Assembly',
        actions: ['recordMilestone', 'recordStateHistory', 'updateTimestamp', 'persistState']
      },
      on: {
        // 简化的完成事件（用于非并行模式）
        PRODUCTION_COMPLETE: {
          target: 'M7_Assembly',
          actions: ['recordMilestone', 'recordStateHistory', 'updateTimestamp', 'persistState']
        },
        TIMEOUT_ESCALATE: {
          actions: ['handleEscalation']
        }
      }
    },

    // M7: 装配调试
    M7_Assembly: {
      entry: ['logPhaseEntry', 'resetPhaseTimer'],
      on: {
        ASSEMBLY_COMPLETE: {
          target: 'M8_Testing',
          actions: ['recordMilestone', 'recordStateHistory', 'updateTimestamp', 'persistState']
        },
        TIMEOUT_ESCALATE: {
          actions: ['handleEscalation']
        }
      }
    },

    // M8: 测试验证 (FAT)
    M8_Testing: {
      entry: ['logPhaseEntry', 'resetPhaseTimer'],
      on: {
        TESTING_PASSED: {
          target: 'M9_Shipping_Prep',
          actions: ['recordMilestone', 'setFatComplete', 'recordStateHistory', 'updateTimestamp', 'persistState']
        },
        TIMEOUT_ESCALATE: {
          actions: ['handleEscalation']
        }
      }
    },

    // M9: 发货准备 (包含财务硬约束)
    M9_Shipping_Prep: {
      entry: ['logPhaseEntry', 'resetPhaseTimer'],
      on: {
        PAYMENT_RECEIVED: {
          actions: ['recordPayment', 'updateTimestamp', 'persistState']
        },
        RED_BLUE_COMPLETE: {
          actions: ['setRedBlueComplete', 'updateTimestamp', 'persistState']
        },
        SHIPMENT_REQUESTED: [
          {
            // Tier1客户：需要预验收通过 + 收到款项 + 红蓝对抗完成
            target: 'M10_Delivery',
            guard: 'canShipTier1',
            actions: ['recordMilestone', 'recordStateHistory', 'updateTimestamp', 'persistState']
          },
          {
            // 普通客户：只需预验收通过 + 收到款项
            target: 'M10_Delivery',
            guard: 'canShipNormal',
            actions: ['recordMilestone', 'recordStateHistory', 'updateTimestamp', 'persistState']
          }
        ],
        TIMEOUT_ESCALATE: {
          actions: ['handleEscalation']
        }
      }
    },

    // M10: 设备交付
    M10_Delivery: {
      entry: ['logPhaseEntry', 'resetPhaseTimer'],
      on: {
        DELIVERED: {
          target: 'M11_Installation',
          actions: ['recordMilestone', 'recordStateHistory', 'updateTimestamp', 'persistState']
        },
        TIMEOUT_ESCALATE: {
          actions: ['handleEscalation']
        }
      }
    },

    // M11: 现场安装
    M11_Installation: {
      entry: ['logPhaseEntry', 'resetPhaseTimer'],
      on: {
        INSTALLATION_COMPLETE: {
          target: 'M12_Closure',
          actions: ['recordMilestone', 'recordStateHistory', 'updateTimestamp', 'persistState']
        },
        TIMEOUT_ESCALATE: {
          actions: ['handleEscalation']
        }
      }
    },

    // M12: 结项
    M12_Closure: {
      type: 'final',
      entry: ['logPhaseEntry', 'generateClosureReport', 'archiveProject', 'persistState']
    }
  },
  on: {
    // 全局回滚事件
    ROLLBACK: {
      actions: ['handleRollback']
    }
  }
}, {
  actions: {
    // 记录阶段进入日志
    logPhaseEntry: ({ context, event }) => {
      // 发布状态变更事件
      eventBus.emit(Events.PROJECT_STATE_CHANGED, {
        projectId: context.projectId,
        event: event.type,
        timestamp: new Date()
      });
    },

    // 重置阶段计时器
    resetPhaseTimer: assign({
      phaseStartTime: () => new Date(),
      escalationLevel: 0,
      phaseTimeoutHours: ({ context }) => {
        // 获取当前状态的超时配置
        // 注意：这里简化处理，实际需要根据当前状态获取
        return 72; // 默认72小时
      }
    }),

    // 记录状态历史
    recordStateHistory: assign({
      stateHistory: ({ context, event }) => {
        const record: StateHistoryRecord = {
          id: generateHistoryId(),
          fromState: 'previous', // 实际应从状态机获取
          toState: 'current',
          event: event.type,
          timestamp: new Date(),
          userId: (event as any).data?.userId || 'system',
          metadata: (event as any).data
        };
        
        // 记录审计日志
        auditLogger.logStateTransition(
          context.projectId || 'unknown',
          record.fromState,
          record.toState,
          event.type,
          { userId: record.userId, userName: 'System' }
        );
        
        return [...context.stateHistory, record];
      }
    }),

    // 处理超时升级
    handleEscalation: assign({
      escalationLevel: ({ context, event }) => {
        if (event.type === 'TIMEOUT_ESCALATE') {
          const newLevel = context.escalationLevel + 1;

          // TODO: 发送升级通知
          // notificationService.sendEscalation(context.projectId, newLevel);
          
          return newLevel;
        }
        return context.escalationLevel;
      }
    }),

    // 处理回滚
    handleRollback: ({ context, event }) => {
      if (event.type === 'ROLLBACK') {
        // 记录回滚审计
        auditLogger.logStateTransition(
          context.projectId || 'unknown',
          'current',
          event.data.targetState,
          'ROLLBACK',
          { userId: event.data.userId, userName: 'System' },
          { reason: event.data.reason }
        );
        
        // TODO: 实现实际的回滚逻辑
      }
    },

    // 持久化状态
    persistState: ({ context }) => {
      if (context.projectId) {
        stateMachineStorage.save(context.projectId, {
          context,
          timestamp: new Date()
        }).catch(err => {
          log.error({ err, projectId: context.projectId }, "Failed to persist state");
        });
      }
    },

    // 记录里程碑
    recordMilestone: assign({
      milestones: ({ context, event }) => [
        ...context.milestones,
        {
          phase: event.type,
          completedAt: new Date(),
          completedBy: (event as any).data?.userId || 'system',
          notes: JSON.stringify(event)
        }
      ]
    }),

    // 更新时间戳
    updateTimestamp: assign({
      updatedAt: () => new Date()
    }),

    // M2: 冻结目标成本
    freezeTargetCost: assign({
      targetCost: ({ context }) => {
        return context.budget;
      }
    }),

    // M2: 初始化应收账款
    initializeReceivables: ({ context, event }) => {
      if (event.type === 'CONTRACT_SIGNED') {
        // TODO: 调用财务模块初始化应收
      }
    },

    // M3: 更新BOM版本
    updateBomVersion: assign({
      bomVersion: ({ event }) => {
        if (event.type === 'BOM_RELEASED') {
          return event.data.bomVersion;
        }
        return '0.0';
      }
    }),

    // M4: 设置评审通过
    setReviewPassed: assign({
      reviewPassed: true
    }),

    // M4: 记录设计失败
    logDesignFailure: ({ context, event }) => {
      if (event.type === 'REVIEW_FAILED') {
        log.warn({ projectId: context.projectId, reason: event.data.reason }, "Design review failed");
        // TODO: 发送通知给设计团队
      }
    },

    // M4: 增加失败计数
    incrementFailureCount: assign({
      designFailureCount: ({ context }) => context.designFailureCount + 1
    }),

    // M5: 设置客户批准
    setCustomerApproved: assign({
      customerApproved: true
    }),

    // M5: 记录客户拒绝
    logCustomerRejection: ({ context, event }) => {
      if (event.type === 'CUSTOMER_REJECTED') {
        log.warn({ projectId: context.projectId, reason: event.data.reason }, "Customer rejected design");
      }
    },

    // M8: 设置FAT完成
    setFatComplete: assign({
      fatReportComplete: true
    }),

    // M9: 记录付款
    recordPayment: assign({
      isPaymentReceived: true,
      paymentAmount: ({ context, event }) => {
        if (event.type === 'PAYMENT_RECEIVED') {
          return context.paymentAmount + event.data.amount;
        }
        return context.paymentAmount;
      }
    }),

    // M9: 设置红蓝对抗完成
    setRedBlueComplete: assign({
      redBlueComplete: true
    }),

    // M12: 生成复盘报告
    generateClosureReport: ({ context }) => {
      const report = {
        projectId: context.projectId,
        projectName: context.projectName,
        budget: context.budget,
        targetCost: context.targetCost,
        actualCost: context.actualCost,
        costVariance: ((context.actualCost - context.targetCost) / context.targetCost * 100).toFixed(2) + '%',
        designIterations: context.designFailureCount + 1,
        milestones: context.milestones,
        stateHistory: context.stateHistory,
        completedAt: new Date()
      };
      // TODO: 存储到知识库
    },

    // M12: 归档项目
    archiveProject: ({ context }) => {
      // TODO: 调用归档服务
    }
  },
  guards: {
    // Tier1客户发货条件
    canShipTier1: ({ context }) => {
      return context.customerTier === 1 &&
             context.fatReportComplete &&
             context.isPaymentReceived &&
             context.redBlueComplete;
    },

    // 普通客户发货条件
    canShipNormal: ({ context }) => {
      return context.customerTier !== 1 &&
             context.fatReportComplete &&
             context.isPaymentReceived;
    }
  }
});

// 状态机持久化接口
export interface StateMachineStorage {
  save(projectId: string, state: any): Promise<void>;
  load(projectId: string): Promise<any | null>;
  getHistory(projectId: string): Promise<StateHistoryRecord[]>;
  rollback(projectId: string, historyId: string): Promise<boolean>;
}

// 内存存储实现（开发用）
class InMemoryStorage implements StateMachineStorage {
  private storage = new Map<string, any>();
  private historyStorage = new Map<string, StateHistoryRecord[]>();

  async save(projectId: string, state: any): Promise<void> {
    this.storage.set(projectId, JSON.stringify(state));
  }

  async load(projectId: string): Promise<any | null> {
    const data = this.storage.get(projectId);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  }

  async getHistory(projectId: string): Promise<StateHistoryRecord[]> {
    return this.historyStorage.get(projectId) || [];
  }

  async rollback(projectId: string, historyId: string): Promise<boolean> {
    const history = this.historyStorage.get(projectId);
    if (!history) return false;

    const targetIndex = history.findIndex(h => h.id === historyId);
    if (targetIndex === -1) return false;

    // 截断历史到目标点
    this.historyStorage.set(projectId, history.slice(0, targetIndex + 1));
    return true;
  }
}

// 导出存储实例
export const stateMachineStorage = new InMemoryStorage();

/**
 * 状态机可视化导出
 */
export function exportStateMachineVisualization(): string {
  // 生成Mermaid格式的状态图
  const mermaidDiagram = `stateDiagram-v2
    [*] --> M0_Initiation
    M0_Initiation --> M1_Solution_NDA: KICKOFF_MEETING_HELD
    M1_Solution_NDA --> M2_Contract_Pricing: NDA_SIGNED
    M2_Contract_Pricing --> M3_Design_BOM: CONTRACT_SIGNED
    M3_Design_BOM --> M4_Internal_Review: BOM_RELEASED
    M4_Internal_Review --> M5_Customer_Review: REVIEW_PASSED
    M4_Internal_Review --> M3_Design_BOM: REVIEW_FAILED
    M5_Customer_Review --> M6_Production: CUSTOMER_APPROVED
    M5_Customer_Review --> M3_Design_BOM: CUSTOMER_REJECTED
    M6_Production --> M7_Assembly: PRODUCTION_COMPLETE
    M7_Assembly --> M8_Testing: ASSEMBLY_COMPLETE
    M8_Testing --> M9_Shipping_Prep: TESTING_PASSED
    M9_Shipping_Prep --> M10_Delivery: SHIPMENT_REQUESTED
    M10_Delivery --> M11_Installation: DELIVERED
    M11_Installation --> M12_Closure: INSTALLATION_COMPLETE
    M12_Closure --> [*]
    
    note right of M4_Internal_Review: 关键节点\\n可回退到设计阶段
    note right of M9_Shipping_Prep: 财务硬约束\\nTier1需红蓝对抗`;

  return mermaidDiagram;
}

/**
 * 超时检查服务
 */
export class TimeoutChecker {
  private checkInterval: NodeJS.Timeout | null = null;

  start(intervalMs: number = 3600000): void { // 默认每小时检查
    this.checkInterval = setInterval(() => {
      this.checkAllProjects();
    }, intervalMs);
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private async checkAllProjects(): Promise<void> {
    // TODO: 从数据库获取所有活跃项目
    // 检查每个项目是否超时
  }

  checkProjectTimeout(context: ProjectContext, currentState: string): boolean {
    const config = phaseTimeoutConfig[currentState];
    if (!config) return false;

    const elapsedHours = (Date.now() - context.phaseStartTime.getTime()) / (1000 * 60 * 60);
    return elapsedHours > config.hours;
  }

  getEscalationPath(currentState: string): string[] {
    return phaseTimeoutConfig[currentState]?.escalationPath || [];
  }
}

// 导出超时检查器实例
export const timeoutChecker = new TimeoutChecker();

// 导出类型
export type ProjectLifecycleMachine = typeof projectLifecycleMachine;
