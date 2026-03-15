/**
 * KPI Input Form — DB-backed persistence + AI analysis trigger
 *
 * Saves KPIs to annualPlanningItems via tRPC (category='kpi').
 * Loads existing KPIs on mount. Auto-saves on add/edit/delete.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Send, Save, CheckCircle2, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface KPI {
  id: string;
  name: string;
  category: string;
  target: number;
  unit: string;
  owner?: string;
  description?: string;
  calculationMethod?: string;
  dataSource?: string;
  reviewFrequency?: string;
}

interface KPIInputFormProps {
  year: number;
  onSubmit: (content: string, documentType: string) => void;
}

const EMPTY_FORM: Partial<KPI> = {
  name: '',
  category: 'Revenue',
  target: 0,
  unit: '',
  owner: '',
  description: '',
  calculationMethod: '',
  dataSource: 'System',
  reviewFrequency: 'Monthly',
};

const CATEGORIES = [
  { value: "Revenue", label: "营收 Revenue" },
  { value: "Cost", label: "成本 Cost" },
  { value: "Quality", label: "质量 Quality" },
  { value: "Delivery", label: "交付 Delivery" },
  { value: "Customer", label: "客户 Customer" },
  { value: "Employee", label: "员工 Employee" },
  { value: "Innovation", label: "创新 Innovation" },
];

export default function KPIInputForm({ year, onSubmit }: KPIInputFormProps) {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<KPI>>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // Load existing KPIs from DB
  const kpiQuery = (trpc.annualPlanning as any).getKPIs.useQuery(
    { year },
    { refetchOnWindowFocus: false }
  );

  // Save mutation
  const saveMutation = (trpc.annualPlanning as any).saveKPIs.useMutation({
    onSuccess: (data: any) => {
      setLastSavedAt(new Date().toLocaleTimeString());
      toast.success(`${data.message ?? 'KPIs saved'}`);
    },
    onError: (err: any) => {
      toast.error(`Save failed: ${err.message}`);
    },
  });

  // Analyze mutation
  const analyzeMutation = (trpc.annualPlanning as any).analyzeKPIs.useMutation({
    onSuccess: (data: any) => {
      toast.success(`AI analysis complete — Score: ${data.score}/100 (${data.grade})`);
      // Pass structured result to parent for InterpretationResults
      onSubmit(JSON.stringify(data), 'KPI_ANALYSIS');
    },
    onError: (err: any) => {
      toast.error(`Analysis failed: ${err.message}`);
    },
  });

  // Load KPIs from DB on mount / year change
  useEffect(() => {
    if (kpiQuery.data?.kpis?.length > 0) {
      setKpis(kpiQuery.data.kpis);
      setLastSavedAt("loaded from DB");
    }
  }, [kpiQuery.data]);

  // Save to DB
  const saveToDb = useCallback(async (kpiList: KPI[]) => {
    if (kpiList.length === 0) return;
    setIsSaving(true);
    try {
      await saveMutation.mutateAsync({
        year,
        kpis: kpiList.map(k => ({
          name: k.name,
          category: k.category,
          target: k.target,
          unit: k.unit,
          owner: k.owner,
          description: k.description,
          calculationMethod: k.calculationMethod,
          dataSource: k.dataSource,
          reviewFrequency: k.reviewFrequency,
        })),
      });
    } finally {
      setIsSaving(false);
    }
  }, [year, saveMutation]);

  const handleAddKPI = () => {
    if (!formData.name?.trim() || !formData.unit?.trim()) {
      toast.error('Please fill in KPI Name and Unit');
      return;
    }

    const newKPI: KPI = {
      id: editingId ?? `kpi-${Date.now()}`,
      name: formData.name || '',
      category: formData.category || 'Revenue',
      target: formData.target || 0,
      unit: formData.unit || '',
      owner: formData.owner,
      description: formData.description,
      calculationMethod: formData.calculationMethod,
      dataSource: formData.dataSource,
      reviewFrequency: formData.reviewFrequency,
    };

    let updated: KPI[];
    if (editingId) {
      updated = kpis.map(k => k.id === editingId ? newKPI : k);
      setEditingId(null);
    } else {
      updated = [...kpis, newKPI];
    }
    setKpis(updated);
    setFormData({ ...EMPTY_FORM });

    // Auto-save to DB
    saveToDb(updated);
  };

  const handleEditKPI = (kpi: KPI) => {
    setFormData(kpi);
    setEditingId(kpi.id);
  };

  const handleDeleteKPI = (id: string) => {
    const updated = kpis.filter(k => k.id !== id);
    setKpis(updated);
    if (editingId === id) {
      setEditingId(null);
      setFormData({ ...EMPTY_FORM });
    }
    // Auto-save (or clear DB if empty)
    if (updated.length > 0) {
      saveToDb(updated);
    } else {
      toast.info("All KPIs removed");
    }
  };

  const handleAnalyze = async () => {
    if (kpis.length === 0) {
      toast.error('Please add at least one KPI');
      return;
    }
    // Save first, then analyze
    await saveToDb(kpis);
    analyzeMutation.mutate({
      year,
      kpis: kpis.map(k => ({
        name: k.name,
        category: k.category,
        target: k.target,
        unit: k.unit,
        owner: k.owner,
        description: k.description,
        calculationMethod: k.calculationMethod,
        dataSource: k.dataSource,
        reviewFrequency: k.reviewFrequency,
      })),
    });
  };

  const isLoading = kpiQuery.isLoading;
  const isAnalyzing = analyzeMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Status bar */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>{year} Annual KPIs</span>
          {kpis.length > 0 && (
            <Badge variant="secondary">{kpis.length} KPI{kpis.length > 1 ? 's' : ''}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {lastSavedAt && (
            <span className="flex items-center gap-1 text-xs">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              Saved: {lastSavedAt}
            </span>
          )}
          {isSaving && (
            <span className="flex items-center gap-1 text-xs text-blue-500">
              <Loader2 className="w-3 h-3 animate-spin" />
              Saving...
            </span>
          )}
        </div>
      </div>

      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Edit KPI' : 'Add KPI'}</CardTitle>
          <CardDescription>
            Define annual Key Performance Indicators for {year} — auto-saved to database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="kpi-name">KPI Name *</Label>
              <Input
                id="kpi-name"
                placeholder="e.g., 年度营收目标"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="kpi-category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger id="kpi-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="kpi-target">Target Value *</Label>
              <Input
                id="kpi-target"
                type="number"
                placeholder="0"
                value={formData.target || ''}
                onChange={(e) => setFormData({ ...formData, target: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label htmlFor="kpi-unit">Unit *</Label>
              <Input
                id="kpi-unit"
                placeholder="e.g., 万元, %, 台"
                value={formData.unit || ''}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="kpi-owner">Owner / 责任人</Label>
              <Input
                id="kpi-owner"
                placeholder="Person responsible"
                value={formData.owner || ''}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="kpi-datasource">Data Source</Label>
              <Select value={formData.dataSource} onValueChange={(value) => setFormData({ ...formData, dataSource: value })}>
                <SelectTrigger id="kpi-datasource">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="System">System / 系统自动</SelectItem>
                  <SelectItem value="Manual">Manual / 手动录入</SelectItem>
                  <SelectItem value="External">External / 外部数据</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="kpi-frequency">Review Frequency</Label>
              <Select value={formData.reviewFrequency} onValueChange={(value) => setFormData({ ...formData, reviewFrequency: value })}>
                <SelectTrigger id="kpi-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Daily">Daily / 每日</SelectItem>
                  <SelectItem value="Weekly">Weekly / 每周</SelectItem>
                  <SelectItem value="Monthly">Monthly / 每月</SelectItem>
                  <SelectItem value="Quarterly">Quarterly / 每季度</SelectItem>
                  <SelectItem value="Annual">Annual / 每年</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="kpi-description">Description / 描述</Label>
            <Textarea
              id="kpi-description"
              placeholder="Detailed description of this KPI"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="kpi-calculation">Calculation Method / 计算方式</Label>
            <Textarea
              id="kpi-calculation"
              placeholder="How is this KPI calculated?"
              value={formData.calculationMethod || ''}
              onChange={(e) => setFormData({ ...formData, calculationMethod: e.target.value })}
              rows={2}
            />
          </div>

          <Button onClick={handleAddKPI} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            {editingId ? 'Update KPI / 更新' : 'Add KPI / 添加'}
          </Button>
        </CardContent>
      </Card>

      {/* KPI List */}
      {kpis.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>KPIs ({kpis.length})</CardTitle>
              <Button variant="outline" size="sm" onClick={() => saveToDb(kpis)} disabled={isSaving}>
                <Save className="w-4 h-4 mr-1" />
                {isSaving ? 'Saving...' : 'Manual Save'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {kpis.map((kpi) => (
                <div key={kpi.id} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-grow">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{kpi.name}</h3>
                        <Badge variant="outline" className="text-xs">{kpi.category}</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Target:</span> {kpi.target} {kpi.unit}
                        </div>
                        <div>
                          <span className="font-medium">Owner:</span> {kpi.owner || 'Unassigned'}
                        </div>
                        <div>
                          <span className="font-medium">Source:</span> {kpi.dataSource}
                        </div>
                        <div>
                          <span className="font-medium">Frequency:</span> {kpi.reviewFrequency}
                        </div>
                      </div>
                      {kpi.description && (
                        <p className="text-sm text-muted-foreground mt-2">{kpi.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button variant="outline" size="sm" onClick={() => handleEditKPI(kpi)}>
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteKPI(kpi.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit for AI Analysis */}
      {kpis.length > 0 && (
        <Button
          onClick={handleAnalyze}
          disabled={isAnalyzing || isSaving}
          className="w-full"
          size="lg"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              AI Analyzing...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Submit for AI Analysis / 提交AI分析
            </>
          )}
        </Button>
      )}
    </div>
  );
}
