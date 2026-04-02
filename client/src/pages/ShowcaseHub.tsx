/**
 * ShowcaseHub -- GRT 展示中枢
 *
 * Internal admin page for CTO/CEO to manage all showcase operations:
 * Templates, Content CMS, Guest Links, Equipment Health, Support Tickets, Loyalty.
 */
import { useState, FormEvent, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  LayoutDashboard,
  FileText,
  Link2,
  Wrench,
  TicketCheck,
  Star,
  Plus,
  Copy,
  Trash2,
  Eye,
  ExternalLink,
  Activity,
  Users,
  Trophy,
  Gift,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Presentation,
  ChevronDown,
} from "lucide-react";

// ── Helpers ──

function StatCard({
  title,
  value,
  icon: Icon,
  color = "text-primary",
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`rounded-lg p-2 bg-muted ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const BLOCK_TYPES = [
  "roadmap",
  "patent",
  "case_study",
  "exhibit_detail",
  "esg_metric",
  "delivery_center",
  "tech_highlight",
  "video_testimonial",
  "equipment_card",
] as const;

const WATERMARK_LEVELS = ["none", "light", "heavy", "confidential"] as const;
const LANGUAGES = ["zh", "en", "de", "fr"] as const;
const RECIPIENT_ROLES = ["ceo", "cto", "cfo", "purchasing", "engineer"] as const;
const ACCESS_LEVELS = ["standard", "vvip", "exhibit_scan", "content_gated"] as const;

const TICKET_STATUS_COLORS: Record<string, string> = {
  open: "bg-red-100 text-red-800",
  ai_responded: "bg-blue-100 text-blue-800",
  assigned: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-amber-100 text-amber-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
};

const TIER_COLORS: Record<string, string> = {
  bronze: "bg-orange-100 text-orange-800",
  silver: "bg-gray-200 text-gray-700",
  gold: "bg-yellow-100 text-yellow-800",
  platinum: "bg-cyan-100 text-cyan-800",
  diamond: "bg-violet-100 text-violet-800",
};

// ── Tab 1: Overview ──

function OverviewTab() {
  const { t } = useLanguage();
  const templates = trpc.targetedShowcase.template.list.useQuery();
  const analytics = trpc.targetedShowcase.guestLink.getAnalytics.useQuery();
  const ticketStats = trpc.targetedShowcase.supportTicket.getStats.useQuery();
  const equipDash = trpc.targetedShowcase.equipmentHealth.healthDashboard.useQuery();
  const loyaltyDash = trpc.targetedShowcase.loyalty.getDashboard.useQuery();

  const totalReferrals = loyaltyDash.data?.totalReferrals ?? 0;
  const convertedReferrals = loyaltyDash.data?.convertedReferrals ?? 0;
  const conversionRate =
    totalReferrals > 0 ? ((convertedReferrals / totalReferrals) * 100).toFixed(1) : "0";

  const quickLinks = [
    { label: t("showcase.hub.companyVdo"), path: "/showcase/company-intro", downloadPath: "/conference-assets/company-intro-presentation.pptx" },
    { label: t("showcase.hub.grts3Demo"), path: "/grts3-demo" },
    { label: t("showcase.hub.supplierRfp"), path: "/guest/showcase/f2cd0d633fdd927c4cdb87065f34eec27216c7af7df03b4c5db9f6a4dfcb6afc" },
    { label: t("showcase.hub.newEnergyShowcase"), path: "/showcase/new-energy" },
    { label: "Expo Kiosk", path: "/expo-kiosk" },
    { label: "Excellence Showcase", path: "/excellence-showcase" },
    { label: "Showroom", path: "/showroom" },
  ];

  const conferenceOptions = [
    { value: "gear-shaft", label: "齿轴行业大会", labelEn: "Gear Shaft Conference" },
    { value: "aluminum-casting", label: "铝铸件行业大会", labelEn: "Aluminum Casting Conference" },
    { value: "engine-block", label: "发动机缸体大会", labelEn: "Engine Block Conference" },
    { value: "injection-system", label: "喷射系统大会", labelEn: "Injection System Conference" },
  ];

  const vipClientOptions = [
    { slug: "meilixin-vip", label: "美利信集团", labelEn: "Meilixin Group", color: "#F59E0B" },
    { slug: "xusheng-vip", label: "旭升集团", labelEn: "Xusheng Group", color: "#06B6D4" },
    { slug: "ikd-vip", label: "爱柯迪集团", labelEn: "IKD Group", color: "#8B5CF6" },
  ];
  const [vipOpen, setVipOpen] = useState(false);

  const [confOpen, setConfOpen] = useState(false);
  const launchConference = useCallback((slug: string) => {
    window.open(`/conference/${slug}`, "_blank");
    setConfOpen(false);
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Templates"
          value={templates.data?.total ?? 0}
          icon={FileText}
          color="text-blue-600"
        />
        <StatCard
          title="Active Guest Links"
          value={analytics.data?.activeLinks ?? 0}
          icon={Link2}
          color="text-green-600"
        />
        <StatCard
          title="Total Views"
          value={analytics.data?.totalViews ?? 0}
          icon={Eye}
          color="text-purple-600"
        />
        <StatCard
          title="Open Tickets"
          value={ticketStats.data?.open ?? 0}
          icon={TicketCheck}
          color="text-red-600"
        />
        <StatCard
          title="Equipment Monitored"
          value={equipDash.data?.total ?? 0}
          icon={Wrench}
          color="text-amber-600"
        />
        <StatCard
          title="Loyalty Members"
          value={loyaltyDash.data?.totalAccounts ?? 0}
          icon={Users}
          color="text-cyan-600"
        />
        <StatCard
          title="Total Referrals"
          value={totalReferrals}
          icon={Trophy}
          color="text-orange-600"
        />
        <StatCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          icon={Activity}
          color="text-emerald-600"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Launch</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {quickLinks.map((link: any) => (
            <div key={link.path} className="flex items-center gap-1">
              <Button
                variant="outline"
                onClick={() => window.open(link.path, "_blank")}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                {link.label}
              </Button>
              {link.downloadPath && (
                <a href={link.downloadPath} download title="下载资料"
                  className="p-2 rounded-md border hover:bg-muted transition-colors">
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </a>
              )}
            </div>
          ))}

          {/* ── VIP Client Portal Launcher ── */}
          <div className="relative">
            <Button
              variant="default"
              className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white"
              onClick={() => setVipOpen((v) => !v)}
            >
              <Star className="mr-2 h-4 w-4" />
              VIP客户专属门户
              <ChevronDown className={`ml-2 h-3 w-3 transition-transform ${vipOpen ? "rotate-180" : ""}`} />
            </Button>
            {vipOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 w-64 rounded-md border bg-popover p-1 shadow-md">
                {vipClientOptions.map((opt) => (
                  <button
                    key={opt.slug}
                    className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                    onClick={() => { window.open(`/client-portal/${opt.slug}`, "_blank"); setVipOpen(false); }}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: opt.color }} />
                    <span className="font-medium">{opt.label}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{opt.labelEn}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Industry Conference Launcher ── */}
          <div className="relative">
            <Button
              variant="default"
              className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
              onClick={() => setConfOpen((v) => !v)}
            >
              <Presentation className="mr-2 h-4 w-4" />
              行业大会演讲
              <ChevronDown className={`ml-2 h-3 w-3 transition-transform ${confOpen ? "rotate-180" : ""}`} />
            </Button>
            {confOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 w-56 rounded-md border bg-popover p-1 shadow-md">
                {conferenceOptions.map((opt) => (
                  <div key={opt.value} className="flex w-full items-center gap-1">
                    <button
                      className="flex flex-1 items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                      onClick={() => launchConference(opt.value)}
                    >
                      <Presentation className="h-3.5 w-3.5 text-amber-600" />
                      <span>{opt.label}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground">{opt.labelEn}</span>
                    </button>
                    <a href={`/conference-assets/${opt.value}-presentation.pptx`}
                      download className="p-1.5 rounded hover:bg-muted" title="下载PPTX">
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 供应链降本场景 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            {t("showcase.hub.scenariosTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {/* 场景1: 设备测试结果 */}
            <div className="border rounded-lg p-4 bg-gradient-to-br from-red-50 to-orange-50">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-red-500" />
                <span className="text-sm font-bold text-red-700">{t("showcase.hub.scenario1Title")}</span>
              </div>
              <p className="text-xs text-gray-600 mb-2">{t("showcase.hub.scenario1Desc")}</p>
              <div className="p-2 bg-white rounded border text-xs text-gray-500 italic mb-3">
                {t("showcase.hub.scenario1Quote")}
              </div>
              <div className="text-[10px] text-red-600 font-semibold mb-2">{t("showcase.hub.scenario1Logic")}</div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => window.open("/showcase-hub", "_self")}>
                  {t("showcase.hub.equipHealthTab")}
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => window.open("/grts3-demo/cto", "_blank")}>
                  {t("showcase.hub.ctoDemo")}
                </Button>
              </div>
            </div>

            {/* 场景4: 供应商大会 */}
            <div className="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-bold text-blue-700">{t("showcase.hub.scenario4Title")}</span>
              </div>
              <p className="text-xs text-gray-600 mb-2">{t("showcase.hub.scenario4Desc")}</p>
              <div className="p-2 bg-white rounded border text-xs text-gray-500 italic mb-3">
                {t("showcase.hub.scenario4Quote")}
              </div>
              <div className="text-[10px] text-blue-600 font-semibold mb-2">{t("showcase.hub.scenario4Logic")}</div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => window.open("/showcase/new-energy", "_blank")}>
                  {t("showcase.hub.supplierShowcase")}
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => window.open("/grts3-demo/commercial", "_blank")}>
                  {t("showcase.hub.commercialDemo")}
                </Button>
              </div>
            </div>

            {/* 场景7: 潜在供应商互动 */}
            <div className="border rounded-lg p-4 bg-gradient-to-br from-green-50 to-emerald-50">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="h-4 w-4 text-green-500" />
                <span className="text-sm font-bold text-green-700">{t("showcase.hub.scenario7Title")}</span>
              </div>
              <p className="text-xs text-gray-600 mb-2">{t("showcase.hub.scenario7Desc")}</p>
              <div className="p-2 bg-white rounded border text-xs text-gray-500 italic mb-3">
                {t("showcase.hub.scenario7Quote")}
              </div>
              <div className="text-[10px] text-green-600 font-semibold mb-2">{t("showcase.hub.scenario7Logic")}</div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => window.open("/showroom", "_blank")}>
                  Showroom
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => window.open("/expo-kiosk", "_blank")}>
                  {t("showcase.hub.expoScreen")}
                </Button>
              </div>
            </div>
          </div>

          {/* 降本闭环流程 */}
          <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg">
            <div className="text-xs font-bold text-amber-700 mb-2">{t("showcase.hub.costLoop")}</div>
            <div className="flex items-center gap-2 text-[11px] text-amber-600 flex-wrap">
              <span className="px-2 py-1 bg-white rounded border">{t("showcase.hub.costStep1")}</span>
              <span>→</span>
              <span className="px-2 py-1 bg-white rounded border">{t("showcase.hub.costStep2")}</span>
              <span>→</span>
              <span className="px-2 py-1 bg-white rounded border">{t("showcase.hub.costStep3")}</span>
              <span>→</span>
              <span className="px-2 py-1 bg-white rounded border">{t("showcase.hub.costStep4")}</span>
              <span>→</span>
              <span className="px-2 py-1 bg-white rounded border font-bold">{t("showcase.hub.costStep5")}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tab 2: Content CMS ──

function ContentCmsTab() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const blocksQuery = trpc.targetedShowcase.contentBlock.list.useQuery();
  const createMut = trpc.targetedShowcase.contentBlock.create.useMutation();
  const publishMut = trpc.targetedShowcase.contentBlock.publish.useMutation();
  const unpublishMut = trpc.targetedShowcase.contentBlock.unpublish.useMutation();
  const duplicateMut = trpc.targetedShowcase.contentBlock.duplicate.useMutation();
  const deleteMut = trpc.targetedShowcase.contentBlock.delete.useMutation();

  const [form, setForm] = useState({
    blockType: "tech_highlight",
    title: "",
    subtitle: "",
    language: "zh",
    tags: "",
    industryScope: "",
    watermarkLevel: "none",
    sortOrder: 0,
    expiryDate: "",
  });

  function resetForm() {
    setForm({
      blockType: "tech_highlight",
      title: "",
      subtitle: "",
      language: "zh",
      tags: "",
      industryScope: "",
      watermarkLevel: "none",
      sortOrder: 0,
      expiryDate: "",
    });
  }

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    createMut.mutate(
      {
        blockType: form.blockType,
        title: form.title,
        subtitle: form.subtitle || undefined,
        language: form.language,
        tags: form.tags ? form.tags.split(",").map((s) => s.trim()).filter(Boolean) : [],
        industryScope: form.industryScope
          ? form.industryScope.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        watermarkLevel: form.watermarkLevel,
        sortOrder: form.sortOrder,
        expiryDate: form.expiryDate || undefined,
      },
      {
        onSuccess: () => {
          toast({ title: "Content block created" });
          setDialogOpen(false);
          resetForm();
          blocksQuery.refetch();
        },
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      },
    );
  }

  function handleTogglePublish(id: number, isPublished: boolean) {
    const mut = isPublished ? unpublishMut : publishMut;
    mut.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: isPublished ? "Unpublished" : "Published" });
          blocksQuery.refetch();
        },
      },
    );
  }

  function handleDuplicate(id: number) {
    duplicateMut.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Block duplicated" });
          blocksQuery.refetch();
        },
      },
    );
  }

  function handleDelete(id: number) {
    deleteMut.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Block deleted" });
          blocksQuery.refetch();
        },
      },
    );
  }

  const blocks = blocksQuery.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Content Blocks ({blocksQuery.data?.total ?? 0})</h3>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Block
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Published</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Ver</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {blocks.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium max-w-[200px] truncate">{b.title}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{b.blockType}</Badge>
                </TableCell>
                <TableCell>{b.language}</TableCell>
                <TableCell className="max-w-[120px] truncate">
                  {Array.isArray(b.tags) ? (b.tags as string[]).join(", ") : ""}
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full ${
                      b.isPublished ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                </TableCell>
                <TableCell className="text-xs">
                  {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : "--"}
                </TableCell>
                <TableCell>{b.version ?? 1}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleTogglePublish(b.id, !!b.isPublished)}
                  >
                    {b.isPublished ? "Unpublish" : "Publish"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDuplicate(b.id)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(b.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {blocks.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No content blocks yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Content Block</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Block Type</Label>
              <Select value={form.blockType} onValueChange={(v) => setForm({ ...form, blockType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BLOCK_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Subtitle</Label>
              <Input
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l} value={l}>{l.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Watermark</Label>
                <Select
                  value={form.watermarkLevel}
                  onValueChange={(v) => setForm({ ...form, watermarkLevel: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WATERMARK_LEVELS.map((w) => (
                      <SelectItem key={w} value={w}>{w}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="gear, precision, automotive"
              />
            </div>
            <div className="space-y-2">
              <Label>Industry Scope (comma-separated)</Label>
              <Input
                value={form.industryScope}
                onChange={(e) => setForm({ ...form, industryScope: e.target.value })}
                placeholder="gear-shaft, die-casting, new-energy"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending ? "Creating..." : "Create Block"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Tab 3: Guest Links ──

function GuestLinksTab() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const analyticsQuery = trpc.targetedShowcase.guestLink.getAnalytics.useQuery();
  const linksQuery = trpc.targetedShowcase.guestLink.listAuthorizations.useQuery();
  const templatesQuery = trpc.targetedShowcase.template.list.useQuery();
  const generateMut = trpc.targetedShowcase.guestLink.generateGuestLink.useMutation();
  const revokeMut = trpc.targetedShowcase.guestLink.revokeLink.useMutation();

  const [form, setForm] = useState({
    showcaseId: 0,
    targetClient: "",
    contactPerson: "",
    contactEmail: "",
    recipientRole: "cto",
    accessLevel: "standard",
    expiresInHours: 48,
    maxViews: 100,
    welcomeMessage: "",
  });

  function handleGenerate(e: FormEvent) {
    e.preventDefault();
    generateMut.mutate(
      {
        showcaseId: form.showcaseId,
        targetClient: form.targetClient,
        contactPerson: form.contactPerson || undefined,
        contactEmail: form.contactEmail || undefined,
        welcomeMessage: form.welcomeMessage || undefined,
        expiresInHours: form.expiresInHours,
        maxViews: form.maxViews,
      },
      {
        onSuccess: (data) => {
          const fullUrl = `${window.location.origin}${data.guestUrl}`;
          setGeneratedUrl(fullUrl);
          toast({ title: "Guest link generated" });
          linksQuery.refetch();
          analyticsQuery.refetch();
        },
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      },
    );
  }

  function handleRevoke(id: number) {
    revokeMut.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Link revoked" });
          linksQuery.refetch();
          analyticsQuery.refetch();
        },
      },
    );
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  }

  const links = linksQuery.data?.items ?? [];
  const a = analyticsQuery.data;
  const templates = templatesQuery.data?.items ?? [];

  function getLinkStatus(link: { isRevoked?: boolean | null; expiresAt?: string | null }): string {
    if (link.isRevoked) return "revoked";
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) return "expired";
    return "active";
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Total Links" value={a?.totalLinks ?? 0} icon={Link2} color="text-blue-600" />
        <StatCard title="Active Links" value={a?.activeLinks ?? 0} icon={CheckCircle2} color="text-green-600" />
        <StatCard title="Total Views" value={a?.totalViews ?? 0} icon={Eye} color="text-purple-600" />
      </div>

      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Guest Authorizations ({linksQuery.data?.total ?? 0})</h3>
        <Button onClick={() => { setDialogOpen(true); setGeneratedUrl(null); }}>
          <Plus className="mr-2 h-4 w-4" />
          Generate V-VIP Link
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Access</TableHead>
              <TableHead>Token</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {links.map((link) => {
              const status = getLinkStatus(link);
              return (
                <TableRow key={link.id}>
                  <TableCell className="font-medium">{link.targetClient}</TableCell>
                  <TableCell>{link.recipientRole ?? "--"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{link.accessLevel ?? "standard"}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{link.tokenPreview}</TableCell>
                  <TableCell>{link.viewCount}</TableCell>
                  <TableCell className="text-xs">
                    {link.expiresAt ? new Date(link.expiresAt).toLocaleString() : "--"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={status === "active" ? "default" : "secondary"}
                      className={
                        status === "active"
                          ? "bg-green-100 text-green-800"
                          : status === "expired"
                            ? "bg-gray-100 text-gray-600"
                            : "bg-red-100 text-red-800"
                      }
                    >
                      {status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {status === "active" && (
                      <Button size="sm" variant="ghost" onClick={() => handleRevoke(link.id)}>
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {links.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No guest links yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate V-VIP Guest Link</DialogTitle>
          </DialogHeader>
          {generatedUrl ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Link generated successfully:</p>
              <div className="flex items-center gap-2">
                <Input readOnly value={generatedUrl} className="font-mono text-xs" />
                <Button size="sm" variant="outline" onClick={() => copyToClipboard(generatedUrl)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="space-y-2">
                <Label>Template</Label>
                <Select
                  value={form.showcaseId ? String(form.showcaseId) : ""}
                  onValueChange={(v) => setForm({ ...form, showcaseId: Number(v) })}
                >
                  <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.title} ({t.productType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target Client</Label>
                <Input
                  required
                  value={form.targetClient}
                  onChange={(e) => setForm({ ...form, targetClient: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Person</Label>
                  <Input
                    value={form.contactPerson}
                    onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>联系邮箱</Label>
                  <Input
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Recipient Role</Label>
                  <Select
                    value={form.recipientRole}
                    onValueChange={(v) => setForm({ ...form, recipientRole: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RECIPIENT_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>{r.toUpperCase()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Access Level</Label>
                  <Select
                    value={form.accessLevel}
                    onValueChange={(v) => setForm({ ...form, accessLevel: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACCESS_LEVELS.map((l) => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Expires In (hours)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={720}
                    value={form.expiresInHours}
                    onChange={(e) => setForm({ ...form, expiresInHours: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Views</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10000}
                    value={form.maxViews}
                    onChange={(e) => setForm({ ...form, maxViews: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Welcome Message</Label>
                <Input
                  value={form.welcomeMessage}
                  onChange={(e) => setForm({ ...form, welcomeMessage: e.target.value })}
                  placeholder="Personalized welcome message for the guest"
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={generateMut.isPending || !form.showcaseId}>
                  {generateMut.isPending ? "Generating..." : "Generate Link"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Tab 4: Equipment Health ──

function EquipmentHealthTab() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const dashboard = trpc.targetedShowcase.equipmentHealth.healthDashboard.useQuery();
  const createSnap = trpc.targetedShowcase.equipmentHealth.createSnapshot.useMutation();

  const [form, setForm] = useState({
    equipmentCode: "",
    equipmentName: "",
    healthScore: 85,
    healthStatus: "normal",
    lastTestDate: "",
    operatingHours: 0,
  });

  function handleCreateSnapshot(e: FormEvent) {
    e.preventDefault();
    createSnap.mutate(
      {
        equipmentCode: form.equipmentCode,
        equipmentName: form.equipmentName,
        healthScore: form.healthScore,
        healthStatus: form.healthStatus,
        lastTestDate: form.lastTestDate || undefined,
        operatingHours: form.operatingHours || undefined,
      },
      {
        onSuccess: () => {
          toast({ title: "Health snapshot created" });
          setDialogOpen(false);
          dashboard.refetch();
        },
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      },
    );
  }

  const d = dashboard.data;
  const snapshots = d?.snapshots ?? [];

  function scoreColor(score: number): string {
    if (score > 80) return "text-green-600";
    if (score > 60) return "text-yellow-600";
    return "text-red-600";
  }

  function scoreBg(score: number): string {
    if (score > 80) return "bg-green-100";
    if (score > 60) return "bg-yellow-100";
    return "bg-red-100";
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Equipment" value={d?.total ?? 0} icon={Wrench} color="text-blue-600" />
        <StatCard
          title="Avg Health Score"
          value={d?.avgScore ?? 0}
          icon={Activity}
          color="text-green-600"
        />
        <StatCard
          title="Warning"
          value={d?.warning ?? 0}
          icon={AlertTriangle}
          color="text-yellow-600"
        />
        <StatCard
          title="Critical"
          value={d?.critical ?? 0}
          icon={XCircle}
          color="text-red-600"
        />
      </div>

      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Equipment ({d?.total ?? 0})</h3>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Snapshot
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {snapshots.map((eq) => (
          <Card key={eq.id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{eq.equipmentName}</p>
                  <p className="text-xs text-muted-foreground font-mono">{eq.equipmentCode}</p>
                </div>
                <Badge variant="outline" className={eq.healthStatus === "normal" ? "" : "border-red-300"}>
                  {eq.healthStatus}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className={`text-2xl font-bold ${scoreColor(eq.healthScore)} ${scoreBg(eq.healthScore)} px-3 py-1 rounded-lg`}
                >
                  {eq.healthScore}
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    Last Test:{" "}
                    {eq.lastTestDate ? new Date(eq.lastTestDate).toLocaleDateString() : "--"}
                  </p>
                  <p>Operating Hours: {eq.operatingHours ?? "--"}</p>
                </div>
              </div>
              {!!(eq.maintenancePrediction &&
                typeof eq.maintenancePrediction === "object" &&
                Object.keys(eq.maintenancePrediction as Record<string, unknown>).length > 0) && (
                  <div className="text-xs bg-muted/50 rounded p-2">
                    <p className="font-medium mb-1">Maintenance Prediction:</p>
                    {Object.entries(eq.maintenancePrediction as Record<string, unknown>)
                      .slice(0, 3)
                      .map(([k, v]) => (
                        <p key={k}>
                          {k}: {String(v)}
                        </p>
                      ))}
                  </div>
                )}
            </CardContent>
          </Card>
        ))}
        {snapshots.length === 0 && (
          <div className="col-span-3 text-center text-muted-foreground py-12">
            No equipment health data yet.
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Equipment Health Snapshot</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSnapshot} className="space-y-4">
            <div className="space-y-2">
              <Label>Equipment Code</Label>
              <Input
                required
                value={form.equipmentCode}
                onChange={(e) => setForm({ ...form, equipmentCode: e.target.value })}
                placeholder="EQ-001"
              />
            </div>
            <div className="space-y-2">
              <Label>Equipment Name</Label>
              <Input
                required
                value={form.equipmentName}
                onChange={(e) => setForm({ ...form, equipmentName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Health Score (0-100)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.healthScore}
                  onChange={(e) => setForm({ ...form, healthScore: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.healthStatus}
                  onValueChange={(v) => setForm({ ...form, healthStatus: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Last Test Date</Label>
                <Input
                  type="date"
                  value={form.lastTestDate}
                  onChange={(e) => setForm({ ...form, lastTestDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Operating Hours</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.operatingHours}
                  onChange={(e) => setForm({ ...form, operatingHours: Number(e.target.value) })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createSnap.isPending}>
                {createSnap.isPending ? "Saving..." : "Create Snapshot"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Tab 5: Support Tickets ──

function SupportTicketsTab() {
  const { toast } = useToast();
  const statsQuery = trpc.targetedShowcase.supportTicket.getStats.useQuery();
  const ticketsQuery = trpc.targetedShowcase.supportTicket.list.useQuery();
  const assignMut = trpc.targetedShowcase.supportTicket.assign.useMutation();
  const updateStatusMut = trpc.targetedShowcase.supportTicket.updateStatus.useMutation();

  const [statusDialog, setStatusDialog] = useState<{ open: boolean; ticketId: number }>({
    open: false,
    ticketId: 0,
  });
  const [newStatus, setNewStatus] = useState("in_progress");
  const [resolution, setResolution] = useState("");

  const s = statsQuery.data;
  const tickets = ticketsQuery.data?.items ?? [];

  function handleUpdateStatus(e: FormEvent) {
    e.preventDefault();
    updateStatusMut.mutate(
      {
        id: statusDialog.ticketId,
        status: newStatus,
        resolution: resolution || undefined,
      },
      {
        onSuccess: () => {
          toast({ title: "Status updated" });
          setStatusDialog({ open: false, ticketId: 0 });
          setResolution("");
          ticketsQuery.refetch();
          statsQuery.refetch();
        },
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Tickets" value={s?.total ?? 0} icon={TicketCheck} color="text-blue-600" />
        <StatCard title="Open" value={s?.open ?? 0} icon={AlertTriangle} color="text-red-600" />
        <StatCard title="Resolved" value={s?.resolved ?? 0} icon={CheckCircle2} color="text-green-600" />
        <StatCard
          title="Avg Satisfaction"
          value={s?.avgSatisfaction ?? 0}
          icon={Star}
          color="text-amber-600"
        />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Guest</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-mono text-xs">{t.ticketCode}</TableCell>
                <TableCell className="max-w-[180px] truncate font-medium">{t.subject}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{t.issueType}</Badge>
                </TableCell>
                <TableCell>
                  <Badge className={TICKET_STATUS_COLORS[t.status ?? "open"] ?? ""}>
                    {t.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{t.companyName ?? "--"}</TableCell>
                <TableCell className="text-sm">{t.guestName ?? "--"}</TableCell>
                <TableCell className="text-xs">
                  {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "--"}
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setStatusDialog({ open: true, ticketId: t.id });
                      setNewStatus(t.status === "open" ? "in_progress" : "resolved");
                    }}
                  >
                    <Clock className="h-3.5 w-3.5 mr-1" />
                    Status
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {tickets.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No support tickets yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={statusDialog.open} onOpenChange={(o) => setStatusDialog({ ...statusDialog, open: o })}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Ticket Status</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateStatus} className="space-y-4">
            <div className="space-y-2">
              <Label>New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(TICKET_STATUS_COLORS).map((st) => (
                    <SelectItem key={st} value={st}>{st}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Resolution (optional)</Label>
              <Input
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Describe the resolution"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updateStatusMut.isPending}>
                {updateStatusMut.isPending ? "Updating..." : "Update"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Tab 6: Loyalty & Incentives ──

function LoyaltyTab() {
  const { toast } = useToast();
  const [accountDialog, setAccountDialog] = useState(false);
  const [awardDialog, setAwardDialog] = useState(false);
  const dashQuery = trpc.targetedShowcase.loyalty.getDashboard.useQuery();
  const rewardsQuery = trpc.targetedShowcase.loyalty.listRewards.useQuery();
  const createAccMut = trpc.targetedShowcase.loyalty.createAccount.useMutation();
  const earnMut = trpc.targetedShowcase.loyalty.earnPoints.useMutation();

  const [accForm, setAccForm] = useState({
    customerCode: "",
    customerName: "",
    contactName: "",
    contactEmail: "",
    companyName: "",
  });

  const [awardForm, setAwardForm] = useState({
    customerCode: "",
    sourceType: "showcase_visit",
    customPoints: "",
    description: "",
  });

  const d = dashQuery.data;
  const tierDist = d?.tierDistribution ?? [];
  const topContributors = d?.topContributors ?? [];
  const totalReferrals = d?.totalReferrals ?? 0;
  const convertedReferrals = d?.convertedReferrals ?? 0;
  const conversionRate =
    totalReferrals > 0 ? ((convertedReferrals / totalReferrals) * 100).toFixed(1) : "0";
  const rewards = rewardsQuery.data ?? [];

  const TIERS_ORDER = ["bronze", "silver", "gold", "platinum", "diamond"];

  function handleCreateAccount(e: FormEvent) {
    e.preventDefault();
    createAccMut.mutate(
      {
        customerCode: accForm.customerCode,
        customerName: accForm.customerName,
        contactName: accForm.contactName || undefined,
        contactEmail: accForm.contactEmail || undefined,
        companyName: accForm.companyName || undefined,
      },
      {
        onSuccess: () => {
          toast({ title: "会员账户创建成功" });
          setAccountDialog(false);
          setAccForm({ customerCode: "", customerName: "", contactName: "", contactEmail: "", companyName: "" });
          dashQuery.refetch();
        },
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      },
    );
  }

  function handleAwardPoints(e: FormEvent) {
    e.preventDefault();
    earnMut.mutate(
      {
        customerCode: awardForm.customerCode,
        sourceType: awardForm.sourceType,
        customPoints: awardForm.customPoints ? Number(awardForm.customPoints) : undefined,
        description: awardForm.description || undefined,
      },
      {
        onSuccess: (res) => {
          toast({ title: `已发放 ${res.points} 积分（余额: ${res.balanceAfter}）` });
          setAwardDialog(false);
          setAwardForm({ customerCode: "", sourceType: "showcase_visit", customPoints: "", description: "" });
          dashQuery.refetch();
        },
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      },
    );
  }

  const SOURCE_TYPES: Array<{ value: string; label: string }> = [
    { value: "showcase_visit", label: "访问展厅 (5分)" },
    { value: "content_download", label: "下载技术资料 (20分)" },
    { value: "video_watch", label: "观看演示视频 (10分)" },
    { value: "referral_signup", label: "推荐新客户注册 (100分)" },
    { value: "tech_feedback", label: "提交技术反馈 (50分)" },
    { value: "community_post", label: "社群发帖 (15分)" },
    { value: "community_answer", label: "解答技术问题 (30分)" },
    { value: "ticket_resolved", label: "协助问题解决 (25分)" },
    { value: "event_checkin", label: "展会签到 (30分)" },
    { value: "survey_complete", label: "完成满意度调查 (40分)" },
    { value: "expert_booking", label: "预约专家咨询 (20分)" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="会员总数"
          value={d?.totalAccounts ?? 0}
          icon={Users}
          color="text-blue-600"
        />
        <StatCard
          title="流通积分"
          value={d?.totalPointsCirculating ?? 0}
          icon={Star}
          color="text-amber-600"
        />
        <StatCard
          title="推荐总数"
          value={totalReferrals}
          icon={Trophy}
          color="text-orange-600"
        />
        <StatCard
          title="转化率"
          value={`${conversionRate}%`}
          icon={Activity}
          color="text-emerald-600"
        />
      </div>

      {/* Tier Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">等级分布</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            {TIERS_ORDER.map((tier) => {
              const entry = tierDist.find((t) => t.tier === tier);
              const cnt = entry?.count ?? 0;
              return (
                <div key={tier} className="flex items-center gap-2">
                  <Badge className={TIER_COLORS[tier] ?? ""}>{tier}</Badge>
                  <span className="text-sm font-semibold">{cnt}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={() => setAccountDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          创建会员账户
        </Button>
        <Button variant="outline" onClick={() => setAwardDialog(true)}>
          <Star className="mr-2 h-4 w-4" />
          积分奖励
        </Button>
      </div>

      {/* Top Contributors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">积分排行榜 Top 10</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>客户名称</TableHead>
                <TableHead>公司</TableHead>
                <TableHead>等级</TableHead>
                <TableHead>积分</TableHead>
                <TableHead>推荐数</TableHead>
                <TableHead>技术贡献</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topContributors.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.customerName}</TableCell>
                  <TableCell>{c.companyName ?? "--"}</TableCell>
                  <TableCell>
                    <Badge className={TIER_COLORS[c.tier] ?? ""}>{c.tier}</Badge>
                  </TableCell>
                  <TableCell>{c.tierPoints}</TableCell>
                  <TableCell>{c.referralCount}</TableCell>
                  <TableCell>{c.techContributionCount}</TableCell>
                </TableRow>
              ))}
              {topContributors.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                    暂无会员数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Rewards Catalog */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">积分兑换目录</CardTitle>
        </CardHeader>
        <CardContent>
          {rewards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rewards.map((r) => (
                <Card key={r.id} className="border">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{r.name}</p>
                        {r.nameEn && <p className="text-xs text-muted-foreground">{r.nameEn}</p>}
                      </div>
                      <Badge variant="secondary">{r.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{r.description ?? "--"}</p>
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-bold text-amber-600">
                        <Gift className="inline h-3.5 w-3.5 mr-1" />
                        {r.pointsCost} pts
                      </span>
                      <Badge className={TIER_COLORS[r.minTier ?? "bronze"] ?? ""}>
                        {r.minTier ?? "bronze"}+
                      </Badge>
                    </div>
                    {r.stockQuantity != null && (
                      <p className="text-xs text-muted-foreground">
                        Stock: {r.stockQuantity - r.redeemedCount}/{r.stockQuantity}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-6">暂无积分兑换奖励</p>
          )}
        </CardContent>
      </Card>

      {/* Create Account Dialog */}
      <Dialog open={accountDialog} onOpenChange={setAccountDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>创建忠诚会员账户</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div className="space-y-2">
              <Label>客户编码</Label>
              <Input
                required
                value={accForm.customerCode}
                onChange={(e) => setAccForm({ ...accForm, customerCode: e.target.value })}
                placeholder="CUST-001"
              />
            </div>
            <div className="space-y-2">
              <Label>客户名称</Label>
              <Input
                required
                value={accForm.customerName}
                onChange={(e) => setAccForm({ ...accForm, customerName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>联系人</Label>
              <Input
                value={accForm.contactName}
                onChange={(e) => setAccForm({ ...accForm, contactName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>联系邮箱</Label>
              <Input
                type="email"
                value={accForm.contactEmail}
                onChange={(e) => setAccForm({ ...accForm, contactEmail: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>公司名称</Label>
              <Input
                value={accForm.companyName}
                onChange={(e) => setAccForm({ ...accForm, companyName: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createAccMut.isPending}>
                {createAccMut.isPending ? "创建中..." : "创建账户"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Award Points Dialog */}
      <Dialog open={awardDialog} onOpenChange={setAwardDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>积分奖励</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAwardPoints} className="space-y-4">
            <div className="space-y-2">
              <Label>客户编码</Label>
              <Input
                required
                value={awardForm.customerCode}
                onChange={(e) => setAwardForm({ ...awardForm, customerCode: e.target.value })}
                placeholder="CUST-001"
              />
            </div>
            <div className="space-y-2">
              <Label>积分来源</Label>
              <Select
                value={awardForm.sourceType}
                onValueChange={(v) => setAwardForm({ ...awardForm, sourceType: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>自定义积分（可选，覆盖默认值）</Label>
              <Input
                type="number"
                value={awardForm.customPoints}
                onChange={(e) => setAwardForm({ ...awardForm, customPoints: e.target.value })}
                placeholder="留空使用默认积分"
              />
            </div>
            <div className="space-y-2">
              <Label>描述（可选）</Label>
              <Input
                value={awardForm.description}
                onChange={(e) => setAwardForm({ ...awardForm, description: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={earnMut.isPending}>
                {earnMut.isPending ? "发放中..." : "发放积分"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main Page ──

export default function ShowcaseHub() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold">{t("showcase.hub.title")}</h1>
        <p className="text-muted-foreground">
          {t("showcase.hub.subtitle")}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full max-w-3xl">
          <TabsTrigger value="overview" className="gap-1.5">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">{t("showcase.hub.tabOverview")}</span>
          </TabsTrigger>
          <TabsTrigger value="content" className="gap-1.5">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">{t("showcase.hub.tabContent")}</span>
          </TabsTrigger>
          <TabsTrigger value="links" className="gap-1.5">
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t("showcase.hub.tabLinks")}</span>
          </TabsTrigger>
          <TabsTrigger value="equipment" className="gap-1.5">
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">{t("showcase.hub.tabEquipment")}</span>
          </TabsTrigger>
          <TabsTrigger value="tickets" className="gap-1.5">
            <TicketCheck className="h-4 w-4" />
            <span className="hidden sm:inline">{t("showcase.hub.tabTickets")}</span>
          </TabsTrigger>
          <TabsTrigger value="loyalty" className="gap-1.5">
            <Star className="h-4 w-4" />
            <span className="hidden sm:inline">{t("showcase.hub.tabLoyalty")}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="content" className="mt-6">
          <ContentCmsTab />
        </TabsContent>
        <TabsContent value="links" className="mt-6">
          <GuestLinksTab />
        </TabsContent>
        <TabsContent value="equipment" className="mt-6">
          <EquipmentHealthTab />
        </TabsContent>
        <TabsContent value="tickets" className="mt-6">
          <SupportTicketsTab />
        </TabsContent>
        <TabsContent value="loyalty" className="mt-6">
          <LoyaltyTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
