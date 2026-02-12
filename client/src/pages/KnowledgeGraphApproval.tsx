/**
 * 知识图谱扩展审批前端页面
 * v2.5.7 - 建议列表、人工审批、选择性应用、审批历史
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  CheckCircle2, XCircle, Clock, Play, RotateCcw, History, 
  Info, RefreshCw, ChevronRight, GitBranch, Plus, Link2, Merge, Trash2, Edit3, Network
} from 'lucide-react';
import KnowledgeGraphVisualization, { generateSampleGraphData } from '@/components/KnowledgeGraphVisualization';

// ==================== 类型定义 ====================

type SuggestionType = 'add_entity' | 'add_relation' | 'merge_entities' | 'delete_entity' | 'update_entity';
type SuggestionStatus = 'pending' | 'approved' | 'rejected' | 'applied' | 'reverted';
type Priority = 'high' | 'medium' | 'low';

interface ExpansionSuggestion {
  id: string;
  type: SuggestionType;
  title: string;
  description: string;
  priority: Priority;
  confidence: number;
  status: SuggestionStatus;
  impact: { affectedEntities: number; affectedRelations: number; riskLevel: string };
  details: Record<string, any>;
  reasoning: string[];
  evidence: Record<string, any>;
  createdAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
  reviewComment?: string;
  appliedAt?: number;
  appliedBy?: string;
}

interface HistoryEntry {
  id: string;
  suggestionId: string;
  suggestionTitle: string;
  action: string;
  performedBy: string;
  performedAt: number;
  comment?: string;
}

// ==================== 模拟数据 ====================

const mockSuggestions: ExpansionSuggestion[] = [
  { id: 'exp_1', type: 'add_entity', title: '添加新工艺节点: 超声波清洗', description: '检测到多个项目中提及超声波清洗工艺，但知识图谱中缺少此节点', priority: 'high', confidence: 0.92, status: 'pending', impact: { affectedEntities: 5, affectedRelations: 12, riskLevel: 'low' }, details: { entityType: 'process', entityName: '超声波清洗' }, reasoning: ['在15个项目文档中被提及', '与现有清洗工艺节点有明确关联'], evidence: { documentCount: 15 }, createdAt: Date.now() - 3600000 },
  { id: 'exp_2', type: 'add_relation', title: '建立关系: 铝材 -> 阳极氧化', description: '检测到铝材与阳极氧化工艺之间存在强关联但缺少直接关系', priority: 'high', confidence: 0.88, status: 'pending', impact: { affectedEntities: 2, affectedRelations: 1, riskLevel: 'low' }, details: { relationType: 'applicable_process', sourceEntity: '铝材', targetEntity: '阳极氧化' }, reasoning: ['共现频率高达89%', '专业文献支持此关联'], evidence: { cooccurrence: 0.89 }, createdAt: Date.now() - 7200000 },
  { id: 'exp_3', type: 'merge_entities', title: '合并重复实体: 喷涂/喷漆', description: '检测到"喷涂"和"喷漆"两个实体实际指同一工艺', priority: 'medium', confidence: 0.85, status: 'approved', impact: { affectedEntities: 2, affectedRelations: 8, riskLevel: 'medium' }, details: { sourceEntities: ['喷涂', '喷漆'], targetEntity: '喷涂/喷漆' }, reasoning: ['语义相似度0.96', '使用场景完全重叠'], evidence: { semanticSimilarity: 0.96 }, createdAt: Date.now() - 86400000, reviewedAt: Date.now() - 43200000, reviewedBy: '张工' },
  { id: 'exp_4', type: 'add_entity', title: '添加新材料节点: 钛合金TC4', description: '近期项目中频繁出现钛合金TC4材料', priority: 'medium', confidence: 0.78, status: 'applied', impact: { affectedEntities: 3, affectedRelations: 6, riskLevel: 'low' }, details: { entityType: 'material', entityName: '钛合金TC4' }, reasoning: ['在8个新项目中被使用'], evidence: { projectCount: 8 }, createdAt: Date.now() - 172800000, reviewedAt: Date.now() - 129600000, reviewedBy: '李工', appliedAt: Date.now() - 86400000, appliedBy: '李工' },
  { id: 'exp_5', type: 'update_entity', title: '更新实体属性: 不锈钢304', description: '检测到不锈钢304的耐腐蚀等级属性可能需要更新', priority: 'low', confidence: 0.72, status: 'rejected', impact: { affectedEntities: 1, affectedRelations: 0, riskLevel: 'low' }, details: { entityName: '不锈钢304', updatedFields: { corrosionResistance: 'A级' } }, reasoning: ['最新标准已更新'], evidence: { standardUpdate: true }, createdAt: Date.now() - 259200000, reviewedAt: Date.now() - 216000000, reviewedBy: '王工', reviewComment: '需要更多验证数据' }
];

const mockHistory: HistoryEntry[] = [
  { id: 'h1', suggestionId: 'exp_4', suggestionTitle: '添加新材料节点: 钛合金TC4', action: 'apply', performedBy: '李工', performedAt: Date.now() - 86400000 },
  { id: 'h2', suggestionId: 'exp_4', suggestionTitle: '添加新材料节点: 钛合金TC4', action: 'approve', performedBy: '李工', performedAt: Date.now() - 129600000 },
  { id: 'h3', suggestionId: 'exp_5', suggestionTitle: '更新实体属性: 不锈钢304', action: 'reject', performedBy: '王工', performedAt: Date.now() - 216000000, comment: '需要更多验证数据' },
  { id: 'h4', suggestionId: 'exp_3', suggestionTitle: '合并重复实体: 喷涂/喷漆', action: 'approve', performedBy: '张工', performedAt: Date.now() - 43200000 }
];

// ==================== 工具函数 ====================

const typeIcons: Record<SuggestionType, any> = { add_entity: Plus, add_relation: Link2, merge_entities: Merge, delete_entity: Trash2, update_entity: Edit3 };
const typeLabels: Record<SuggestionType, string> = { add_entity: '添加实体', add_relation: '添加关系', merge_entities: '合并实体', delete_entity: '删除实体', update_entity: '更新实体' };
const statusConfig: Record<SuggestionStatus, { label: string; icon: any }> = { pending: { label: '待审批', icon: Clock }, approved: { label: '已批准', icon: CheckCircle2 }, rejected: { label: '已拒绝', icon: XCircle }, applied: { label: '已应用', icon: Play }, reverted: { label: '已撤销', icon: RotateCcw } };
const priorityConfig: Record<Priority, { label: string; color: string }> = { high: { label: '高', color: 'bg-red-100 text-red-800' }, medium: { label: '中', color: 'bg-yellow-100 text-yellow-800' }, low: { label: '低', color: 'bg-green-100 text-green-800' } };

// ==================== 子组件 ====================

function SuggestionCard({ suggestion, selected, onSelect, onAction }: { suggestion: ExpansionSuggestion; selected: boolean; onSelect: (id: string) => void; onAction: (id: string, action: string) => void }) {
  const TypeIcon = typeIcons[suggestion.type];
  const StatusIcon = statusConfig[suggestion.status].icon;
  
  return (
    <Card className={`transition-all ${selected ? 'ring-2 ring-primary' : ''} hover:shadow-md`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {suggestion.status === 'pending' && <Checkbox checked={selected} onCheckedChange={() => onSelect(suggestion.id)} />}
            <div className={`p-2 rounded-lg ${suggestion.status === 'pending' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}><TypeIcon className="w-5 h-5" /></div>
            <div><CardTitle className="text-base">{suggestion.title}</CardTitle><CardDescription className="text-xs mt-1">{typeLabels[suggestion.type]} · {new Date(suggestion.createdAt).toLocaleString('zh-CN')}</CardDescription></div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={priorityConfig[suggestion.priority].color}>{priorityConfig[suggestion.priority].label}</Badge>
            <Badge variant="outline" className="flex items-center gap-1"><StatusIcon className="w-3 h-3" />{statusConfig[suggestion.status].label}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">{suggestion.description}</p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
          <span>置信度: <strong className={suggestion.confidence >= 0.8 ? 'text-green-600' : suggestion.confidence >= 0.6 ? 'text-yellow-600' : 'text-red-600'}>{(suggestion.confidence * 100).toFixed(0)}%</strong></span>
          <span>影响实体: {suggestion.impact.affectedEntities}</span>
          <span>影响关系: {suggestion.impact.affectedRelations}</span>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 mb-3">
          <h4 className="text-xs font-medium mb-2">推理依据:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">{suggestion.reasoning.map((r, i) => <li key={i} className="flex items-center gap-2"><ChevronRight className="w-3 h-3" />{r}</li>)}</ul>
        </div>
        {suggestion.reviewComment && <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3"><p className="text-xs text-yellow-800"><strong>审批意见:</strong> {suggestion.reviewComment}</p></div>}
        <div className="flex items-center justify-end gap-2">
          {suggestion.status === 'pending' && <><Button size="sm" variant="outline" onClick={() => onAction(suggestion.id, 'reject')}><XCircle className="w-4 h-4 mr-1" />拒绝</Button><Button size="sm" onClick={() => onAction(suggestion.id, 'approve')}><CheckCircle2 className="w-4 h-4 mr-1" />批准</Button></>}
          {suggestion.status === 'approved' && <Button size="sm" onClick={() => onAction(suggestion.id, 'apply')}><Play className="w-4 h-4 mr-1" />应用</Button>}
          {suggestion.status === 'applied' && <Button size="sm" variant="outline" onClick={() => onAction(suggestion.id, 'revert')}><RotateCcw className="w-4 h-4 mr-1" />撤销</Button>}
        </div>
      </CardContent>
    </Card>
  );
}

function StatsCard({ stats }: { stats: { total: number; pending: number; approved: number; rejected: number; applied: number; approvalRate: number } }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
      <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{stats.total}</div><div className="text-xs text-muted-foreground">总建议</div></CardContent></Card>
      <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-yellow-600">{stats.pending}</div><div className="text-xs text-muted-foreground">待审批</div></CardContent></Card>
      <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-blue-600">{stats.approved}</div><div className="text-xs text-muted-foreground">已批准</div></CardContent></Card>
      <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-red-600">{stats.rejected}</div><div className="text-xs text-muted-foreground">已拒绝</div></CardContent></Card>
      <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-green-600">{stats.applied}</div><div className="text-xs text-muted-foreground">已应用</div></CardContent></Card>
      <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{(stats.approvalRate * 100).toFixed(0)}%</div><div className="text-xs text-muted-foreground">批准率</div></CardContent></Card>
    </div>
  );
}

// ==================== 主组件 ====================

export default function KnowledgeGraphApproval() {
  const [suggestions, setSuggestions] = useState<ExpansionSuggestion[]>(mockSuggestions);
  const [history, setHistory] = useState<HistoryEntry[]>(mockHistory);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<{ id: string; action: string } | null>(null);
  const [comment, setComment] = useState('');

  const filteredSuggestions = suggestions.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (typeFilter !== 'all' && s.type !== typeFilter) return false;
    return true;
  });

  const stats = {
    total: suggestions.length,
    pending: suggestions.filter(s => s.status === 'pending').length,
    approved: suggestions.filter(s => s.status === 'approved').length,
    rejected: suggestions.filter(s => s.status === 'rejected').length,
    applied: suggestions.filter(s => s.status === 'applied').length,
    approvalRate: suggestions.filter(s => ['approved', 'applied'].includes(s.status)).length / Math.max(suggestions.filter(s => s.status !== 'pending').length, 1)
  };

  const handleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const handleAction = (id: string, action: string) => { setDialogAction({ id, action }); setDialogOpen(true); };

  const confirmAction = () => {
    if (!dialogAction) return;
    const { id, action } = dialogAction;
    setSuggestions(prev => prev.map(s => {
      if (s.id !== id) return s;
      const now = Date.now();
      switch (action) {
        case 'approve': return { ...s, status: 'approved' as SuggestionStatus, reviewedAt: now, reviewedBy: '当前用户', reviewComment: comment || undefined };
        case 'reject': return { ...s, status: 'rejected' as SuggestionStatus, reviewedAt: now, reviewedBy: '当前用户', reviewComment: comment || undefined };
        case 'apply': return { ...s, status: 'applied' as SuggestionStatus, appliedAt: now, appliedBy: '当前用户' };
        case 'revert': return { ...s, status: 'reverted' as SuggestionStatus };
        default: return s;
      }
    }));
    setHistory(prev => [{ id: `h_${Date.now()}`, suggestionId: id, suggestionTitle: suggestions.find(s => s.id === id)?.title || '', action, performedBy: '当前用户', performedAt: Date.now(), comment: comment || undefined }, ...prev]);
    toast.success(`操作成功: ${action === 'approve' ? '已批准' : action === 'reject' ? '已拒绝' : action === 'apply' ? '已应用' : '已撤销'}`);
    setDialogOpen(false); setComment(''); setDialogAction(null);
  };

  const handleBatchAction = (action: 'approve' | 'reject') => {
    if (selectedIds.length === 0) { toast.error('请先选择要操作的建议'); return; }
    setSuggestions(prev => prev.map(s => { if (!selectedIds.includes(s.id)) return s; return { ...s, status: action === 'approve' ? 'approved' : 'rejected', reviewedAt: Date.now(), reviewedBy: '当前用户' }; }));
    toast.success(`批量${action === 'approve' ? '批准' : '拒绝'}成功: ${selectedIds.length}个建议`);
    setSelectedIds([]);
  };

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold flex items-center gap-3"><GitBranch className="w-8 h-8" />知识图谱扩展审批</h1><p className="text-muted-foreground mt-1">审批和管理知识图谱的自动扩展建议</p></div>
        <Button variant="outline" onClick={() => toast.info('刷新建议列表')}><RefreshCw className="w-4 h-4 mr-2" />刷新</Button>
      </div>

      <StatsCard stats={stats} />

      <Tabs defaultValue="visualization" className="space-y-4">
        <TabsList><TabsTrigger value="visualization" className="flex items-center gap-2"><Network className="w-4 h-4" />图谱可视化</TabsTrigger><TabsTrigger value="suggestions" className="flex items-center gap-2"><Clock className="w-4 h-4" />建议列表</TabsTrigger><TabsTrigger value="history" className="flex items-center gap-2"><History className="w-4 h-4" />审批历史</TabsTrigger></TabsList>

        <TabsContent value="visualization">
          <Card className="h-[600px]">
            <KnowledgeGraphVisualization
              data={generateSampleGraphData()}
              onNodeClick={(node) => toast.info(`选中节点: ${node.label}`)}
              onEdgeClick={(edge) => toast.info(`选中关系: ${edge.relation}`)}
              onSuggestionApprove={(item) => toast.success(`已批准扩展建议`)}
              className="h-full"
            />
          </Card>
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-32"><SelectValue placeholder="状态" /></SelectTrigger><SelectContent><SelectItem value="all">全部状态</SelectItem><SelectItem value="pending">待审批</SelectItem><SelectItem value="approved">已批准</SelectItem><SelectItem value="rejected">已拒绝</SelectItem><SelectItem value="applied">已应用</SelectItem></SelectContent></Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-32"><SelectValue placeholder="类型" /></SelectTrigger><SelectContent><SelectItem value="all">全部类型</SelectItem><SelectItem value="add_entity">添加实体</SelectItem><SelectItem value="add_relation">添加关系</SelectItem><SelectItem value="merge_entities">合并实体</SelectItem><SelectItem value="update_entity">更新实体</SelectItem></SelectContent></Select>
            </div>
            {selectedIds.length > 0 && <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">已选择 {selectedIds.length} 项</span><Button size="sm" variant="outline" onClick={() => handleBatchAction('reject')}>批量拒绝</Button><Button size="sm" onClick={() => handleBatchAction('approve')}>批量批准</Button></div>}
          </div>
          <div className="space-y-4">
            {filteredSuggestions.map(s => <SuggestionCard key={s.id} suggestion={s} selected={selectedIds.includes(s.id)} onSelect={handleSelect} onAction={handleAction} />)}
            {filteredSuggestions.length === 0 && <Card><CardContent className="p-12 text-center text-muted-foreground"><Info className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>没有符合条件的建议</p></CardContent></Card>}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card><CardHeader><CardTitle>审批历史记录</CardTitle><CardDescription>查看所有审批操作的历史记录</CardDescription></CardHeader><CardContent><div className="space-y-4">{history.map(h => (<div key={h.id} className="flex items-center justify-between p-4 border rounded-lg"><div className="flex items-center gap-4"><div className={`p-2 rounded-full ${h.action === 'approve' ? 'bg-blue-100 text-blue-600' : h.action === 'reject' ? 'bg-red-100 text-red-600' : h.action === 'apply' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>{h.action === 'approve' ? <CheckCircle2 className="w-4 h-4" /> : h.action === 'reject' ? <XCircle className="w-4 h-4" /> : h.action === 'apply' ? <Play className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}</div><div><p className="font-medium">{h.suggestionTitle}</p><p className="text-sm text-muted-foreground">{h.performedBy} · {new Date(h.performedAt).toLocaleString('zh-CN')}</p>{h.comment && <p className="text-sm text-yellow-600 mt-1">备注: {h.comment}</p>}</div></div><Badge variant="outline">{h.action === 'approve' ? '批准' : h.action === 'reject' ? '拒绝' : h.action === 'apply' ? '应用' : '撤销'}</Badge></div>))}</div></CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>确认操作</DialogTitle><DialogDescription>{dialogAction?.action === 'approve' && '确定要批准此建议吗？批准后可以应用到知识图谱。'}{dialogAction?.action === 'reject' && '确定要拒绝此建议吗？请填写拒绝原因。'}{dialogAction?.action === 'apply' && '确定要应用此建议吗？这将修改知识图谱数据。'}{dialogAction?.action === 'revert' && '确定要撤销此建议吗？这将回滚知识图谱的变更。'}</DialogDescription></DialogHeader>{(dialogAction?.action === 'approve' || dialogAction?.action === 'reject') && <Textarea placeholder="请输入审批意见（可选）" value={comment} onChange={e => setComment(e.target.value)} />}<DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button><Button onClick={confirmAction} variant={dialogAction?.action === 'reject' ? 'destructive' : 'default'}>确认</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}
