/**
 * SupplierPortal — 供应商自助上传门户
 * Route: /supplier-portal/:token (STANDALONE, token-gated, no login required)
 *
 * 供应商通过GRT发放的令牌链接访问:
 * - 上传资质资料 (ISO证书/营业执照/质量报告/测试报告/签字确认函等)
 * - 确认上传后文档锁定，不可自行撤销
 * - 如需撤销，提交申请 → GRT内部审批后执行
 */
import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, FileCheck, Lock, AlertTriangle, CheckCircle2, XCircle,
  FileText, Shield, Clock, Building2, Send,
} from "lucide-react";

// ── Document type configuration ──────────────────────────────

const DOC_TYPES = [
  { value: "iso_9001_cert", label: "ISO 9001 证书", category: "certification", icon: "🏅", required: true },
  { value: "iso_14001_cert", label: "ISO 14001 证书", category: "certification", icon: "🌿" },
  { value: "iatf_16949_cert", label: "IATF 16949 证书", category: "certification", icon: "🏭" },
  { value: "business_license", label: "营业执照", category: "legal", icon: "📋", required: true },
  { value: "quality_report", label: "质量体系报告", category: "quality", icon: "📊" },
  { value: "test_report", label: "产品测试报告", category: "quality", icon: "🔬" },
  { value: "signed_confirmation", label: "签字确认函", category: "legal", icon: "✍️", required: true },
  { value: "capability_statement", label: "生产能力说明", category: "commercial", icon: "⚙️" },
  { value: "price_list", label: "报价单/价格表", category: "commercial", icon: "💰" },
  { value: "other", label: "其他资料", category: "other", icon: "📎" },
] as const;

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof Lock }> = {
  uploading: { label: "上传中", color: "text-blue-600 bg-blue-50", icon: Upload },
  pending_confirm: { label: "待确认", color: "text-amber-600 bg-amber-50", icon: Clock },
  confirmed: { label: "已确认(锁定)", color: "text-green-600 bg-green-50", icon: Lock },
  revoke_requested: { label: "撤销申请中", color: "text-orange-600 bg-orange-50", icon: AlertTriangle },
  revoke_approved: { label: "撤销已批准", color: "text-gray-600 bg-gray-50", icon: CheckCircle2 },
  revoked: { label: "已撤销", color: "text-red-600 bg-red-50", icon: XCircle },
};

// ── Main Component ───────────────────────────────────────────

export default function SupplierPortal() {
  const params = useParams<{ token: string }>();
  const token = params.token || "";
  const { toast } = useToast();

  const validation = trpc.supplierGovernance.validatePortalToken.useQuery({ token }, { enabled: !!token, retry: false });
  const docs = trpc.supplierGovernance.listDocuments.useQuery({ token }, { enabled: validation.data?.valid === true });
  const uploadMut = trpc.supplierGovernance.uploadDocument.useMutation({ onSuccess: () => docs.refetch() });
  const confirmMut = trpc.supplierGovernance.confirmDocument.useMutation({ onSuccess: () => { docs.refetch(); toast({ title: "文档已确认锁定" }); } });
  const revokeMut = trpc.supplierGovernance.requestDocRevoke.useMutation({ onSuccess: () => { docs.refetch(); toast({ title: "撤销申请已提交" }); } });

  const [uploadForm, setUploadForm] = useState({ docType: "iso_9001_cert", fileName: "", fileSize: 0, notes: "" });
  const [revokeDocId, setRevokeDocId] = useState<number | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const supplier = validation.data?.supplier;
  const docList = (docs.data || []) as Array<{
    id: number; doc_code: string; doc_type: string; doc_category: string;
    file_name: string; file_size: number; status: string; is_immutable: boolean;
    confirmed_at: string | null; revoke_reason: string | null; created_at: string;
  }>;

  // Invalid token
  if (validation.data && !validation.data.valid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">访问令牌无效</h2>
            <p className="text-sm text-gray-500">{validation.data.error}</p>
            <p className="text-xs text-gray-400 mt-4">请联系GRT采购部获取有效的门户链接</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading
  if (!validation.data || validation.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const confirmedCount = docList.filter(d => d.status === "confirmed").length;
  const pendingCount = docList.filter(d => d.status === "pending_confirm").length;
  const requiredTypes = DOC_TYPES.filter(t => (t as any).required).map(t => t.value);
  const missingRequired = requiredTypes.filter(rt => !docList.some(d => d.doc_type === rt && d.status === "confirmed"));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-5">
          <div className="flex items-center gap-3 mb-2">
            <img src="/GRTlogo.gif" alt="GRT" className="w-8 h-8 object-contain" />
            <div>
              <h1 className="text-lg font-semibold text-gray-900">GRT 供应商资料门户</h1>
              <p className="text-xs text-gray-500">Supplier Document Portal · Global Robot Technology</p>
            </div>
          </div>
          <div className="flex items-center gap-6 mt-3 text-sm">
            <span className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-blue-500" />
              <b>{supplier?.name}</b>
            </span>
            {supplier?.contact && <span className="text-gray-500">联系人: {supplier.contact}</span>}
            <div className="ml-auto flex items-center gap-3">
              <Badge variant="outline" className="text-green-600 border-green-200">{confirmedCount} 已确认</Badge>
              {pendingCount > 0 && <Badge variant="outline" className="text-amber-600 border-amber-200">{pendingCount} 待确认</Badge>}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Required documents checklist */}
        {missingRequired.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-700">以下必需资料尚未提交:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {missingRequired.map(rt => {
                  const dt = DOC_TYPES.find(t => t.value === rt);
                  return <Badge key={rt} variant="outline" className="text-amber-600 border-amber-300">{dt?.icon} {dt?.label}</Badge>;
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload form */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Upload className="h-4 w-4 text-blue-500" />上传资质资料</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">资料类型</label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={uploadForm.docType}
                  onChange={e => setUploadForm(f => ({...f, docType: e.target.value}))}
                >
                  {DOC_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.icon} {t.label} {(t as any).required ? "(必需)" : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">选择文件</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  className="w-full text-sm border rounded px-3 py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-50 file:text-blue-600 file:text-xs file:font-medium"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedFile(file);
                      setUploadForm(f => ({...f, fileName: file.name, fileSize: file.size}));
                    }
                  }}
                />
              </div>
            </div>
            <Input placeholder="备注 (可选)" value={uploadForm.notes} onChange={e => setUploadForm(f => ({...f, notes: e.target.value}))} />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400">支持: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX · 单文件≤50MB</span>
              <Button size="sm" disabled={!selectedFile || uploadMut.isPending}
                onClick={() => {
                  const dt = DOC_TYPES.find(t => t.value === uploadForm.docType);
                  uploadMut.mutate({
                    token,
                    docType: uploadForm.docType as any,
                    docCategory: (dt?.category || "other") as any,
                    fileName: uploadForm.fileName,
                    fileSize: uploadForm.fileSize,
                    notes: uploadForm.notes || undefined,
                  });
                  setSelectedFile(null);
                  toast({ title: "文档已上传，请确认提交" });
                }}>
                <Upload className="h-3.5 w-3.5 mr-1.5" />上传
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Important notice */}
        <Card className="border-red-200 bg-red-50/30">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <div className="text-xs text-red-700 space-y-1">
                <p className="font-semibold">重要提示 — 文档确认后不可自行撤销</p>
                <p>点击「确认提交」后，文档将被<b>永久锁定</b>。如需撤销，必须提交撤销申请，经GRT内部审批后方可执行。</p>
                <p>请确保上传的资料内容准确、文件完整后再确认。</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Document list */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-500" />
            已上传文档 ({docList.length})
          </h3>
          <div className="space-y-2">
            {docList.map(doc => {
              const dt = DOC_TYPES.find(t => t.value === doc.doc_type);
              const st = STATUS_MAP[doc.status] || STATUS_MAP.uploading;
              const StIcon = st.icon;
              return (
                <Card key={doc.id}>
                  <CardContent className="flex items-center gap-4 p-3">
                    <span className="text-2xl">{dt?.icon || "📎"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{doc.file_name}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${st.color}`}>
                          <StIcon className="h-3 w-3" />{st.label}
                        </span>
                        {doc.is_immutable && <Lock className="h-3 w-3 text-gray-400" />}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {doc.doc_code} · {dt?.label} · {Math.round((doc.file_size || 0) / 1024)}KB · {doc.created_at?.slice(0, 16)}
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      {doc.status === "pending_confirm" && (
                        <Button size="sm" variant="default" className="h-7 text-xs"
                          onClick={() => confirmMut.mutate({ docId: doc.id, token })}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />确认提交
                        </Button>
                      )}
                      {doc.status === "confirmed" && (
                        revokeDocId === doc.id ? (
                          <div className="flex items-center gap-1">
                            <Input className="h-7 w-40 text-xs" placeholder="撤销原因" value={revokeReason} onChange={e => setRevokeReason(e.target.value)} />
                            <Button size="sm" variant="outline" className="h-7 text-xs text-red-600" onClick={() => {
                              revokeMut.mutate({ docId: doc.id, reason: revokeReason });
                              setRevokeDocId(null); setRevokeReason("");
                            }}>
                              <Send className="h-3 w-3 mr-1" />提交
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-gray-400" onClick={() => setRevokeDocId(doc.id)}>
                            申请撤销
                          </Button>
                        )
                      )}
                      {doc.status === "revoke_requested" && (
                        <span className="text-xs text-orange-500">撤销审批中...</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {docList.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Upload className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">尚未上传任何文档</p>
                <p className="text-xs">请使用上方表单上传资质资料</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 py-4 border-t">
          GRT · 杰瑞德自动化 · Global Robot Technology · 供应商资料管理平台
        </div>
      </div>
    </div>
  );
}
