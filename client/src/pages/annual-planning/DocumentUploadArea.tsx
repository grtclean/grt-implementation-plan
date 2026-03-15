/**
 * Document Recording Area — DB-backed persistence
 *
 * Records planning documents to annualPlanningItems via tRPC (category='document').
 * Drag-and-drop styled zone (metadata only, no actual file upload API).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useUserProfile } from '@/contexts/UserProfileContext';

interface DocRecord {
  id: string;
  title: string;
  description: string;
  documentType: string;
  createdAt: string;
}

interface DocumentUploadAreaProps {
  year: number;
  onUpload: (content: string, documentType: string) => void;
}

const DOC_TYPES = [
  { value: 'policy', label: 'Policy / 制度文件' },
  { value: 'report', label: 'Report / 报告' },
  { value: 'plan', label: 'Plan / 计划书' },
  { value: 'memo', label: 'Memo / 备忘录' },
];

export default function DocumentUploadArea({ year, onUpload }: DocumentUploadAreaProps) {
  const { level } = useUserProfile();
  const canManage = level >= 5;
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [docType, setDocType] = useState('plan');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Load existing document items from DB
  const itemsQuery = (trpc.annualPlanning as any).getItems.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  // Mutation
  const createMutation = (trpc.annualPlanning as any).createItem.useMutation({
    onSuccess: () => {
      setLastSavedAt(new Date().toLocaleTimeString());
      toast.success('Document recorded to database');
      itemsQuery.refetch();
    },
    onError: (err: any) => toast.error(`Save failed: ${err.message}`),
  });

  const deleteMutation = (trpc.annualPlanning as any).deleteItem.useMutation({
    onSuccess: () => {
      toast.success('Document deleted from database');
      itemsQuery.refetch();
    },
    onError: (err: any) => toast.error(`Delete failed: ${err.message}`),
  });

  const handleDeleteDoc = (id: string) => {
    setDocs(prev => prev.filter(d => d.id !== id));
    deleteMutation.mutate({ id });
  };

  // Parse DB items on load
  useEffect(() => {
    if (itemsQuery.data) {
      const docItems = (itemsQuery.data as any[]).filter((i: any) => i.category === 'document');
      const parsed = docItems.map((item: any) => {
        let tasks: Record<string, any> = {};
        try { tasks = typeof item.tasks === 'string' ? JSON.parse(item.tasks) : (item.tasks ?? {}); } catch { /* */ }
        return {
          id: String(item.id),
          title: item.name ?? '',
          description: item.description ?? '',
          documentType: tasks.documentType ?? 'plan',
          createdAt: item.createdAt ?? '',
        };
      });
      setDocs(parsed);
      if (parsed.length > 0) setLastSavedAt('loaded from DB');
    }
  }, [itemsQuery.data]);

  const handleRecord = useCallback(() => {
    if (!title.trim()) {
      toast.error('Please fill in Document Title');
      return;
    }

    const newDoc: DocRecord = {
      id: `doc-${Date.now()}`,
      title,
      description,
      documentType: docType,
      createdAt: new Date().toISOString(),
    };

    setDocs(prev => [...prev, newDoc]);
    setTitle('');
    setDescription('');
    setDocType('plan');

    // Save to DB
    setIsSaving(true);
    createMutation.mutate({
      category: 'document',
      name: newDoc.title,
      description: newDoc.description,
      tasks: { documentType: newDoc.documentType },
      status: 'pending',
    }, { onSettled: () => setIsSaving(false) });
  }, [title, description, docType, createMutation]);

  const docTypeLabel = (val: string) => DOC_TYPES.find(d => d.value === val)?.label ?? val;
  const docTypeBadgeColor = (val: string) => {
    switch (val) {
      case 'policy': return 'destructive';
      case 'report': return 'default';
      case 'plan': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Status bar */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          <span>{year} Planning Documents</span>
          {docs.length > 0 && <Badge variant="secondary">{docs.length} doc{docs.length > 1 ? 's' : ''}</Badge>}
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

      {/* Drop zone */}
      {canManage && <Card>
        <CardHeader>
          <CardTitle>Record Planning Document</CardTitle>
          <CardDescription>Record document metadata for {year} annual planning</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragOver(false); toast.info('File upload API not yet connected — please record metadata below'); }}
          >
            <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Drag & drop files here (metadata recording only)
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              File upload API will be connected in a future phase
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Document Title *</Label>
              <Input placeholder="e.g., 2026年度经营计划书" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>Document Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Description / 说明</Label>
            <Textarea placeholder="Brief description of this document" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <Button onClick={handleRecord} className="w-full" disabled={isSaving}>
            <FileText className="w-4 h-4 mr-2" />
            Record Document / 记录文档
          </Button>
        </CardContent>
      </Card>}

      {!canManage && (
        <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          只读模式 — 总监及以上角色可上传文档
        </div>
      )}

      {/* Document List */}
      {docs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recorded Documents ({docs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {docs.map((doc) => (
                <div key={doc.id} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{doc.title}</h3>
                        <Badge variant={docTypeBadgeColor(doc.documentType) as any} className="text-xs">{docTypeLabel(doc.documentType)}</Badge>
                      </div>
                      {doc.description && <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>}
                    </div>
                  </div>
                  {canManage && (
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteDoc(doc.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
