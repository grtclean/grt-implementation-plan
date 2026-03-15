/**
 * Organization Structure Change Form — DB-backed persistence
 *
 * Saves org changes to annualPlanningItems via tRPC (category='org').
 * Loads existing org items on mount. Auto-saves on add/edit/delete.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Save, CheckCircle2, Loader2, Building2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useUserProfile } from '@/contexts/UserProfileContext';

interface OrgChange {
  id: string;
  changeType: string;
  department: string;
  description: string;
  headcountDelta: number;
  newReportingTo: string;
  priority: string;
  effectiveDate: string;
}

interface OrgStructureFormProps {
  year: number;
  onSubmit: (content: string, documentType: string) => void;
}

const EMPTY_FORM: Partial<OrgChange> = {
  changeType: 'add_dept',
  department: '',
  description: '',
  headcountDelta: 0,
  newReportingTo: '',
  priority: 'medium',
  effectiveDate: '',
};

const CHANGE_TYPES = [
  { value: 'add_dept', label: 'Add Department / 新增部门' },
  { value: 'remove_dept', label: 'Remove Department / 撤销部门' },
  { value: 'rename_dept', label: 'Rename Department / 部门更名' },
  { value: 'headcount_increase', label: 'Headcount Increase / 增员' },
  { value: 'headcount_decrease', label: 'Headcount Decrease / 减员' },
  { value: 'reporting_change', label: 'Reporting Change / 汇报关系变更' },
  { value: 'merge', label: 'Merge Departments / 部门合并' },
  { value: 'split', label: 'Split Department / 部门拆分' },
];

const PRIORITIES = [
  { value: 'high', label: 'High / 高' },
  { value: 'medium', label: 'Medium / 中' },
  { value: 'low', label: 'Low / 低' },
];

export default function OrgStructureForm({ year, onSubmit }: OrgStructureFormProps) {
  const { level } = useUserProfile();
  const canManage = level >= 5;
  const [items, setItems] = useState<OrgChange[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<OrgChange>>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // Load existing org items from DB
  const itemsQuery = (trpc.annualPlanning as any).getItems.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  // Mutation
  const createMutation = (trpc.annualPlanning as any).createItem.useMutation({
    onSuccess: () => {
      setLastSavedAt(new Date().toLocaleTimeString());
      toast.success('Org change saved to database');
      itemsQuery.refetch();
    },
    onError: (err: any) => toast.error(`Save failed: ${err.message}`),
  });

  const deleteMutation = (trpc.annualPlanning as any).deleteItem.useMutation({
    onSuccess: () => {
      toast.success('Org change deleted from database');
      itemsQuery.refetch();
    },
    onError: (err: any) => toast.error(`Delete failed: ${err.message}`),
  });

  // Load org items from query
  useEffect(() => {
    if (itemsQuery.data) {
      const orgItems = (itemsQuery.data as any[]).filter((i: any) => i.category === 'org');
      const parsed = orgItems.map((item: any) => {
        let tasks: Record<string, any> = {};
        try { tasks = typeof item.tasks === 'string' ? JSON.parse(item.tasks) : (item.tasks ?? {}); } catch { /* */ }
        return {
          id: String(item.id),
          changeType: tasks.changeType ?? 'add_dept',
          department: item.name ?? '',
          description: item.description ?? '',
          headcountDelta: tasks.headcountDelta ?? 0,
          newReportingTo: tasks.newReportingTo ?? '',
          priority: tasks.priority ?? 'medium',
          effectiveDate: tasks.effectiveDate ?? '',
        };
      });
      setItems(parsed);
      if (parsed.length > 0) setLastSavedAt('loaded from DB');
    }
  }, [itemsQuery.data]);

  const handleAdd = useCallback(() => {
    if (!formData.department?.trim()) {
      toast.error('Please fill in Department name');
      return;
    }

    const newItem: OrgChange = {
      id: editingId ?? `org-${Date.now()}`,
      changeType: formData.changeType || 'add_dept',
      department: formData.department || '',
      description: formData.description || '',
      headcountDelta: formData.headcountDelta || 0,
      newReportingTo: formData.newReportingTo || '',
      priority: formData.priority || 'medium',
      effectiveDate: formData.effectiveDate || '',
    };

    let updated: OrgChange[];
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
      category: 'org',
      name: newItem.department,
      description: newItem.description,
      tasks: {
        changeType: newItem.changeType,
        headcountDelta: newItem.headcountDelta,
        newReportingTo: newItem.newReportingTo,
        priority: newItem.priority,
        effectiveDate: newItem.effectiveDate,
      },
      status: 'pending',
    }, { onSettled: () => setIsSaving(false) });
  }, [formData, editingId, items, createMutation]);

  const handleEdit = (item: OrgChange) => {
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

  const changeTypeLabel = (val: string) => CHANGE_TYPES.find(c => c.value === val)?.label ?? val;
  const priorityColor = (p: string) => p === 'high' ? 'destructive' : p === 'low' ? 'secondary' : 'outline';

  return (
    <div className="space-y-6">
      {/* Status bar */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          <span>{year} Org Structure Changes</span>
          {items.length > 0 && <Badge variant="secondary">{items.length} change{items.length > 1 ? 's' : ''}</Badge>}
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
          <CardTitle>{editingId ? 'Edit Change' : 'Add Org Change'}</CardTitle>
          <CardDescription>Define organizational structure changes for {year}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Change Type *</Label>
              <Select value={formData.changeType} onValueChange={(v) => setFormData({ ...formData, changeType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHANGE_TYPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Department *</Label>
              <Input placeholder="e.g., 海外事业部" value={formData.department || ''} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
            </div>
            <div>
              <Label>Headcount Change</Label>
              <Input type="number" placeholder="0" value={formData.headcountDelta || ''} onChange={(e) => setFormData({ ...formData, headcountDelta: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>New Reporting To</Label>
              <Input placeholder="e.g., VP Operations" value={formData.newReportingTo || ''} onChange={(e) => setFormData({ ...formData, newReportingTo: e.target.value })} />
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
              <Label>Effective Date</Label>
              <Input type="date" value={formData.effectiveDate || ''} onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Description / 说明</Label>
            <Textarea placeholder="Details of this organizational change" value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
          </div>
          <Button onClick={handleAdd} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            {editingId ? 'Update Change / 更新' : 'Add Change / 添加'}
          </Button>
        </CardContent>
      </Card>}

      {!canManage && (
        <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          只读模式 — 总监及以上角色可编辑组织架构变更
        </div>
      )}

      {/* Item List */}
      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Org Changes ({items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-grow">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{item.department}</h3>
                        <Badge variant="outline" className="text-xs">{changeTypeLabel(item.changeType)}</Badge>
                        <Badge variant={priorityColor(item.priority) as any} className="text-xs">{item.priority}</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 text-sm text-muted-foreground">
                        {item.headcountDelta !== 0 && <div><span className="font-medium">HC Delta:</span> {item.headcountDelta > 0 ? '+' : ''}{item.headcountDelta}</div>}
                        {item.newReportingTo && <div><span className="font-medium">Reports to:</span> {item.newReportingTo}</div>}
                        {item.effectiveDate && <div><span className="font-medium">Effective:</span> {item.effectiveDate}</div>}
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
