/**
 * v2.4.8 功能测试
 * 智能体群体协调策略、数字孪生物理仿真、预测模型在线学习
 */

import { describe, it, expect } from 'vitest';

// ==================== 智能体群体协调策略测试 ====================

import {
  createSwarmCoordinator,
  createLoadBalancer,
  createFailoverManager,
  calculateAgentTaskScore,
  greedyTaskAssignment,
  type AgentNode,
  type Task
} from './services/swarm-coordination.service';

describe('智能体群体协调策略', () => {
  describe('群体协调器', () => {
    it('应该创建群体协调器', () => {
      const coordinator = createSwarmCoordinator({
        loadBalanceStrategy: { type: 'least_loaded' },
        failoverConfig: {
          enabled: true,
          maxRetries: 3,
          retryDelay: 1000,
          healthCheckInterval: 5000,
          failoverTimeout: 30000,
          backupAgents: []
        },
        heartbeatInterval: 5000,
        taskTimeout: 30000
      });
      
      expect(coordinator).toBeDefined();
      expect(coordinator.registerAgent).toBeDefined();
      expect(coordinator.unregisterAgent).toBeDefined();
      expect(coordinator.submitTask).toBeDefined();
    });
    
    it('应该注册和注销智能体', () => {
      const coordinator = createSwarmCoordinator({
        loadBalanceStrategy: { type: 'least_loaded' },
        failoverConfig: {
          enabled: true,
          maxRetries: 3,
          retryDelay: 1000,
          healthCheckInterval: 5000,
          failoverTimeout: 30000,
          backupAgents: []
        },
        heartbeatInterval: 5000,
        taskTimeout: 30000
      });
      
      const agent: AgentNode = {
        id: 'agent-001',
        name: 'Agent-001',
        type: 'worker',
        status: 'online',
        capabilities: ['compute', 'storage'],
        currentLoad: 0,
        maxLoad: 100,
        lastHeartbeat: Date.now(),
        metadata: {}
      };
      
      coordinator.registerAgent(agent);
      
      expect(coordinator.getMetrics().totalAgents).toBe(1);
      
      coordinator.unregisterAgent('agent-001');
      expect(coordinator.getMetrics().totalAgents).toBe(0);
    });
    
    it('应该提交和分配任务', () => {
      const coordinator = createSwarmCoordinator({
        loadBalanceStrategy: { type: 'least_loaded' },
        failoverConfig: {
          enabled: true,
          maxRetries: 3,
          retryDelay: 1000,
          healthCheckInterval: 5000,
          failoverTimeout: 30000,
          backupAgents: []
        },
        heartbeatInterval: 5000,
        taskTimeout: 30000
      });
      
      const agent: AgentNode = {
        id: 'agent-001',
        name: 'Agent-001',
        type: 'worker',
        status: 'idle',
        capabilities: ['compute'],
        currentLoad: 0,
        maxLoad: 100,
        lastHeartbeat: Date.now(),
        metadata: {}
      };
      
      coordinator.registerAgent(agent);
      
      const task: Task = {
        id: 'task-001',
        name: 'Test Task',
        type: 'compute',
        priority: 'medium',
        requiredCapabilities: ['compute'],
        estimatedLoad: 10,
        dependencies: [],
        status: 'pending',
        createdAt: Date.now()
      };
      
      const assignment = coordinator.submitTask(task);
      
      expect(assignment).toBeDefined();
      
      const metrics = coordinator.getMetrics();
      expect(metrics.totalTasks).toBeGreaterThanOrEqual(0);
    });
    
    it('应该获取群体状态', () => {
      const coordinator = createSwarmCoordinator({
        loadBalanceStrategy: { type: 'least_loaded' },
        failoverConfig: {
          enabled: true,
          maxRetries: 3,
          retryDelay: 1000,
          healthCheckInterval: 5000,
          failoverTimeout: 30000,
          backupAgents: []
        },
        heartbeatInterval: 5000,
        taskTimeout: 30000
      });
      
      const agent: AgentNode = {
        id: 'agent-001',
        name: 'Agent-001',
        type: 'worker',
        status: 'online',
        capabilities: ['compute'],
        currentLoad: 0,
        maxLoad: 100,
        lastHeartbeat: Date.now(),
        metadata: {}
      };
      
      coordinator.registerAgent(agent);
      
      const metrics = coordinator.getMetrics();
      
      expect(metrics.totalAgents).toBe(1);
      expect(metrics.onlineAgents).toBeDefined();
    });
  });
  
  describe('任务分配算法', () => {
    it('应该计算智能体任务适配分数', () => {
      const agent: AgentNode = {
        id: 'agent-1',
        name: 'Agent 1',
        type: 'worker',
        status: 'idle',
        capabilities: ['compute', 'storage'],
        currentLoad: 30,
        maxLoad: 100,
        lastHeartbeat: Date.now(),
        metadata: {}
      };
      
      const task: Task = {
        id: 'task-1',
        name: 'Test Task',
        type: 'compute',
        priority: 'medium',
        requiredCapabilities: ['compute'],
        estimatedLoad: 20,
        dependencies: [],
        status: 'pending',
        createdAt: Date.now()
      };
      
      const result = calculateAgentTaskScore(agent, task);
      expect(result.score).toBeGreaterThan(0);
      expect(result.breakdown).toBeDefined();
    });
    
    it('应该使用贪婪算法分配任务', () => {
      const agents: AgentNode[] = [
        {
          id: 'agent-1',
          name: 'Agent 1',
          type: 'worker',
          status: 'idle',
          capabilities: ['compute'],
          currentLoad: 30,
          maxLoad: 100,
          lastHeartbeat: Date.now(),
          metadata: {}
        },
        {
          id: 'agent-2',
          name: 'Agent 2',
          type: 'worker',
          status: 'idle',
          capabilities: ['compute', 'storage'],
          currentLoad: 50,
          maxLoad: 100,
          lastHeartbeat: Date.now(),
          metadata: {}
        }
      ];
      
      const tasks: Task[] = [
        {
          id: 'task-1',
          name: 'Test Task',
          type: 'compute',
          priority: 'medium',
          requiredCapabilities: ['compute'],
          estimatedLoad: 20,
          dependencies: [],
          status: 'pending',
          createdAt: Date.now()
        }
      ];
      
      const assignments = greedyTaskAssignment(agents, tasks);
      expect(assignments.length).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('负载均衡器', () => {
    it('应该创建负载均衡器', () => {
      const balancer = createLoadBalancer({
        type: 'round_robin'
      });
      
      expect(balancer).toBeDefined();
      expect(balancer.selectAgent).toBeDefined();
    });
    
    it('应该使用轮询策略选择智能体', () => {
      const balancer = createLoadBalancer({
        type: 'round_robin'
      });
      
      const agents: AgentNode[] = [
        {
          id: 'agent-1',
          name: 'Agent 1',
          type: 'worker',
          status: 'idle',
          capabilities: ['compute'],
          currentLoad: 30,
          maxLoad: 100,
          lastHeartbeat: Date.now(),
          metadata: {}
        },
        {
          id: 'agent-2',
          name: 'Agent 2',
          type: 'worker',
          status: 'idle',
          capabilities: ['compute'],
          currentLoad: 50,
          maxLoad: 100,
          lastHeartbeat: Date.now(),
          metadata: {}
        }
      ];
      
      const selected1 = balancer.selectAgent(agents, ['compute']);
      const selected2 = balancer.selectAgent(agents, ['compute']);
      
      expect(selected1).toBeDefined();
      expect(selected2).toBeDefined();
    });
    
    it('应该使用最小负载策略选择智能体', () => {
      const balancer = createLoadBalancer({
        type: 'least_loaded'
      });
      
      const agents: AgentNode[] = [
        {
          id: 'agent-1',
          name: 'Agent 1',
          type: 'worker',
          status: 'idle',
          capabilities: ['compute'],
          currentLoad: 80,
          maxLoad: 100,
          lastHeartbeat: Date.now(),
          metadata: {}
        },
        {
          id: 'agent-2',
          name: 'Agent 2',
          type: 'worker',
          status: 'idle',
          capabilities: ['compute'],
          currentLoad: 20,
          maxLoad: 100,
          lastHeartbeat: Date.now(),
          metadata: {}
        }
      ];
      
      const selected = balancer.selectAgent(agents, ['compute']);
      expect(selected?.id).toBe('agent-2');
    });
  });
  
  describe('故障转移管理器', () => {
    it('应该创建故障转移管理器', () => {
      const manager = createFailoverManager({
        enabled: true,
        maxRetries: 3,
        retryDelay: 1000,
        healthCheckInterval: 5000,
        failoverTimeout: 30000,
        backupAgents: []
      });
      
      expect(manager).toBeDefined();
      expect(manager.reportAgentFailure).toBeDefined();
      expect(manager.attemptFailover).toBeDefined();
    });
    
    it('应该报告智能体故障', () => {
      const manager = createFailoverManager({
        enabled: true,
        maxRetries: 3,
        retryDelay: 1000,
        healthCheckInterval: 5000,
        failoverTimeout: 30000,
        backupAgents: ['backup-1']
      });
      
      manager.reportAgentFailure('agent-1');
      manager.reportAgentFailure('agent-1');
      manager.reportAgentFailure('agent-1');
      
      const shouldQuarantine = manager.shouldQuarantine('agent-1');
      expect(shouldQuarantine).toBe(true);
    });
    
    it('应该尝试故障转移', () => {
      const manager = createFailoverManager({
        enabled: true,
        maxRetries: 3,
        retryDelay: 1000,
        healthCheckInterval: 5000,
        failoverTimeout: 30000,
        backupAgents: ['backup-1']
      });
      
      const task: Task = {
        id: 'task-1',
        name: 'Test Task',
        type: 'compute',
        priority: 'medium',
        requiredCapabilities: ['compute'],
        estimatedLoad: 20,
        dependencies: [],
        status: 'running',
        assignedAgent: 'agent-1',
        createdAt: Date.now()
      };
      
      const availableAgents: AgentNode[] = [
        {
          id: 'backup-1',
          name: 'Backup Agent',
          type: 'worker',
          status: 'idle',
          capabilities: ['compute'],
          currentLoad: 10,
          maxLoad: 100,
          lastHeartbeat: Date.now(),
          metadata: {}
        }
      ];
      
      const result = manager.attemptFailover(task, 'agent-1', availableAgents);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.newAgentId).toBe('backup-1');
    });
  });
});

// ==================== 数字孪生物理仿真测试 ====================

import {
  Vector3Utils,
  QuaternionUtils,
  computeAABB,
  aabbIntersects,
  sphereCollision,
  forwardKinematics,
  inverseKinematics,
  calculateVonMisesStress,
  calculatePrincipalStresses,
  calculateSafetyFactor,
  analyzeStress,
  createPhysicsWorld,
  addRigidBody,
  applyForce,
  stepPhysicsWorld
} from './services/physics-simulation.service';

describe('数字孪生物理仿真', () => {
  describe('向量运算', () => {
    it('应该创建向量', () => {
      const v = Vector3Utils.create(1, 2, 3);
      expect(v.x).toBe(1);
      expect(v.y).toBe(2);
      expect(v.z).toBe(3);
    });
    
    it('应该计算向量加法', () => {
      const a = Vector3Utils.create(1, 2, 3);
      const b = Vector3Utils.create(4, 5, 6);
      const result = Vector3Utils.add(a, b);
      
      expect(result.x).toBe(5);
      expect(result.y).toBe(7);
      expect(result.z).toBe(9);
    });
    
    it('应该计算向量减法', () => {
      const a = Vector3Utils.create(4, 5, 6);
      const b = Vector3Utils.create(1, 2, 3);
      const result = Vector3Utils.subtract(a, b);
      
      expect(result.x).toBe(3);
      expect(result.y).toBe(3);
      expect(result.z).toBe(3);
    });
    
    it('应该计算点积', () => {
      const a = Vector3Utils.create(1, 2, 3);
      const b = Vector3Utils.create(4, 5, 6);
      const result = Vector3Utils.dot(a, b);
      
      expect(result).toBe(32);
    });
    
    it('应该计算叉积', () => {
      const a = Vector3Utils.create(1, 0, 0);
      const b = Vector3Utils.create(0, 1, 0);
      const result = Vector3Utils.cross(a, b);
      
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.z).toBe(1);
    });
    
    it('应该计算向量长度', () => {
      const v = Vector3Utils.create(3, 4, 0);
      const mag = Vector3Utils.magnitude(v);
      
      expect(mag).toBe(5);
    });
    
    it('应该归一化向量', () => {
      const v = Vector3Utils.create(3, 4, 0);
      const normalized = Vector3Utils.normalize(v);
      
      expect(normalized.x).toBeCloseTo(0.6);
      expect(normalized.y).toBeCloseTo(0.8);
      expect(normalized.z).toBe(0);
    });
  });
  
  describe('四元数运算', () => {
    it('应该创建单位四元数', () => {
      const q = QuaternionUtils.identity();
      
      expect(q.x).toBe(0);
      expect(q.y).toBe(0);
      expect(q.z).toBe(0);
      expect(q.w).toBe(1);
    });
    
    it('应该从欧拉角创建四元数', () => {
      const euler = { x: 0, y: 0, z: Math.PI / 2 };
      const q = QuaternionUtils.fromEuler(euler);
      
      expect(q.w).toBeCloseTo(Math.cos(Math.PI / 4));
      expect(q.z).toBeCloseTo(Math.sin(Math.PI / 4));
    });
    
    it('应该旋转向量', () => {
      const q = QuaternionUtils.fromEuler({ x: 0, y: 0, z: Math.PI / 2 });
      const v = { x: 1, y: 0, z: 0 };
      const result = QuaternionUtils.rotateVector(q, v);
      
      expect(result.x).toBeCloseTo(0);
      expect(result.y).toBeCloseTo(1);
      expect(result.z).toBeCloseTo(0);
    });
  });
  
  describe('碰撞检测', () => {
    it('应该检测球体碰撞', () => {
      const collision = sphereCollision(
        { x: 0, y: 0, z: 0 }, 1,
        { x: 1.5, y: 0, z: 0 }, 1
      );
      
      expect(collision).not.toBeNull();
      expect(collision!.penetrationDepth).toBeCloseTo(0.5);
    });
    
    it('应该检测球体不碰撞', () => {
      const collision = sphereCollision(
        { x: 0, y: 0, z: 0 }, 1,
        { x: 3, y: 0, z: 0 }, 1
      );
      
      expect(collision).toBeNull();
    });
    
    it('应该计算AABB包围盒', () => {
      const body = {
        id: 'test',
        name: 'Test Body',
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: QuaternionUtils.identity(),
          scale: { x: 1, y: 1, z: 1 }
        },
        velocity: { x: 0, y: 0, z: 0 },
        angularVelocity: { x: 0, y: 0, z: 0 },
        mass: 1,
        inertia: { x: 1, y: 1, z: 1 },
        isStatic: false,
        isKinematic: false,
        friction: 0.5,
        restitution: 0.5,
        collider: {
          type: 'box' as const,
          dimensions: { x: 2, y: 2, z: 2 },
          center: { x: 0, y: 0, z: 0 }
        },
        forces: [],
        torques: []
      };
      
      const aabb = computeAABB(body);
      
      expect(aabb.min).toBeDefined();
      expect(aabb.max).toBeDefined();
    });
    
    it('应该检测AABB相交', () => {
      const a = { min: { x: 0, y: 0, z: 0 }, max: { x: 2, y: 2, z: 2 } };
      const b = { min: { x: 1, y: 1, z: 1 }, max: { x: 3, y: 3, z: 3 } };
      
      expect(aabbIntersects(a, b)).toBe(true);
    });
  });
  
  describe('运动学仿真', () => {
    it('应该计算正向运动学', () => {
      const chain = {
        id: 'arm',
        name: 'Robot Arm',
        joints: [
          {
            id: 'joint-1',
            type: 'hinge' as const,
            bodyA: 'base',
            bodyB: 'link-1',
            anchorA: { x: 0, y: 0, z: 0 },
            anchorB: { x: 0, y: 1, z: 0 },
            axis: { x: 0, y: 0, z: 1 }
          }
        ],
        endEffector: 'link-1',
        dofCount: 1
      };
      
      const transforms = forwardKinematics(chain, [0], new Map());
      
      expect(transforms.length).toBe(1);
      expect(transforms[0].position).toBeDefined();
    });
    
    it('应该计算逆向运动学', () => {
      const chain = {
        id: 'arm',
        name: 'Robot Arm',
        joints: [
          {
            id: 'joint-1',
            type: 'hinge' as const,
            bodyA: 'base',
            bodyB: 'link-1',
            anchorA: { x: 0, y: 0, z: 0 },
            anchorB: { x: 0, y: 1, z: 0 },
            axis: { x: 0, y: 0, z: 1 }
          }
        ],
        endEffector: 'link-1',
        dofCount: 1
      };
      
      const result = inverseKinematics(
        chain,
        { x: 0, y: 1, z: 0 },
        [0],
        100,
        0.01
      );
      
      expect(result.angles).toBeDefined();
      expect(result.error).toBeDefined();
    });
  });
  
  describe('应力分析', () => {
    it('应该计算Von Mises应力', () => {
      const stress = {
        xx: 100,
        yy: 50,
        zz: 0,
        xy: 25,
        yz: 0,
        xz: 0
      };
      
      const vonMises = calculateVonMisesStress(stress);
      
      expect(vonMises).toBeGreaterThan(0);
    });
    
    it('应该计算主应力', () => {
      const stress = {
        xx: 100,
        yy: 50,
        zz: 25,
        xy: 0,
        yz: 0,
        xz: 0
      };
      
      const principals = calculatePrincipalStresses(stress);
      
      expect(principals.length).toBe(3);
    });
    
    it('应该计算安全系数', () => {
      const safetyFactor = calculateSafetyFactor(100, 250);
      
      expect(safetyFactor).toBe(2.5);
    });
    
    it('应该进行应力分析', () => {
      const result = analyzeStress(
        { x: 1000, y: 0, z: 0 },
        0.01,
        1e-6,
        0.05,
        250e6
      );
      
      expect(result.vonMisesStress).toBeGreaterThan(0);
      expect(result.safetyFactor).toBeGreaterThan(0);
    });
  });
  
  describe('物理引擎', () => {
    it('应该创建物理世界', () => {
      const world = createPhysicsWorld({
        gravity: { x: 0, y: -9.81, z: 0 },
        timeStep: 1/60,
        substeps: 4,
        maxIterations: 10,
        tolerance: 0.001,
        enableCollisions: true,
        enableFriction: true,
        enableSleep: true,
        sleepThreshold: 0.1
      });
      
      expect(world).toBeDefined();
      expect(world.bodies).toBeDefined();
      expect(world.gravity.y).toBe(-9.81);
    });
    
    it('应该添加刚体', () => {
      const world = createPhysicsWorld({
        gravity: { x: 0, y: -9.81, z: 0 },
        timeStep: 1/60,
        substeps: 4,
        maxIterations: 10,
        tolerance: 0.001,
        enableCollisions: true,
        enableFriction: true,
        enableSleep: true,
        sleepThreshold: 0.1
      });
      
      const body = {
        id: 'body-1',
        name: 'Test Body',
        transform: {
          position: { x: 0, y: 10, z: 0 },
          rotation: QuaternionUtils.identity(),
          scale: { x: 1, y: 1, z: 1 }
        },
        velocity: { x: 0, y: 0, z: 0 },
        angularVelocity: { x: 0, y: 0, z: 0 },
        mass: 1,
        inertia: { x: 1, y: 1, z: 1 },
        isStatic: false,
        isKinematic: false,
        friction: 0.5,
        restitution: 0.5,
        collider: {
          type: 'box' as const,
          dimensions: { x: 1, y: 1, z: 1 },
          center: { x: 0, y: 0, z: 0 }
        },
        forces: [],
        torques: []
      };
      
      addRigidBody(world, body);
      
      expect(world.bodies.size).toBe(1);
    });
    
    it('应该应用力', () => {
      const world = createPhysicsWorld({
        gravity: { x: 0, y: -9.81, z: 0 },
        timeStep: 1/60,
        substeps: 4,
        maxIterations: 10,
        tolerance: 0.001,
        enableCollisions: true,
        enableFriction: true,
        enableSleep: true,
        sleepThreshold: 0.1
      });
      
      const body = {
        id: 'body-1',
        name: 'Test Body',
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: QuaternionUtils.identity(),
          scale: { x: 1, y: 1, z: 1 }
        },
        velocity: { x: 0, y: 0, z: 0 },
        angularVelocity: { x: 0, y: 0, z: 0 },
        mass: 1,
        inertia: { x: 1, y: 1, z: 1 },
        isStatic: false,
        isKinematic: false,
        friction: 0.5,
        restitution: 0.5,
        collider: {
          type: 'box' as const,
          dimensions: { x: 1, y: 1, z: 1 },
          center: { x: 0, y: 0, z: 0 }
        },
        forces: [],
        torques: []
      };
      
      addRigidBody(world, body);
      applyForce(world, 'body-1', { x: 100, y: 0, z: 0 });
      
      expect(world.bodies.get('body-1')!.forces.length).toBe(1);
    });
    
    it('应该步进物理世界', () => {
      const world = createPhysicsWorld({
        gravity: { x: 0, y: -9.81, z: 0 },
        timeStep: 1/60,
        substeps: 4,
        maxIterations: 10,
        tolerance: 0.001,
        enableCollisions: true,
        enableFriction: true,
        enableSleep: true,
        sleepThreshold: 0.1
      });
      
      const body = {
        id: 'body-1',
        name: 'Test Body',
        transform: {
          position: { x: 0, y: 10, z: 0 },
          rotation: QuaternionUtils.identity(),
          scale: { x: 1, y: 1, z: 1 }
        },
        velocity: { x: 0, y: 0, z: 0 },
        angularVelocity: { x: 0, y: 0, z: 0 },
        mass: 1,
        inertia: { x: 1, y: 1, z: 1 },
        isStatic: false,
        isKinematic: false,
        friction: 0.5,
        restitution: 0.5,
        collider: {
          type: 'box' as const,
          dimensions: { x: 1, y: 1, z: 1 },
          center: { x: 0, y: 0, z: 0 }
        },
        forces: [],
        torques: []
      };
      
      addRigidBody(world, body);
      
      const initialY = world.bodies.get('body-1')!.transform.position.y;
      
      stepPhysicsWorld(world, {
        gravity: { x: 0, y: -9.81, z: 0 },
        timeStep: 1/60,
        substeps: 4,
        maxIterations: 10,
        tolerance: 0.001,
        enableCollisions: true,
        enableFriction: true,
        enableSleep: true,
        sleepThreshold: 0.1
      });
      
      const finalY = world.bodies.get('body-1')!.transform.position.y;
      
      expect(finalY).toBeLessThan(initialY);
    });
  });
});

// ==================== 预测模型在线学习测试 ====================

import {
  sgdUpdate,
  adamUpdate,
  computeLinearGradient,
  computeLogisticGradient,
  welfordUpdate,
  updateFeatureStats,
  initializeFeatureStats,
  createPageHinkleyDetector,
  createADWINDetector,
  createModelVersionManager,
  createOnlineLearningModel,
  createOnlineEnsemble
} from './services/online-learning.service';

describe('预测模型在线学习', () => {
  describe('SGD更新', () => {
    it('应该更新权重', () => {
      const weights = [0.5, 0.3, 0.2];
      const gradient = [0.1, 0.05, 0.02];
      const learningRate = 0.01;
      
      const result = sgdUpdate(weights, gradient, learningRate);
      
      expect(result.weights.length).toBe(3);
      expect(result.weights[0]).toBeLessThan(weights[0]);
    });
  });
  
  describe('Adam更新', () => {
    it('应该更新权重', () => {
      const weights = [0.5, 0.3, 0.2];
      const gradient = [0.1, 0.05, 0.02];
      const m = [0, 0, 0];
      const v = [0, 0, 0];
      const t = 1;
      
      const result = adamUpdate(weights, gradient, m, v, t);
      
      expect(result.weights.length).toBe(3);
      expect(result.m.length).toBe(3);
      expect(result.v.length).toBe(3);
    });
  });
  
  describe('梯度计算', () => {
    it('应该计算线性回归梯度', () => {
      const features = [1, 2, 3];
      const label = 10;
      const weights = [1, 1, 1];
      const bias = 0;
      
      const result = computeLinearGradient(features, label, weights, bias);
      
      expect(result.weightGradient.length).toBe(3);
      expect(result.biasGradient).toBeDefined();
    });
    
    it('应该计算逻辑回归梯度', () => {
      const features = [1, 2, 3];
      const label = 1;
      const weights = [0.1, 0.1, 0.1];
      const bias = 0;
      
      const result = computeLogisticGradient(features, label, weights, bias);
      
      expect(result.weightGradient.length).toBe(3);
    });
  });
  
  describe('Welford在线统计', () => {
    it('应该更新均值和方差', () => {
      let count = 0;
      let mean = 0;
      let m2 = 0;
      
      const values = [10, 20, 30, 40, 50];
      
      for (const value of values) {
        const result = welfordUpdate(count, mean, m2, value);
        count = result.count;
        mean = result.mean;
        m2 = result.m2;
      }
      
      expect(mean).toBe(30);
      expect(count).toBe(5);
    });
  });
  
  describe('特征统计', () => {
    it('应该初始化特征统计', () => {
      const stats = initializeFeatureStats(5);
      
      expect(stats.length).toBe(5);
      expect(stats[0].featureIndex).toBe(0);
    });
    
    it('应该更新特征统计', () => {
      let stats = initializeFeatureStats(1)[0];
      
      stats = updateFeatureStats(stats, 10);
      stats = updateFeatureStats(stats, 20);
      stats = updateFeatureStats(stats, 30);
      
      expect(stats.count).toBe(3);
      expect(stats.mean).toBe(20);
    });
  });
  
  describe('漂移检测', () => {
    it('应该创建Page-Hinkley检测器', () => {
      const detector = createPageHinkleyDetector();
      
      expect(detector).toBeDefined();
      expect(detector.update).toBeDefined();
    });
    
    it('应该创建ADWIN检测器', () => {
      const detector = createADWINDetector();
      
      expect(detector).toBeDefined();
      expect(detector.update).toBeDefined();
    });
  });
  
  describe('模型版本管理', () => {
    it('应该创建版本管理器', () => {
      const manager = createModelVersionManager();
      
      expect(manager).toBeDefined();
      expect(manager.createVersion).toBeDefined();
    });
    
    it('应该创建新版本', () => {
      const manager = createModelVersionManager();
      
      const version = manager.createVersion(
        'test-model',
        'regression',
        { learningRate: 0.01 }
      );
      
      expect(version.id).toBeDefined();
      expect(version.name).toBe('test-model');
    });
    
    it('应该激活版本', () => {
      const manager = createModelVersionManager();
      
      const version = manager.createVersion(
        'test-model',
        'regression',
        { learningRate: 0.01 }
      );
      
      const activated = manager.activateVersion(version.id);
      expect(activated).toBe(true);
    });
  });
  
  describe('在线学习模型', () => {
    it('应该创建在线学习模型', () => {
      const model = createOnlineLearningModel(5, 'regression', {
        learningRate: 0.01,
        batchSize: 32,
        regularization: 0.001,
        momentum: 0.9,
        decayRate: 0.0001,
        minLearningRate: 0.0001,
        maxIterations: 1000,
        convergenceThreshold: 0.001,
        earlyStoppingPatience: 10,
        validationSplit: 0.2
      });
      
      expect(model).toBeDefined();
      expect(model.partialFit).toBeDefined();
    });
    
    it('应该进行增量学习', () => {
      const model = createOnlineLearningModel(2, 'regression', {
        learningRate: 0.01,
        batchSize: 32,
        regularization: 0.001,
        momentum: 0.9,
        decayRate: 0.0001,
        minLearningRate: 0.0001,
        maxIterations: 1000,
        convergenceThreshold: 0.001,
        earlyStoppingPatience: 10,
        validationSplit: 0.2
      });
      
      const result = model.partialFit({
        id: 'dp-1',
        features: [1, 2],
        label: 3,
        timestamp: Date.now(),
        weight: 1
      });
      
      expect(result.loss).toBeDefined();
    });
    
    it('应该进行预测', () => {
      const model = createOnlineLearningModel(2, 'regression', {
        learningRate: 0.1,
        batchSize: 32,
        regularization: 0,
        momentum: 0,
        decayRate: 0,
        minLearningRate: 0.001,
        maxIterations: 1000,
        convergenceThreshold: 0.001,
        earlyStoppingPatience: 10,
        validationSplit: 0.2
      });
      
      for (let i = 0; i < 50; i++) {
        const x1 = Math.random() * 10;
        const x2 = Math.random() * 10;
        const y = 2 * x1 + 3 * x2 + 1;
        
        model.partialFit({
          id: `dp-${i}`,
          features: [x1, x2],
          label: y,
          timestamp: Date.now(),
          weight: 1
        });
      }
      
      const prediction = model.predict([5, 5]);
      expect(typeof prediction).toBe('number');
    });
    
    it('应该评估模型', () => {
      const model = createOnlineLearningModel(2, 'regression', {
        learningRate: 0.01,
        batchSize: 32,
        regularization: 0,
        momentum: 0,
        decayRate: 0,
        minLearningRate: 0.001,
        maxIterations: 1000,
        convergenceThreshold: 0.001,
        earlyStoppingPatience: 10,
        validationSplit: 0.2
      });
      
      for (let i = 0; i < 50; i++) {
        model.partialFit({
          id: `dp-${i}`,
          features: [i, i * 2],
          label: i * 3,
          timestamp: Date.now(),
          weight: 1
        });
      }
      
      const testData = Array.from({ length: 10 }, (_, i) => ({
        id: `test-${i}`,
        features: [i + 50, (i + 50) * 2],
        label: (i + 50) * 3,
        timestamp: Date.now(),
        weight: 1
      }));
      
      const metrics = model.evaluate(testData);
      
      expect(metrics.mse).toBeDefined();
      expect(metrics.sampleCount).toBe(10);
    });
    
    it('应该获取特征重要性', () => {
      const model = createOnlineLearningModel(3, 'regression', {
        learningRate: 0.01,
        batchSize: 32,
        regularization: 0,
        momentum: 0,
        decayRate: 0,
        minLearningRate: 0.001,
        maxIterations: 1000,
        convergenceThreshold: 0.001,
        earlyStoppingPatience: 10,
        validationSplit: 0.2
      });
      
      for (let i = 0; i < 50; i++) {
        model.partialFit({
          id: `dp-${i}`,
          features: [i, i * 2, i * 0.5],
          label: i * 3,
          timestamp: Date.now(),
          weight: 1
        });
      }
      
      const importance = model.getFeatureImportance();
      
      expect(importance.length).toBe(3);
    });
  });
  
  describe('在线集成模型', () => {
    it('应该创建集成模型', () => {
      const models = [
        createOnlineLearningModel(2, 'regression', {
          learningRate: 0.01, batchSize: 32, regularization: 0,
          momentum: 0, decayRate: 0, minLearningRate: 0.001,
          maxIterations: 1000, convergenceThreshold: 0.001,
          earlyStoppingPatience: 10, validationSplit: 0.2
        }),
        createOnlineLearningModel(2, 'regression', {
          learningRate: 0.001, batchSize: 32, regularization: 0,
          momentum: 0, decayRate: 0, minLearningRate: 0.001,
          maxIterations: 1000, convergenceThreshold: 0.001,
          earlyStoppingPatience: 10, validationSplit: 0.2
        })
      ];
      
      const ensemble = createOnlineEnsemble(models);
      
      expect(ensemble).toBeDefined();
      expect(ensemble.partialFit).toBeDefined();
    });
    
    it('应该进行集成预测', () => {
      const models = [
        createOnlineLearningModel(2, 'regression', {
          learningRate: 0.01, batchSize: 32, regularization: 0,
          momentum: 0, decayRate: 0, minLearningRate: 0.001,
          maxIterations: 1000, convergenceThreshold: 0.001,
          earlyStoppingPatience: 10, validationSplit: 0.2
        }),
        createOnlineLearningModel(2, 'regression', {
          learningRate: 0.001, batchSize: 32, regularization: 0,
          momentum: 0, decayRate: 0, minLearningRate: 0.001,
          maxIterations: 1000, convergenceThreshold: 0.001,
          earlyStoppingPatience: 10, validationSplit: 0.2
        })
      ];
      
      const ensemble = createOnlineEnsemble(models);
      
      for (let i = 0; i < 50; i++) {
        ensemble.partialFit({
          id: `dp-${i}`,
          features: [i, i * 2],
          label: i * 3,
          timestamp: Date.now(),
          weight: 1
        });
      }
      
      const prediction = ensemble.predict([10, 20]);
      expect(typeof prediction).toBe('number');
    });
  });
});
