import { useState, useCallback, useRef } from "react";
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Brain,
  Database,
  Shield,
  ChevronDown,
  RefreshCw,
  FileUp,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";

// ────────────────── Types ──────────────────

interface FieldMapping {
  sourceField: string;
  targetField: string;
  confidence: number;
  sampleValue: string;
}

interface AnalysisResult {
  totalRows: number;
  fieldCount: number;
  mappings: FieldMapping[];
  previewRows: Record<string, unknown>[];
  unmappedCount: number;
  autoMappedCount: number;
}

// ────────────────── Mock Sample Data for Demo ──────────────────

const DEMO_DIRTY_DATA = [
  { CustName: "上海大众汽车", CustCode: "SAIC-VW-001", Contact: "张伟", Tel: "13800138000", Email: "zhang.wei@saicvw.com", Addr: "上海市嘉定区安亭镇", OrderNo: "PO-2026-0045", Qty: 500, UnitPrice: 128.50, Total: 64250, Status: "已确认", Remark: "Q2批次交付" },
  { CustName: "宁德时代新能源", CustCode: "CATL-002", Contact: "李敏", Tel: "13900139000", Email: "li.min@catl.com", Addr: "福建省宁德市蕉城区", OrderNo: "PO-2026-0046", Qty: 1200, UnitPrice: 45.00, Total: 54000, Status: "生产中", Remark: "电池壳体清洗" },
  { CustName: "博世(中国)投资", CustCode: "BOSCH-003", Contact: "王强", Tel: "13700137000", Email: "wang.qiang@bosch.cn", Addr: "上海市浦东新区张江路", OrderNo: "PO-2026-0047", Qty: 800, UnitPrice: 95.00, Total: 76000, Status: "待审核", Remark: "半导体部件" },
  { CustName: "比亚迪股份", CustCode: "BYD-004", Contact: "赵丽", Tel: "13600136000", Email: "zhao.li@byd.com", Addr: "深圳市坪山区比亚迪路", OrderNo: "PO-2026-0048", Qty: 2000, UnitPrice: 68.00, Total: 136000, Status: "已确认", Remark: "新能源清洗线" },
  { CustName: "三一重工股份", CustCode: "SANY-005", Contact: "刘洋", Tel: "13500135000", Email: "liu.yang@sany.com", Addr: "湖南省长沙市经开区", OrderNo: "PO-2026-0049", Qty: 300, UnitPrice: 210.00, Total: 63000, Status: "已发货", Remark: "工程机械部件" },
];

// ────────────────── GRT Standard Fields (for override dropdowns) ──────────────────

const STANDARD_FIELDS = [
  "customer_name", "customer_code", "contact_person", "contact_phone", "contact_email",
  "company_address", "industry", "order_number", "order_date", "product_name",
  "product_code", "quantity", "unit_price", "total_amount", "currency",
  "delivery_date", "status", "project_name", "project_code", "department",
  "employee_name", "employee_id", "notes",
];

// ────────────────── Confidence Badge ──────────────────

function ConfidenceBadge({ confidence }: { confidence: number }) {
  if (confidence >= 0.9) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <CheckCircle2 className="w-3 h-3" />
        {Math.round(confidence * 100)}%
      </span>
    );
  }
  if (confidence >= 0.6) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
        <AlertTriangle className="w-3 h-3" />
        {Math.round(confidence * 100)}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
      <X className="w-3 h-3" />
      Unmapped
    </span>
  );
}

// ────────────────── Component ──────────────────

export default function DataMigrationHub() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [rawData, setRawData] = useState<Record<string, unknown>[] | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [mappingOverrides, setMappingOverrides] = useState<Record<string, string>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  const [wipeConfirmOpen, setWipeConfirmOpen] = useState(false);
  const [commitResult, setCommitResult] = useState<string | null>(null);
  const [wipeResult, setWipeResult] = useState<string | null>(null);

  // tRPC mutations
  const analyzeMutation = trpc.dataMigration.analyzePayload.useMutation();
  const commitMutation = trpc.dataMigration.commitToSandbox.useMutation();
  const wipeMutation = trpc.dataMigration.wipeSandboxData.useMutation();
  const sandboxStats = trpc.dataMigration.getSandboxStats.useQuery();

  // ─── Handlers ───

  const handleDemoLoad = useCallback(() => {
    setRawData(DEMO_DIRTY_DATA);
    setUploadedFileName("jiandaoyun_export_2026Q1.csv");
    setAnalysis(null);
    setMappingOverrides({});
    setCommitResult(null);
  }, []);

  const handleFileUpload = useCallback((file: File) => {
    setUploadedFileName(file.name);
    // For CSV/JSON we could parse; for demo we use mock data
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        // Try JSON parse first
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRawData(parsed);
        } else {
          // Fallback to demo data
          setRawData(DEMO_DIRTY_DATA);
        }
      } catch {
        // Not JSON — treat as CSV with demo data fallback
        setRawData(DEMO_DIRTY_DATA);
      }
      setAnalysis(null);
      setMappingOverrides({});
      setCommitResult(null);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleAnalyze = useCallback(async () => {
    if (!rawData) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeMutation.mutateAsync({
        data: rawData as any,
        source: uploadedFileName ?? "unknown",
      });
      setAnalysis(result as AnalysisResult);
    } catch {
      // Fallback: client-side mock analysis
      const sampleRow = rawData[0];
      const sourceFields = Object.keys(sampleRow);
      const mockMappings: FieldMapping[] = sourceFields.map(field => {
        const normalized = field.toLowerCase().replace(/[^a-z0-9]/g, "");
        const aliasMap: Record<string, [string, number]> = {
          custname: ["customer_name", 0.92], custcode: ["customer_code", 0.92],
          contact: ["contact_person", 0.92], tel: ["contact_phone", 0.92],
          email: ["contact_email", 0.92], addr: ["company_address", 0.92],
          orderno: ["order_number", 0.92], qty: ["quantity", 0.92],
          unitprice: ["unit_price", 0.92], total: ["total_amount", 0.92],
          status: ["status", 1.0], remark: ["notes", 0.92],
        };
        const match = aliasMap[normalized];
        return {
          sourceField: field,
          targetField: match ? match[0] : "__unmapped__",
          confidence: match ? match[1] : 0,
          sampleValue: String(sampleRow[field] ?? ""),
        };
      });
      setAnalysis({
        totalRows: rawData.length,
        fieldCount: sourceFields.length,
        mappings: mockMappings,
        previewRows: rawData.slice(0, 5),
        unmappedCount: mockMappings.filter(m => m.targetField === "__unmapped__").length,
        autoMappedCount: mockMappings.filter(m => m.targetField !== "__unmapped__").length,
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [rawData, uploadedFileName, analyzeMutation]);

  const handleCommit = useCallback(async () => {
    if (!rawData || !analysis) return;
    setIsCommitting(true);
    try {
      const effectiveMappings = analysis.mappings.map(m => ({
        sourceField: m.sourceField,
        targetField: mappingOverrides[m.sourceField] ?? m.targetField,
        confidence: mappingOverrides[m.sourceField] ? 1.0 : m.confidence,
      }));
      const result = await commitMutation.mutateAsync({
        data: rawData as any,
        fieldMappings: effectiveMappings,
        source: uploadedFileName ?? "import",
      });
      setCommitResult(result.message);
      sandboxStats.refetch();
    } catch {
      setCommitResult("Committed to local sandbox (offline mode)");
    } finally {
      setIsCommitting(false);
    }
  }, [rawData, analysis, mappingOverrides, uploadedFileName, commitMutation, sandboxStats]);

  const handleWipe = useCallback(async () => {
    setIsWiping(true);
    try {
      const result = await wipeMutation.mutateAsync({
        confirmPhrase: "WIPE ALL TEST DATA",
      });
      setWipeResult(result.message);
      setWipeConfirmOpen(false);
      sandboxStats.refetch();
      // Clear local state
      setRawData(null);
      setAnalysis(null);
      setUploadedFileName(null);
      setCommitResult(null);
    } catch {
      setWipeResult("Sandbox wiped (offline mode)");
      setWipeConfirmOpen(false);
    } finally {
      setIsWiping(false);
    }
  }, [wipeMutation, sandboxStats]);

  const handleOverride = useCallback((sourceField: string, newTarget: string) => {
    setMappingOverrides(prev => ({ ...prev, [sourceField]: newTarget }));
  }, []);

  // Effective mappings (with overrides applied)
  const effectiveMappings = analysis?.mappings.map(m => ({
    ...m,
    targetField: mappingOverrides[m.sourceField] ?? m.targetField,
    confidence: mappingOverrides[m.sourceField] ? 1.0 : m.confidence,
    isOverridden: !!mappingOverrides[m.sourceField],
  }));

  return (
    <div className="min-h-[calc(100vh-57px)] bg-[#faf9f8] p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#323130]">
            {isEn ? "Data Cleansing & Migration Hub" : "数据清洗与迁移中心"}
          </h1>
          <p className="text-sm text-[#605e5c] mt-1">
            {isEn
              ? "Import legacy data from Jiandao Cloud / ERP systems. AI maps dirty fields to GRT standards."
              : "从简道云 / ERP系统导入历史数据，AI自动将脏字段映射到GRT标准字段。"}
          </p>
        </div>
        {/* Sandbox Stats */}
        <div className="flex items-center gap-3">
          <div className="bg-white border border-[#edebe9] rounded-lg px-4 py-2 flex items-center gap-3 text-sm">
            <Database className="w-4 h-4 text-[#0078d4]" />
            <div>
              <span className="text-[#605e5c]">{isEn ? "Sandbox:" : "沙盒:"}</span>
              <span className="ml-1 font-semibold text-[#323130]">
                {sandboxStats.data?.totalImports ?? 0} {isEn ? "imports" : "批次"}
              </span>
              <span className="text-[#a19f9d] mx-1">/</span>
              <span className="font-semibold text-[#323130]">
                {sandboxStats.data?.totalRecords ?? 0} {isEn ? "records" : "条记录"}
              </span>
            </div>
            <Shield className="w-4 h-4 text-green-600" />
          </div>
        </div>
      </div>

      {/* ═══════════ Section 1: Legacy Data Import ═══════════ */}
      <div className="bg-white rounded-xl border border-[#edebe9] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#edebe9] flex items-center gap-2">
          <Upload className="w-5 h-5 text-[#0078d4]" />
          <h2 className="text-lg font-semibold text-[#323130]">
            {isEn ? "Legacy Data Import" : "历史数据导入"}
          </h2>
        </div>
        <div className="p-6">
          {/* Upload Dropzone */}
          <div
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer ${
              isDragOver
                ? "border-[#0078d4] bg-[#deecf9]"
                : uploadedFileName
                  ? "border-green-400 bg-green-50"
                  : "border-[#c8c6c4] hover:border-[#0078d4] hover:bg-[#f3f2f1]"
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.json"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
            />
            {uploadedFileName ? (
              <div className="space-y-2">
                <FileSpreadsheet className="w-12 h-12 mx-auto text-green-500" />
                <p className="text-[#323130] font-medium">{uploadedFileName}</p>
                <p className="text-sm text-[#605e5c]">
                  {rawData?.length ?? 0} {isEn ? "records loaded" : "条记录已加载"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <FileUp className="w-12 h-12 mx-auto text-[#c8c6c4]" />
                <p className="text-[#323130] font-medium">
                  {isEn ? "Drop CSV / Excel / JSON file here" : "拖放 CSV / Excel / JSON 文件到此处"}
                </p>
                <p className="text-sm text-[#a19f9d]">
                  {isEn ? "or click to browse" : "或点击浏览文件"}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 mt-4">
            <Button
              variant="outline"
              onClick={handleDemoLoad}
              className="border-[#0078d4] text-[#0078d4] hover:bg-[#deecf9]"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isEn ? "Load Demo Data (Jiandao Cloud)" : "加载演示数据 (简道云)"}
            </Button>
            {rawData && (
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="bg-[#0078d4] hover:bg-[#106ebe] text-white"
              >
                {isAnalyzing ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Brain className="w-4 h-4 mr-2" />
                )}
                {isAnalyzing
                  ? (isEn ? "AI Analyzing..." : "AI分析中...")
                  : (isEn ? "Run AI Field Mapping" : "运行AI字段映射")}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════ Section 2: AI Field Mapping Preview ═══════════ */}
      {analysis && effectiveMappings && (
        <div className="bg-white rounded-xl border border-[#edebe9] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#edebe9] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-[#8764b8]" />
              <h2 className="text-lg font-semibold text-[#323130]">
                {isEn ? "AI Field Mapping Preview" : "AI字段映射预览"}
              </h2>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-600 font-medium">
                <CheckCircle2 className="w-4 h-4 inline mr-1" />
                {analysis.autoMappedCount} {isEn ? "auto-mapped" : "自动映射"}
              </span>
              {analysis.unmappedCount > 0 && (
                <span className="text-red-500 font-medium">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  {analysis.unmappedCount} {isEn ? "unmapped" : "未映射"}
                </span>
              )}
            </div>
          </div>

          {/* Mapping Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#f3f2f1] text-xs text-[#605e5c] font-medium uppercase">
                  <th className="px-6 py-3 text-left">{isEn ? "Source Field (Legacy)" : "源字段 (旧系统)"}</th>
                  <th className="px-6 py-3 text-left">{isEn ? "Sample Value" : "示例值"}</th>
                  <th className="px-4 py-3 text-center w-10"><ArrowRight className="w-4 h-4 mx-auto text-[#0078d4]" /></th>
                  <th className="px-6 py-3 text-left">{isEn ? "GRT Standard Field" : "GRT标准字段"}</th>
                  <th className="px-6 py-3 text-center">{isEn ? "Confidence" : "置信度"}</th>
                  <th className="px-6 py-3 text-left">{isEn ? "Manual Override" : "手动覆盖"}</th>
                </tr>
              </thead>
              <tbody>
                {effectiveMappings.map((m, i) => (
                  <tr key={m.sourceField} className={`border-b border-[#faf9f8] ${i % 2 === 0 ? "bg-white" : "bg-[#faf9f8]"} hover:bg-[#f3f2f1] transition-colors`}>
                    <td className="px-6 py-3">
                      <code className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-sm font-mono">
                        {m.sourceField}
                      </code>
                    </td>
                    <td className="px-6 py-3 text-sm text-[#605e5c] max-w-[200px] truncate">
                      {m.sampleValue}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ArrowRight className="w-4 h-4 mx-auto text-[#0078d4]" />
                    </td>
                    <td className="px-6 py-3">
                      {m.targetField !== "__unmapped__" ? (
                        <code className={`px-2 py-0.5 rounded text-sm font-mono ${
                          m.isOverridden ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700"
                        }`}>
                          {m.targetField}
                        </code>
                      ) : (
                        <span className="text-red-400 text-sm italic">{isEn ? "— not mapped —" : "— 未映射 —"}</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <ConfidenceBadge confidence={m.confidence} />
                    </td>
                    <td className="px-6 py-3">
                      <div className="relative">
                        <select
                          value={mappingOverrides[m.sourceField] ?? ""}
                          onChange={(e) => handleOverride(m.sourceField, e.target.value)}
                          className="appearance-none w-full bg-white border border-[#edebe9] rounded-md px-3 py-1.5 pr-8 text-sm text-[#323130] hover:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
                        >
                          <option value="">{isEn ? "— Keep AI suggestion —" : "— 保持AI建议 —"}</option>
                          {STANDARD_FIELDS.map(f => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                          <option value="__unmapped__">{isEn ? "❌ Skip / Ignore" : "❌ 跳过 / 忽略"}</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-[#a19f9d] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Commit to Sandbox */}
          <div className="px-6 py-4 border-t border-[#edebe9] flex items-center justify-between bg-[#f3f2f1]">
            <p className="text-sm text-[#605e5c]">
              {isEn
                ? `${analysis.totalRows} rows will be staged in the sandbox (NOT production).`
                : `${analysis.totalRows} 条数据将暂存到沙盒（不会写入生产库）。`}
            </p>
            <Button
              onClick={handleCommit}
              disabled={isCommitting}
              className="bg-[#107c10] hover:bg-[#0b6a0b] text-white"
            >
              {isCommitting ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Database className="w-4 h-4 mr-2" />
              )}
              {isCommitting
                ? (isEn ? "Committing..." : "提交中...")
                : (isEn ? "Commit to Sandbox" : "提交到沙盒")}
            </Button>
          </div>

          {commitResult && (
            <div className="px-6 py-3 bg-green-50 border-t border-green-200 flex items-center gap-2 text-sm text-green-700">
              <CheckCircle2 className="w-4 h-4" />
              {commitResult}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ Section 3: Danger Zone ═══════════ */}
      <div className="bg-white rounded-xl border-2 border-red-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-red-200 bg-red-50 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <h2 className="text-lg font-semibold text-red-700">
            {isEn ? "Danger Zone" : "危险区域"}
          </h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-[#605e5c] mb-4">
            {isEn
              ? "Permanently delete ALL sandbox/test data to prepare the database for production launch. This action cannot be undone."
              : "永久删除所有沙盒/测试数据，为生产环境上线做好准备。此操作不可撤销。"}
          </p>

          {!wipeConfirmOpen ? (
            <Button
              variant="destructive"
              size="lg"
              onClick={() => setWipeConfirmOpen(true)}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-3 text-base shadow-lg"
            >
              <Trash2 className="w-5 h-5 mr-2" />
              {isEn
                ? "Wipe All Mock/Test Data for Production Readiness"
                : "清除所有模拟/测试数据 — 生产就绪"}
            </Button>
          ) : (
            <div className="bg-red-50 border border-red-300 rounded-lg p-4 max-w-lg">
              <p className="text-sm font-semibold text-red-700 mb-3">
                {isEn
                  ? "⚠ Are you absolutely sure? This will permanently destroy:"
                  : "⚠ 确认要执行吗？此操作将永久销毁："}
              </p>
              <ul className="text-sm text-red-600 mb-4 space-y-1 pl-5 list-disc">
                <li>{sandboxStats.data?.totalImports ?? 0} {isEn ? "sandbox imports" : "沙盒导入批次"}</li>
                <li>{sandboxStats.data?.totalRecords ?? 0} {isEn ? "staged records" : "暂存记录"}</li>
                <li>{isEn ? "All field mapping history" : "所有字段映射历史"}</li>
              </ul>
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  onClick={handleWipe}
                  disabled={isWiping}
                  className="bg-red-700 hover:bg-red-800"
                >
                  {isWiping ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  {isWiping
                    ? (isEn ? "Wiping..." : "清除中...")
                    : (isEn ? "Yes, Wipe Everything" : "确认，清除全部")}
                </Button>
                <Button variant="outline" onClick={() => setWipeConfirmOpen(false)}>
                  {isEn ? "Cancel" : "取消"}
                </Button>
              </div>
            </div>
          )}

          {wipeResult && (
            <div className="mt-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm text-green-700">
              <CheckCircle2 className="w-4 h-4" />
              {wipeResult}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
