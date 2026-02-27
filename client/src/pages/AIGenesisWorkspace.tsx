/**
 * AI Genesis Workspace - AI创世工作台
 *
 * Split-screen workspace for document ingestion and AI-driven proposal management.
 * Left panel: Document feeder with drag-and-drop upload
 * Right panel: Proposal list + chat/detail view with action buttons
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { toast } from "sonner";
import {
  Brain,
  Upload,
  FileText,
  MessageSquare,
  CheckCircle,
  XCircle,
  Send,
  Bot,
  User,
  Sparkles,
  Archive,
  RefreshCw,
  Loader2,
  Shield,
  ShieldCheck,
  Clock,
  History,
  BookOpen,
  Star,
} from "lucide-react";
import QueryErrorBanner from "@/components/QueryErrorBanner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DocumentStatus = "UPLOADED" | "PROCESSING" | "ANALYZED" | "FAILED" | "ARCHIVED";
type ProposalStatus = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "COMMITTED";
type ProposalType = "SCHEMA_CHANGE" | "CONFIG_UPDATE" | "SOP_CREATION" | "POLICY_UPDATE" | "OTHER";
type ChatRole = "user" | "ai" | "system";
type ApprovalStatus = "DRAFT" | "PENDING_MANAGER" | "APPROVED";
type MockRole = "employee" | "manager";

interface GenesisDocument {
  id: number;
  fileName: string;
  fileType: string;
  status: DocumentStatus;
  proposalCount: number;
  uploadedAt: string;
  analyzedAt?: string;
}

interface GenesisProposal {
  id: number;
  documentId: number;
  title: string;
  description: string;
  proposalType: ProposalType;
  status: ProposalStatus;
  confidence: number;
  targetEntity: string;
  proposedJsonDiff: string;
  impactSummary: string;
  createdAt: string;
}

interface ChatMessage {
  id: number;
  role: ChatRole;
  content: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<DocumentStatus, { color: string; label: string }> = {
  UPLOADED: { color: "bg-blue-500/15 text-blue-400 border-blue-500/30", label: "Uploaded" },
  PROCESSING: { color: "bg-amber-500/15 text-amber-400 border-amber-500/30", label: "Processing" },
  ANALYZED: { color: "bg-green-500/15 text-green-400 border-green-500/30", label: "Analyzed" },
  FAILED: { color: "bg-red-500/15 text-red-400 border-red-500/30", label: "Failed" },
  ARCHIVED: { color: "bg-muted text-muted-foreground border-muted", label: "Archived" },
};

const APPROVAL_STYLES: Record<ApprovalStatus, { color: string; label: string; labelCn: string }> = {
  DRAFT: { color: "bg-slate-500/15 text-slate-400 border-slate-500/30", label: "Draft", labelCn: "草稿" },
  PENDING_MANAGER: { color: "bg-amber-500/15 text-amber-400 border-amber-500/30", label: "Awaiting Approval", labelCn: "等待主管审核" },
  APPROVED: { color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", label: "Approved", labelCn: "已批准" },
};

const PROPOSAL_STATUS_STYLES: Record<ProposalStatus, { color: string; label: string }> = {
  DRAFT: { color: "bg-muted text-muted-foreground border-muted", label: "Draft" },
  PENDING_REVIEW: { color: "bg-amber-500/15 text-amber-400 border-amber-500/30", label: "Pending Review" },
  APPROVED: { color: "bg-green-500/15 text-green-400 border-green-500/30", label: "Approved" },
  REJECTED: { color: "bg-red-500/15 text-red-400 border-red-500/30", label: "Rejected" },
  COMMITTED: { color: "bg-primary/15 text-primary border-primary/30", label: "Committed" },
};

const PROPOSAL_TYPE_LABELS: Record<ProposalType, string> = {
  SCHEMA_CHANGE: "Schema Change",
  CONFIG_UPDATE: "Config Update",
  SOP_CREATION: "SOP Creation",
  POLICY_UPDATE: "Policy Update",
  OTHER: "Other",
};

function fileIcon(fileType: string) {
  switch (fileType) {
    case "pdf": return <FileText className="w-5 h-5 text-red-400" />;
    case "docx": return <FileText className="w-5 h-5 text-blue-400" />;
    case "csv": return <FileText className="w-5 h-5 text-green-400" />;
    default: return <FileText className="w-5 h-5 text-muted-foreground" />;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AIGenesisWorkspace() {
  // State
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [selectedProposalId, setSelectedProposalId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"proposals" | "chat" | "history">("proposals");
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [mockRole, setMockRole] = useState<MockRole>("employee");

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [generatedHistoryId, setGeneratedHistoryId] = useState<number | null>(null);
  const [localDocuments, setLocalDocuments] = useState<Array<{
    id: number; fileName: string; fileSize: number; fileType: string;
    status: DocumentStatus; approvalStatus: ApprovalStatus;
    uploadedAt: string; proposalCount: number;
  }>>([]);
  const [approvalStatusMap, setApprovalStatusMap] = useState<Record<number, ApprovalStatus>>({});
  const nextLocalIdRef = useRef(-1);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // tRPC utils for cache invalidation
  const utils = trpc.useUtils();

  // ---------------------------------------------------------------------------
  // tRPC queries
  // ---------------------------------------------------------------------------

  const statsQuery = trpc.genesis.getGenesisStats.useQuery();
  const documentsQuery = trpc.genesis.listDocuments.useQuery();
  const proposalsQuery = trpc.genesis.listProposals.useQuery();
  const proposalDetailQuery = trpc.genesis.getProposal.useQuery(
    { id: selectedProposalId! },
    { enabled: !!selectedProposalId }
  );

  const uploadMutation = trpc.genesis.uploadDocument.useMutation({
    onSuccess: () => {
      toast.success("Document uploaded successfully");
      setUploadProgress(null);
      utils.genesis.listDocuments.invalidate();
      utils.genesis.getGenesisStats.invalidate();
    },
    onError: () => {
      toast.error("Upload failed. Please try again.");
      setUploadProgress(null);
    },
  });

  const generateProposalMutation = trpc.genesis.generateProposal.useMutation({
    onSuccess: () => {
      toast.success("Proposal generation started");
      utils.genesis.listProposals.invalidate();
      utils.genesis.getGenesisStats.invalidate();
    },
    onError: () => toast.error("Failed to generate proposal"),
  });

  const simulateGenerationMutation = trpc.genesis.simulateGeneration.useMutation({
    onMutate: () => {
      setIsGenerating(true);
      setGeneratedContent(null);
    },
    onSuccess: (data) => {
      setIsGenerating(false);
      setGeneratedContent(data.generatedContent);
      setGeneratedHistoryId(data.historyId);
      toast.success(`Proposal generated for ${data.documentName} (History #${data.historyId})`);
      utils.genesis.listProposalHistory.invalidate();
      utils.genesis.getGenesisStats.invalidate();
    },
    onError: (err) => {
      setIsGenerating(false);
      toast.error(`Generation failed: ${err.message}`);
    },
  });

  const sendMessageMutation = trpc.genesis.sendMessage.useMutation({
    onSuccess: () => {
      utils.genesis.getProposal.invalidate();
    },
  });

  const generateAIResponseMutation = trpc.genesis.generateAIResponse.useMutation({
    onSuccess: () => {
      utils.genesis.getProposal.invalidate();
    },
  });

  const updateStatusMutation = trpc.genesis.updateProposalStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      utils.genesis.listProposals.invalidate();
      utils.genesis.getProposal.invalidate();
      utils.genesis.getGenesisStats.invalidate();
    },
    onError: () => toast.error("Failed to update status"),
  });

  const proposalHistoryQuery = trpc.genesis.listProposalHistory.useQuery();
  const proposalHistory = proposalHistoryQuery.data ?? [];

  const feedbackMutation = trpc.genesis.feedbackToKnowledgeBase.useMutation({
    onSuccess: () => {
      toast.success("反馈至知识炼金炉 — Fed back to Knowledge Base for AI learning");
      utils.genesis.listProposalHistory.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateHistoryMutation = trpc.genesis.updateProposalHistory.useMutation({
    onSuccess: () => {
      utils.genesis.listProposalHistory.invalidate();
    },
  });

  const commitMutation = trpc.genesis.commitProposal.useMutation({
    onSuccess: () => {
      toast.success("Proposal committed successfully");
      utils.genesis.listProposals.invalidate();
      utils.genesis.getProposal.invalidate();
      utils.genesis.getGenesisStats.invalidate();
    },
    onError: () => toast.error("Failed to commit proposal"),
  });

  // Resolve data from backend
  const documents = (documentsQuery.data as any)?.items ?? [];
  // Merge local mock uploads with backend documents, each carrying approvalStatus
  const allDocuments = [
    ...localDocuments,
    ...documents.map((d: any) => ({
      ...d,
      approvalStatus: (approvalStatusMap[d.id] ?? "DRAFT") as ApprovalStatus,
    })),
  ];
  const proposals = (proposalsQuery.data as any)?.items ?? [];
  const selectedProposal = proposals.find((p: any) => p.id === selectedProposalId) ?? null;
  const proposalDetail = proposalDetailQuery.data;
  const chatMessages = (proposalDetail as any)?.chatMessages ?? [];

  const genesisQueryError = statsQuery.error || documentsQuery.error || proposalsQuery.error;
  const stats = statsQuery.data ?? {
    documentCount: documents.length,
    proposalCount: proposals.length,
    committedCount: proposals.filter((p: any) => p.status === "COMMITTED").length,
  };

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length]);

  // ---------------------------------------------------------------------------
  // Drag-and-drop handlers
  // ---------------------------------------------------------------------------

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileUpload(files);
    }
    // Reset so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileUpload = (files: File[]) => {
    const file = files[0];
    const localId = nextLocalIdRef.current;
    nextLocalIdRef.current -= 1;

    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev === null) return null;
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    // Simulate a 1-second upload delay — generates a local mock record
    // so Excel/CSV/XLSX files never hit a binary-parsing path that could crash
    setTimeout(() => {
      clearInterval(interval);
      const ext = file.name.split(".").pop()?.toLowerCase() || "other";
      const newDoc = {
        id: localId,
        fileName: file.name,
        fileSize: file.size,
        fileType: ext,
        status: "UPLOADED" as DocumentStatus,
        approvalStatus: "DRAFT" as ApprovalStatus,
        uploadedAt: new Date().toLocaleString(),
        proposalCount: 0,
      };
      setLocalDocuments((prev) => [newDoc, ...prev]);
      setApprovalStatusMap((prev) => ({ ...prev, [localId]: "DRAFT" }));
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(null), 500);
      toast.success(`${file.name} uploaded successfully`);

      // Also persist to backend (non-blocking, best-effort)
      uploadMutation.mutate({ fileName: file.name });
    }, 1000);
  };

  // ---------------------------------------------------------------------------
  // Chat handler
  // ---------------------------------------------------------------------------

  const handleSendMessage = () => {
    const text = chatInput.trim();
    if (!text || !selectedProposalId) return;

    sendMessageMutation.mutate({ proposalId: selectedProposalId, content: text });
    // Trigger AI response after user message
    setTimeout(() => {
      generateAIResponseMutation.mutate({ proposalId: selectedProposalId });
    }, 300);
    setChatInput("");
  };

  // ---------------------------------------------------------------------------
  // Proposal actions
  // ---------------------------------------------------------------------------

  const handleSubmitForReview = () => {
    if (!selectedProposalId) return;
    updateStatusMutation.mutate({ id: selectedProposalId, status: "PENDING_REVIEW" });
  };

  const handleApproveAndCommit = () => {
    if (!selectedProposalId) return;
    commitMutation.mutate({ id: selectedProposalId });
  };

  const handleReject = () => {
    if (!selectedProposalId) return;
    updateStatusMutation.mutate({ id: selectedProposalId, status: "REJECTED" });
  };

  const handleGenerateProposal = () => {
    if (!selectedDocumentId) return;
    // Find the document name for context
    const doc = allDocuments.find((d: any) => d.id === selectedDocumentId);
    const docName = doc?.fileName ?? `Document #${selectedDocumentId}`;
    // Use the fixed simulation pipeline (always works, even without DB)
    simulateGenerationMutation.mutate({
      documentId: selectedDocumentId,
      documentName: docName,
    });
  };

  // ---------------------------------------------------------------------------
  // Document RBAC approval handlers
  // ---------------------------------------------------------------------------

  const handleRequestAuthorization = (docId: number) => {
    setApprovalStatusMap((prev) => ({ ...prev, [docId]: "PENDING_MANAGER" }));
    setLocalDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, approvalStatus: "PENDING_MANAGER" } : d))
    );
    toast.info("Authorization requested — awaiting manager approval (申请已提交，等待主管审核)");
  };

  const handleManagerApprove = (docId: number) => {
    setApprovalStatusMap((prev) => ({ ...prev, [docId]: "APPROVED" }));
    setLocalDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, approvalStatus: "APPROVED" } : d))
    );
    toast.success("Document approved — AI ingestion authorized (主管确认，AI处理已授权)");
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-full space-y-4">
      <QueryErrorBanner error={genesisQueryError} onRetry={() => { statsQuery.refetch(); documentsQuery.refetch(); proposalsQuery.refetch(); }} />
      {/* Header */}
      <PageHeader
        icon={Brain}
        title="AI Genesis Workspace"
        description="Document ingestion and AI-driven proposal management"
        actions={
          <div className="flex items-center gap-3">
            {/* Mock RBAC role toggle */}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setMockRole((r) => (r === "employee" ? "manager" : "employee"))}
            >
              {mockRole === "manager" ? (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Shield className="w-3.5 h-3.5 text-blue-400" />
              )}
              {mockRole === "manager" ? "Role: Manager (主管)" : "Role: Employee (员工)"}
            </Button>
            <Badge variant="outline" className="gap-1">
              <FileText className="w-3 h-3" />
              {stats.documentCount} docs
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Sparkles className="w-3 h-3" />
              {stats.proposalCount} proposals
            </Badge>
            <Badge variant="outline" className="gap-1">
              <CheckCircle className="w-3 h-3" />
              {stats.committedCount} committed
            </Badge>
          </div>
        }
      />

      {/* Main split-screen area */}
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup direction={isMobile ? "vertical" : "horizontal"} className="rounded-lg border border-border">
          {/* ---------------------------------------------------------------- */}
          {/* LEFT PANEL: Document Feeder                                      */}
          {/* ---------------------------------------------------------------- */}
          <ResizablePanel defaultSize={40} minSize={25} maxSize={60}>
            <div className="flex flex-col h-full">
              {/* Drop zone */}
              <div className="p-4">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    relative flex flex-col items-center justify-center gap-3 p-8
                    border-2 border-dashed rounded-lg cursor-pointer
                    transition-colors duration-200
                    ${dragActive
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/30"
                    }
                  `}
                >
                  <Upload className={`w-10 h-10 ${dragActive ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">
                      Drop files here or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, DOCX, CSV, XLSX supported
                    </p>
                  </div>
                  {dragActive && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-primary/10 border-2 border-primary">
                      <p className="text-sm font-semibold text-primary">Release to upload</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.doc,.csv,.xlsx,.xls,.txt"
                    multiple
                    onChange={handleFileSelect}
                  />
                </div>

                {/* Upload progress bar */}
                {uploadProgress !== null && (
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Uploading...</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-1.5" />
                  </div>
                )}
              </div>

              <Separator />

              {/* Document list */}
              <div className="px-4 pt-3 pb-1">
                <h3 className="text-sm font-semibold text-foreground">Recent Documents</h3>
              </div>
              <ScrollArea className="flex-1 px-4 pb-4">
                <div className="space-y-2">
                  {documentsQuery.isLoading && localDocuments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Loader2 className="w-8 h-8 animate-spin mb-2 opacity-50" />
                      <p className="text-xs">Loading documents...</p>
                    </div>
                  ) : allDocuments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <FileText className="w-8 h-8 mb-2 opacity-40" />
                      <p className="text-xs">No documents yet. Upload one above.</p>
                    </div>
                  ) : allDocuments.map((doc: any) => {
                    const statusInfo = STATUS_STYLES[doc.status as DocumentStatus] ?? STATUS_STYLES.UPLOADED;
                    const approvalInfo = APPROVAL_STYLES[(doc.approvalStatus ?? "DRAFT") as ApprovalStatus];
                    const isSelected = selectedDocumentId === doc.id;
                    return (
                      <Card
                        key={doc.id}
                        className={`cursor-pointer transition-all duration-150 ${
                          isSelected
                            ? "ring-2 ring-primary bg-primary/5"
                            : "hover:bg-muted/40"
                        }`}
                        onClick={() => setSelectedDocumentId(doc.id)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            {fileIcon(doc.fileType)}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate text-foreground">
                                {doc.fileName}
                              </p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusInfo.color}`}>
                                  {doc.status === "PROCESSING" && (
                                    <RefreshCw className="w-2.5 h-2.5 mr-1 animate-spin" />
                                  )}
                                  {statusInfo.label}
                                </Badge>
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 gap-0.5 ${approvalInfo.color}`}>
                                  {doc.approvalStatus === "PENDING_MANAGER" && <Clock className="w-2.5 h-2.5" />}
                                  {doc.approvalStatus === "APPROVED" && <ShieldCheck className="w-2.5 h-2.5" />}
                                  {approvalInfo.labelCn}
                                </Badge>
                                {doc.proposalCount > 0 && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {doc.proposalCount} proposal{doc.proposalCount > 1 ? "s" : ""}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {doc.uploadedAt ?? doc.createdAt}
                                {doc.fileSize ? ` · ${(doc.fileSize / 1024).toFixed(1)} KB` : ""}
                              </p>
                              {/* RBAC approval action buttons */}
                              {mockRole === "employee" && doc.approvalStatus === "DRAFT" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mt-2 h-7 text-xs gap-1"
                                  onClick={(e) => { e.stopPropagation(); handleRequestAuthorization(doc.id); }}
                                >
                                  <Shield className="w-3 h-3" />
                                  申请授权 Request Authorization
                                </Button>
                              )}
                              {mockRole === "employee" && doc.approvalStatus === "PENDING_MANAGER" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="mt-2 h-7 text-xs gap-1 text-amber-400"
                                  disabled
                                >
                                  <Clock className="w-3 h-3 animate-pulse" />
                                  等待主管审核 Awaiting Approval...
                                </Button>
                              )}
                              {mockRole === "manager" && doc.approvalStatus === "PENDING_MANAGER" && (
                                <Button
                                  size="sm"
                                  className="mt-2 h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                  onClick={(e) => { e.stopPropagation(); handleManagerApprove(doc.id); }}
                                >
                                  <ShieldCheck className="w-3 h-3" />
                                  主管确认 Manager Approve
                                </Button>
                              )}
                              {doc.approvalStatus === "APPROVED" && (
                                <div className="flex items-center gap-1 mt-2 text-[10px] text-emerald-400">
                                  <ShieldCheck className="w-3 h-3" />
                                  AI ingestion authorized
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Generate Proposal button when a document is selected */}
                {selectedDocumentId && (
                  <div className="mt-4">
                    <Button
                      onClick={handleGenerateProposal}
                      className="w-full gap-2"
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating via Gemini/Claude Engine...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Generate Proposal
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* ---------------------------------------------------------------- */}
          {/* RIGHT PANEL: Proposals & Chat                                    */}
          {/* ---------------------------------------------------------------- */}
          <ResizablePanel defaultSize={60} minSize={35}>
            <div className="flex flex-col h-full">
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as "proposals" | "chat" | "history")}
                className="flex flex-col h-full"
              >
                <div className="px-4 pt-3">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="proposals" className="gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Proposals
                    </TabsTrigger>
                    <TabsTrigger value="chat" className="gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Chat & Detail
                    </TabsTrigger>
                    <TabsTrigger value="history" className="gap-1.5">
                      <History className="w-3.5 h-3.5" />
                      History
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* ---- Proposals Tab ---- */}
                <TabsContent value="proposals" className="flex-1 min-h-0 mt-0 px-4 pb-4">
                  <ScrollArea className="h-full pt-3">
                    <div className="space-y-3">
                      {proposalsQuery.isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                          <Loader2 className="w-10 h-10 animate-spin mb-3 opacity-50" />
                          <p className="text-sm">Loading proposals...</p>
                        </div>
                      ) : proposals.length === 0 && !generatedContent ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                          <Sparkles className="w-10 h-10 mb-3 opacity-40" />
                          <p className="text-sm">No proposals yet.</p>
                          <p className="text-xs mt-1">Upload a document and generate proposals to get started.</p>
                        </div>
                      ) : (
                        <>
                        {/* Generated content display */}
                        {generatedContent && (
                          <Card className="border-primary/40 bg-primary/5">
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-base flex items-center gap-2">
                                  <Sparkles className="w-4 h-4 text-primary" />
                                  Generated Proposal
                                </CardTitle>
                                <Badge variant="outline" className="text-[10px] bg-green-500/15 text-green-400 border-green-500/30">
                                  History #{generatedHistoryId}
                                </Badge>
                              </div>
                              <CardDescription>
                                AI-generated via Gemini/Claude Engine — saved to Data Flywheel
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <ScrollArea className="h-[300px]">
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                                    {generatedContent}
                                  </pre>
                                </div>
                              </ScrollArea>
                            </CardContent>
                          </Card>
                        )}

                        {[...proposals]
                          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                          .map((proposal: any) => {
                            const pStatus = PROPOSAL_STATUS_STYLES[proposal.status as ProposalStatus];
                            const isActive = selectedProposalId === proposal.id;
                            return (
                              <Card
                                key={proposal.id}
                                className={`cursor-pointer transition-all duration-150 ${
                                  isActive
                                    ? "ring-2 ring-primary bg-primary/5"
                                    : "hover:bg-muted/40"
                                }`}
                                onClick={() => {
                                  setSelectedProposalId(proposal.id);
                                  setActiveTab("chat");
                                }}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-foreground truncate">
                                        {proposal.title}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                        {proposal.description}
                                      </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${pStatus.color}`}>
                                        {pStatus.label}
                                      </Badge>
                                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                        {PROPOSAL_TYPE_LABELS[proposal.proposalType as ProposalType] ?? proposal.proposalType}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4 mt-3">
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                      <span>Confidence:</span>
                                      <div className="w-16">
                                        <Progress value={proposal.confidence != null ? proposal.confidence * 100 : 0} className="h-1.5" />
                                      </div>
                                      <span className="font-mono text-foreground">
                                        {proposal.confidence != null ? `${Math.round(proposal.confidence * 100)}%` : "N/A"}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">
                                      Target: {proposal.targetEntity}
                                    </span>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* ---- Chat & Detail Tab ---- */}
                <TabsContent value="chat" className="flex-1 min-h-0 mt-0 flex flex-col">
                  {!selectedProposal ? (
                    <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
                      <MessageSquare className="w-10 h-10 mb-3 opacity-40" />
                      <p className="text-sm">Select a proposal to view details and chat.</p>
                    </div>
                  ) : (
                    <>
                      {/* Proposal detail card */}
                      <div className="px-4 pt-3 space-y-3">
                        <Card>
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-base">
                                  {selectedProposal.title}
                                </CardTitle>
                                <CardDescription className="mt-1">
                                  {selectedProposal.description}
                                </CardDescription>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-0 ${
                                    (PROPOSAL_STATUS_STYLES[selectedProposal.status as ProposalStatus] ?? PROPOSAL_STATUS_STYLES.DRAFT).color
                                  }`}
                                >
                                  {(PROPOSAL_STATUS_STYLES[selectedProposal.status as ProposalStatus] ?? PROPOSAL_STATUS_STYLES.DRAFT).label}
                                </Badge>
                                <span className="text-xs font-mono text-muted-foreground">
                                  {selectedProposal.confidence != null ? `${Math.round(selectedProposal.confidence * 100)}%` : "N/A"} confidence
                                </span>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0 space-y-2">
                            {/* Confidence bar */}
                            <Progress value={selectedProposal.confidence != null ? selectedProposal.confidence * 100 : 0} className="h-1.5" />

                            {/* JSON Diff */}
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">
                                Proposed Changes
                              </p>
                              <pre className="font-mono text-xs bg-secondary/30 rounded-md p-3 overflow-x-auto whitespace-pre-wrap border border-border">
                                {typeof selectedProposal.proposedJsonDiff === "string"
                                  ? selectedProposal.proposedJsonDiff
                                  : JSON.stringify(selectedProposal.proposedJsonDiff, null, 2)}
                              </pre>
                            </div>

                            {/* Impact */}
                            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-md p-2">
                              <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                              <span>
                                {selectedProposal.impactSummary
                                  ?? (selectedProposal.impactAnalysis
                                    ? (typeof selectedProposal.impactAnalysis === "string"
                                        ? selectedProposal.impactAnalysis
                                        : JSON.stringify(selectedProposal.impactAnalysis))
                                    : "No impact analysis available")}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <Separator className="my-2" />

                      {/* Chat messages */}
                      <ScrollArea className="flex-1 min-h-0 px-4">
                        <div className="space-y-3 py-2">
                          {chatMessages.map((msg: any) => {
                            const role = (msg.role ?? "").toLowerCase();
                            if (role === "system") {
                              return (
                                <div key={msg.id} className="flex justify-center">
                                  <p className="text-[10px] text-muted-foreground bg-muted/50 rounded-full px-3 py-1">
                                    {msg.content}
                                  </p>
                                </div>
                              );
                            }
                            const isAI = role === "ai";
                            return (
                              <div
                                key={msg.id}
                                className={`flex gap-2 ${isAI ? "justify-start" : "justify-end"}`}
                              >
                                {isAI && (
                                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                                    <Bot className="w-4 h-4 text-primary" />
                                  </div>
                                )}
                                <div
                                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                                    isAI
                                      ? "bg-muted/60 text-foreground"
                                      : "bg-primary text-primary-foreground"
                                  }`}
                                >
                                  <p className="whitespace-pre-wrap">{msg.content}</p>
                                  <p
                                    className={`text-[10px] mt-1 ${
                                      isAI ? "text-muted-foreground" : "text-primary-foreground/60"
                                    }`}
                                  >
                                    {msg.createdAt}
                                  </p>
                                </div>
                                {!isAI && (
                                  <div className="w-7 h-7 rounded-full bg-primary/80 flex items-center justify-center shrink-0 mt-1">
                                    <User className="w-4 h-4 text-primary-foreground" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          <div ref={chatEndRef} />
                        </div>
                      </ScrollArea>

                      {/* Chat input */}
                      <div className="px-4 py-3 border-t border-border">
                        <div className="flex gap-2">
                          <Textarea
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                              }
                            }}
                            placeholder="Type a message..."
                            className="min-h-[40px] max-h-[100px] resize-none text-sm"
                            rows={1}
                          />
                          <Button
                            size="icon"
                            onClick={handleSendMessage}
                            disabled={!chatInput.trim()}
                            className="shrink-0"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 mt-3">
                          {selectedProposal.status === "DRAFT" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              onClick={handleSubmitForReview}
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              Submit for Review
                            </Button>
                          )}
                          {selectedProposal.status === "PENDING_REVIEW" && (
                            <>
                              <Button
                                size="sm"
                                className="gap-1.5"
                                onClick={handleApproveAndCommit}
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Approve & Commit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="gap-1.5"
                                onClick={handleReject}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Reject
                              </Button>
                            </>
                          )}
                          {selectedProposal.status === "COMMITTED" && (
                            <Badge variant="outline" className="gap-1 bg-primary/10 text-primary border-primary/30">
                              <Archive className="w-3 h-3" />
                              Committed
                            </Badge>
                          )}
                          {selectedProposal.status === "APPROVED" && (
                            <Button
                              size="sm"
                              className="gap-1.5"
                              onClick={handleApproveAndCommit}
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Commit Changes
                            </Button>
                          )}
                          {selectedProposal.status === "REJECTED" && (
                            <Badge variant="outline" className="gap-1 bg-red-500/10 text-red-400 border-red-500/30">
                              <XCircle className="w-3 h-3" />
                              Rejected
                            </Badge>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </TabsContent>

                {/* ---- History Tab (Data Flywheel Learning Registry) ---- */}
                <TabsContent value="history" className="flex-1 min-h-0 mt-0 px-4 pb-4">
                  <ScrollArea className="h-full pt-3">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-primary" />
                          AI Learning History — Data Flywheel Registry
                        </h3>
                        <Badge variant="outline" className="text-[10px]">
                          {proposalHistory.length} record{proposalHistory.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>

                      {proposalHistoryQuery.isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                          <Loader2 className="w-10 h-10 animate-spin mb-3 opacity-50" />
                          <p className="text-sm">Loading history...</p>
                        </div>
                      ) : proposalHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                          <History className="w-10 h-10 mb-3 opacity-40" />
                          <p className="text-sm">No generation history yet.</p>
                          <p className="text-xs mt-1">Generate a proposal to start building the Data Flywheel.</p>
                        </div>
                      ) : (
                        proposalHistory.map((entry: any) => {
                          const statusColor =
                            entry.status === "FINALIZED"
                              ? "bg-green-500/15 text-green-400 border-green-500/30"
                              : entry.status === "EDITED"
                                ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                                : "bg-muted text-muted-foreground border-muted";
                          return (
                            <Card key={entry.id} className="transition-all duration-150 hover:bg-muted/40">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0 space-y-1.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-sm font-semibold text-foreground">
                                        History #{entry.id}
                                      </span>
                                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColor}`}>
                                        {entry.status}
                                      </Badge>
                                      {entry.feedbackScore && (
                                        <div className="flex items-center gap-0.5">
                                          {Array.from({ length: entry.feedbackScore }).map((_, i) => (
                                            <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      Source: {entry.sourceDocumentName ?? `Document #${entry.sourceDocumentId ?? "N/A"}`}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "—"}
                                    </p>
                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                      {entry.generatedContent?.substring(0, 120)}...
                                    </p>
                                  </div>
                                  <div className="flex flex-col gap-1.5 shrink-0">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-xs gap-1"
                                      onClick={() => {
                                        setGeneratedContent(entry.generatedContent);
                                        setGeneratedHistoryId(entry.id);
                                        setActiveTab("proposals");
                                      }}
                                    >
                                      <FileText className="w-3 h-3" />
                                      View
                                    </Button>
                                    {entry.status !== "FINALIZED" && (
                                      <Button
                                        size="sm"
                                        className="h-7 text-xs gap-1 bg-amber-600 hover:bg-amber-700 text-white"
                                        onClick={() => feedbackMutation.mutate({ historyId: entry.id })}
                                        disabled={feedbackMutation.isPending}
                                      >
                                        <BookOpen className="w-3 h-3" />
                                        反馈至知识炼金炉
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>{stats.documentCount} document{stats.documentCount !== 1 ? "s" : ""}</span>
          <Separator orientation="vertical" className="h-3" />
          <span>{stats.proposalCount} proposal{stats.proposalCount !== 1 ? "s" : ""}</span>
          <Separator orientation="vertical" className="h-3" />
          <span>{stats.committedCount} committed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5" />
          <span>AI Genesis Engine</span>
        </div>
      </div>
    </div>
  );
}
