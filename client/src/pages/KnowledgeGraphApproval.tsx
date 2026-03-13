/**
 * 知识图谱扩展审批前端页面
 * v2.5.7 - 建议列表、人工审批、选择性应用、审批历史
 */

import { useState } from 'react';
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader, StatCard } from '@/components/grt';
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
  { id: 'exp_5', type: 'update_entity', title: '更新实体属性: 不锈钢304', description: '检测到不锈钢304的耐腐蚀等级属性可能需要更新', priority: 'low', confidence: 0.72, status: 'rejected', impact: { affectedEntities: 1, affectedRelations: 0, riskLevel: 'low' }, details: { entityName: '不锈钢304', updatedFields: { corrosionResistance: 'A级' } }, reasoning: ['最新标准已更新'], evidence: { standardUpdate: true }, createdAt: Date.now() - 259200000, reviewedAt: Date.now() - 216000000, reviewedBy: '焦斌', reviewComment: '需要更多验证数据' }
];

const mockHistory: HistoryEntry[] = [
  { id: 'h1', suggestionId: 'exp_4', suggestionTitle: '添加新材料节点: 钛合金TC4', action: 'apply', performedBy: '李工', performedAt: Date.now() - 86400000 },
  { id: 'h2', suggestionId: 'exp_4', suggestionTitle: '添加新材料节点: 钛合金TC4', action: 'approve', performedBy: '李工', performedAt: Date.now() - 129600000 },
  { id: 'h3', suggestionId: 'exp_5', suggestionTitle: '更新实体属性: 不锈钢304', action: 'reject', performedBy: '焦斌', performedAt: Date.now() - 216000000, comment: '需要更多验证数据' },
  { id: 'h4', suggestionId: 'exp_3', suggestionTitle: '合并重复实体: 喷涂/喷漆', action: 'approve', performedBy: '张工', performedAt: Date.now() - 43200000 }
];

// ==================== 工具函数 ====================

const typeIcons: Record<SuggestionType, any> = { add_entity: Plus, add_relation: Link2, merge_entities: Merge, delete_entity: Trash2, update_entity: Edit3 };
const typeKeys: Record<SuggestionType, string> = { add_entity: 'ai.knowledgeGraph.addEntity', add_relation: 'ai.knowledgeGraph.addRelation', merge_entities: 'ai.knowledgeGraph.mergeEntities', delete_entity: 'ai.knowledgeGraph.deleteEntity', update_entity: 'ai.knowledgeGraph.updateEntity' };
const statusConfigKeys: Record<SuggestionStatus, { labelKey: string; icon: any }> = { pending: { labelKey: 'ai.knowledgeGraph.pendingApproval', icon: Clock }, approved: { labelKey: 'ai.knowledgeGraph.approved', icon: CheckCircle2 }, rejected: { labelKey: 'ai.knowledgeGraph.rejected', icon: XCircle }, applied: { labelKey: 'ai.knowledgeGraph.applied', icon: Play }, reverted: { labelKey: 'ai.knowledgeGraph.statusReverted', icon: RotateCcw } };
const priorityConfigKeys: Record<Priority, { labelKey: string; color: string }> = { high: { labelKey: 'ai.knowledgeGraph.priorityHigh', color: 'bg-red-100 text-red-800' }, medium: { labelKey: 'ai.knowledgeGraph.priorityMedium', color: 'bg-yellow-100 text-yellow-800' }, low: { labelKey: 'ai.knowledgeGraph.priorityLow', color: 'bg-green-100 text-green-800' } };

// ==================== 子组件 ====================

function SuggestionCard({ suggestion, selected, onSelect, onAction }: { suggestion: ExpansionSuggestion; selected: boolean; onSelect: (id: string) => void; onAction: (id: string, action: string) => void }) {
  const { t } = useLanguage();
  const TypeIcon = typeIcons[suggestion.type];
  const StatusIcon = statusConfigKeys[suggestion.status].icon;
  
  return (
    <Card className={`transition-all ${selected ? 'ring-2 ring-primary' : ''} hover:shadow-md`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {suggestion.status === 'pending' && <Checkbox checked={selected} onCheckedChange={() => onSelect(suggestion.id)} />}
            <div className={`p-2 rounded-lg ${suggestion.status === 'pending' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}><TypeIcon className="w-5 h-5" /></div>
            <div><CardTitle className="text-base">{suggestion.title}</CardTitle><CardDescription className="text-xs mt-1">{t(typeKeys[suggestion.type])} · {new Date(suggestion.createdAt).toLocaleString()}</CardDescription></div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={priorityConfigKeys[suggestion.priority].color}>{t(priorityConfigKeys[suggestion.priority].labelKey)}</Badge>
            <Badge variant="outline" className="flex items-center gap-1"><StatusIcon className="w-3 h-3" />{t(statusConfigKeys[suggestion.status].labelKey)}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">{suggestion.description}</p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
          <span>{t("ai.knowledgeGraph.confidenceLabel")}: <strong className={suggestion.confidence >= 0.8 ? 'text-green-600' : suggestion.confidence >= 0.6 ? 'text-yellow-600' : 'text-red-600'}>{(suggestion.confidence * 100).toFixed(0)}%</strong></span>
          <span>{t("ai.knowledgeGraph.affectedEntities")}: {suggestion.impact.affectedEntities}</span>
          <span>{t("ai.knowledgeGraph.affectedRelations")}: {suggestion.impact.affectedRelations}</span>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 mb-3">
          <h4 className="text-xs font-medium mb-2">{t("ai.knowledgeGraph.reasoningBasis")}</h4>
          <ul className="text-xs text-muted-foreground space-y-1">{suggestion.reasoning.map((r, i) => <li key={i} className="flex items-center gap-2"><ChevronRight className="w-3 h-3" />{r}</li>)}</ul>
        </div>
        {suggestion.reviewComment && <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3"><p className="text-xs text-yellow-800"><strong>{t("ai.knowledgeGraph.reviewComment")}</strong> {suggestion.reviewComment}</p></div>}
        <div className="flex items-center justify-end gap-2">
          {suggestion.status === 'pending' && <><Button size="sm" variant="outline" onClick={() => onAction(suggestion.id, 'reject')}><XCircle className="w-4 h-4 mr-1" />{t("ai.knowledgeGraph.reject")}</Button><Button size="sm" onClick={() => onAction(suggestion.id, 'approve')}><CheckCircle2 className="w-4 h-4 mr-1" />{t("ai.knowledgeGraph.approve")}</Button></>}
          {suggestion.status === 'approved' && <Button size="sm" onClick={() => onAction(suggestion.id, 'apply')}><Play className="w-4 h-4 mr-1" />{t("ai.knowledgeGraph.apply")}</Button>}
          {suggestion.status === 'applied' && <Button size="sm" variant="outline" onClick={() => onAction(suggestion.id, 'revert')}><RotateCcw className="w-4 h-4 mr-1" />{t("ai.knowledgeGraph.revert")}</Button>}
        </div>
      </CardContent>
    </Card>
  );
}

function StatsCard({ stats }: { stats: { total: number; pending: number; approved: number; rejected: number; applied: number; approvalRate: number } }) {
  const { t } = useLanguage();
  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
      <StatCard icon={Network} label={t("ai.knowledgeGraph.totalSuggestions")} value={stats.total} />
      <StatCard icon={Clock} label={t("ai.knowledgeGraph.pendingApproval")} value={stats.pending} iconColor="text-yellow-500" iconBg="bg-yellow-500/10" />
      <StatCard icon={CheckCircle2} label={t("ai.knowledgeGraph.approved")} value={stats.approved} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
      <StatCard icon={XCircle} label={t("ai.knowledgeGraph.rejected")} value={stats.rejected} iconColor="text-red-500" iconBg="bg-red-500/10" />
      <StatCard icon={Play} label={t("ai.knowledgeGraph.applied")} value={stats.applied} iconColor="text-green-500" iconBg="bg-green-500/10" />
      <StatCard icon={GitBranch} label={t("ai.knowledgeGraph.approvalRate")} value={`${(stats.approvalRate * 100).toFixed(0)}%`} />
    </div>
  );
}

// ==================== 主组件 ====================

export default function KnowledgeGraphApproval() {
  const { t } = useLanguage();
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
    toast.success(`${t("ai.knowledgeGraph.operationSuccess")}: ${action === 'approve' ? t("ai.knowledgeGraph.approved") : action === 'reject' ? t("ai.knowledgeGraph.rejected") : action === 'apply' ? t("ai.knowledgeGraph.applied") : t("ai.knowledgeGraph.statusReverted")}`);
    setDialogOpen(false); setComment(''); setDialogAction(null);
  };

  const handleBatchAction = (action: 'approve' | 'reject') => {
    if (selectedIds.length === 0) { toast.error(t("ai.knowledgeGraph.selectFirst")); return; }
    setSuggestions(prev => prev.map(s => { if (!selectedIds.includes(s.id)) return s; return { ...s, status: action === 'approve' ? 'approved' : 'rejected', reviewedAt: Date.now(), reviewedBy: 'current_user' }; }));
    toast.success(t("ai.knowledgeGraph.batchSuccess").replace("{action}", action === 'approve' ? t("ai.knowledgeGraph.approve") : t("ai.knowledgeGraph.reject")).replace("{n}", String(selectedIds.length)));
    setSelectedIds([]);
  };

  return (
    <div className="container py-8 space-y-6">
      <PageHeader
        icon={GitBranch}
        title={t("ai.knowledgeGraph.title")}
        description={t("ai.knowledgeGraph.description")}
        actions={
          <Button variant="outline" onClick={() => toast.info(t("ai.knowledgeGraph.refreshHint"))}><RefreshCw className="w-4 h-4 mr-2" />{t("ai.knowledgeGraph.refresh")}</Button>
        }
      />

      <StatsCard stats={stats} />

      <Tabs defaultValue="visualization" className="space-y-4">
        <TabsList><TabsTrigger value="visualization" className="flex items-center gap-2"><Network className="w-4 h-4" />{t("ai.knowledgeGraph.tabVisualization")}</TabsTrigger><TabsTrigger value="suggestions" className="flex items-center gap-2"><Clock className="w-4 h-4" />{t("ai.knowledgeGraph.tabSuggestions")}</TabsTrigger><TabsTrigger value="history" className="flex items-center gap-2"><History className="w-4 h-4" />{t("ai.knowledgeGraph.tabHistory")}</TabsTrigger></TabsList>

        <TabsContent value="visualization">
          <Card className="h-[600px]">
            <KnowledgeGraphVisualization
              data={generateSampleGraphData()}
              onNodeClick={(node) => toast.info(`${t("ai.knowledgeGraph.selectedNode")}: ${node.label}`)}
              onEdgeClick={(edge) => toast.info(`${t("ai.knowledgeGraph.selectedRelation")}: ${edge.relation}`)}
              onSuggestionApprove={(item) => toast.success(t("ai.knowledgeGraph.expansionApproved"))}
              className="h-full"
            />
          </Card>
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-32"><SelectValue placeholder={t("ai.knowledgeGraph.filterStatus")} /></SelectTrigger><SelectContent><SelectItem value="all">{t("ai.knowledgeGraph.allStatuses")}</SelectItem><SelectItem value="pending">{t("ai.knowledgeGraph.statusPending")}</SelectItem><SelectItem value="approved">{t("ai.knowledgeGraph.statusApproved")}</SelectItem><SelectItem value="rejected">{t("ai.knowledgeGraph.statusRejected")}</SelectItem><SelectItem value="applied">{t("ai.knowledgeGraph.statusApplied")}</SelectItem></SelectContent></Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-32"><SelectValue placeholder={t("ai.knowledgeGraph.filterType")} /></SelectTrigger><SelectContent><SelectItem value="all">{t("ai.knowledgeGraph.allTypes")}</SelectItem><SelectItem value="add_entity">{t("ai.knowledgeGraph.addEntity")}</SelectItem><SelectItem value="add_relation">{t("ai.knowledgeGraph.addRelation")}</SelectItem><SelectItem value="merge_entities">{t("ai.knowledgeGraph.mergeEntities")}</SelectItem><SelectItem value="update_entity">{t("ai.knowledgeGraph.updateEntity")}</SelectItem></SelectContent></Select>
            </div>
            {selectedIds.length > 0 && <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">{t("ai.knowledgeGraph.selectedCount").replace("{n}", String(selectedIds.length))}</span><Button size="sm" variant="outline" onClick={() => handleBatchAction('reject')}>{t("ai.knowledgeGraph.batchReject")}</Button><Button size="sm" onClick={() => handleBatchAction('approve')}>{t("ai.knowledgeGraph.batchApprove")}</Button></div>}
          </div>
          <div className="space-y-4">
            {filteredSuggestions.map(s => <SuggestionCard key={s.id} suggestion={s} selected={selectedIds.includes(s.id)} onSelect={handleSelect} onAction={handleAction} />)}
            {filteredSuggestions.length === 0 && <Card><CardContent className="p-12 text-center text-muted-foreground"><Info className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>{t("ai.knowledgeGraph.noSuggestions")}</p></CardContent></Card>}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card><CardHeader><CardTitle>{t("ai.knowledgeGraph.historyTitle")}</CardTitle><CardDescription>{t("ai.knowledgeGraph.historyDesc")}</CardDescription></CardHeader><CardContent><div className="space-y-4">{history.map(h => (<div key={h.id} className="flex items-center justify-between p-4 border rounded-lg"><div className="flex items-center gap-4"><div className={`p-2 rounded-full ${h.action === 'approve' ? 'bg-blue-100 text-blue-600' : h.action === 'reject' ? 'bg-red-100 text-red-600' : h.action === 'apply' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>{h.action === 'approve' ? <CheckCircle2 className="w-4 h-4" /> : h.action === 'reject' ? <XCircle className="w-4 h-4" /> : h.action === 'apply' ? <Play className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}</div><div><p className="font-medium">{h.suggestionTitle}</p><p className="text-sm text-muted-foreground">{h.performedBy} · {new Date(h.performedAt).toLocaleString()}</p>{h.comment && <p className="text-sm text-yellow-600 mt-1">{t("ai.knowledgeGraph.remark")}: {h.comment}</p>}</div></div><Badge variant="outline">{h.action === 'approve' ? t("ai.knowledgeGraph.actionApprove") : h.action === 'reject' ? t("ai.knowledgeGraph.actionReject") : h.action === 'apply' ? t("ai.knowledgeGraph.actionApply") : t("ai.knowledgeGraph.actionRevert")}</Badge></div>))}</div></CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>{t("ai.knowledgeGraph.confirmAction")}</DialogTitle><DialogDescription>{dialogAction?.action === 'approve' && t("ai.knowledgeGraph.confirmApprove")}{dialogAction?.action === 'reject' && t("ai.knowledgeGraph.confirmReject")}{dialogAction?.action === 'apply' && t("ai.knowledgeGraph.confirmApply")}{dialogAction?.action === 'revert' && t("ai.knowledgeGraph.confirmRevert")}</DialogDescription></DialogHeader>{(dialogAction?.action === 'approve' || dialogAction?.action === 'reject') && <Textarea placeholder={t("ai.knowledgeGraph.commentPlaceholder")} value={comment} onChange={e => setComment(e.target.value)} />}<DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>{t("ai.knowledgeGraph.cancelBtn")}</Button><Button onClick={confirmAction} variant={dialogAction?.action === 'reject' ? 'destructive' : 'default'}>{t("ai.knowledgeGraph.confirmBtn")}</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}
