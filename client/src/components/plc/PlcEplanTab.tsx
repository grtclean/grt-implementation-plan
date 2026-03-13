/**
 * PLC EPLAN Schematics Tab — Circuit page preview + XML export
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  FileCode, Download, RefreshCw, Zap, Shield, Cpu,
  Network, Cable, LayoutGrid, Play,
} from "lucide-react";

interface PlcEplanTabProps {
  projectId: number;
  plcProjectId: number | null;
}

const CATEGORY_ICON: Record<string, typeof Zap> = {
  main_power: Zap,
  motor_control: Play,
  safety_circuit: Shield,
  control_24v: Cable,
  plc_rack: Cpu,
  hmi_network: Network,
  terminal_layout: LayoutGrid,
};

const CATEGORY_LABEL: Record<string, string> = {
  main_power: "主电源回路",
  motor_control: "电机控制",
  safety_circuit: "安全回路",
  control_24v: "24V控制电源",
  plc_rack: "PLC机架布局",
  hmi_network: "网络拓扑",
  terminal_layout: "端子排布局",
};

export default function PlcEplanTab({ projectId, plcProjectId }: PlcEplanTabProps) {
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);

  const schematics = trpc.designEngine.plcGetSchematics.useQuery(
    { plcProjectId: plcProjectId || 0 },
    { enabled: !!plcProjectId }
  );
  const selectedPage = trpc.designEngine.plcExportSchematic.useQuery(
    { id: selectedPageId || 0 },
    { enabled: !!selectedPageId }
  );
  const generateSchematics = trpc.designEngine.plcGenerateSchematics.useMutation({
    onSuccess: (data) => {
      toast.success(`已生成 ${data.pageCount} 页原理图`);
      schematics.refetch();
    },
    onError: (e) => toast.error(`生成失败: ${e.message}`),
  });

  if (!plcProjectId) {
    return <div className="text-center py-20 text-muted-foreground">请先创建PLC项目</div>;
  }

  const downloadXml = () => {
    if (!selectedPage.data) return;
    const blob = new Blob([selectedPage.data.xmlContent], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = selectedPage.data.fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("XML已下载");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1">
          <FileCode className="h-4 w-4" />
          EPLAN 电气原理图
          {schematics.data && <Badge variant="secondary">{schematics.data.length} 页</Badge>}
        </h3>
        <Button
          onClick={() => generateSchematics.mutate({ plcProjectId: plcProjectId! })}
          disabled={generateSchematics.isPending}
        >
          {generateSchematics.isPending ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
          生成全部原理图
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Page list */}
        <div className="lg:col-span-3">
          <Card className="h-[600px] overflow-y-auto">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm">原理图页面</CardTitle>
            </CardHeader>
            <CardContent className="p-1 space-y-0.5">
              {schematics.isLoading && <Skeleton className="h-40" />}
              {(schematics.data || []).map(page => {
                const Icon = CATEGORY_ICON[page.pageCategory] || FileCode;
                return (
                  <div
                    key={page.id}
                    className={`flex items-center gap-2 px-2 py-2 rounded cursor-pointer text-xs hover:bg-accent ${selectedPageId === page.id ? "bg-accent" : ""}`}
                    onClick={() => setSelectedPageId(page.id)}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">P{page.pageNumber}: {page.pageTitle}</div>
                      <div className="text-muted-foreground text-[10px]">
                        {CATEGORY_LABEL[page.pageCategory] || page.pageCategory}
                      </div>
                    </div>
                  </div>
                );
              })}
              {schematics.data?.length === 0 && (
                <div className="text-center py-10 text-muted-foreground text-xs">
                  点击"生成全部原理图"开始
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Center: SVG Preview */}
        <div className="lg:col-span-9">
          <Card className="h-[600px]">
            <CardHeader className="py-2 px-3 flex-row items-center justify-between">
              <CardTitle className="text-sm">
                {selectedPageId && schematics.data?.find(p => p.id === selectedPageId)
                  ? `P${schematics.data.find(p => p.id === selectedPageId)!.pageNumber}: ${schematics.data.find(p => p.id === selectedPageId)!.pageTitle}`
                  : "选择页面查看预览"}
              </CardTitle>
              {selectedPageId && (
                <Button variant="outline" size="sm" onClick={downloadXml}>
                  <Download className="h-4 w-4 mr-1" />
                  导出EPLAN XML
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-2 h-[calc(100%-48px)] overflow-auto">
              {selectedPageId && schematics.data?.find(p => p.id === selectedPageId)?.svgPreview ? (
                <div
                  className="w-full"
                  dangerouslySetInnerHTML={{
                    __html: schematics.data.find(p => p.id === selectedPageId)!.svgPreview,
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  选择左侧页面查看SVG预览
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
