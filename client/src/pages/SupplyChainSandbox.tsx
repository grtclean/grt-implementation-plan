/**
 * 供应链沙盘 — 引导式教学 + 练习场景
 * 路由: /sandbox/supply-chain
 * 交互式流程图: 供应商→IQC→仓库→生产→质检→发货
 */

import React, { useState, useReducer } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Truck, ClipboardCheck, Warehouse, Factory, ShieldCheck, PackageCheck,
  ChevronRight, RotateCcw, CheckCircle, AlertCircle, Play,
} from 'lucide-react';

// Supply chain stages
const STAGES = [
  { id: 'supplier', name: '供应商发货', nameEn: 'Supplier Shipment', icon: Truck, color: 'bg-blue-500' },
  { id: 'iqc', name: 'IQC来料检验', nameEn: 'Incoming QC', icon: ClipboardCheck, color: 'bg-yellow-500' },
  { id: 'warehouse', name: '仓库入库', nameEn: 'Warehouse Receipt', icon: Warehouse, color: 'bg-green-500' },
  { id: 'production', name: '生产领料', nameEn: 'Production Issue', icon: Factory, color: 'bg-purple-500' },
  { id: 'quality', name: '成品质检', nameEn: 'Final QC', icon: ShieldCheck, color: 'bg-orange-500' },
  { id: 'shipping', name: '成品发货', nameEn: 'Shipping', icon: PackageCheck, color: 'bg-emerald-500' },
] as const;

// Practice scenarios
const SCENARIOS = [
  {
    id: 'receiving',
    name: '收货与IQC',
    description: '供应商来料 → 扫码收货 → IQC检验 → 入库上架',
    steps: ['扫描供应商条码', '核对送货单与PO', '抽样送检IQC', '记录检验结果', '合格品入库上架'],
  },
  {
    id: 'picking',
    name: '生产领料',
    description: '工单下达 → BOM展开 → 按批次FIFO拣货 → 发料确认',
    steps: ['接收工单需求', '展开BOM物料清单', '按FIFO规则拣货', '扫码确认批次', '发料至产线'],
  },
  {
    id: 'complaint',
    name: '客户投诉处理',
    description: '客户投诉 → 反向追溯 → 供应商管理 → 8D报告',
    steps: ['记录客户投诉', '批次反向追溯', '定位问题供应商', '发起8D报告', '关闭投诉工单'],
  },
  {
    id: 'stocktake',
    name: '库存盘点',
    description: '盘点计划 → 锁定库位 → 实盘录入 → 差异处理',
    steps: ['创建盘点计划', '锁定盘点区域', '扫码逐位盘点', '录入实际数量', '处理盘盈盘亏'],
  },
];

type State = {
  currentStage: number;
  selectedScenario: string | null;
  scenarioStep: number;
  completedScenarios: string[];
};

type Action =
  | { type: 'NEXT_STAGE' }
  | { type: 'RESET' }
  | { type: 'SELECT_SCENARIO'; id: string }
  | { type: 'NEXT_SCENARIO_STEP' }
  | { type: 'COMPLETE_SCENARIO'; id: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'NEXT_STAGE':
      return { ...state, currentStage: Math.min(state.currentStage + 1, STAGES.length - 1) };
    case 'RESET':
      return { ...state, currentStage: 0, selectedScenario: null, scenarioStep: 0 };
    case 'SELECT_SCENARIO':
      return { ...state, selectedScenario: action.id, scenarioStep: 0 };
    case 'NEXT_SCENARIO_STEP': {
      const scenario = SCENARIOS.find(s => s.id === state.selectedScenario);
      if (scenario && state.scenarioStep >= scenario.steps.length - 1) {
        return {
          ...state,
          completedScenarios: [...new Set([...state.completedScenarios, state.selectedScenario!])],
          selectedScenario: null,
          scenarioStep: 0,
        };
      }
      return { ...state, scenarioStep: state.scenarioStep + 1 };
    }
    case 'COMPLETE_SCENARIO':
      return {
        ...state,
        completedScenarios: [...new Set([...state.completedScenarios, action.id])],
        selectedScenario: null,
        scenarioStep: 0,
      };
    default:
      return state;
  }
}

export default function SupplyChainSandbox() {
  const [state, dispatch] = useReducer(reducer, {
    currentStage: 0,
    selectedScenario: null,
    scenarioStep: 0,
    completedScenarios: [],
  });

  const completionRate = Math.round((state.completedScenarios.length / SCENARIOS.length) * 100);
  const activeScenario = SCENARIOS.find(s => s.id === state.selectedScenario);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">供应链沙盘</h1>
          <p className="text-muted-foreground mt-1">引导式教学 — 从供应商到客户的全链路</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm">
            完成 {state.completedScenarios.length}/{SCENARIOS.length} 场景
          </Badge>
          <Progress value={completionRate} className="w-32" />
        </div>
      </div>

      {/* Flow Diagram */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">供应链全流程</CardTitle>
          <CardDescription>点击"下一步"推进流程，了解每个阶段的关键操作</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2">
            {STAGES.map((stage, idx) => {
              const Icon = stage.icon;
              const isActive = idx === state.currentStage;
              const isDone = idx < state.currentStage;
              return (
                <React.Fragment key={stage.id}>
                  <div className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all ${
                    isActive ? 'ring-2 ring-primary bg-primary/5 scale-105' : isDone ? 'opacity-60' : 'opacity-40'
                  }`}>
                    <div className={`p-3 rounded-full text-white ${isDone ? 'bg-green-500' : isActive ? stage.color : 'bg-gray-400'}`}>
                      {isDone ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <span className="text-xs font-medium text-center">{stage.name}</span>
                    <span className="text-[10px] text-muted-foreground">{stage.nameEn}</span>
                  </div>
                  {idx < STAGES.length - 1 && (
                    <ChevronRight className={`h-5 w-5 flex-shrink-0 ${isDone ? 'text-green-500' : 'text-gray-300'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <div className="flex justify-center gap-3 mt-6">
            <Button variant="outline" size="sm" onClick={() => dispatch({ type: 'RESET' })}>
              <RotateCcw className="h-4 w-4 mr-1" /> 重置
            </Button>
            <Button
              size="sm"
              onClick={() => dispatch({ type: 'NEXT_STAGE' })}
              disabled={state.currentStage >= STAGES.length - 1}
            >
              下一阶段 <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Practice Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SCENARIOS.map(scenario => {
          const isCompleted = state.completedScenarios.includes(scenario.id);
          const isActive = state.selectedScenario === scenario.id;
          return (
            <Card key={scenario.id} className={isActive ? 'ring-2 ring-primary' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{scenario.name}</CardTitle>
                  {isCompleted && <Badge className="bg-green-500">已完成</Badge>}
                </div>
                <CardDescription>{scenario.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {isActive && activeScenario ? (
                  <div className="space-y-3">
                    {activeScenario.steps.map((step, idx) => (
                      <div key={idx} className={`flex items-center gap-2 text-sm ${
                        idx < state.scenarioStep ? 'text-green-600 line-through' :
                        idx === state.scenarioStep ? 'text-primary font-medium' : 'text-muted-foreground'
                      }`}>
                        {idx < state.scenarioStep ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : idx === state.scenarioStep ? (
                          <AlertCircle className="h-4 w-4 text-primary" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border" />
                        )}
                        Step {idx + 1}: {step}
                      </div>
                    ))}
                    <Button size="sm" className="w-full mt-2" onClick={() => dispatch({ type: 'NEXT_SCENARIO_STEP' })}>
                      {state.scenarioStep >= activeScenario.steps.length - 1 ? '完成场景' : '下一步'}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => dispatch({ type: 'SELECT_SCENARIO', id: scenario.id })}
                  >
                    <Play className="h-4 w-4 mr-1" /> {isCompleted ? '重做' : '开始练习'}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
