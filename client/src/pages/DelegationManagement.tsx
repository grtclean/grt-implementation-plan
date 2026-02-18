/**
 * 代理职能管理页面
 * 员工可在出差/休假期间将审批权限委托给同事
 */
import { useState } from "react";
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

const BUSINESS_TYPES = [
  { value: "expense", label: "费用报销" },
  { value: "trip", label: "出差申请" },
  { value: "leave", label: "请假审批" },
  { value: "procurement", label: "采购审批" },
  { value: "general", label: "通用审批" },
] as const;

function statusBadge(status: string) {
  if (status === "active") return <Badge className="bg-green-100 text-green-700">有效</Badge>;
  return <Badge variant="secondary">已撤销</Badge>;
}

function formatDate(d: string | Date | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("zh-CN");
}

function formatBusinessTypes(types: unknown) {
  if (!Array.isArray(types)) return "-";
  return types
    .map((t) => BUSINESS_TYPES.find((b) => b.value === t)?.label ?? t)
    .join("、");
}

export default function DelegationManagement() {
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
      toast.success("委托创建成功");
      utils.delegation.myDelegations.invalidate();
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const revokeMut = trpc.delegation.revoke.useMutation({
    onSuccess: () => {
      toast.success("委托已撤销");
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
    if (!selectedEmployee) return toast.error("请选择被委托人");
    if (selectedTypes.length === 0) return toast.error("请选择委托业务类型");
    if (!startDate || !endDate) return toast.error("请选择委托时间段");
    if (new Date(endDate) < new Date(startDate)) return toast.error("结束日期不能早于开始日期");

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
          title="代理职能管理"
          description="出差或休假时，将审批权限委托给同事代理"
          actions={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />新建委托
            </Button>
          }
        />

        <Tabs defaultValue="my">
          <TabsList>
            <TabsTrigger value="my">我的委托</TabsTrigger>
            <TabsTrigger value="tome">他人委托给我</TabsTrigger>
          </TabsList>

          {/* ---- 我的委托 ---- */}
          <TabsContent value="my">
            <Card>
              <CardHeader><CardTitle>我发出的委托</CardTitle></CardHeader>
              <CardContent>
                {myDelegations.isLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : !myDelegations.data?.length ? (
                  <p className="text-muted-foreground text-center py-8">暂无委托记录</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>被委托人</TableHead>
                        <TableHead>业务类型</TableHead>
                        <TableHead>开始日期</TableHead>
                        <TableHead>结束日期</TableHead>
                        <TableHead>原因</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myDelegations.data.map((d: any) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.delegateeName}</TableCell>
                          <TableCell>{formatBusinessTypes(d.businessTypes)}</TableCell>
                          <TableCell>{formatDate(d.startDate)}</TableCell>
                          <TableCell>{formatDate(d.endDate)}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{d.reason || "-"}</TableCell>
                          <TableCell>{statusBadge(d.status)}</TableCell>
                          <TableCell>
                            {d.status === "active" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => revokeMut.mutate({ delegationId: d.id })}
                                disabled={revokeMut.isPending}
                              >
                                <XCircle className="h-4 w-4 mr-1" />撤销
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
              <CardHeader><CardTitle>当前有效的委托给我的记录</CardTitle></CardHeader>
              <CardContent>
                {toMe.isLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : !toMe.data?.length ? (
                  <p className="text-muted-foreground text-center py-8">暂无他人委托给您的记录</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>委托人</TableHead>
                        <TableHead>业务类型</TableHead>
                        <TableHead>开始日期</TableHead>
                        <TableHead>结束日期</TableHead>
                        <TableHead>原因</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {toMe.data.map((d: any) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.delegatorName}</TableCell>
                          <TableCell>{formatBusinessTypes(d.businessTypes)}</TableCell>
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
              <DialogTitle>新建审批委托</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* 搜索被委托人 */}
              <div className="space-y-2">
                <Label>被委托人</Label>
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
                        placeholder="输入姓名或工号搜索..."
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
                <Label>委托业务类型</Label>
                <div className="flex flex-wrap gap-3">
                  {BUSINESS_TYPES.map((bt) => (
                    <label key={bt.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <Checkbox
                        checked={selectedTypes.includes(bt.value)}
                        onCheckedChange={(checked) =>
                          setSelectedTypes((prev) =>
                            checked ? [...prev, bt.value] : prev.filter((v) => v !== bt.value),
                          )
                        }
                      />
                      {bt.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* 日期范围 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>开始日期</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>结束日期</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>

              {/* 原因 */}
              <div className="space-y-2">
                <Label>委托原因（可选）</Label>
                <Textarea
                  placeholder="例如：出差至XX客户现场，预计XX天"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>取消</Button>
              <Button onClick={handleCreate} disabled={createMut.isPending}>
                {createMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                确认委托
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
