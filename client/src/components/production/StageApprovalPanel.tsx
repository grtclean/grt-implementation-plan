/**
 * 阶段审批面板组件
 * Stage Approval Panel Component
 * 
 * 实现Gate门禁审批功能：
 * - 阶段开始/完成审批
 * - 审批流程可视化
 * - 审批历史记录
 * - 角色权限控制
 */

import { useState, useMemo } from 'react';
import { 
  CheckCircle2, XCircle, Clock, AlertTriangle,
  ShieldCheck, User, FileText, ChevronDown, ChevronUp,
  Send, MessageSquare, History, Lock, Unlock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';

// ============================================================================
// 类型定义
// ============================================================================

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'AUTO_APPROVED';
export type ApprovalType = 'STAGE_START' | 'STAGE_COMPLETE' | 'GATE_PASS' | 'EXCEPTION';

export interface ApprovalRecord {
  id: number;
  productionStageId: number;
  projectId: number;
  stageCode: string;
  requestedBy: number;
  requestedByName: string;
  requestedAt: string;
  approverId: number | null;
  approverName: string | null;
  approverRole: string | null;
  status: ApprovalStatus;
  approvalType: ApprovalType;
  comments: string | null;
  rejectionReason: string | null;
  approvedAt: string | null;
}

export interface ApprovalRule {
  id: number;
  stageCode: string;
  approvalType: ApprovalType;
  requiredRole: string;
  autoApproveConditions: string | null;
  escalationHours: number;
}

export interface StageApprovalPanelProps {
  projectId: number;
  stageId: number;
  stageCode: string;
  stageName: string;
  currentUserId: number;
  currentUserName: string;
  currentUserRole: string;
  stageStatus: string;
  approvals?: ApprovalRecord[];
  rules?: ApprovalRule[];
  onApprovalCreate?: (data: Partial<ApprovalRecord>) => void;
  onApprovalProcess?: (id: number, status: 'APPROVED' | 'REJECTED', comments?: string) => void;
  isLoading?: boolean;
}

// ============================================================================
// 状态配置
// ============================================================================

const STATUS_CONFIG: Record<ApprovalStatus, { icon: any; label: string; labelZh: string; color: string; bgColor: string }> = {
  PENDING: { icon: Clock, label: 'Pending', labelZh: '待审批', color: 'text-yellow-400', bgColor: 'bg-yellow-900/30' },
  APPROVED: { icon: CheckCircle2, label: 'Approved', labelZh: '已批准', color: 'text-emerald-400', bgColor: 'bg-emerald-900/30' },
  REJECTED: { icon: XCircle, label: 'Rejected', labelZh: '已拒绝', color: 'text-red-400', bgColor: 'bg-red-900/30' },
  CANCELLED: { icon: XCircle, label: 'Cancelled', labelZh: '已取消', color: 'text-slate-400', bgColor: 'bg-slate-900/30' },
  AUTO_APPROVED: { icon: ShieldCheck, label: 'Auto Approved', labelZh: '自动批准', color: 'text-blue-400', bgColor: 'bg-blue-900/30' },
};

const TYPE_CONFIG: Record<ApprovalType, { label: string; labelZh: string }> = {
  STAGE_START: { label: 'Stage Start', labelZh: '阶段开始' },
  STAGE_COMPLETE: { label: 'Stage Complete', labelZh: '阶段完成' },
  GATE_PASS: { label: 'Gate Pass', labelZh: 'Gate通过' },
  EXCEPTION: { label: 'Exception', labelZh: '异常处理' },
};

// ============================================================================
// 主组件
// ============================================================================

export default function StageApprovalPanel({
  projectId,
  stageId,
  stageCode,
  stageName,
  currentUserId,
  currentUserName,
  currentUserRole,
  stageStatus,
  approvals = [],
  rules = [],
  onApprovalCreate,
  onApprovalProcess,
  isLoading = false,
}: StageApprovalPanelProps) {
  const { language } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestComments, setRequestComments] = useState('');
  const [selectedType, setSelectedType] = useState<ApprovalType>('STAGE_COMPLETE');
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [processComments, setProcessComments] = useState('');

  // 获取待处理的审批
  const pendingApprovals = useMemo(() => 
    approvals.filter(a => a.status === 'PENDING'),
    [approvals]
  );

  // 获取当前用户可以审批的请求
  const approvableRequests = useMemo(() => 
    pendingApprovals.filter(a => {
      // 管理员可以审批所有
      if (currentUserRole === 'ADMIN') return true;
      // 检查是否有对应的审批规则
      const rule = rules.find(r => r.stageCode === a.stageCode && r.approvalType === a.approvalType);
      return rule?.requiredRole === currentUserRole;
    }),
    [pendingApprovals, rules, currentUserRole]
  );

  // 统计数据
  const stats = useMemo(() => ({
    total: approvals.length,
    pending: approvals.filter(a => a.status === 'PENDING').length,
    approved: approvals.filter(a => a.status === 'APPROVED' || a.status === 'AUTO_APPROVED').length,
    rejected: approvals.filter(a => a.status === 'REJECTED').length,
  }), [approvals]);

  // 判断是否可以发起审批请求
  const canRequestApproval = useMemo(() => {
    // 如果阶段已完成，不能再发起
    if (stageStatus === 'Completed') return false;
    // 如果有待处理的同类型审批，不能重复发起
    const hasPendingSameType = pendingApprovals.some(a => a.approvalType === selectedType);
    return !hasPendingSameType;
  }, [stageStatus, pendingApprovals, selectedType]);

  // 提交审批请求
  const handleSubmitRequest = () => {
    onApprovalCreate?.({
      productionStageId: stageId,
      projectId,
      stageCode,
      requestedBy: currentUserId,
      requestedByName: currentUserName,
      status: 'PENDING',
      approvalType: selectedType,
      comments: requestComments || null,
    });
    setShowRequestForm(false);
    setRequestComments('');
  };

  // 处理审批
  const handleProcess = (id: number, status: 'APPROVED' | 'REJECTED') => {
    onApprovalProcess?.(id, status, processComments);
    setProcessingId(null);
    setProcessComments('');
  };

  return (
    <Card className="bg-[#111827] border-slate-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-300 flex items-center gap-2">
            <ShieldCheck size={16} className="text-blue-400" />
            {language === 'zh' ? 'Gate审批' : 'Gate Approval'}
            <span className="text-xs text-slate-500">({stageCode})</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            {pendingApprovals.length > 0 && (
              <span className="px-2 py-0.5 bg-yellow-900/30 text-yellow-400 text-[10px] rounded-full">
                {pendingApprovals.length} {language === 'zh' ? '待审批' : 'pending'}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-slate-400 hover:text-slate-200"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 快速统计 */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700 text-center">
            <div className="text-lg font-bold text-slate-300">{stats.total}</div>
            <div className="text-[10px] text-slate-500">{language === 'zh' ? '总计' : 'Total'}</div>
          </div>
          <div className="bg-yellow-900/20 rounded-lg p-2 border border-yellow-900/30 text-center">
            <div className="text-lg font-bold text-yellow-400">{stats.pending}</div>
            <div className="text-[10px] text-yellow-500">{language === 'zh' ? '待审批' : 'Pending'}</div>
          </div>
          <div className="bg-emerald-900/20 rounded-lg p-2 border border-emerald-900/30 text-center">
            <div className="text-lg font-bold text-emerald-400">{stats.approved}</div>
            <div className="text-[10px] text-emerald-500">{language === 'zh' ? '已批准' : 'Approved'}</div>
          </div>
          <div className="bg-red-900/20 rounded-lg p-2 border border-red-900/30 text-center">
            <div className="text-lg font-bold text-red-400">{stats.rejected}</div>
            <div className="text-[10px] text-red-500">{language === 'zh' ? '已拒绝' : 'Rejected'}</div>
          </div>
        </div>

        {/* 当前用户可审批的请求 */}
        {approvableRequests.length > 0 && (
          <div className="bg-orange-900/10 rounded-lg p-3 border border-orange-600/30">
            <div className="text-xs text-orange-400 font-medium mb-2 flex items-center gap-2">
              <AlertTriangle size={12} />
              {language === 'zh' ? '需要您审批' : 'Requires Your Approval'}
            </div>
            <div className="space-y-2">
              {approvableRequests.map((approval) => (
                <div key={approval.id} className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-300">
                        {language === 'zh' 
                          ? TYPE_CONFIG[approval.approvalType].labelZh 
                          : TYPE_CONFIG[approval.approvalType].label}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        by {approval.requestedByName}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {new Date(approval.requestedAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  
                  {approval.comments && (
                    <div className="text-xs text-slate-400 mb-3 p-2 bg-slate-800/50 rounded">
                      {approval.comments}
                    </div>
                  )}
                  
                  {processingId === approval.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={processComments}
                        onChange={(e) => setProcessComments(e.target.value)}
                        placeholder={language === 'zh' ? '审批意见（可选）...' : 'Comments (optional)...'}
                        className="bg-slate-800 border-slate-700 text-slate-200 text-sm h-16"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleProcess(approval.id, 'APPROVED')}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                        >
                          <CheckCircle2 size={12} className="mr-1" />
                          {language === 'zh' ? '批准' : 'Approve'}
                        </Button>
                        <Button
                          onClick={() => handleProcess(approval.id, 'REJECTED')}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs"
                        >
                          <XCircle size={12} className="mr-1" />
                          {language === 'zh' ? '拒绝' : 'Reject'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setProcessingId(null)}
                          className="border-slate-600 text-slate-300 hover:bg-slate-800 text-xs"
                        >
                          {language === 'zh' ? '取消' : 'Cancel'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setProcessingId(approval.id)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs"
                    >
                      <ShieldCheck size={12} className="mr-1" />
                      {language === 'zh' ? '审批' : 'Review'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 发起审批请求 */}
        {!showRequestForm ? (
          <Button
            onClick={() => setShowRequestForm(true)}
            disabled={!canRequestApproval}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
          >
            <Send size={14} className="mr-2" />
            {language === 'zh' ? '发起审批请求' : 'Request Approval'}
          </Button>
        ) : (
          <div className="bg-slate-900/50 rounded-lg p-4 border border-blue-600/30 space-y-3">
            <div className="text-xs text-blue-400 font-medium mb-2">
              {language === 'zh' ? '发起审批请求' : 'Request Approval'}
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(TYPE_CONFIG) as [ApprovalType, typeof TYPE_CONFIG[ApprovalType]][]).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`p-2 rounded border text-xs transition-colors ${
                    selectedType === type
                      ? 'bg-blue-600/20 border-blue-600 text-blue-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {language === 'zh' ? config.labelZh : config.label}
                </button>
              ))}
            </div>
            
            <Textarea
              value={requestComments}
              onChange={(e) => setRequestComments(e.target.value)}
              placeholder={language === 'zh' ? '请说明审批原因...' : 'Please explain the reason...'}
              className="bg-slate-800 border-slate-700 text-slate-200 text-sm h-20"
            />
            
            <div className="flex gap-2">
              <Button
                onClick={handleSubmitRequest}
                disabled={!canRequestApproval}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm"
              >
                <Send size={14} className="mr-2" />
                {language === 'zh' ? '提交' : 'Submit'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowRequestForm(false)}
                className="border-slate-600 text-slate-300 hover:bg-slate-800 text-sm"
              >
                {language === 'zh' ? '取消' : 'Cancel'}
              </Button>
            </div>
          </div>
        )}

        {/* 展开的审批历史 */}
        {isExpanded && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
              <History size={12} />
              {language === 'zh' ? '审批历史' : 'Approval History'}
            </div>
            
            {approvals.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-sm">
                {language === 'zh' ? '暂无审批记录' : 'No approval records yet'}
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {approvals.map((approval) => {
                  const statusConfig = STATUS_CONFIG[approval.status];
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <div
                      key={approval.id}
                      className={`rounded-lg p-3 border ${statusConfig.bgColor} border-slate-700/50`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <StatusIcon size={14} className={statusConfig.color} />
                          <span className={`text-xs ${statusConfig.color}`}>
                            {language === 'zh' ? statusConfig.labelZh : statusConfig.label}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {language === 'zh' 
                              ? TYPE_CONFIG[approval.approvalType].labelZh 
                              : TYPE_CONFIG[approval.approvalType].label}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {new Date(approval.requestedAt).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <div className="flex items-center gap-1">
                          <User size={10} />
                          <span>{language === 'zh' ? '申请人' : 'Requested by'}: {approval.requestedByName}</span>
                        </div>
                        {approval.approverName && (
                          <div className="flex items-center gap-1">
                            <ShieldCheck size={10} />
                            <span>{language === 'zh' ? '审批人' : 'Approved by'}: {approval.approverName}</span>
                          </div>
                        )}
                      </div>
                      
                      {approval.comments && (
                        <div className="mt-2 text-[10px] text-slate-400 p-2 bg-slate-800/30 rounded">
                          <MessageSquare size={10} className="inline mr-1" />
                          {approval.comments}
                        </div>
                      )}
                      
                      {approval.rejectionReason && (
                        <div className="mt-2 text-[10px] text-red-400 p-2 bg-red-900/20 rounded">
                          <AlertTriangle size={10} className="inline mr-1" />
                          {approval.rejectionReason}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Gate状态指示器 */}
        <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-800">
          <div className={`flex items-center gap-1 text-[10px] ${
            stageStatus === 'Completed' ? 'text-emerald-400' : 'text-slate-500'
          }`}>
            {stageStatus === 'Completed' ? <Unlock size={10} /> : <Lock size={10} />}
            <span>
              {stageStatus === 'Completed' 
                ? (language === 'zh' ? 'Gate已通过' : 'Gate Passed')
                : (language === 'zh' ? 'Gate待通过' : 'Gate Pending')}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
