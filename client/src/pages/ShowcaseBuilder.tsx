/**
 * ShowcaseBuilder — 数字展厅组装工作台
 *
 * Internal tool for marketing/planning team to:
 * 1. Create & manage showcase templates (product type, images, videos, specs)
 * 2. Generate time-limited guest links with QR codes
 * 3. Track link analytics (views, active links, expiry)
 */
import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Link2,
  Eye,
  Clock,
  QrCode,
  Copy,
  Trash2,
  Send,
  Image,
  Video,
  BarChart3,
  Shield,
  ExternalLink,
  Ban,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

// ── QR Code Placeholder (renders a styled link box) ──
function QrCodeBox({ url }: { url: string }) {
  const fullUrl = `${window.location.origin}${url}`;
  return (
    <div className="border rounded-lg p-4 bg-muted/50 flex flex-col items-center gap-3">
      <div className="w-32 h-32 bg-white border-2 border-dashed border-muted-foreground/30 rounded flex items-center justify-center">
        <QrCode className="w-16 h-16 text-muted-foreground/40" />
      </div>
      <code className="text-xs break-all text-center max-w-[250px]">{fullUrl}</code>
    </div>
  );
}

// ── Template Form ──
function TemplateForm({
  onSuccess,
  editData,
}: {
  onSuccess: () => void;
  editData?: any;
}) {
  const { toast } = useToast();
  const createMut = trpc.targetedShowcase.template.create.useMutation();
  const updateMut = trpc.targetedShowcase.template.update.useMutation();
  const isEdit = !!editData;

  const [form, setForm] = useState({
    productType: editData?.productType ?? "",
    title: editData?.title ?? "",
    subtitle: editData?.subtitle ?? "",
    description: editData?.description ?? "",
    heroVideoUrl: editData?.heroVideoUrl ?? "",
    taktTimeSeconds: editData?.taktTimeSeconds ?? "",
    cleaningEfficiency: editData?.cleaningEfficiency ?? "",
    cleanlinessStandard: editData?.cleanlinessStandard ?? "",
    throughputPerHour: editData?.throughputPerHour ?? "",
    powerConsumptionKw: editData?.powerConsumptionKw ?? "",
    priceRangeMin: editData?.priceRangeMin ?? "",
    priceRangeMax: editData?.priceRangeMax ?? "",
    priceCurrency: editData?.priceCurrency ?? "EUR",
    roiMonths: editData?.roiMonths ?? "",
  });

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    const payload = {
      productType: form.productType,
      title: form.title,
      subtitle: form.subtitle || undefined,
      description: form.description || undefined,
      heroVideoUrl: form.heroVideoUrl || undefined,
      taktTimeSeconds: form.taktTimeSeconds ? Number(form.taktTimeSeconds) : undefined,
      cleaningEfficiency: form.cleaningEfficiency || undefined,
      cleanlinessStandard: form.cleanlinessStandard || undefined,
      throughputPerHour: form.throughputPerHour ? Number(form.throughputPerHour) : undefined,
      powerConsumptionKw: form.powerConsumptionKw ? Number(form.powerConsumptionKw) : undefined,
      priceRangeMin: form.priceRangeMin ? Number(form.priceRangeMin) : undefined,
      priceRangeMax: form.priceRangeMax ? Number(form.priceRangeMax) : undefined,
      priceCurrency: form.priceCurrency,
      roiMonths: form.roiMonths ? Number(form.roiMonths) : undefined,
    };

    const mutation = isEdit
      ? updateMut.mutateAsync({ id: editData.id, ...payload })
      : createMut.mutateAsync(payload);

    mutation
      .then(() => {
        toast({ title: isEdit ? "Template updated" : "Template created successfully!" });
        onSuccess();
      })
      .catch((err: any) => {
        const msg = err?.message || err?.data?.message || "Unknown error occurred";
        setError(msg);
        toast({ variant: "destructive", title: "Failed to save template", description: msg });
      });
  };

  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 max-h-[55vh] overflow-y-auto pr-2">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Product Type *</Label>
            <Input value={form.productType} onChange={(e) => set("productType", e.target.value)} placeholder="KLT周转箱" />
          </div>
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="KLT Cleaning Solution" />
          </div>
        </div>
        <div>
          <Label>Subtitle</Label>
          <Input value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} placeholder="Advanced ultrasonic cleaning..." />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} />
        </div>
        <div>
          <Label>Hero Video URL</Label>
          <Input value={form.heroVideoUrl} onChange={(e) => set("heroVideoUrl", e.target.value)} placeholder="https://..." />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Takt Time (s)</Label>
            <Input type="number" value={form.taktTimeSeconds} onChange={(e) => set("taktTimeSeconds", e.target.value)} />
          </div>
          <div>
            <Label>Cleaning Efficiency</Label>
            <Input value={form.cleaningEfficiency} onChange={(e) => set("cleaningEfficiency", e.target.value)} placeholder="99.7%" />
          </div>
          <div>
            <Label>Cleanliness Standard</Label>
            <Input value={form.cleanlinessStandard} onChange={(e) => set("cleanlinessStandard", e.target.value)} placeholder="VDA 19.1 / ISO 16232" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Throughput / Hour</Label>
            <Input type="number" value={form.throughputPerHour} onChange={(e) => set("throughputPerHour", e.target.value)} />
          </div>
          <div>
            <Label>Power (kW)</Label>
            <Input type="number" value={form.powerConsumptionKw} onChange={(e) => set("powerConsumptionKw", e.target.value)} />
          </div>
          <div>
            <Label>ROI (months)</Label>
            <Input type="number" value={form.roiMonths} onChange={(e) => set("roiMonths", e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Price Min</Label>
            <Input type="number" value={form.priceRangeMin} onChange={(e) => set("priceRangeMin", e.target.value)} />
          </div>
          <div>
            <Label>Price Max</Label>
            <Input type="number" value={form.priceRangeMax} onChange={(e) => set("priceRangeMax", e.target.value)} />
          </div>
          <div>
            <Label>Currency</Label>
            <Select value={form.priceCurrency} onValueChange={(v) => set("priceCurrency", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="CNY">CNY</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {error && (
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm">
            {error}
          </div>
        )}
      </div>
      <Button type="submit" disabled={createMut.isPending || updateMut.isPending || !form.productType || !form.title} className="w-full">
        {(createMut.isPending || updateMut.isPending) && (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
        )}
        {createMut.isPending ? "Creating..." : updateMut.isPending ? "Updating..." : isEdit ? "Update Template" : "Create Template"}
      </Button>
    </form>
  );
}

// ── Generate Link Dialog ──
function GenerateLinkDialog({ showcaseId, title }: { showcaseId: number; title: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<{ accessToken: string; guestUrl: string; expiresAt: string } | null>(null);
  const [form, setForm] = useState({
    targetClient: "",
    contactPerson: "",
    contactEmail: "",
    welcomeMessage: "",
    expiresInHours: "48",
    maxViews: "100",
  });

  const genMut = trpc.targetedShowcase.guestLink.generateGuestLink.useMutation();

  const handleGenerate = async () => {
    try {
      const res = await genMut.mutateAsync({
        showcaseId,
        targetClient: form.targetClient,
        contactPerson: form.contactPerson || undefined,
        contactEmail: form.contactEmail || undefined,
        welcomeMessage: form.welcomeMessage || undefined,
        expiresInHours: Number(form.expiresInHours),
        maxViews: Number(form.maxViews),
      });
      setResult(res);
      toast({ title: "Guest link generated!" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const copyLink = () => {
    if (result) {
      navigator.clipboard.writeText(`${window.location.origin}${result.guestUrl}`);
      toast({ title: "Link copied to clipboard" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setResult(null); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <Send className="w-3.5 h-3.5" /> Generate Link
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Generate Guest Link — {title}
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="grid gap-3">
            <div>
              <Label>Target Client *</Label>
              <Input value={form.targetClient} onChange={(e) => setForm((p) => ({ ...p, targetClient: e.target.value }))} placeholder="Schaeffler" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Contact Person</Label>
                <Input value={form.contactPerson} onChange={(e) => setForm((p) => ({ ...p, contactPerson: e.target.value }))} />
              </div>
              <div>
                <Label>Contact Email</Label>
                <Input value={form.contactEmail} onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Welcome Message</Label>
              <Textarea value={form.welcomeMessage} onChange={(e) => setForm((p) => ({ ...p, welcomeMessage: e.target.value }))} placeholder="GRT Advanced Cleaning Solution for Schaeffler KLT" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Expires in (hours)</Label>
                <Input type="number" value={form.expiresInHours} onChange={(e) => setForm((p) => ({ ...p, expiresInHours: e.target.value }))} />
              </div>
              <div>
                <Label>Max Views</Label>
                <Input type="number" value={form.maxViews} onChange={(e) => setForm((p) => ({ ...p, maxViews: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleGenerate} disabled={genMut.isPending || !form.targetClient} className="gap-1">
                <Shield className="w-4 h-4" /> Generate Secure Link
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 px-3 py-1">
              Link Generated Successfully
            </Badge>
            <QrCodeBox url={result.guestUrl} />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-1" onClick={copyLink}>
                <Copy className="w-3.5 h-3.5" /> Copy Link
              </Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => window.open(result.guestUrl, "_blank")}>
                <ExternalLink className="w-3.5 h-3.5" /> Preview
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Expires: {new Date(result.expiresAt).toLocaleString()}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ──── Main Page ────

export default function ShowcaseBuilder() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<any>(null);

  const templates = trpc.targetedShowcase.template.list.useQuery({ isActive: true });
  const auths = trpc.targetedShowcase.guestLink.listAuthorizations.useQuery({});
  const analytics = trpc.targetedShowcase.guestLink.getAnalytics.useQuery({});
  const revokeMut = trpc.targetedShowcase.guestLink.revokeLink.useMutation();
  const deleteMut = trpc.targetedShowcase.template.delete.useMutation();

  const handleRevoke = useCallback(async (id: number) => {
    try {
      await revokeMut.mutateAsync({ id });
      toast({ title: "Link revoked" });
      auths.refetch();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  }, [revokeMut, toast, auths]);

  const handleDeleteTemplate = useCallback(async (id: number) => {
    try {
      await deleteMut.mutateAsync({ id });
      toast({ title: "Template archived" });
      templates.refetch();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  }, [deleteMut, toast, templates]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Showcase Builder</h1>
          <p className="text-muted-foreground">定向数字展厅 — Create & manage targeted client showcases</p>
        </div>
        <Dialog open={createOpen || !!editTemplate} onOpenChange={(v) => { if (!v) { setCreateOpen(false); setEditTemplate(null); } }}>
          <DialogTrigger asChild>
            <Button className="gap-1" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4" /> New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editTemplate ? "Edit Template" : "Create Showcase Template"}</DialogTitle>
            </DialogHeader>
            <TemplateForm
              editData={editTemplate}
              onSuccess={() => { setCreateOpen(false); setEditTemplate(null); templates.refetch(); }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600"><Link2 className="w-5 h-5" /></div>
              <div>
                <p className="text-2xl font-bold">{analytics.data?.totalLinks ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total Links</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-600"><Shield className="w-5 h-5" /></div>
              <div>
                <p className="text-2xl font-bold">{analytics.data?.activeLinks ?? 0}</p>
                <p className="text-xs text-muted-foreground">Active Links</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-600"><Eye className="w-5 h-5" /></div>
              <div>
                <p className="text-2xl font-bold">{analytics.data?.totalViews ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total Views</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates" className="gap-1"><Image className="w-4 h-4" /> Templates</TabsTrigger>
          <TabsTrigger value="links" className="gap-1"><Link2 className="w-4 h-4" /> Guest Links</TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          {templates.isLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />)}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {(templates.data?.items ?? []).map((t: any) => (
                <Card key={t.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{t.title}</CardTitle>
                        <CardDescription>{t.subtitle}</CardDescription>
                      </div>
                      <Badge variant="outline">{t.productType}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2 text-sm mb-4">
                      {t.taktTimeSeconds && (
                        <div className="bg-muted/50 rounded p-2 text-center">
                          <span className="block text-lg font-bold">{Number(t.taktTimeSeconds)}s</span>
                          <span className="text-xs text-muted-foreground">Takt Time</span>
                        </div>
                      )}
                      {t.cleaningEfficiency && (
                        <div className="bg-muted/50 rounded p-2 text-center">
                          <span className="block text-lg font-bold">{t.cleaningEfficiency}</span>
                          <span className="text-xs text-muted-foreground">Efficiency</span>
                        </div>
                      )}
                      {t.throughputPerHour && (
                        <div className="bg-muted/50 rounded p-2 text-center">
                          <span className="block text-lg font-bold">{t.throughputPerHour}/h</span>
                          <span className="text-xs text-muted-foreground">Throughput</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {t.heroVideoUrl && <Badge variant="secondary" className="gap-1"><Video className="w-3 h-3" /> Video</Badge>}
                      {t.priceRangeMin && <Badge variant="secondary">{t.priceCurrency} {Number(t.priceRangeMin).toLocaleString()}–{Number(t.priceRangeMax).toLocaleString()}</Badge>}
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <GenerateLinkDialog showcaseId={t.id} title={t.title} />
                      <Button size="sm" variant="ghost" onClick={() => setEditTemplate(t)}>Edit</Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteTemplate(t.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Guest Links Tab */}
        <TabsContent value="links">
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 px-3">Client</th>
                      <th className="text-left py-2 px-3">Token</th>
                      <th className="text-right py-2 px-3">Views</th>
                      <th className="text-left py-2 px-3">Expires</th>
                      <th className="text-center py-2 px-3">Status</th>
                      <th className="text-center py-2 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(auths.data?.items ?? []).map((a: any) => {
                      const expired = new Date(a.expiresAt) < new Date();
                      const status = a.isRevoked ? "revoked" : expired ? "expired" : "active";
                      return (
                        <tr key={a.id} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-3 font-medium">{a.targetClient}</td>
                          <td className="py-2 px-3 font-mono text-xs">{a.tokenPreview}</td>
                          <td className="py-2 px-3 text-right">{a.viewCount}</td>
                          <td className="py-2 px-3 text-xs">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(a.expiresAt).toLocaleString()}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Badge variant={status === "active" ? "default" : "secondary"} className={status === "revoked" ? "bg-red-100 text-red-700" : status === "expired" ? "bg-yellow-100 text-yellow-700" : ""}>
                              {status}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-center">
                            {status === "active" && (
                              <Button size="sm" variant="ghost" className="text-destructive gap-1" onClick={() => handleRevoke(a.id)}>
                                <Ban className="w-3.5 h-3.5" /> Revoke
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {(auths.data?.items ?? []).length === 0 && (
                      <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No guest links generated yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
