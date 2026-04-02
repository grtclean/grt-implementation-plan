/**
 * 条码管理 — 生成/查询/批量打印
 * QR/CODE128/EAN13 条码生成
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QrCode, Barcode, Search, Printer, Plus, Download } from 'lucide-react';

interface BarcodeItem {
  id: string;
  content: string;
  format: 'QR' | 'CODE128' | 'EAN13';
  label: string;
  materialCode?: string;
  lotNumber?: string;
  createdAt: string;
}

// Demo data
const DEMO_BARCODES: BarcodeItem[] = [
  { id: '1', content: 'MAT-EQP-001-001', format: 'QR', label: '超声波清洗机 主控板', materialCode: 'MAT-EQP-001-001', createdAt: '2026-03-17' },
  { id: '2', content: 'LOT-20260315-001', format: 'CODE128', label: '批次 2026-03-15 #001', lotNumber: 'LOT-20260315-001', createdAt: '2026-03-15' },
  { id: '3', content: '6901234567890', format: 'EAN13', label: '标准品 EAN-13', createdAt: '2026-03-10' },
];

export default function BarcodeManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newFormat, setNewFormat] = useState<'QR' | 'CODE128' | 'EAN13'>('QR');
  const [newLabel, setNewLabel] = useState('');
  const [barcodes, setBarcodes] = useState<BarcodeItem[]>(DEMO_BARCODES);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = barcodes.filter(b =>
    b.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleGenerate = () => {
    if (!newContent.trim()) return;
    const item: BarcodeItem = {
      id: String(Date.now()),
      content: newContent.trim(),
      format: newFormat,
      label: newLabel || newContent.trim(),
      createdAt: new Date().toISOString().split('T')[0],
    };
    setBarcodes(prev => [item, ...prev]);
    setNewContent('');
    setNewLabel('');
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">条码管理</h1>
          <p className="text-muted-foreground mt-1">生成 QR/CODE128/EAN13 条码，扫码查询物料与批次</p>
        </div>
        {selectedIds.size > 0 && (
          <Button variant="outline">
            <Printer className="h-4 w-4 mr-1" /> 批量打印 ({selectedIds.size})
          </Button>
        )}
      </div>

      <Tabs defaultValue="generate">
        <TabsList>
          <TabsTrigger value="generate"><Plus className="h-4 w-4 mr-1" /> 生成条码</TabsTrigger>
          <TabsTrigger value="lookup"><Search className="h-4 w-4 mr-1" /> 扫码查询</TabsTrigger>
          <TabsTrigger value="history"><Barcode className="h-4 w-4 mr-1" /> 历史记录</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">生成条码</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">条码内容</label>
                  <Input
                    value={newContent}
                    onChange={e => setNewContent(e.target.value)}
                    placeholder="物料编码/批次号/自定义内容"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">格式</label>
                  <div className="flex gap-2">
                    {(['QR', 'CODE128', 'EAN13'] as const).map(fmt => (
                      <Button
                        key={fmt}
                        variant={newFormat === fmt ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setNewFormat(fmt)}
                      >
                        {fmt === 'QR' ? <QrCode className="h-4 w-4 mr-1" /> : <Barcode className="h-4 w-4 mr-1" />}
                        {fmt}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">标签</label>
                  <Input
                    value={newLabel}
                    onChange={e => setNewLabel(e.target.value)}
                    placeholder="可选描述"
                  />
                </div>
              </div>
              <Button onClick={handleGenerate} disabled={!newContent.trim()}>
                <Plus className="h-4 w-4 mr-1" /> 生成
              </Button>
              {/* Preview */}
              {newContent && (
                <div className="border rounded-lg p-6 flex flex-col items-center gap-2 bg-white">
                  <div className="w-32 h-32 border-2 border-dashed rounded flex items-center justify-center">
                    {newFormat === 'QR' ? (
                      <QrCode className="h-16 w-16 text-gray-400" />
                    ) : (
                      <Barcode className="h-16 w-16 text-gray-400" />
                    )}
                  </div>
                  <span className="text-xs font-mono">{newContent}</span>
                  <Badge variant="outline">{newFormat}</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lookup" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">扫码查询</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="输入或扫描条码内容..."
                  className="max-w-md"
                />
                <Button variant="outline"><Search className="h-4 w-4" /></Button>
              </div>
              {searchQuery && filtered.length > 0 && (
                <div className="space-y-2">
                  {filtered.map(b => (
                    <div key={b.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {b.format === 'QR' ? <QrCode className="h-5 w-5" /> : <Barcode className="h-5 w-5" />}
                        <div>
                          <div className="font-medium">{b.label}</div>
                          <div className="text-sm text-muted-foreground font-mono">{b.content}</div>
                        </div>
                      </div>
                      <Badge>{b.format}</Badge>
                    </div>
                  ))}
                </div>
              )}
              {searchQuery && filtered.length === 0 && (
                <p className="text-muted-foreground text-center py-8">未找到匹配的条码记录</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                {barcodes.map(b => (
                  <div
                    key={b.id}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedIds.has(b.id) ? 'bg-primary/5 border-primary' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => toggleSelect(b.id)}
                  >
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={selectedIds.has(b.id)} readOnly className="rounded" />
                      {b.format === 'QR' ? <QrCode className="h-5 w-5" /> : <Barcode className="h-5 w-5" />}
                      <div>
                        <div className="font-medium text-sm">{b.label}</div>
                        <div className="text-xs text-muted-foreground font-mono">{b.content}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{b.format}</Badge>
                      <span className="text-xs text-muted-foreground">{b.createdAt}</span>
                      <Button variant="ghost" size="sm"><Download className="h-3 w-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
