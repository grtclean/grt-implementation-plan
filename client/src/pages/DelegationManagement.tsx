/**
 * 代理职能管理页面
 * 员工可在出差/休假期间将审批权限委托给同事
 */
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader } from "@/components/grt/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserCog, Plus, XCircle, Search, CalendarDays, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const BUSINESS_TYPE_KEYS = [
  { value: "expense", labelKey: "admin.delegation.expense" },
  { value: "trip", labelKey: "admin.delegation.trip" },
  { value: "leave", labelKey: "admin.delegation.leave" },
  { value: "procurement", labelKey: "admin.delegation.procurement" },
  { value: "general", labelKey: "admin.delegation.general" },
] as const;

function statusBadge(status: string, activeLabel: string, revokedLabel: string) {
  if (status === "active") return <Badge className="bg-green-100 text-green-700">{activeLabel}</Badge>;
  return <Badge variant="secondary">{revokedLabel}</Badge>;
}

function formatDate(d: string | Date | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("zh-CN");
}

function formatBusinessTypes(types: unknown, tFn: (key: string) => string) {
  if (!Array.isArray(types)) return "-";
  return types
    .map((v) => {
      const bt = BUSINESS_TYPE_KEYS.find((b) => b.value === v);
      return bt ? tFn(bt.labelKey) : v;
    })
    .join(", ");
}

export default function DelegationManagement() {
  const { t } = useLanguage();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: number; name: string; department: string } | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const utils = trpc.useUtils();

  const myDelegations = trpc.delegation.myDelegations.useQuery();
  const toMe = trpc.delegation.delegationsToMe.useQuery();
  const empSearch = trpc.delegation.searchEmployees.useQuery(
    { keyword: searchKeyword },
    { enabled: searchKeyword.length >= 2 },
  );

  const createMut = trpc.delegation.create.useMutation({
    onSuccess: () => {
      toast.success(t("admin.delegation.createSuccess"));
      utils.delegation.myDelegations.invalidate();
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const revokeMut = trpc.delegation.revoke.useMutation({
    onSuccess: () => {
      toast.success(t("admin.delegation.revokeSuccess"));
      utils.delegation.myDelegations.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  function resetForm() {
    setDialogOpen(false);
    setSearchKeyword("");
    setSelectedEmployee(null);
    setSelectedTypes([]);
    setStartDate("");
    setEndDate("");
    setReason("");
  }

  function handleCreate() {
    if (!selectedEmployee) return toast.error(t("admin.delegation.errSelectDelegatee"));
    if (selectedTypes.length === 0) return toast.error(t("admin.delegation.errSelectType"));
    if (!startDate || !endDate) return toast.error(t("admin.delegation.errSelectDate"));
    if (new Date(endDate) < new Date(startDate)) return toast.error(t("admin.delegation.errDateOrder"));

    createMut.mutate({
      delegateeId: selectedEmployee.id,
      delegateeName: selectedEmployee.name,
      businessTypes: selectedTypes,
      startDate,
      endDate,
      reason: reason || undefined,
    });
  }

  return (
      <div className="space-y-6">
        <PageHeader
          icon={UserCog}
          title={t("admin.delegation.title")}
          description={t("admin.delegation.description")}
          actions={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />{t("admin.delegation.newDelegation")}
            </Button>
          }
        />

        <Tabs defaultValue="my">
          <TabsList>
            <TabsTrigger value="my">{t("admin.delegation.myDelegations")}</TabsTrigger>
            <TabsTrigger value="tome">{t("admin.delegation.delegationsToMe")}</TabsTrigger>
          </TabsList>

          {/* ---- 我的委托 ---- */}
          <TabsContent value="my">
            <Card>
              <CardHeader><CardTitle>{t("admin.delegation.outgoing")}</CardTitle></CardHeader>
              <CardContent>
                {myDelegations.isLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : !myDelegations.data?.length ? (
                  <p className="text-muted-foreground text-center py-8">{t("admin.delegation.noDelegations")}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("admin.delegation.delegatee")}</TableHead>
                        <TableHead>{t("admin.delegation.businessType")}</TableHead>
                        <TableHead>{t("admin.delegation.startDate")}</TableHead>
                        <TableHead>{t("admin.delegation.endDate")}</TableHead>
                        <TableHead>{t("admin.delegation.reason")}</TableHead>
                        <TableHead>{t("admin.delegation.status")}</TableHead>
                        <TableHead>{t("admin.delegation.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myDelegations.data.map((d: any) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.delegateeName}</TableCell>
                          <TableCell>{formatBusinessTypes(d.businessTypes, t)}</TableCell>
                          <TableCell>{formatDate(d.startDate)}</TableCell>
                          <TableCell>{formatDate(d.endDate)}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{d.reason || "-"}</TableCell>
                          <TableCell>{statusBadge(d.status, t("admin.delegation.statusActive"), t("admin.delegation.statusRevoked"))}</TableCell>
                          <TableCell>
                            {d.status === "active" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => revokeMut.mutate({ delegationId: d.id })}
                                disabled={revokeMut.isPending}
                              >
                                <XCircle className="h-4 w-4 mr-1" />{t("admin.delegation.revoke")}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---- 他人委托给我 ---- */}
          <TabsContent value="tome">
            <Card>
              <CardHeader><CardTitle>{t("admin.delegation.incoming")}</CardTitle></CardHeader>
              <CardContent>
                {toMe.isLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : !toMe.data?.length ? (
                  <p className="text-muted-foreground text-center py-8">{t("admin.delegation.noIncoming")}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("admin.delegation.delegator")}</TableHead>
                        <TableHead>{t("admin.delegation.businessType")}</TableHead>
                        <TableHead>{t("admin.delegation.startDate")}</TableHead>
                        <TableHead>{t("admin.delegation.endDate")}</TableHead>
                        <TableHead>{t("admin.delegation.reason")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {toMe.data.map((d: any) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.delegatorName}</TableCell>
                          <TableCell>{formatBusinessTypes(d.businessTypes, t)}</TableCell>
                          <TableCell>{formatDate(d.startDate)}</TableCell>
                          <TableCell>{formatDate(d.endDate)}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{d.reason || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ---- 新建委托对话框 ---- */}
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setDialogOpen(true); }}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>{t("admin.delegation.dialogTitle")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* 搜索被委托人 */}
              <div className="space-y-2">
                <Label>{t("admin.delegation.delegateeLabel")}</Label>
                {selectedEmployee ? (
                  <div className="flex items-center gap-2 p-2 border rounded-lg">
                    <span className="font-medium">{selectedEmployee.name}</span>
                    <span className="text-muted-foreground text-sm">{selectedEmployee.department}</span>
                    <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setSelectedEmployee(null)}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={t("admin.delegation.searchPlaceholder")}
                        className="pl-9"
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                      />
                    </div>
                    {empSearch.data && empSearch.data.length > 0 && (
                      <div className="border rounded-lg max-h-40 overflow-y-auto">
                        {empSearch.data.map((emp: any) => (
                          <button
                            key={emp.id}
                            className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex justify-between"
                            onClick={() => { setSelectedEmployee({ id: emp.id, name: emp.name, department: emp.department }); setSearchKeyword(""); }}
                          >
                            <span>{emp.name} ({emp.employeeCode})</span>
                            <span className="text-muted-foreground">{emp.department} · {emp.position}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 业务类型 */}
              <div className="space-y-2">
                <Label>{t("admin.delegation.businessTypeLabel")}</Label>
                <div className="flex flex-wrap gap-3">
                  {BUSINESS_TYPE_KEYS.map((bt) => (
                    <label key={bt.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <Checkbox
                        checked={selectedTypes.includes(bt.value)}
                        onCheckedChange={(checked) =>
                          setSelectedTypes((prev) =>
                            checked ? [...prev, bt.value] : prev.filter((v) => v !== bt.value),
                          )
                        }
                      />
                      {t(bt.labelKey)}
                    </label>
                  ))}
                </div>
              </div>

              {/* 日期范围 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("admin.delegation.startDateLabel")}</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("admin.delegation.endDateLabel")}</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>

              {/* 原因 */}
              <div className="space-y-2">
                <Label>{t("admin.delegation.reasonLabel")}</Label>
                <Textarea
                  placeholder={t("admin.delegation.reasonPlaceholder")}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>{t("admin.delegation.cancelBtn")}</Button>
              <Button onClick={handleCreate} disabled={createMut.isPending}>
                {createMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("admin.delegation.confirmBtn")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
