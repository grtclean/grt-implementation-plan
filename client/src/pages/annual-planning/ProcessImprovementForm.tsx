/**
 * Process Improvement Form — DB-backed persistence
 *
 * Saves process improvement items to annualPlanningItems via tRPC (category='process').
 * Loads existing items on mount. Auto-saves on add.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, CheckCircle2, Loader2, Workflow } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useUserProfile } from '@/contexts/UserProfileContext';

interface ProcessItem {
  id: string;
  processName: string;
  currentState: string;
  targetState: string;
  priority: string;
  responsible: string;
  timeline: string;
  description: string;
}

interface ProcessImprovementFormProps {
  year: number;
  onSubmit: (content: string, documentType: string) => void;
}

const EMPTY_FORM: Partial<ProcessItem> = {
  processName: '',
  currentState: '',
  targetState: '',
  priority: 'medium',
  responsible: '',
  timeline: '',
  description: '',
};

const PRIORITIES = [
  { value: 'high', label: 'High / 高优先级' },
  { value: 'medium', label: 'Medium / 中优先级' },
  { value: 'low', label: 'Low / 低优先级' },
];

export default function ProcessImprovementForm({ year, onSubmit }: ProcessImprovementFormProps) {
  const { level } = useUserProfile();
  const canManage = level >= 5;
  const [items, setItems] = useState<ProcessItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<ProcessItem>>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // Load existing items from DB
  const itemsQuery = (trpc.annualPlanning as any).getItems.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  // Mutation
  const createMutation = (trpc.annualPlanning as any).createItem.useMutation({
    onSuccess: () => {
      setLastSavedAt(new Date().toLocaleTimeString());
      toast.success('Process improvement saved to database');
      itemsQuery.refetch();
    },
    onError: (err: any) => toast.error(`Save failed: ${err.message}`),
  });

  const deleteMutation = (trpc.annualPlanning as any).deleteItem.useMutation({
    onSuccess: () => {
      toast.success('Process improvement deleted from database');
      itemsQuery.refetch();
    },
    onError: (err: any) => toast.error(`Delete failed: ${err.message}`),
  });

  // Parse DB items on load
  useEffect(() => {
    if (itemsQuery.data) {
      const processItems = (itemsQuery.data as any[]).filter((i: any) => i.category === 'process');
      const parsed = processItems.map((item: any) => {
        let tasks: Record<string, any> = {};
        try { tasks = typeof item.tasks === 'string' ? JSON.parse(item.tasks) : (item.tasks ?? {}); } catch { /* */ }
        return {
          id: String(item.id),
          processName: item.name ?? '',
          currentState: tasks.currentState ?? '',
          targetState: tasks.targetState ?? '',
          priority: tasks.priority ?? 'medium',
          responsible: item.responsibleUserName ?? tasks.responsible ?? '',
          timeline: tasks.timeline ?? '',
          description: item.description ?? '',
        };
      });
      setItems(parsed);
      if (parsed.length > 0) setLastSavedAt('loaded from DB');
    }
  }, [itemsQuery.data]);

  const handleAdd = useCallback(() => {
    if (!formData.processName?.trim()) {
      toast.error('Please fill in Process Name');
      return;
    }

    const newItem: ProcessItem = {
      id: editingId ?? `proc-${Date.now()}`,
      processName: formData.processName || '',
      currentState: formData.currentState || '',
      targetState: formData.targetState || '',
      priority: formData.priority || 'medium',
      responsible: formData.responsible || '',
      timeline: formData.timeline || '',
      description: formData.description || '',
    };

    let updated: ProcessItem[];
    if (editingId) {
      updated = items.map(i => i.id === editingId ? newItem : i);
      setEditingId(null);
    } else {
      updated = [...items, newItem];
    }
    setItems(updated);
    setFormData({ ...EMPTY_FORM });

    // Save to DB
    setIsSaving(true);
    createMutation.mutate({
      category: 'process',
      name: newItem.processName,
      description: newItem.description,
      responsibleUserName: newItem.responsible,
      tasks: {
        currentState: newItem.currentState,
        targetState: newItem.targetState,
        priority: newItem.priority,
        responsible: newItem.responsible,
        timeline: newItem.timeline,
      },
      status: 'pending',
    }, { onSettled: () => setIsSaving(false) });
  }, [formData, editingId, items, createMutation]);

  const handleEdit = (item: ProcessItem) => {
    setFormData(item);
    setEditingId(item.id);
  };

  const handleDelete = (id: string) => {
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    if (editingId === id) {
      setEditingId(null);
      setFormData({ ...EMPTY_FORM });
    }
    deleteMutation.mutate({ id });
  };

  const priorityColor = (p: string) => p === 'high' ? 'destructive' : p === 'low' ? 'secondary' : 'outline';

  return (
    <div className="space-y-6">
      {/* Status bar */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Workflow className="w-4 h-4" />
          <span>{year} Process Improvements</span>
          {items.length > 0 && <Badge variant="secondary">{items.length} item{items.length > 1 ? 's' : ''}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {lastSavedAt && (
            <span className="flex items-center gap-1 text-xs">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              {lastSavedAt}
            </span>
          )}
          {isSaving && (
            <span className="flex items-center gap-1 text-xs text-blue-500">
              <Loader2 className="w-3 h-3 animate-spin" /> Saving...
            </span>
          )}
        </div>
      </div>

      {/* Form */}
      {canManage && <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Edit Process Improvement' : 'Add Process Improvement'}</CardTitle>
          <CardDescription>Define process improvement initiatives for {year}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Process Name *</Label>
              <Input placeholder="e.g., 采购审批流程" value={formData.processName || ''} onChange={(e) => setFormData({ ...formData, processName: e.target.value })} />
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Responsible Person / 负责人</Label>
              <Input placeholder="e.g., 张经理" value={formData.responsible || ''} onChange={(e) => setFormData({ ...formData, responsible: e.target.value })} />
            </div>
            <div>
              <Label>Timeline / 时间线</Label>
              <Input placeholder="e.g., Q1-Q2 2026" value={formData.timeline || ''} onChange={(e) => setFormData({ ...formData, timeline: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Current State / 现状</Label>
            <Textarea placeholder="Describe the current process state" value={formData.currentState || ''} onChange={(e) => setFormData({ ...formData, currentState: e.target.value })} rows={2} />
          </div>
          <div>
            <Label>Target State / 目标状态</Label>
            <Textarea placeholder="Describe the desired future state" value={formData.targetState || ''} onChange={(e) => setFormData({ ...formData, targetState: e.target.value })} rows={2} />
          </div>
          <div>
            <Label>Additional Description / 补充说明</Label>
            <Textarea placeholder="Any additional details" value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
          </div>
          <Button onClick={handleAdd} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            {editingId ? 'Update / 更新' : 'Add Improvement / 添加'}
          </Button>
        </CardContent>
      </Card>}

      {!canManage && (
        <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 flex items-center gap-2">
          <Workflow className="w-4 h-4" />
          只读模式 — 总监及以上角色可编辑流程改进项
        </div>
      )}

      {/* Item List */}
      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Process Improvements ({items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-grow">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{item.processName}</h3>
                        <Badge variant={priorityColor(item.priority) as any} className="text-xs">{item.priority}</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 text-sm text-muted-foreground">
                        {item.currentState && <div><span className="font-medium">Current:</span> {item.currentState}</div>}
                        {item.targetState && <div><span className="font-medium">Target:</span> {item.targetState}</div>}
                        {item.responsible && <div><span className="font-medium">Owner:</span> {item.responsible}</div>}
                        {item.timeline && <div><span className="font-medium">Timeline:</span> {item.timeline}</div>}
                      </div>
                      {item.description && <p className="text-sm text-muted-foreground mt-2">{item.description}</p>}
                    </div>
                    {canManage && <div className="flex gap-2 ml-4">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>Edit</Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
