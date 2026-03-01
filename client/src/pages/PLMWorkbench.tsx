/**
 * GRT PLM Workbench — Product Lifecycle Management
 *
 * 5 tabs: Documents | Versions | Reviews | Stats | Design Freeze
 * Strict Microsoft Fluent Design palette
 * Wired to plm.* tRPC router
 */
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  FileText, Upload, Eye, Send, CheckCircle, Clock, Shield, BarChart3,
  Lock, Plus, Search, Filter, ChevronRight, X,
} from "lucide-react";

// ── Fluent Design Tokens ──
const F = {
  bg: "bg-[#faf9f8]",
  card: "bg-white rounded-lg border border-[#edebe9] shadow-sm",
  accent: "#0078d4",
  text: "text-[#323130]",
  muted: "text-[#605e5c]",
  tableHead: "bg-[#f3f2f1] text-xs font-semibold text-[#605e5c] uppercase",
  btnPrimary: "bg-[#0078d4] hover:bg-[#106ebe] text-white rounded-md px-4 py-2 text-sm font-medium transition-colors",
  btnSecondary: "bg-white border border-[#edebe9] hover:bg-[#f3f2f1] text-[#323130] rounded-md px-4 py-2 text-sm font-medium transition-colors",
} as const;

// ── Status badge helpers ──
const DOC_STATUS_STYLE: Record<string, string> = {
  draft: "bg-[#f3f2f1] text-[#605e5c]",
  in_review: "bg-[#deecf9] text-[#0078d4]",
  released: "bg-[#dff6dd] text-[#107c10]",
  obsolete: "bg-[#fed9cc] text-[#d83b01]",
};

const REVIEW_STATUS_STYLE: Record<string, string> = {
  pending: "bg-[#deecf9] text-[#0078d4]",
  approved: "bg-[#dff6dd] text-[#107c10]",
  rejected: "bg-[#fed9cc] text-[#d83b01]",
  revision_requested: "bg-[#fff4ce] text-[#797673]",
};

const DOC_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  released: "Released",
  obsolete: "Obsolete",
};

const REVIEW_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  revision_requested: "Revision Requested",
};

const DOC_TYPE_LABEL: Record<string, string> = {
  mechanical: "Mechanical",
  electrical: "Electrical",
  software: "Software",
  manual: "Manual",
};

const DOC_TYPE_STYLE: Record<string, string> = {
  mechanical: "bg-[#deecf9] text-[#0078d4]",
  electrical: "bg-[#fff4ce] text-[#797673]",
  software: "bg-[#dff6dd] text-[#107c10]",
  manual: "bg-[#f3f2f1] text-[#605e5c]",
};

// ── Date formatter ──
function fmtDate(d: string | null | undefined): string {
  if (!d) return "--";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "--";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  const h = String(dt.getHours()).padStart(2, "0");
  const min = String(dt.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${min}`;
}

// ── Loading skeleton ──
function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 w-full bg-[#f3f2f1] animate-pulse rounded" />
      ))}
    </div>
  );
}

// ── Badge component ──
function StatusBadge({ status, map, labels }: { status: string; map: Record<string, string>; labels: Record<string, string> }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status] ?? "bg-[#f3f2f1] text-[#605e5c]"}`}>
      {labels[status] ?? status}
    </span>
  );
}

// ── Empty state ──
function EmptyState({ icon: Icon, text }: { icon: React.ComponentType<any>; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-[#605e5c]">
      <Icon className="h-12 w-12 mb-3 opacity-40" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 1: Documents
// ═══════════════════════════════════════════════════════════
function DocumentsTab({
  onSelectDoc,
}: {
  onSelectDoc: (id: number) => void;
}) {
  const [docTypeFilter, setDocTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    docNumber: "",
    title: "",
    description: "",
    docType: "mechanical" as "mechanical" | "electrical" | "software" | "manual",
    ownerName: "",
  });

  const statsQ = trpc.plm.getStats.useQuery();
  const docsQ = trpc.plm.listDocuments.useQuery({
    docType: docTypeFilter || undefined,
    currentStatus: statusFilter || undefined,
    search: search || undefined,
  });
  const createMut = trpc.plm.createDocument.useMutation();

  const stats = statsQ.data;
  const docs = docsQ.data?.items ?? [];

  async function handleCreate() {
    if (!form.docNumber.trim() || !form.title.trim()) {
      toast.error("Document number and title are required");
      return;
    }
    try {
      await createMut.mutateAsync(form);
      toast.success("Document created");
      setShowCreate(false);
      setForm({ docNumber: "", title: "", description: "", docType: "mechanical", ownerName: "" });
      docsQ.refetch();
      statsQ.refetch();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create document");
    }
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Documents", value: stats?.total ?? 0, icon: FileText, color: "#0078d4" },
          { label: "Released", value: stats?.released ?? 0, icon: CheckCircle, color: "#107c10" },
          { label: "In Review", value: stats?.inReview ?? 0, icon: Clock, color: "#0078d4" },
          { label: "Design Frozen", value: stats?.frozen ?? 0, icon: Lock, color: "#797673" },
        ].map((s) => (
          <div key={s.label} className={F.card + " p-4"}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-medium ${F.muted}`}>{s.label}</span>
              <s.icon className="h-4 w-4" style={{ color: s.color }} />
            </div>
            <div className={`text-2xl font-bold ${F.text}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className={F.card + " p-4"}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#605e5c]" />
            <input
              type="text"
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-[#edebe9] focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4] bg-white"
            />
          </div>
          <div className="flex items-center gap-1">
            <Filter className="h-4 w-4 text-[#605e5c]" />
            <select
              value={docTypeFilter}
              onChange={(e) => setDocTypeFilter(e.target.value)}
              className="text-sm rounded-md border border-[#edebe9] px-3 py-2 bg-white focus:border-[#0078d4] focus:outline-none"
            >
              <option value="">All Types</option>
              <option value="mechanical">Mechanical</option>
              <option value="electrical">Electrical</option>
              <option value="software">Software</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm rounded-md border border-[#edebe9] px-3 py-2 bg-white focus:border-[#0078d4] focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="in_review">In Review</option>
            <option value="released">Released</option>
            <option value="obsolete">Obsolete</option>
          </select>
          <button className={F.btnPrimary + " flex items-center gap-1.5"} onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Create
          </button>
        </div>
      </div>

      {/* Data table */}
      <div className={F.card + " overflow-hidden"}>
        {docsQ.isLoading ? (
          <div className="p-4"><SkeletonRows rows={5} /></div>
        ) : docs.length === 0 ? (
          <EmptyState icon={FileText} text="No documents found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={F.tableHead}>
                  <th className="text-left px-4 py-3">Doc Number</th>
                  <th className="text-left px-4 py-3">Title</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Version</th>
                  <th className="text-left px-4 py-3">Owner</th>
                  <th className="text-left px-4 py-3">Updated At</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edebe9]">
                {docs.map((doc: any) => (
                  <tr key={doc.id} className="hover:bg-[#faf9f8] transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-[#323130]">{doc.docNumber}</td>
                    <td className="px-4 py-3 text-[#323130] font-medium">{doc.title}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={doc.docType} map={DOC_TYPE_STYLE} labels={DOC_TYPE_LABEL} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={doc.currentStatus} map={DOC_STATUS_STYLE} labels={DOC_STATUS_LABEL} />
                    </td>
                    <td className="px-4 py-3 text-[#323130]">V{doc.currentVersionMajor ?? 0}.{doc.currentVersionMinor ?? 0}</td>
                    <td className="px-4 py-3 text-[#605e5c]">{doc.ownerName ?? "--"}</td>
                    <td className="px-4 py-3 text-[#605e5c] text-xs">{fmtDate(doc.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          title="View Details"
                          className="p-1.5 rounded hover:bg-[#deecf9] text-[#0078d4] transition-colors"
                          onClick={() => onSelectDoc(doc.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          title="Submit for Review"
                          className="p-1.5 rounded hover:bg-[#deecf9] text-[#0078d4] transition-colors"
                          onClick={() => {
                            toast.info("Select a version from the Versions tab to submit for review");
                            onSelectDoc(doc.id);
                          }}
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Document Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-lg border border-[#edebe9] shadow-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#edebe9]">
              <h3 className="text-lg font-semibold text-[#323130]">Create Document</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded hover:bg-[#f3f2f1]">
                <X className="h-5 w-5 text-[#605e5c]" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#323130] mb-1">Doc Number *</label>
                <input
                  type="text"
                  value={form.docNumber}
                  onChange={(e) => setForm({ ...form, docNumber: e.target.value })}
                  placeholder="e.g., GRT-MECH-001"
                  className="w-full px-3 py-2 text-sm rounded-md border border-[#edebe9] focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#323130] mb-1">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Document title"
                  className="w-full px-3 py-2 text-sm rounded-md border border-[#edebe9] focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#323130] mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional description"
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-md border border-[#edebe9] focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4] resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#323130] mb-1">Doc Type</label>
                <select
                  value={form.docType}
                  onChange={(e) => setForm({ ...form, docType: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm rounded-md border border-[#edebe9] focus:border-[#0078d4] focus:outline-none"
                >
                  <option value="mechanical">Mechanical</option>
                  <option value="electrical">Electrical</option>
                  <option value="software">Software</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#323130] mb-1">Owner Name</label>
                <input
                  type="text"
                  value={form.ownerName}
                  onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                  placeholder="e.g., Zhang Wei"
                  className="w-full px-3 py-2 text-sm rounded-md border border-[#edebe9] focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#edebe9]">
              <button className={F.btnSecondary} onClick={() => setShowCreate(false)}>Cancel</button>
              <button
                className={F.btnPrimary}
                onClick={handleCreate}
                disabled={createMut.isPending}
              >
                {createMut.isPending ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 2: Versions
// ═══════════════════════════════════════════════════════════
function VersionsTab({ selectedDocId }: { selectedDocId: number | null }) {
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    fileUrlPath: "",
    changeReason: "",
    uploadedByName: "",
  });

  const docQ = trpc.plm.getDocument.useQuery(
    { id: selectedDocId! },
    { enabled: !!selectedDocId },
  );
  const uploadMut = trpc.plm.uploadVersion.useMutation();
  const promoteMut = trpc.plm.promoteMajorVersion.useMutation();

  const doc = docQ.data;
  const versions = doc?.versions ?? [];

  async function handleUpload() {
    if (!selectedDocId) return;
    if (!uploadForm.fileUrlPath.trim() || !uploadForm.changeReason.trim()) {
      toast.error("File path and change reason are required");
      return;
    }
    try {
      await uploadMut.mutateAsync({
        documentId: selectedDocId,
        fileUrlPath: uploadForm.fileUrlPath,
        changeReason: uploadForm.changeReason,
      });
      toast.success("New version uploaded");
      setShowUpload(false);
      setUploadForm({ fileUrlPath: "", changeReason: "", uploadedByName: "" });
      docQ.refetch();
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    }
  }

  async function handlePromote() {
    if (!selectedDocId) return;
    try {
      await promoteMut.mutateAsync({
        documentId: selectedDocId,
        fileUrlPath: versions[0]?.fileUrlPath ?? "/promoted",
      });
      toast.success("Promoted to major version");
      docQ.refetch();
    } catch (e: any) {
      toast.error(e.message ?? "Promote failed");
    }
  }

  if (!selectedDocId) {
    return <EmptyState icon={FileText} text="Click a document in the Documents tab to view its version history" />;
  }

  if (docQ.isLoading) {
    return <div className="p-4"><SkeletonRows rows={4} /></div>;
  }

  if (!doc) {
    return <EmptyState icon={FileText} text="Document not found" />;
  }

  return (
    <div className="space-y-6">
      {/* Doc header */}
      <div className={F.card + " p-5"}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#323130]">{doc.title}</h3>
            <p className="text-sm text-[#605e5c] mt-1 font-mono">{doc.docNumber}</p>
            {doc.description && <p className="text-sm text-[#605e5c] mt-2">{doc.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button className={F.btnPrimary + " flex items-center gap-1.5"} onClick={() => setShowUpload(true)}>
              <Upload className="h-4 w-4" />
              Upload New Version
            </button>
            <button
              className={F.btnSecondary + " flex items-center gap-1.5"}
              onClick={handlePromote}
              disabled={promoteMut.isPending}
            >
              <ChevronRight className="h-4 w-4" />
              {promoteMut.isPending ? "Promoting..." : "Promote to Major"}
            </button>
          </div>
        </div>
      </div>

      {/* Version timeline */}
      {versions.length === 0 ? (
        <EmptyState icon={Clock} text="No versions recorded yet" />
      ) : (
        <div className="relative pl-8">
          {/* Vertical line */}
          <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-[#edebe9]" />

          <div className="space-y-4">
            {versions.map((v: any, idx: number) => (
              <div key={v.id} className="relative">
                {/* Node dot */}
                <div
                  className={`absolute -left-8 top-4 w-[14px] h-[14px] rounded-full border-2 ${
                    idx === 0
                      ? "bg-[#0078d4] border-[#0078d4]"
                      : "bg-white border-[#edebe9]"
                  }`}
                />
                <div className={F.card + " p-4"}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-base font-bold text-[#323130]">
                      V{v.versionMajor}.{v.versionMinor}
                    </span>
                    {v.isLatest && (
                      <span className="bg-[#deecf9] text-[#0078d4] text-xs font-semibold px-2 py-0.5 rounded-full">
                        Latest
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-[#605e5c] text-xs">Uploaded</span>
                      <p className="text-[#323130]">{fmtDate(v.createdAt)}</p>
                    </div>
                    <div>
                      <span className="text-[#605e5c] text-xs">Uploader</span>
                      <p className="text-[#323130]">{v.uploadedByName ?? `User #${v.uploadedBy}`}</p>
                    </div>
                    <div>
                      <span className="text-[#605e5c] text-xs">Change Reason</span>
                      <p className="text-[#323130]">{v.changeReason ?? "--"}</p>
                    </div>
                    <div>
                      <span className="text-[#605e5c] text-xs">File Size</span>
                      <p className="text-[#323130]">
                        {v.fileSizeBytes ? `${(v.fileSizeBytes / 1024).toFixed(1)} KB` : "--"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload dialog */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowUpload(false)}>
          <div className="bg-white rounded-lg border border-[#edebe9] shadow-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#edebe9]">
              <h3 className="text-lg font-semibold text-[#323130]">Upload New Version</h3>
              <button onClick={() => setShowUpload(false)} className="p-1 rounded hover:bg-[#f3f2f1]">
                <X className="h-5 w-5 text-[#605e5c]" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#323130] mb-1">File Path *</label>
                <input
                  type="text"
                  value={uploadForm.fileUrlPath}
                  onChange={(e) => setUploadForm({ ...uploadForm, fileUrlPath: e.target.value })}
                  placeholder="/uploads/doc-v1.2.pdf"
                  className="w-full px-3 py-2 text-sm rounded-md border border-[#edebe9] focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#323130] mb-1">Change Reason *</label>
                <textarea
                  value={uploadForm.changeReason}
                  onChange={(e) => setUploadForm({ ...uploadForm, changeReason: e.target.value })}
                  placeholder="Describe what changed in this version"
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-md border border-[#edebe9] focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4] resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#323130] mb-1">Uploader Name</label>
                <input
                  type="text"
                  value={uploadForm.uploadedByName}
                  onChange={(e) => setUploadForm({ ...uploadForm, uploadedByName: e.target.value })}
                  placeholder="Your name"
                  className="w-full px-3 py-2 text-sm rounded-md border border-[#edebe9] focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#edebe9]">
              <button className={F.btnSecondary} onClick={() => setShowUpload(false)}>Cancel</button>
              <button
                className={F.btnPrimary}
                onClick={handleUpload}
                disabled={uploadMut.isPending}
              >
                {uploadMut.isPending ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 3: Reviews
// ═══════════════════════════════════════════════════════════
function ReviewsTab() {
  const [showDecision, setShowDecision] = useState(false);
  const [decisionTarget, setDecisionTarget] = useState<number | null>(null);
  const [decisionForm, setDecisionForm] = useState({
    reviewStatus: "approved" as "approved" | "rejected" | "revision_requested",
    comments: "",
  });

  const reviewsQ = trpc.plm.listReviews.useQuery({});
  const decisionMut = trpc.plm.recordDecision.useMutation();

  const reviews = reviewsQ.data?.items ?? [];

  async function handleDecision() {
    if (!decisionTarget) return;
    try {
      await decisionMut.mutateAsync({
        reviewId: decisionTarget,
        reviewStatus: decisionForm.reviewStatus,
        comments: decisionForm.comments || undefined,
      });
      toast.success("Decision recorded");
      setShowDecision(false);
      setDecisionTarget(null);
      setDecisionForm({ reviewStatus: "approved", comments: "" });
      reviewsQ.refetch();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to record decision");
    }
  }

  return (
    <div className="space-y-6">
      <div className={F.card + " overflow-hidden"}>
        {reviewsQ.isLoading ? (
          <div className="p-4"><SkeletonRows rows={4} /></div>
        ) : reviews.length === 0 ? (
          <EmptyState icon={Shield} text="No design reviews found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={F.tableHead}>
                  <th className="text-left px-4 py-3">Reviewer</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Comments</th>
                  <th className="text-left px-4 py-3">Requested At</th>
                  <th className="text-left px-4 py-3">Reviewed At</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edebe9]">
                {reviews.map((r: any) => (
                  <tr key={r.id} className="hover:bg-[#faf9f8] transition-colors">
                    <td className="px-4 py-3 text-[#323130] font-medium">
                      {r.reviewerName ?? `User #${r.reviewerUserId}`}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.reviewStatus} map={REVIEW_STATUS_STYLE} labels={REVIEW_STATUS_LABEL} />
                    </td>
                    <td className="px-4 py-3 text-[#605e5c] max-w-[300px] truncate">
                      {r.comments ?? "--"}
                    </td>
                    <td className="px-4 py-3 text-[#605e5c] text-xs">{fmtDate(r.createdAt)}</td>
                    <td className="px-4 py-3 text-[#605e5c] text-xs">{fmtDate(r.reviewedAt)}</td>
                    <td className="px-4 py-3">
                      {r.reviewStatus === "pending" && (
                        <button
                          className={F.btnPrimary + " text-xs px-3 py-1.5"}
                          onClick={() => {
                            setDecisionTarget(r.id);
                            setShowDecision(true);
                          }}
                        >
                          Record Decision
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Decision dialog */}
      {showDecision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowDecision(false)}>
          <div className="bg-white rounded-lg border border-[#edebe9] shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#edebe9]">
              <h3 className="text-lg font-semibold text-[#323130]">Record Decision</h3>
              <button onClick={() => setShowDecision(false)} className="p-1 rounded hover:bg-[#f3f2f1]">
                <X className="h-5 w-5 text-[#605e5c]" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#323130] mb-1">Decision</label>
                <select
                  value={decisionForm.reviewStatus}
                  onChange={(e) => setDecisionForm({ ...decisionForm, reviewStatus: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm rounded-md border border-[#edebe9] focus:border-[#0078d4] focus:outline-none"
                >
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="revision_requested">Revision Requested</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#323130] mb-1">Comments</label>
                <textarea
                  value={decisionForm.comments}
                  onChange={(e) => setDecisionForm({ ...decisionForm, comments: e.target.value })}
                  placeholder="Optional review comments"
                  rows={4}
                  className="w-full px-3 py-2 text-sm rounded-md border border-[#edebe9] focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4] resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#edebe9]">
              <button className={F.btnSecondary} onClick={() => setShowDecision(false)}>Cancel</button>
              <button
                className={F.btnPrimary}
                onClick={handleDecision}
                disabled={decisionMut.isPending}
              >
                {decisionMut.isPending ? "Saving..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 4: Stats
// ═══════════════════════════════════════════════════════════
function StatsTab() {
  const statsQ = trpc.plm.getStats.useQuery();
  const docsQ = trpc.plm.listDocuments.useQuery({ limit: 500 });

  const stats = statsQ.data;
  const docs = docsQ.data?.items ?? [];

  // Distribution by doc type
  const typeDist = useMemo(() => {
    const map: Record<string, number> = { mechanical: 0, electrical: 0, software: 0, manual: 0 };
    for (const doc of docs) {
      map[(doc as any).docType] = (map[(doc as any).docType] ?? 0) + 1;
    }
    return map;
  }, [docs]);

  const maxCount = Math.max(...Object.values(typeDist), 1);

  if (statsQ.isLoading) {
    return <div className="p-4"><SkeletonRows rows={4} /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Big stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Documents", value: stats?.total ?? 0, icon: FileText, color: "#0078d4", bg: "#deecf9" },
          { label: "Released", value: stats?.released ?? 0, icon: CheckCircle, color: "#107c10", bg: "#dff6dd" },
          { label: "In Review", value: stats?.inReview ?? 0, icon: Clock, color: "#0078d4", bg: "#deecf9" },
          { label: "Freeze Rate", value: `${stats?.freezeRate ?? 0}%`, icon: Lock, color: "#605e5c", bg: "#f3f2f1" },
        ].map((s) => (
          <div key={s.label} className={F.card + " p-6"}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: s.bg }}>
                <s.icon className="h-5 w-5" style={{ color: s.color }} />
              </div>
            </div>
            <div className="text-3xl font-bold text-[#323130] mb-1">{s.value}</div>
            <span className="text-xs text-[#605e5c]">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Distribution bar chart */}
      <div className={F.card + " p-6"}>
        <h3 className="text-sm font-semibold text-[#323130] mb-4">Distribution by Document Type</h3>
        <div className="space-y-3">
          {Object.entries(typeDist).map(([type, cnt]) => (
            <div key={type} className="flex items-center gap-3">
              <span className="text-sm text-[#605e5c] w-24">{DOC_TYPE_LABEL[type] ?? type}</span>
              <div className="flex-1 bg-[#f3f2f1] rounded-full h-6 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(cnt / maxCount) * 100}%`,
                    backgroundColor: type === "mechanical" ? "#0078d4"
                      : type === "electrical" ? "#797673"
                      : type === "software" ? "#107c10"
                      : "#a19f9d",
                    minWidth: cnt > 0 ? "20px" : "0",
                  }}
                />
              </div>
              <span className="text-sm font-semibold text-[#323130] w-8 text-right">{cnt}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 5: Design Freeze
// ═══════════════════════════════════════════════════════════
function DesignFreezeTab() {
  const docsQ = trpc.plm.listDocuments.useQuery({ limit: 500 });
  const docs = docsQ.data?.items ?? [];

  const frozenDocs = useMemo(
    () => docs.filter((d: any) => d.designFreezeApproved),
    [docs],
  );

  if (docsQ.isLoading) {
    return <div className="p-4"><SkeletonRows rows={4} /></div>;
  }

  if (frozenDocs.length === 0) {
    return <EmptyState icon={Lock} text="No documents have been design-frozen yet" />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {frozenDocs.map((doc: any) => (
        <div key={doc.id} className={F.card + " p-5"}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#dff6dd] flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-[#107c10]" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#323130]">{doc.title}</h4>
                <p className="text-xs text-[#605e5c] font-mono">{doc.docNumber}</p>
              </div>
            </div>
            <StatusBadge status={doc.docType} map={DOC_TYPE_STYLE} labels={DOC_TYPE_LABEL} />
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#605e5c]">Freeze Date</span>
              <span className="text-[#323130]">{fmtDate(doc.designFreezeDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#605e5c]">Approved By</span>
              <span className="text-[#323130]">{doc.designFreezeApprovedBy ?? "--"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#605e5c]">Version at Freeze</span>
              <span className="text-[#323130] font-mono">
                V{doc.currentVersionMajor ?? 0}.{doc.currentVersionMinor ?? 0}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[#edebe9]">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#107c10]">
              <Lock className="h-3 w-3" />
              Design Frozen
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════

const TABS = [
  { key: "documents", labelKey: "projects.plm.tabDocuments", icon: FileText },
  { key: "versions", labelKey: "projects.plm.tabVersions", icon: Clock },
  { key: "reviews", labelKey: "projects.plm.tabReviews", icon: Shield },
  { key: "stats", labelKey: "projects.plm.tabStats", icon: BarChart3 },
  { key: "freeze", labelKey: "projects.plm.tabDesignFreeze", icon: Lock },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function PLMWorkbench() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabKey>("documents");
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);

  function handleSelectDoc(id: number) {
    setSelectedDocId(id);
    setActiveTab("versions");
  }

  return (
    <div className={`flex flex-col h-full ${F.bg}`}>
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-[#323130]">{t("projects.plm.title")}</h1>
        <p className="text-sm text-[#605e5c] mt-1">{t("projects.plm.subtitle")}</p>
      </div>

      {/* Tabs */}
      <div className="px-6 border-b border-[#edebe9]">
        <div className="flex gap-0">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors
                  ${isActive
                    ? "bg-white text-[#0078d4] border-b-2 border-[#0078d4]"
                    : "text-[#605e5c] hover:text-[#323130] hover:bg-[#f3f2f1] border-b-2 border-transparent"
                  }
                `}
              >
                <tab.icon className="h-4 w-4" />
                <span>{t(tab.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {activeTab === "documents" && <DocumentsTab onSelectDoc={handleSelectDoc} />}
        {activeTab === "versions" && <VersionsTab selectedDocId={selectedDocId} />}
        {activeTab === "reviews" && <ReviewsTab />}
        {activeTab === "stats" && <StatsTab />}
        {activeTab === "freeze" && <DesignFreezeTab />}
      </div>
    </div>
  );
}
