/**
 * 简道云表单数据浏览器
 * 左侧: 表单列表 + 搜索 + 按实体类型筛选
 * 右侧: 字段结构 / 数据浏览 / 映射编辑器
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import {
  Database, Search, ChevronRight, Loader2, Table, FileText,
  Settings2, RefreshCw, Check, AlertCircle
} from "lucide-react";

// 所有可分类的实体类型
const ALL_ENTITY_TYPES = [
  'project', 'projectTask', 'projectMilestone', 'projectPhase', 'projectTeamMember',
  'approval_instance', 'approval_template',
  'crmCustomer', 'crmContact', 'crmOpportunity', 'crmLead', 'crmFollowUp',
  'hrmEmployee', 'hrmCandidate', 'hrmTraining', 'hrmPerformance', 'hrmSalary',
  'productionWorkOrder', 'qualityInspection', 'bom', 'inventory',
  'salesOrder', 'purchaseOrder', 'quotation',
  'knowledgeDocument', 'issueRecord',
];

type Tab = 'fields' | 'data' | 'mapping';

export default function JiandaoyunFormBrowser() {
  const [search, setSearch] = useState('');
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [selectedFormId, setSelectedFormId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('fields');
  const [dataPageCursor, setDataPageCursor] = useState<string | undefined>(undefined);

  // Queries
  const formMappingsQuery = trpc.jiandaoyun.getFormMappings.useQuery({});
  const updateMapping = trpc.jiandaoyun.updateFormMapping.useMutation({
    onSuccess: () => formMappingsQuery.refetch(),
  });

  const allForms = formMappingsQuery.data || [];

  // Filter forms
  const filteredForms = useMemo(() => {
    return allForms.filter((m: any) => {
      const matchSearch = !search ||
        m.jdy_form_name?.toLowerCase().includes(search.toLowerCase()) ||
        m.jdy_app_name?.toLowerCase().includes(search.toLowerCase());
      const matchEntity = filterEntity === 'all' ||
        (filterEntity === 'classified' && m.target_entity) ||
        (filterEntity === 'unclassified' && !m.target_entity) ||
        m.target_entity === filterEntity;
      return matchSearch && matchEntity;
    });
  }, [allForms, search, filterEntity]);

  const selectedForm = allForms.find((m: any) => m.id === selectedFormId) as any;

  // Data query for selected form
  const formDataQuery = trpc.jiandaoyun.getFormData.useQuery(
    {
      appId: selectedForm?.jdy_app_id || '',
      formId: selectedForm?.jdy_form_id || '',
      limit: 50,
      dataId: dataPageCursor,
    },
    { enabled: !!selectedForm && activeTab === 'data' }
  );

  // Field query for selected form
  const formFieldsQuery = trpc.jiandaoyun.getFormFields.useQuery(
    {
      appId: selectedForm?.jdy_app_id || '',
      formId: selectedForm?.jdy_form_id || '',
    },
    { enabled: !!selectedForm && activeTab === 'fields' }
  );

  const handleSelectForm = (id: number) => {
    setSelectedFormId(id);
    setActiveTab('fields');
    setDataPageCursor(undefined);
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="h-6 w-6" />
          表单数据浏览器
        </h1>
        <p className="text-muted-foreground mt-1">浏览已发现的简道云表单，查看字段结构和数据</p>
      </div>

      <div className="flex gap-4 h-[calc(100vh-180px)]">
        {/* Left panel: form list */}
        <div className="w-80 flex-shrink-0 flex flex-col border rounded-lg overflow-hidden">
          <div className="p-3 border-b space-y-2 bg-muted/30">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索表单..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={filterEntity} onValueChange={setFilterEntity}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="筛选类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部 ({allForms.length})</SelectItem>
                <SelectItem value="classified">已分类 ({allForms.filter((m: any) => m.target_entity).length})</SelectItem>
                <SelectItem value="unclassified">未分类 ({allForms.filter((m: any) => !m.target_entity).length})</SelectItem>
                {ALL_ENTITY_TYPES.map(e => {
                  const cnt = allForms.filter((m: any) => m.target_entity === e).length;
                  if (cnt === 0) return null;
                  return <SelectItem key={e} value={e}>{e} ({cnt})</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-y-auto">
            {formMappingsQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredForms.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">无匹配表单</p>
            ) : (
              filteredForms.map((m: any) => (
                <button
                  key={m.id}
                  onClick={() => handleSelectForm(m.id)}
                  className={`w-full text-left px-3 py-2.5 border-b text-sm transition-colors hover:bg-muted/50 ${
                    selectedFormId === m.id ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                  }`}
                >
                  <div className="font-medium truncate">{m.jdy_form_name}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground truncate">{m.jdy_app_name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">{m.record_count || 0}条</span>
                      {m.target_entity ? (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">{m.target_entity}</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">未分类</Badge>
                      )}
                      {m.is_confirmed && <Check className="h-3 w-3 text-green-500" />}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right panel: details */}
        <div className="flex-1 border rounded-lg overflow-hidden flex flex-col">
          {!selectedForm ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Database className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>选择左侧表单查看详情</p>
              </div>
            </div>
          ) : (
            <>
              {/* Tab bar */}
              <div className="flex items-center border-b bg-muted/30">
                <div className="flex-1 flex">
                  <TabButton icon={Table} label="字段结构" active={activeTab === 'fields'} onClick={() => setActiveTab('fields')} />
                  <TabButton icon={FileText} label="数据浏览" active={activeTab === 'data'} onClick={() => { setActiveTab('data'); setDataPageCursor(undefined); }} />
                  <TabButton icon={Settings2} label="映射编辑" active={activeTab === 'mapping'} onClick={() => setActiveTab('mapping')} />
                </div>
                <div className="px-3 text-xs text-muted-foreground">
                  {selectedForm.jdy_app_name} / {selectedForm.jdy_form_name}
                </div>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-auto p-4">
                {activeTab === 'fields' && (
                  <FieldsTab fields={formFieldsQuery.data?.fields} isLoading={formFieldsQuery.isLoading} error={formFieldsQuery.data?.error} />
                )}
                {activeTab === 'data' && (
                  <DataTab
                    data={formDataQuery.data?.data}
                    isLoading={formDataQuery.isLoading}
                    error={formDataQuery.data?.error}
                    onNextPage={(lastId) => setDataPageCursor(lastId)}
                    cursor={dataPageCursor}
                    onReset={() => setDataPageCursor(undefined)}
                  />
                )}
                {activeTab === 'mapping' && (
                  <MappingTab
                    form={selectedForm}
                    onUpdate={(update) => {
                      updateMapping.mutate({ id: selectedForm.id, ...update });
                    }}
                    isPending={updateMapping.isPending}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Tab button
function TabButton({ icon: Icon, label, active, onClick }: { icon: any; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 transition-colors ${
        active ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

// ===== Tab 1: 字段结构 =====
function FieldsTab({ fields, isLoading, error }: { fields?: any[]; isLoading: boolean; error?: string | null }) {
  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (error) return <div className="text-red-500 text-sm">{error}</div>;
  if (!fields || fields.length === 0) return <p className="text-muted-foreground text-center py-8">无字段数据</p>;

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">字段名 (name)</th>
            <th className="px-3 py-2 text-left">标签 (label)</th>
            <th className="px-3 py-2 text-left">类型</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((f: any, idx: number) => (
            <tr key={f.name || idx} className="border-t hover:bg-muted/30">
              <td className="px-3 py-1.5 text-muted-foreground">{idx + 1}</td>
              <td className="px-3 py-1.5 font-mono text-xs">{f.name}</td>
              <td className="px-3 py-1.5">{f.label}</td>
              <td className="px-3 py-1.5">
                <Badge variant="outline" className="text-xs">{f.type}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ===== Tab 2: 数据浏览 =====
function DataTab({ data, isLoading, error, onNextPage, cursor, onReset }: {
  data?: any[];
  isLoading: boolean;
  error?: string | null;
  onNextPage: (lastId: string) => void;
  cursor?: string;
  onReset: () => void;
}) {
  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (error) return <div className="text-red-500 text-sm">{error}</div>;
  if (!data || data.length === 0) return <p className="text-muted-foreground text-center py-8">无数据记录</p>;

  // Extract column keys from data
  const columns = Array.from(new Set(data.flatMap((row: any) => Object.keys(row)))).filter(k => k !== '_id');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">显示 {data.length} 条{cursor ? '（已翻页）' : ''}</span>
        <div className="flex gap-2">
          {cursor && (
            <Button size="sm" variant="outline" onClick={onReset}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> 首页
            </Button>
          )}
          {data.length >= 50 && (
            <Button size="sm" variant="outline" onClick={() => {
              const lastItem = data[data.length - 1] as any;
              if (lastItem?._id) onNextPage(lastItem._id);
            }}>
              下一页 <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          )}
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted sticky top-0">
            <tr>
              <th className="px-2 py-1.5 text-left whitespace-nowrap">#</th>
              {columns.slice(0, 10).map(col => (
                <th key={col} className="px-2 py-1.5 text-left whitespace-nowrap max-w-[200px]">{col}</th>
              ))}
              {columns.length > 10 && <th className="px-2 py-1.5">+{columns.length - 10}列</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((row: any, idx: number) => (
              <tr key={row._id || idx} className="border-t hover:bg-muted/30">
                <td className="px-2 py-1 text-muted-foreground">{idx + 1}</td>
                {columns.slice(0, 10).map(col => (
                  <td key={col} className="px-2 py-1 max-w-[200px] truncate">
                    {formatCellValue(row[col])}
                  </td>
                ))}
                {columns.length > 10 && <td className="px-2 py-1 text-muted-foreground">…</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 80);
  return String(value).slice(0, 80);
}

// ===== Tab 3: 映射编辑器 =====
function MappingTab({ form, onUpdate, isPending }: { form: any; onUpdate: (update: any) => void; isPending: boolean }) {
  const [editEntity, setEditEntity] = useState(form.target_entity || '');
  const [confirmed, setConfirmed] = useState(!!form.is_confirmed);

  const fieldMapping = typeof form.field_mapping === 'string'
    ? JSON.parse(form.field_mapping || '{}')
    : form.field_mapping || {};

  return (
    <div className="space-y-6">
      {/* Entity classification */}
      <div className="space-y-2">
        <Label className="font-medium">目标实体类型</Label>
        <div className="flex items-center gap-2">
          <Select value={editEntity || 'none'} onValueChange={setEditEntity}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="选择实体类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">未分类</SelectItem>
              {ALL_ENTITY_TYPES.map(e => (
                <SelectItem key={e} value={e}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={() => onUpdate({ targetEntity: editEntity === 'none' ? undefined : editEntity })}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '保存分类'}
          </Button>
        </div>
      </div>

      {/* Confirmation toggle */}
      <div className="flex items-center gap-3 p-3 rounded-lg border">
        <Switch
          checked={confirmed}
          onCheckedChange={(val) => {
            setConfirmed(val);
            onUpdate({ isConfirmed: val });
          }}
        />
        <div>
          <Label className="font-medium">确认映射</Label>
          <p className="text-xs text-muted-foreground">确认后该表单将在导入阶段被使用</p>
        </div>
      </div>

      {/* Field mapping display */}
      <div className="space-y-2">
        <Label className="font-medium">字段映射 ({Object.keys(fieldMapping).length} 个)</Label>
        {Object.keys(fieldMapping).length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 border rounded-lg">
            <AlertCircle className="h-4 w-4" />
            无字段映射建议。请在表单发现阶段重新扫描以自动生成映射。
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left">JDY字段</th>
                  <th className="px-3 py-2 text-center"><ChevronRight className="h-4 w-4 mx-auto" /></th>
                  <th className="px-3 py-2 text-left">GRT列</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(fieldMapping).map(([jdyField, grtCol]) => (
                  <tr key={jdyField} className="border-t">
                    <td className="px-3 py-1.5 font-mono text-xs">{jdyField}</td>
                    <td className="px-3 py-1.5 text-center text-muted-foreground">→</td>
                    <td className="px-3 py-1.5 font-mono text-xs text-primary">{grtCol as string}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form metadata */}
      <div className="space-y-2">
        <Label className="font-medium">表单元数据</Label>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-2 rounded bg-muted">
            <span className="text-muted-foreground">应用ID:</span> <code className="text-xs">{form.jdy_app_id}</code>
          </div>
          <div className="p-2 rounded bg-muted">
            <span className="text-muted-foreground">表单ID:</span> <code className="text-xs">{form.jdy_form_id}</code>
          </div>
          <div className="p-2 rounded bg-muted">
            <span className="text-muted-foreground">记录数:</span> {form.record_count || 0}
          </div>
          <div className="p-2 rounded bg-muted">
            <span className="text-muted-foreground">最后发现:</span> {form.last_discovered_at ? new Date(form.last_discovered_at).toLocaleString() : 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
}
