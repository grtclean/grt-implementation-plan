/**
 * PLC I/O Mapping Tab — I/O address allocation table
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Cable, Download, RefreshCw, Search, Shield } from "lucide-react";

interface PlcIoMappingTabProps {
  projectId: number;
  plcProjectId: number | null;
}

const IO_TYPE_COLOR: Record<string, string> = {
  DI: "bg-green-100 text-green-800",
  DO: "bg-red-100 text-red-800",
  AI: "bg-blue-100 text-blue-800",
  AO: "bg-purple-100 text-purple-800",
};

export default function PlcIoMappingTab({ projectId, plcProjectId }: PlcIoMappingTabProps) {
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const ioMappings = trpc.designEngine.plcGetIoMapping.useQuery(
    { plcProjectId: plcProjectId || 0 },
    { enabled: !!plcProjectId }
  );

  const updateIo = trpc.designEngine.plcUpdateIoMapping.useMutation({
    onSuccess: () => { toast.success("I/O地址已更新"); ioMappings.refetch(); },
  });

  if (!plcProjectId) {
    return <div className="text-center py-20 text-muted-foreground">请先在"PLC程序架构"中创建项目并生成架构</div>;
  }

  const filteredIo = (ioMappings.data || []).filter(io => {
    if (typeFilter !== "all" && io.ioType !== typeFilter) return false;
    if (filter && !io.signalName.includes(filter) && !io.signalNameEn?.includes(filter) && !io.address.includes(filter)) return false;
    return true;
  });

  const summary = {
    DI: (ioMappings.data || []).filter(m => m.ioType === "DI").length,
    DO: (ioMappings.data || []).filter(m => m.ioType === "DO").length,
    AI: (ioMappings.data || []).filter(m => m.ioType === "AI").length,
    AO: (ioMappings.data || []).filter(m => m.ioType === "AO").length,
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {Object.entries(summary).map(([type, count]) => (
          <Card key={type} className="py-2">
            <CardContent className="p-2 text-center">
              <div className={`text-2xl font-bold ${IO_TYPE_COLOR[type]?.split(" ")[1] || ""}`}>{count}</div>
              <div className="text-xs text-muted-foreground">{type} 信号</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters + export */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索信号名/地址..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="全部类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            <SelectItem value="DI">DI 数字输入</SelectItem>
            <SelectItem value="DO">DO 数字输出</SelectItem>
            <SelectItem value="AI">AI 模拟输入</SelectItem>
            <SelectItem value="AO">AO 模拟输出</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1" />
          导出I/O表
        </Button>
      </div>

      {/* I/O Table */}
      <Card>
        <CardContent className="p-0">
          {ioMappings.isLoading ? <Skeleton className="h-80" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left font-medium">信号名</th>
                    <th className="p-2 text-left font-medium">信号名(EN)</th>
                    <th className="p-2 text-left font-medium">地址</th>
                    <th className="p-2 text-left font-medium">类型</th>
                    <th className="p-2 text-left font-medium">数据类型</th>
                    <th className="p-2 text-left font-medium">机架/槽位/通道</th>
                    <th className="p-2 text-left font-medium">工位</th>
                    <th className="p-2 text-left font-medium">安全</th>
                    <th className="p-2 text-left font-medium">说明</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIo.map(io => (
                    <tr key={io.id} className="border-t hover:bg-accent/50">
                      <td className="p-2 font-mono">{io.signalName}</td>
                      <td className="p-2 text-muted-foreground">{io.signalNameEn}</td>
                      <td className="p-2">
                        <Input
                          defaultValue={io.address}
                          className="h-6 w-24 text-xs font-mono"
                          onBlur={e => {
                            if (e.target.value !== io.address) {
                              updateIo.mutate({ id: io.id, address: e.target.value });
                            }
                          }}
                        />
                      </td>
                      <td className="p-2">
                        <Badge variant="secondary" className={IO_TYPE_COLOR[io.ioType] || ""}>
                          {io.ioType}
                        </Badge>
                      </td>
                      <td className="p-2 font-mono">{io.dataType}</td>
                      <td className="p-2 font-mono text-muted-foreground">
                        R{io.moduleRack}/S{io.moduleSlot}/C{io.moduleChannel}
                      </td>
                      <td className="p-2">{(io as any).stationCode || "—"}</td>
                      <td className="p-2">
                        {io.safetyRelevant && <Shield className="h-3.5 w-3.5 text-red-500" />}
                      </td>
                      <td className="p-2 text-muted-foreground max-w-[200px] truncate">{io.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredIo.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  {ioMappings.data?.length ? "没有匹配的信号" : "请先生成程序架构以自动分配I/O"}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
