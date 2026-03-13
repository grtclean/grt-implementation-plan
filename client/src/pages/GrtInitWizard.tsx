import { useState } from "react";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  Wifi, Search, Monitor, FolderSync, CheckCircle2, ArrowLeft, ArrowRight,
  Loader2, AlertTriangle, Server, Router, HardDrive, Download, Info,
} from "lucide-react";

const STEP_ICONS = [Search, Monitor, HardDrive, FolderSync, CheckCircle2];

interface ScannedDevice {
  ip: string;
  hostname: string;
  type: "plc" | "sensor" | "gateway" | "camera" | "unknown";
  status: "online" | "offline";
  mac?: string;
}

interface LocalApp {
  name: string;
  path: string;
  version: string;
  exe: string;
}

export default function GrtInitWizard() {
  const { language, t } = useLanguage();
  const isZh = language === "zh";

  const [step, setStep] = useState(0);
  const [subnet, setSubnet] = useState("192.168.1.0/24");
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [localApps, setLocalApps] = useState<LocalApp[]>([]);
  const [localAppScanDone, setLocalAppScanDone] = useState(false);
  const [sharePointUrl, setSharePointUrl] = useState("");

  const STEPS = [
    isZh ? "网络扫描" : "Network Scan",
    isZh ? "设备配置" : "Device Config",
    isZh ? "本地应用" : "Local Apps",
    isZh ? "SharePoint 连接" : "SharePoint Test",
    isZh ? "摘要 & 应用" : "Summary & Apply",
  ];

  // --- tRPC queries ---
  const scanMutation = trpc.grtInit.scanNetwork.useMutation();
  const testSharePointMutation = trpc.grtInit.scanSharePoint.useMutation();
  const applyMutation = trpc.grtInit.applyAutoConfig.useMutation();

  const scanLocalAppsQuery = trpc.grtInit.scanLocalApps.useQuery(
    { platform: "windows" },
    { enabled: false },
  );
  const protocolHandlerQuery = trpc.grtInit.registerProtocolHandler.useQuery(
    { handlerUrl: window.location.origin },
    { enabled: false },
  );

  const scannedDevices: ScannedDevice[] = (scanMutation.data as ScannedDevice[] | undefined) ?? [];

  // --- Device selection helpers ---
  const toggleDevice = (ip: string) => {
    setSelectedDevices((prev) => {
      const next = new Set(prev);
      if (next.has(ip)) next.delete(ip);
      else next.add(ip);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedDevices.size === scannedDevices.length) {
      setSelectedDevices(new Set());
    } else {
      setSelectedDevices(new Set(scannedDevices.map((d) => d.ip)));
    }
  };

  // --- Step navigation ---
  const canNext = (): boolean => {
    if (step === 0) return scannedDevices.length > 0;
    if (step === 1) return selectedDevices.size > 0;
    if (step === 2) return localAppScanDone; // Local Apps step — scan must have been attempted
    if (step === 3) return testSharePointMutation.isSuccess;
    return true;
  };

  const handleApply = () => {
    const devices = scannedDevices.filter((d) => selectedDevices.has(d.ip));
    applyMutation.mutate({ scanId: scanMutation.data?.id?.toString() ?? "" } as any);
  };

  // --- Type badge color ---
  const typeBadge = (type: string) => {
    const map: Record<string, string> = {
      plc: "bg-blue-100 text-blue-800",
      sensor: "bg-green-100 text-green-800",
      gateway: "bg-purple-100 text-purple-800",
      camera: "bg-orange-100 text-orange-800",
      unknown: "bg-gray-100 text-gray-800",
    };
    return map[type] ?? map.unknown;
  };

  // ===== Step renderers =====

  const renderNetworkScan = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          {isZh ? "子网扫描" : "Subnet Scan"}
        </CardTitle>
        <CardDescription>
          {isZh
            ? "输入工厂网络子网进行设备发现"
            : "Enter the factory network subnet for device discovery"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded-md px-3 py-2 text-sm bg-background"
            value={subnet}
            onChange={(e) => setSubnet(e.target.value)}
            placeholder="192.168.1.0/24"
          />
          <Button
            onClick={() => scanMutation.mutate({ subnetRange: subnet })}
            disabled={scanMutation.isPending || !subnet}
          >
            {scanMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Wifi className="w-4 h-4 mr-1" />
            )}
            {isZh ? "扫描" : "Scan"}
          </Button>
        </div>

        {scanMutation.isError && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertTriangle className="w-4 h-4" />
            {scanMutation.error?.message ?? (isZh ? "扫描失败" : "Scan failed")}
          </div>
        )}

        {scannedDevices.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>IP</TableHead>
                <TableHead>{isZh ? "主机名" : "Hostname"}</TableHead>
                <TableHead>{isZh ? "类型" : "Type"}</TableHead>
                <TableHead>{isZh ? "状态" : "Status"}</TableHead>
                <TableHead>MAC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scannedDevices.map((d) => (
                <TableRow key={d.ip}>
                  <TableCell className="font-mono text-xs">{d.ip}</TableCell>
                  <TableCell>{d.hostname}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded ${typeBadge(d.type)}`}>
                      {d.type.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={d.status === "online" ? "default" : "secondary"}>
                      {d.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{d.mac ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {scanMutation.isSuccess && scannedDevices.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            {isZh ? "未发现设备" : "No devices found"}
          </p>
        )}
      </CardContent>
    </Card>
  );

  const renderDeviceConfig = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="w-5 h-5" />
          {isZh ? "设备选择" : "Device Selection"}
        </CardTitle>
        <CardDescription>
          {isZh
            ? `已发现 ${scannedDevices.length} 个设备，选择要纳入管理的设备`
            : `${scannedDevices.length} devices found. Select devices to manage.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={selectedDevices.size === scannedDevices.length && scannedDevices.length > 0}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>IP</TableHead>
              <TableHead>{isZh ? "主机名" : "Hostname"}</TableHead>
              <TableHead>{isZh ? "类型" : "Type"}</TableHead>
              <TableHead>{isZh ? "状态" : "Status"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scannedDevices.map((d) => (
              <TableRow
                key={d.ip}
                className={selectedDevices.has(d.ip) ? "bg-primary/5" : ""}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedDevices.has(d.ip)}
                    onCheckedChange={() => toggleDevice(d.ip)}
                  />
                </TableCell>
                <TableCell className="font-mono text-xs">{d.ip}</TableCell>
                <TableCell>{d.hostname}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-0.5 rounded ${typeBadge(d.type)}`}>
                    {d.type.toUpperCase()}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={d.status === "online" ? "default" : "secondary"}>
                    {d.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <p className="text-sm text-muted-foreground mt-3">
          {isZh
            ? `已选择 ${selectedDevices.size} / ${scannedDevices.length} 个设备`
            : `${selectedDevices.size} / ${scannedDevices.length} selected`}
        </p>
      </CardContent>
    </Card>
  );

  const handleScanLocalApps = async () => {
    try {
      const result = await scanLocalAppsQuery.refetch();
      if (result.data?.script) {
        // In a real scenario the script would be sent to a local agent.
        // For now we simulate parsing a JSON response from the PowerShell output.
        // The UI shows the apps the script can detect and their expected paths.
        const detectedApps: LocalApp[] = result.data.apps.map((a) => ({
          name: a.name,
          path: "(run scan script to detect)",
          version: "-",
          exe: a.exe,
        }));
        setLocalApps(detectedApps);
      }
      setLocalAppScanDone(true);
    } catch {
      setLocalAppScanDone(true);
    }
  };

  const handleDownloadRegFile = async () => {
    const result = await protocolHandlerQuery.refetch();
    if (result.data) {
      const blob = new Blob([result.data.registryFileContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.data.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const renderLocalApps = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="w-5 h-5" />
          {isZh ? "本地 CAD / 工程软件检测" : "Local CAD / Engineering App Detection"}
        </CardTitle>
        <CardDescription>
          {isZh
            ? "扫描本地安装的 SolidWorks、AutoCAD、EPLAN、汇川 InoProShop、西门子 TIA Portal 等工程软件"
            : "Scan for locally installed SolidWorks, AutoCAD, EPLAN, Inovance InoProShop, Siemens TIA Portal"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={handleScanLocalApps}
          disabled={scanLocalAppsQuery.isFetching}
        >
          {scanLocalAppsQuery.isFetching ? (
            <Loader2 className="w-4 h-4 animate-spin mr-1" />
          ) : (
            <Search className="w-4 h-4 mr-1" />
          )}
          {isZh ? "扫描本地 CAD 应用" : "Scan Local CAD Apps"}
        </Button>

        {scanLocalAppsQuery.isError && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertTriangle className="w-4 h-4" />
            {scanLocalAppsQuery.error?.message ?? (isZh ? "扫描失败" : "Scan failed")}
          </div>
        )}

        {localApps.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isZh ? "应用名称" : "App Name"}</TableHead>
                <TableHead>{isZh ? "可执行文件" : "Executable"}</TableHead>
                <TableHead>{isZh ? "路径" : "Path"}</TableHead>
                <TableHead>{isZh ? "版本" : "Version"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {localApps.map((app) => (
                <TableRow key={app.exe}>
                  <TableCell className="font-medium">{app.name}</TableCell>
                  <TableCell className="font-mono text-xs">{app.exe}</TableCell>
                  <TableCell className="font-mono text-xs max-w-[300px] truncate">{app.path}</TableCell>
                  <TableCell>{app.version}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {localAppScanDone && localApps.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            {isZh ? "未检测到已安装的 CAD 应用" : "No installed CAD apps detected"}
          </p>
        )}

        {/* Protocol handler section */}
        <div className="border rounded-lg p-4 mt-4 space-y-3 bg-muted/30">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 text-blue-500 shrink-0" />
            <div className="text-sm">
              <p className="font-medium mb-1">
                {isZh ? "GRT 协议处理器" : "GRT Protocol Handler"}
              </p>
              <p className="text-muted-foreground">
                {isZh
                  ? "注册 grt-system:// 协议以便从浏览器直接打开本地工程文件。下载 .reg 文件并导入到 Windows 注册表。"
                  : "Register the grt-system:// protocol to open local engineering files directly from the browser. Download the .reg file and import it into the Windows Registry."}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadRegFile}
            disabled={protocolHandlerQuery.isFetching}
          >
            {protocolHandlerQuery.isFetching ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Download className="w-4 h-4 mr-1" />
            )}
            {isZh ? "下载 .reg 文件" : "Download .reg File"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderSharePointTest = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderSync className="w-5 h-5" />
          {isZh ? "SharePoint 连接测试" : "SharePoint Connection Test"}
        </CardTitle>
        <CardDescription>
          {isZh
            ? "输入 SharePoint 站点 URL 并验证连接"
            : "Enter your SharePoint site URL and verify connectivity"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded-md px-3 py-2 text-sm bg-background"
            value={sharePointUrl}
            onChange={(e) => setSharePointUrl(e.target.value)}
            placeholder="https://company.sharepoint.com/sites/factory"
          />
          <Button
            onClick={() => testSharePointMutation.mutate({ siteUrl: sharePointUrl })}
            disabled={testSharePointMutation.isPending || !sharePointUrl}
          >
            {testSharePointMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Server className="w-4 h-4 mr-1" />
            )}
            {isZh ? "测试" : "Test"}
          </Button>
        </div>

        {testSharePointMutation.isSuccess && (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            {isZh ? "连接成功" : "Connection successful"}
          </div>
        )}

        {testSharePointMutation.isError && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertTriangle className="w-4 h-4" />
            {testSharePointMutation.error?.message ??
              (isZh ? "连接失败" : "Connection failed")}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderSummary = () => {
    const selected = scannedDevices.filter((d) => selectedDevices.has(d.ip));
    const byType = selected.reduce<Record<string, number>>((acc, d) => {
      acc[d.type] = (acc[d.type] ?? 0) + 1;
      return acc;
    }, {});

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            {isZh ? "配置摘要" : "Configuration Summary"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">
                {isZh ? "子网" : "Subnet"}
              </div>
              <div className="font-mono text-sm font-medium flex items-center gap-2">
                <Router className="w-4 h-4 text-muted-foreground" />
                {subnet}
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">
                {isZh ? "已选设备" : "Selected Devices"}
              </div>
              <div className="text-lg font-bold">{selected.length}</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {Object.entries(byType).map(([type, count]) => (
                  <span key={type} className={`text-xs px-1.5 py-0.5 rounded ${typeBadge(type)}`}>
                    {type}: {count}
                  </span>
                ))}
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">SharePoint</div>
              <div className="text-sm font-medium truncate">{sharePointUrl || "-"}</div>
              <Badge variant="default" className="mt-1">
                {isZh ? "已验证" : "Verified"}
              </Badge>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handleApply}
            disabled={applyMutation.isPending}
          >
            {applyMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-1" />
            )}
            {isZh ? "应用配置" : "Apply Configuration"}
          </Button>

          {applyMutation.isSuccess && (
            <div className="flex items-center gap-2 text-green-600 text-sm justify-center">
              <CheckCircle2 className="w-4 h-4" />
              {isZh ? "配置已成功应用!" : "Configuration applied successfully!"}
            </div>
          )}

          {applyMutation.isError && (
            <div className="flex items-center gap-2 text-destructive text-sm justify-center">
              <AlertTriangle className="w-4 h-4" />
              {applyMutation.error?.message ?? (isZh ? "应用失败" : "Apply failed")}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const RENDERERS = [renderNetworkScan, renderDeviceConfig, renderLocalApps, renderSharePointTest, renderSummary];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Wifi}
        title={isZh ? "GRT 初始化向导" : "GRT Init Wizard"}
        description={
          isZh
            ? "工厂环境检测与设备配置"
            : "Factory floor environment detection & device configuration"
        }
      />

      {/* Step progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          {STEPS.map((label, i) => {
            const StepIcon = STEP_ICONS[i];
            const isActive = i === step;
            const isDone = i < step;
            return (
              <div key={i} className="flex items-center gap-1.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    isDone
                      ? "bg-primary text-primary-foreground"
                      : isActive
                        ? "bg-primary/20 text-primary border-2 border-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                </div>
                <span
                  className={`text-sm hidden sm:inline ${
                    isActive ? "font-semibold text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} />
      </div>

      {/* Current step content */}
      {RENDERERS[step]()}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          {isZh ? "上一步" : "Back"}
        </Button>
        {step < STEPS.length - 1 && (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext()}
          >
            {isZh ? "下一步" : "Next"}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
