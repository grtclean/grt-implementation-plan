/**
 * KnowledgeIngestionUI — Multimodal Knowledge Feed-In Interface
 *
 * A smooth, crash-proof UI for the engineering team to upload:
 * - Technical schematics (P&ID)
 * - Detailed assembly SOPs (with torque limits and QA sign-offs)
 *
 * Zero Blocking: Uses ai_tasks polling with useErrorBoundary: false and <Skeleton> loaders.
 */
import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  UploadCloud,
  CheckCircle,
  FileImage,
  AlertCircle,
  Loader2,
  FileText,
  Settings,
  Wrench,
} from 'lucide-react';

// ─── M-Phase Options ────────────────────────────────────────────
const M_PHASES = [
  { value: 'M6', label: 'M6 - Mechanical Assembly', labelZh: 'M6 - 机械装配' },
  { value: 'M7', label: 'M7 - Electrical/Fluid Routing', labelZh: 'M7 - 电气/流体走线' },
  { value: 'M8', label: 'M8 - System Integration', labelZh: 'M8 - 系统集成' },
  { value: 'M9', label: 'M9 - Factory Acceptance Test (FAT)', labelZh: 'M9 - 工厂验收测试' },
  { value: 'M10', label: 'M10 - Site Acceptance Test (SAT)', labelZh: 'M10 - 现场验收测试' },
];

// ─── Asset Type Options ────────────────────────────────────────────
const ASSET_TYPES = [
  { value: 'SOP', label: 'SOP - Standard Operating Procedure', icon: FileText },
  { value: 'SCHEMATIC', label: 'Schematic - P&ID / Technical Drawing', icon: Settings },
  { value: 'POLICY', label: 'Policy - Guidelines & Standards', icon: Wrench },
] as const;

// ─── Main Component ────────────────────────────────────────────
export function KnowledgeIngestionUI() {
  const [title, setTitle] = useState('');
  const [mPhase, setMPhase] = useState('M6');
  const [assetType, setAssetType] = useState<'SOP' | 'SCHEMATIC' | 'POLICY'>('SOP');
  const [equipmentFamily, setEquipmentFamily] = useState('');
  const [base64Image, setBase64Image] = useState('');
  const [fileName, setFileName] = useState('');
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);

  // ─── Mutations & Queries ────────────────────────────────────────
  const ingestMutation = trpc.knowledge.ingestMultimodalAsset.useMutation({
    onSuccess: (data) => {
      setActiveTaskId(data.taskId);
    },
    onError: () => {
      // mutation error handled by tRPC error boundary
    },
  });

  // Polling logic: STRICT ADHERENCE to GRT First Law (No crashes)
  const { data: taskStatus } = trpc.knowledge.getIngestionStatus.useQuery(
    { taskId: activeTaskId! },
    {
      enabled: !!activeTaskId,
      refetchInterval: (query) => {
        const data = query.state.data;
        // Stop polling when completed or failed
        if (data?.status === 'completed' || data?.status === 'failed') {
          return false;
        }
        return 2000; // Poll every 2 seconds
      },
      // CRITICAL: Never crash the UI on polling errors
      throwOnError: false,
      retry: 3,
    }
  );

  // ─── File Upload Handler ────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBase64Image(reader.result as string);
      };
      reader.onerror = () => {
        // file read error — non-fatal
      };
      reader.readAsDataURL(file);
    }
  };

  // ─── Submit Handler ────────────────────────────────────────
  const handleSubmit = () => {
    if (!title || !base64Image) return;

    ingestMutation.mutate({
      title,
      assetType,
      mPhase,
      equipmentFamily: equipmentFamily || undefined,
      base64Image,
      originalFilename: fileName,
      mimeType: base64Image.match(/^data:([^;]+);/)?.[1],
    });
  };

  // ─── Reset Form ────────────────────────────────────────
  const handleReset = () => {
    setActiveTaskId(null);
    setTitle('');
    setBase64Image('');
    setFileName('');
    setEquipmentFamily('');
    ingestMutation.reset();
  };

  // ─── Render ────────────────────────────────────────
  return (
    <Card className="max-w-3xl mx-auto shadow-sm border border-slate-200">
      <CardHeader className="border-b pb-4">
        <div className="flex items-center space-x-3">
          <UploadCloud className="h-6 w-6 text-blue-600" />
          <CardTitle className="text-xl font-semibold text-slate-800">
            Knowledge Feed-In (Multimodal)
          </CardTitle>
          <Badge variant="outline" className="ml-auto">
            Claude Vision
          </Badge>
        </div>
        <p className="text-sm text-slate-500 mt-2">
          上传技术图纸 (P&ID) 或装配 SOP，Claude Vision 将自动提取语义知识块
        </p>
      </CardHeader>

      <CardContent className="p-6">
        {!activeTaskId ? (
          // ─── Upload Form ────────────────────────────────────────
          <div className="space-y-5">
            {/* Document Title */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Document Title / 文档标题 <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g., M6 Assembly SOP - High Pressure Pump"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Asset Type & M-Phase */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Asset Type / 资产类型 <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full border rounded-md p-2 text-sm bg-white"
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value as typeof assetType)}
                >
                  {ASSET_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  M-Phase Association / 制造阶段
                </label>
                <select
                  className="w-full border rounded-md p-2 text-sm bg-white"
                  value={mPhase}
                  onChange={(e) => setMPhase(e.target.value)}
                >
                  {M_PHASES.map((phase) => (
                    <option key={phase.value} value={phase.value}>
                      {phase.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Equipment Family (Optional) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Equipment Family / 设备系列 (Optional)
              </label>
              <Input
                placeholder="e.g., High Pressure Pump, Industrial Washer"
                value={equipmentFamily}
                onChange={(e) => setEquipmentFamily(e.target.value)}
                className="w-full"
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Upload Image/PDF <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  onChange={handleFileUpload}
                />
                {fileName && (
                  <Badge variant="secondary" className="truncate max-w-[200px]">
                    {fileName}
                  </Badge>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={!title || !base64Image || ingestMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {ingestMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Initiating...
                </>
              ) : (
                'Commit to Knowledge Brain'
              )}
            </Button>

            {/* Mutation Error */}
            {ingestMutation.isError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{ingestMutation.error?.message || 'Failed to initiate ingestion'}</span>
              </div>
            )}
          </div>
        ) : (
          // ─── Status Display ────────────────────────────────────────
          <div className="bg-slate-50 p-6 rounded-lg border border-slate-100">
            {taskStatus?.status === 'completed' ? (
              // Success State
              <div className="text-center space-y-3">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <h3 className="text-lg font-medium text-slate-800">
                  Knowledge Successfully Ingested
                </h3>
                <p className="text-sm text-slate-500">
                  Claude Vision extracted{' '}
                  <span className="font-semibold text-green-600">
                    {taskStatus.resultData?.chunkCount || 0}
                  </span>{' '}
                  semantic chunks, including torque limits and QA steps.
                </p>
                {taskStatus.resultData?.parsedSections && (
                  <div className="flex flex-wrap gap-1 justify-center mt-2">
                    {(taskStatus.resultData.parsedSections as string[]).slice(0, 5).map((section, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {section}
                      </Badge>
                    ))}
                    {(taskStatus.resultData.parsedSections as string[]).length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{(taskStatus.resultData.parsedSections as string[]).length - 5} more
                      </Badge>
                    )}
                  </div>
                )}
                <Button
                  variant="link"
                  onClick={handleReset}
                  className="text-blue-600 text-sm mt-4"
                >
                  Upload Another Asset
                </Button>
              </div>
            ) : taskStatus?.status === 'failed' ? (
              // Error State
              <div className="text-center space-y-3">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                <h3 className="text-lg font-medium text-slate-800">Ingestion Failed</h3>
                <p className="text-sm text-red-500">{taskStatus.errorMessage}</p>
                <Button
                  variant="link"
                  onClick={handleReset}
                  className="text-blue-600 text-sm mt-4"
                >
                  Try Again
                </Button>
              </div>
            ) : (
              // Processing State (with Skeleton loaders)
              <div className="space-y-4">
                <div className="flex items-center text-blue-600 text-sm font-medium mb-2 animate-pulse">
                  <FileImage className="h-4 w-4 mr-2" />
                  Claude Vision is analyzing schematic and SOP steps...
                </div>
                {/* Smooth UI Degradation / Loading State */}
                <Skeleton className="h-4 w-full bg-blue-100" />
                <Skeleton className="h-4 w-5/6 bg-blue-100" />
                <Skeleton className="h-4 w-4/6 bg-blue-100" />
                <p className="text-xs text-slate-400 mt-3">
                  Task ID: {activeTaskId} · Status: {taskStatus?.status || 'polling...'}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default KnowledgeIngestionUI;
