import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  Grid,
  ContactShadows,
  Center,
  Html,
} from "@react-three/drei";
import {
  Activity,
  ArrowUpFromLine,
  Box,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Copy,
  Database,
  Download,
  Eye,
  FileText,
  Filter,
  Fingerprint,
  Gauge,
  GitBranch,
  Hash,
  Loader2,
  Lock,
  Maximize2,
  MonitorDot,
  Network,
  Package,
  Plus,
  RotateCcw,
  Search,
  Shield,
  ShieldCheck,
  Snowflake,
  Trash2,
  Upload,
  XCircle,
  Zap,
} from "lucide-react";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import * as THREE from "three";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// TODO: Replace with real auth context (e.g., useUserProfile().id)
const CURRENT_USER_ID = 1;
const PAGE_SIZE = 24;

type AssetStatus = "draft" | "pending_review" | "released" | "obsolete";
type AuditAction =
  | "upload"
  | "approve"
  | "reject"
  | "freeze"
  | "obsolete"
  | "download"
  | "delete"
  | "hash_verify";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "0 MB";
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

function truncateHash(hash: string | null | undefined): string {
  if (!hash || hash.length < 20) return hash ?? "--";
  return hash.slice(0, 8) + "..." + hash.slice(-8);
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "--";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusColor(status: AssetStatus) {
  switch (status) {
    case "draft":
      return {
        bg: "bg-amber-500/20",
        text: "text-amber-400",
        border: "border-amber-500/40",
        glow: "shadow-[0_0_10px_rgba(245,158,11,0.25)]",
        label: "DRAFT",
        labelZh: "草稿",
      };
    case "pending_review":
      return {
        bg: "bg-blue-500/20",
        text: "text-blue-400",
        border: "border-blue-500/40",
        glow: "shadow-[0_0_10px_rgba(59,130,246,0.3)] animate-pulse",
        label: "PENDING REVIEW",
        labelZh: "待审核",
      };
    case "released":
      return {
        bg: "bg-emerald-500/20",
        text: "text-emerald-400",
        border: "border-emerald-500/40",
        glow: "shadow-[0_0_12px_rgba(16,185,129,0.35)]",
        label: "RELEASED",
        labelZh: "已发布",
      };
    case "obsolete":
      return {
        bg: "bg-red-500/15",
        text: "text-red-400/70",
        border: "border-red-500/30",
        glow: "",
        label: "OBSOLETE",
        labelZh: "已废弃",
      };
    default:
      return {
        bg: "bg-slate-700/30",
        text: "text-slate-400",
        border: "border-slate-600/30",
        glow: "",
        label: String(status).toUpperCase(),
        labelZh: status,
      };
  }
}

function actionMeta(action: AuditAction) {
  switch (action) {
    case "upload":
      return { icon: Upload, color: "text-cyan-400", label: "UPLOAD" };
    case "approve":
      return { icon: CheckCircle2, color: "text-emerald-400", label: "APPROVE" };
    case "reject":
      return { icon: XCircle, color: "text-red-400", label: "REJECT" };
    case "freeze":
      return { icon: Snowflake, color: "text-blue-300", label: "FREEZE" };
    case "obsolete":
      return { icon: Trash2, color: "text-red-400/70", label: "OBSOLETE" };
    case "download":
      return { icon: Download, color: "text-slate-400", label: "DOWNLOAD" };
    case "delete":
      return { icon: Trash2, color: "text-red-500", label: "DELETE" };
    case "hash_verify":
      return { icon: Fingerprint, color: "text-violet-400", label: "VERIFY" };
    default:
      return { icon: Activity, color: "text-slate-400", label: String(action) };
  }
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success("Copied to clipboard"),
    () => toast.error("Failed to copy"),
  );
}

// ---------------------------------------------------------------------------
// 3D Scene Components
// ---------------------------------------------------------------------------

/** Animated wireframe polyhedron placeholder when no GLB model is available */
function WireframePlaceholder() {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.LineSegments>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.3;
      meshRef.current.rotation.x = Math.sin(t * 0.2) * 0.15;
    }
    if (wireRef.current) {
      wireRef.current.rotation.y = t * 0.3;
      wireRef.current.rotation.x = Math.sin(t * 0.2) * 0.15;
    }
  });

  const geo = useMemo(() => new THREE.IcosahedronGeometry(1.4, 1), []);

  return (
    <Center>
      <group>
        {/* Semi-transparent solid */}
        <mesh ref={meshRef} geometry={geo}>
          <meshStandardMaterial
            color="#06b6d4"
            transparent
            opacity={0.08}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Wireframe overlay */}
        <lineSegments ref={wireRef}>
          <edgesGeometry args={[geo]} />
          <lineBasicMaterial color="#06b6d4" transparent opacity={0.6} />
        </lineSegments>
        {/* Pulsing inner sphere */}
        <mesh>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial
            color="#10b981"
            emissive="#10b981"
            emissiveIntensity={1.2}
            transparent
            opacity={0.5}
          />
        </mesh>
      </group>
    </Center>
  );
}

/** Small floating HUD tag inside the 3D scene */
function SceneHudTag({
  label,
  value,
  position,
}: {
  label: string;
  value: string;
  position: [number, number, number];
}) {
  return (
    <Html position={position} center distanceFactor={6}>
      <div className="pointer-events-none select-none rounded border border-cyan-500/30 bg-slate-900/90 px-2 py-1 font-mono text-[10px] text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.2)] backdrop-blur-md">
        <span className="text-slate-500">{label}:</span> {value}
      </div>
    </Html>
  );
}

/** The full R3F scene for the 3D viewer */
function ViewerScene({
  asset,
  autoRotate,
}: {
  asset: Record<string, unknown> | null;
  autoRotate: boolean;
}) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 8, 5]} intensity={0.8} castShadow />
      <pointLight position={[-4, 4, -4]} intensity={0.4} color="#06b6d4" />

      {/* Environment */}
      <Environment preset="warehouse" />

      {/* Grid floor */}
      <Grid
        args={[20, 20]}
        position={[0, -1.5, 0]}
        cellSize={0.5}
        cellThickness={0.4}
        cellColor="#064e3b"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#06b6d4"
        fadeDistance={18}
        fadeStrength={1.2}
        infiniteGrid
      />

      {/* Contact shadows */}
      <ContactShadows
        position={[0, -1.49, 0]}
        opacity={0.4}
        scale={12}
        blur={2.5}
        far={4}
        color="#000000"
      />

      {/* Model or placeholder */}
      <WireframePlaceholder />

      {/* Floating HUD elements */}
      {asset && (
        <>
          <SceneHudTag
            label="VER"
            value={String((asset as Record<string, unknown>).versionString ?? (asset as Record<string, unknown>).version ?? "1.0")}
            position={[2.2, 1.8, 0]}
          />
          <SceneHudTag
            label="FORMAT"
            value={String((asset as Record<string, unknown>).fileFormat ?? "GLB")}
            position={[-2.2, 1.8, 0]}
          />
          <SceneHudTag
            label="STATUS"
            value={String((asset as Record<string, unknown>).status ?? "draft").toUpperCase()}
            position={[0, -2.0, 2]}
          />
        </>
      )}

      {/* Controls */}
      <OrbitControls
        autoRotate={autoRotate}
        autoRotateSpeed={1.2}
        enablePan
        enableZoom
        maxPolarAngle={Math.PI / 1.8}
        minDistance={2}
        maxDistance={12}
      />
    </>
  );
}

/** Loading spinner for Suspense fallback */
function CanvasLoader() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        <span className="font-mono text-xs text-cyan-400/70">
          Initializing 3D Engine...
        </span>
      </div>
    </Html>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Stat pill in the top bar */
function StatPill({
  icon: Icon,
  label,
  value,
  accent = "cyan",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  accent?: "cyan" | "emerald" | "amber" | "blue" | "violet";
}) {
  const colorMap = {
    cyan: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
    emerald: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    amber: "text-amber-400 border-amber-500/30 bg-amber-500/10",
    blue: "text-blue-400 border-blue-500/30 bg-blue-500/10",
    violet: "text-violet-400 border-violet-500/30 bg-violet-500/10",
  };

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-sm ${colorMap[accent]}`}
    >
      <Icon className="h-4 w-4" />
      <span className="text-slate-400">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

/** Status badge with glow */
function StatusBadge({
  status,
  size = "sm",
}: {
  status: AssetStatus;
  size?: "sm" | "lg";
}) {
  const s = statusColor(status);
  const sizeClass = size === "lg" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex items-center rounded-full border font-mono font-semibold tracking-wider ${s.bg} ${s.text} ${s.border} ${s.glow} ${sizeClass}`}
    >
      {s.label}
    </span>
  );
}

/** Individual asset card in the grid */
function AssetCard({
  asset,
  onSelect,
}: {
  asset: Record<string, unknown>;
  onSelect: (id: number) => void;
}) {
  const status = (asset.status as AssetStatus) ?? "draft";
  const sc = statusColor(status);

  return (
    <Card
      className={`group relative cursor-pointer overflow-hidden border bg-slate-900/80 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-cyan-500/40 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] ${sc.border}`}
      onClick={() => onSelect(asset.id as number)}
    >
      {/* Scan-line decoration */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-cyan-500/[0.02] via-transparent to-transparent" />

      {/* Thumbnail area */}
      <div className="relative flex h-36 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-800/80 to-slate-900/90">
        {asset.thumbnailUrl ? (
          <img
            src={asset.thumbnailUrl as string}
            alt={asset.assetName as string}
            className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Box className="h-12 w-12 text-cyan-500/40 transition-colors group-hover:text-cyan-400/60" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-slate-600">
              {(asset.fileFormat as string) ?? "3D MODEL"}
            </span>
          </div>
        )}

        {/* Format chip */}
        <span className="absolute right-2 top-2 rounded bg-slate-800/90 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-cyan-400 ring-1 ring-cyan-500/20">
          {(asset.fileFormat as string)?.toUpperCase() ?? "GLB"}
        </span>

        {/* Version chip */}
        <span className="absolute left-2 top-2 rounded bg-slate-800/90 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-400 ring-1 ring-emerald-500/20">
          v{String(asset.versionString ?? asset.version ?? "1.0")}
        </span>

        {/* Frozen indicator */}
        {asset.designFrozen && (
          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-blue-900/80 px-1.5 py-0.5 font-mono text-[10px] text-blue-300 ring-1 ring-blue-500/30">
            <Snowflake className="h-3 w-3" /> FROZEN
          </span>
        )}
      </div>

      <CardContent className="space-y-2 p-3">
        {/* Name + status */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-sm font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
            {asset.assetName as string}
          </h3>
          <StatusBadge status={status} />
        </div>

        {/* Asset number */}
        <p className="font-mono text-[11px] text-slate-500">
          {asset.assetNumber as string}
        </p>

        {/* Hash */}
        <div className="flex items-center gap-1 font-mono text-[10px] text-slate-600">
          <Hash className="h-3 w-3" />
          {truncateHash(asset.sha256Hash as string | null)}
        </div>

        {/* Footer: owner + size */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-slate-500">
            {(asset.ownerName as string) ?? "Unknown"}
          </span>
          <span className="font-mono text-[10px] text-slate-600">
            {formatFileSize(asset.fileSizeBytes as number | null)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// 3D Viewer Dialog Content
// ---------------------------------------------------------------------------

function ViewerDialogContent({
  assetId,
  onClose,
}: {
  assetId: number;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [autoRotate, setAutoRotate] = useState(true);

  const { data, isLoading } = trpc.digitalTwin.getAsset.useQuery({ id: assetId });

  const submitForReview = trpc.digitalTwin.submitForReview.useMutation({
    onSuccess: () => {
      toast.success("Submitted for review");
      utils.digitalTwin.getAsset.invalidate({ id: assetId });
      utils.digitalTwin.listAssets.invalidate();
      utils.digitalTwin.getStats.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const approveAsset = trpc.digitalTwin.approveAsset.useMutation({
    onSuccess: () => {
      toast.success("Asset approved and released");
      utils.digitalTwin.getAsset.invalidate({ id: assetId });
      utils.digitalTwin.listAssets.invalidate();
      utils.digitalTwin.getStats.invalidate();
      utils.digitalTwin.listAuditLogs.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const freezeAsset = trpc.digitalTwin.freezeAsset.useMutation({
    onSuccess: () => {
      toast.success("Design frozen");
      utils.digitalTwin.getAsset.invalidate({ id: assetId });
      utils.digitalTwin.listAssets.invalidate();
      utils.digitalTwin.getStats.invalidate();
      utils.digitalTwin.listAuditLogs.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const verifyHash = trpc.digitalTwin.verifyHash.useMutation({
    onSuccess: (result) => {
      if ((result as Record<string, unknown>)?.isValid) {
        toast.success("Hash verification passed - integrity confirmed");
      } else {
        toast.error("Hash mismatch - integrity compromised!");
      }
      utils.digitalTwin.listAuditLogs.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const publishVersion = trpc.digitalTwin.publishVersion.useMutation({
    onSuccess: () => {
      toast.success("New version published");
      utils.digitalTwin.getAsset.invalidate({ id: assetId });
      utils.digitalTwin.listAssets.invalidate();
      utils.digitalTwin.getStats.invalidate();
      utils.digitalTwin.listAuditLogs.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
          <span className="font-mono text-sm text-cyan-400/60">
            Loading asset data...
          </span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-slate-950">
        <span className="text-red-400">Asset not found</span>
      </div>
    );
  }

  const asset = data as Record<string, unknown>;
  const versionChain = (asset.versionChain as Record<string, unknown>[]) ?? [];
  const assemblyNodes = (asset.assemblyNodes as Record<string, unknown>[]) ?? [];
  const status = (asset.status as AssetStatus) ?? "draft";
  const sc = statusColor(status);

  return (
    <div className="flex h-[85vh] flex-col overflow-hidden bg-slate-950 lg:flex-row">
      {/* ---- Left: 3D Canvas (60%) ---- */}
      <div className="relative flex-1 border-b border-slate-800 lg:border-b-0 lg:border-r">
        {/* Canvas toolbar */}
        <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-slate-700/60 bg-slate-900/80 text-cyan-400 backdrop-blur hover:bg-slate-800 hover:text-cyan-300"
                  onClick={() => setAutoRotate(!autoRotate)}
                >
                  <RotateCcw
                    className={`h-4 w-4 ${autoRotate ? "animate-spin" : ""}`}
                    style={{ animationDuration: "3s" }}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {autoRotate ? "Stop rotation" : "Auto-rotate"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <span className="rounded border border-cyan-500/20 bg-slate-900/80 px-2 py-1 font-mono text-[10px] text-cyan-400/70 backdrop-blur">
            DIGITAL TWIN 3D
          </span>
        </div>

        {/* Scan-line overlay */}
        <div
          className="pointer-events-none absolute inset-0 z-[5] opacity-[0.03]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(6,182,212,0.15) 2px, rgba(6,182,212,0.15) 4px)",
          }}
        />

        <Canvas
          camera={{ position: [4, 3, 5], fov: 45 }}
          className="!bg-slate-950"
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        >
          <Suspense fallback={<CanvasLoader />}>
            <ViewerScene asset={asset} autoRotate={autoRotate} />
          </Suspense>
        </Canvas>

        {/* Bottom info bar */}
        <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between border-t border-slate-800/60 bg-slate-950/90 px-4 py-1.5 backdrop-blur">
          <div className="flex items-center gap-4 font-mono text-[10px] text-slate-500">
            <span>
              VERTICES: {((asset.vertexCount as number) ?? 0).toLocaleString()}
            </span>
            <span>
              FACES: {((asset.faceCount as number) ?? 0).toLocaleString()}
            </span>
            <span>
              SIZE: {formatFileSize(asset.fileSizeBytes as number | null)}
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] text-slate-600">
            <MonitorDot className="h-3 w-3 text-emerald-500" />
            <span>RENDERER: WebGL2</span>
          </div>
        </div>
      </div>

      {/* ---- Right: Details Panel (40%) ---- */}
      <ScrollArea className="w-full lg:w-[40%]">
        <div className="space-y-4 p-4">
          {/* Asset Info Card */}
          <Card className="border-slate-700/50 bg-slate-900/80 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg text-slate-100">
                    {asset.assetName as string}
                  </CardTitle>
                  <p className="font-mono text-xs text-slate-500">
                    {asset.assetNumber as string}
                  </p>
                </div>
                <StatusBadge status={status} size="lg" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoRow label="Format" value={(asset.fileFormat as string)?.toUpperCase() ?? "--"} />
                <InfoRow
                  label="Version"
                  value={`v${String(asset.versionString ?? asset.version ?? "1.0")}`}
                />
                <InfoRow label="Owner" value={(asset.ownerName as string) ?? "--"} />
                <InfoRow label="Size" value={formatFileSize(asset.fileSizeBytes as number | null)} />
                <InfoRow
                  label="Vertices"
                  value={((asset.vertexCount as number) ?? 0).toLocaleString()}
                />
                <InfoRow
                  label="Faces"
                  value={((asset.faceCount as number) ?? 0).toLocaleString()}
                />
                <InfoRow
                  label="Created"
                  value={formatDate(asset.createdAt as string | null)}
                />
                <InfoRow
                  label="Updated"
                  value={formatDate(asset.updatedAt as string | null)}
                />
              </div>

              {/* Description */}
              {asset.description && (
                <div className="rounded border border-slate-700/40 bg-slate-800/40 p-2 text-xs text-slate-400">
                  {asset.description as string}
                </div>
              )}

              {/* Tags */}
              {asset.tags && (
                <div className="flex flex-wrap gap-1">
                  {(Array.isArray(asset.tags)
                    ? asset.tags
                    : String(asset.tags).split(",")
                  ).map((tag: string, i: number) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="border-slate-700 bg-slate-800/60 text-[10px] text-slate-400"
                    >
                      {String(tag).trim()}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* IATF 16949 Status Card */}
          <Card className="border-cyan-500/20 bg-gradient-to-br from-slate-900/90 to-cyan-950/20 backdrop-blur-xl shadow-[0_0_15px_rgba(6,182,212,0.08)]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-cyan-400">
                <ShieldCheck className="h-4 w-4" />
                IATF 16949 Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-2xl font-bold ${sc.text}`}>
                  {sc.labelZh} / {sc.label}
                </span>
                {asset.designFrozen && (
                  <span className="flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-xs text-blue-300 ring-1 ring-blue-500/30">
                    <Snowflake className="h-3 w-3" /> Design Frozen
                  </span>
                )}
              </div>

              {asset.designFrozenAt && (
                <p className="font-mono text-[10px] text-slate-500">
                  Frozen at: {formatDate(asset.designFrozenAt as string)}
                </p>
              )}

              {/* Latest tag indicator */}
              {asset.isLatest && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Latest version in chain
                </div>
              )}
            </CardContent>
          </Card>

          {/* SHA-256 Hash */}
          <Card className="border-slate-700/50 bg-slate-900/80 backdrop-blur-xl">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-violet-400">
                <Fingerprint className="h-4 w-4" />
                SHA-256 Hash
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-hidden text-ellipsis rounded border border-slate-700/40 bg-slate-800/60 px-2 py-1.5 font-mono text-[11px] text-violet-300 break-all">
                  {(asset.sha256Hash as string) ?? "No hash available"}
                </code>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0 border-slate-700/60 bg-slate-800/60 text-slate-400 hover:text-violet-400"
                        onClick={() =>
                          copyToClipboard((asset.sha256Hash as string) ?? "")
                        }
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy full hash</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardContent>
          </Card>

          {/* Version History Timeline */}
          {versionChain.length > 0 && (
            <Card className="border-slate-700/50 bg-slate-900/80 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm text-emerald-400">
                  <GitBranch className="h-4 w-4" />
                  Version History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative space-y-0">
                  {versionChain.map(
                    (ver: Record<string, unknown>, idx: number) => {
                      const isCurrent =
                        (ver.id as number) === (asset.id as number);
                      return (
                        <div key={idx} className="relative flex gap-3 pb-3 last:pb-0">
                          {/* Timeline line */}
                          {idx < versionChain.length - 1 && (
                            <div className="absolute left-[7px] top-5 h-full w-px bg-slate-700/60" />
                          )}
                          {/* Dot */}
                          <div
                            className={`mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 ${
                              isCurrent
                                ? "border-cyan-400 bg-cyan-400/30 shadow-[0_0_6px_rgba(6,182,212,0.4)]"
                                : "border-slate-600 bg-slate-800"
                            }`}
                          />
                          {/* Content */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-mono text-xs font-semibold ${
                                  isCurrent ? "text-cyan-400" : "text-slate-400"
                                }`}
                              >
                                v{String(ver.versionString ?? ver.version ?? idx + 1)}
                              </span>
                              <StatusBadge
                                status={(ver.status as AssetStatus) ?? "draft"}
                              />
                              {isCurrent && (
                                <Badge className="bg-cyan-500/20 text-[10px] text-cyan-400 border-cyan-500/30">
                                  CURRENT
                                </Badge>
                              )}
                            </div>
                            <p className="mt-0.5 font-mono text-[10px] text-slate-600">
                              {formatDate(ver.createdAt as string | null)}
                            </p>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assembly Nodes */}
          {assemblyNodes.length > 0 && (
            <Card className="border-slate-700/50 bg-slate-900/80 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm text-amber-400">
                  <Network className="h-4 w-4" />
                  Assembly Nodes ({assemblyNodes.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700/40 hover:bg-transparent">
                      <TableHead className="text-[11px] text-slate-500">Node</TableHead>
                      <TableHead className="text-[11px] text-slate-500">Type</TableHead>
                      <TableHead className="text-[11px] text-slate-500">Parent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assemblyNodes.map(
                      (node: Record<string, unknown>, idx: number) => (
                        <TableRow
                          key={idx}
                          className="border-slate-800/40 hover:bg-slate-800/30"
                        >
                          <TableCell className="py-1.5 text-xs text-slate-300">
                            {(node.nodeName as string) ?? `Node ${idx + 1}`}
                          </TableCell>
                          <TableCell className="py-1.5">
                            <Badge
                              variant="outline"
                              className="border-slate-700 text-[10px] text-slate-400"
                            >
                              {(node.nodeType as string) ?? "part"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-1.5 font-mono text-[10px] text-slate-500">
                            {(node.parentNodeId as string | null) ?? "root"}
                          </TableCell>
                        </TableRow>
                      ),
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <Card className="border-slate-700/50 bg-slate-900/80 backdrop-blur-xl">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-slate-300">
                <Zap className="h-4 w-4 text-amber-400" />
                Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Submit for Review - only for drafts */}
              {status === "draft" && (
                <Button
                  className="w-full justify-start gap-2 border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                  variant="outline"
                  onClick={() => {
                    try {
                      submitForReview.mutate({
                        assetId,
                      });
                    } catch (e) {
                      toast.error("Operation failed");
                    }
                  }}
                  disabled={submitForReview.isPending}
                >
                  {submitForReview.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUpFromLine className="h-4 w-4" />
                  )}
                  Submit for Review
                </Button>
              )}

              {/* Approve - only for pending */}
              {status === "pending_review" && (
                <Button
                  className="w-full justify-start gap-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                  variant="outline"
                  onClick={() => {
                    try {
                      approveAsset.mutate({
                        assetId,
                      });
                    } catch (e) {
                      toast.error("Operation failed");
                    }
                  }}
                  disabled={approveAsset.isPending}
                >
                  {approveAsset.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Approve & Release
                </Button>
              )}

              {/* Freeze - for released, not yet frozen */}
              {status === "released" && !asset.designFrozen && (
                <Button
                  className="w-full justify-start gap-2 border-blue-400/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20"
                  variant="outline"
                  onClick={() => {
                    try {
                      freezeAsset.mutate({
                        assetId,
                      });
                    } catch (e) {
                      toast.error("Operation failed");
                    }
                  }}
                  disabled={freezeAsset.isPending}
                >
                  {freezeAsset.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Snowflake className="h-4 w-4" />
                  )}
                  Freeze Design
                </Button>
              )}

              {/* Verify Hash - always available */}
              <Button
                className="w-full justify-start gap-2 border-violet-500/30 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20"
                variant="outline"
                onClick={() => {
                  try {
                    verifyHash.mutate({
                      assetId,
                      computedHash: String(asset.sha256Hash ?? ""),
                    });
                  } catch (e) {
                    toast.error("Operation failed");
                  }
                }}
                disabled={verifyHash.isPending}
              >
                {verifyHash.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Fingerprint className="h-4 w-4" />
                )}
                Verify Hash Integrity
              </Button>

              {/* Publish New Version - for released assets */}
              {status === "released" && (
                <Button
                  className="w-full justify-start gap-2 border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"
                  variant="outline"
                  onClick={() => {
                    try {
                      publishVersion.mutate({
                        previousAssetId: assetId,
                        storageUrl: `pending://upload/${Date.now()}`,
                        sha256Hash: "0000000000000000000000000000000000000000000000000000000000000000",
                      });
                    } catch (e) {
                      toast.error("Operation failed");
                    }
                  }}
                  disabled={publishVersion.isPending}
                >
                  {publishVersion.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <GitBranch className="h-4 w-4" />
                  )}
                  Publish New Version
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}

/** Simple key-value info row */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <span className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <p className="font-mono text-xs text-slate-300">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Audit Log Tab
// ---------------------------------------------------------------------------

function AuditLogTable() {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const { data, isLoading } = trpc.digitalTwin.listAuditLogs.useQuery(
    actionFilter === "all"
      ? {}
      : { action: actionFilter as AuditAction },
  );

  const logs = (Array.isArray((data as Record<string, unknown>)?.items)
    ? (data as Record<string, unknown>).items
    : []) as Record<string, unknown>[];

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Filter className="h-4 w-4" />
          <span>Action:</span>
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-44 border-slate-700/60 bg-slate-900/80 text-sm text-slate-300">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent className="border-slate-700 bg-slate-900">
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="upload">Upload</SelectItem>
            <SelectItem value="approve">Approve</SelectItem>
            <SelectItem value="reject">Reject</SelectItem>
            <SelectItem value="freeze">Freeze</SelectItem>
            <SelectItem value="obsolete">Obsolete</SelectItem>
            <SelectItem value="download">Download</SelectItem>
            <SelectItem value="hash_verify">Hash Verify</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2 rounded border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span className="font-mono text-xs text-emerald-400">
            IATF 16949 AUDIT TRAIL
          </span>
        </div>
      </div>

      {/* Table with scan-line effect */}
      <div className="relative overflow-hidden rounded-lg border border-slate-700/50 bg-slate-900/60">
        {/* Scan-line overlay */}
        <div
          className="pointer-events-none absolute inset-0 z-10 opacity-[0.03]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(6,182,212,0.2) 1px, rgba(6,182,212,0.2) 2px)",
          }}
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <ClipboardCheck className="mb-3 h-12 w-12 text-slate-700" />
            <span className="text-sm">No audit records found</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700/50 bg-slate-800/50 hover:bg-slate-800/50">
                <TableHead className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
                  Timestamp
                </TableHead>
                <TableHead className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
                  Actor
                </TableHead>
                <TableHead className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
                  Action
                </TableHead>
                <TableHead className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
                  Asset
                </TableHead>
                <TableHead className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
                  Version
                </TableHead>
                <TableHead className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
                  Hash
                </TableHead>
                <TableHead className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
                  Status Change
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log, idx) => {
                const meta = actionMeta(
                  (log.action as AuditAction) ?? "upload",
                );
                const ActionIcon = meta.icon;
                return (
                  <TableRow
                    key={idx}
                    className="border-slate-800/40 transition-colors hover:bg-slate-800/30"
                  >
                    <TableCell className="py-2 font-mono text-xs text-slate-400">
                      {formatDate(log.timestampUtc as string | null)}
                    </TableCell>
                    <TableCell className="py-2 text-xs text-slate-300">
                      {(log.actorName as string) ?? "--"}
                    </TableCell>
                    <TableCell className="py-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border border-slate-700/40 bg-slate-800/60 px-2 py-0.5 font-mono text-[10px] font-semibold ${meta.color}`}
                      >
                        <ActionIcon className="h-3 w-3" />
                        {meta.label}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 text-xs text-slate-300">
                      {(log.assetId as string | number) ?? "--"}
                    </TableCell>
                    <TableCell className="py-2 font-mono text-xs text-slate-400">
                      v{String(log.assetVersion ?? "--")}
                    </TableCell>
                    <TableCell className="py-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help font-mono text-[10px] text-violet-400/70">
                              {truncateHash(log.hashAtAction as string | null)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <code className="break-all text-[10px]">
                              {(log.hashAtAction as string) ?? "N/A"}
                            </code>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="py-2">
                      {log.previousStatus || log.newStatus ? (
                        <div className="flex items-center gap-1 font-mono text-[10px]">
                          <span className="text-slate-500">
                            {(log.previousStatus as string)?.toUpperCase() ?? "—"}
                          </span>
                          <ChevronRight className="h-3 w-3 text-slate-600" />
                          <span className="text-cyan-400">
                            {(log.newStatus as string)?.toUpperCase() ?? "—"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-600">--</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Asset Dialog — with project/user/skill/performance linkages
// ---------------------------------------------------------------------------

const SKILL_LEVELS = [
  { value: "L1", label: "L1 — 初级 / Beginner", description: "基础操作能力" },
  { value: "L2", label: "L2 — 基本 / Basic", description: "独立完成常规任务" },
  { value: "L3", label: "L3 — 中级 / Intermediate", description: "复杂问题处理能力" },
  { value: "L4", label: "L4 — 高级 / Advanced", description: "指导他人、流程优化" },
  { value: "L5", label: "L5 — 专家 / Expert", description: "系统架构、战略决策" },
] as const;

const QUALITY_SCORES = [
  { value: "5", label: "5 — 卓越 / Excellent", color: "text-emerald-400" },
  { value: "4", label: "4 — 良好 / Good", color: "text-green-400" },
  { value: "3", label: "3 — 合格 / Adequate", color: "text-amber-400" },
  { value: "2", label: "2 — 需改善 / Needs Improvement", color: "text-orange-400" },
  { value: "1", label: "1 — 不合格 / Unsatisfactory", color: "text-red-400" },
] as const;

const FILE_FORMATS = [
  { value: "glb", label: "GLB" },
  { value: "gltf", label: "glTF" },
  { value: "step", label: "STEP" },
  { value: "stl", label: "STL" },
  { value: "obj", label: "OBJ" },
  { value: "fbx", label: "FBX" },
  { value: "zw1", label: "ZW1" },
  { value: "sldprt", label: "SolidWorks Part" },
  { value: "sldasm", label: "SolidWorks Assembly" },
  { value: "other", label: "Other" },
] as const;

interface CreateFormState {
  assetName: string;
  assetNumber: string;
  projectId: string;       // "" = not selected
  ownerUserId: string;     // "" = not selected
  fileFormat: string;
  description: string;
  tags: string;
  requiredSkillLevel: string;    // L1-L5
  qualityScore: string;          // 1-5
  qualityNotes: string;          // free text self-assessment
}

const EMPTY_FORM: CreateFormState = {
  assetName: "",
  assetNumber: "",
  projectId: "",
  ownerUserId: "",
  fileFormat: "glb",
  description: "",
  tags: "",
  requiredSkillLevel: "",
  qualityScore: "",
  qualityNotes: "",
};

function CreateAssetDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState<CreateFormState>({ ...EMPTY_FORM });

  // Load projects & users for selectors
  const { data: projectsRaw } = trpc.project.list.useQuery(undefined, { enabled: open });
  const { data: usersRaw } = trpc.users.getAll.useQuery(undefined, { enabled: open });

  const projectList = (projectsRaw ?? []) as Array<{
    id: number; name: string; projectCode?: string | null; status?: string;
    currentPhase?: string | null;
  }>;
  const userList = (usersRaw ?? []) as Array<{
    id: number; name?: string | null; email?: string | null; role?: string;
  }>;

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) setForm({ ...EMPTY_FORM });
  }, [open]);

  const createAsset = trpc.digitalTwin.createAsset.useMutation({
    onSuccess: () => {
      toast.success("Asset created successfully / 数字孪生资产已创建");
      utils.digitalTwin.listAssets.invalidate();
      utils.digitalTwin.getStats.invalidate();
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message),
  });

  // Derive project + user display info for submission
  const selectedProject = projectList.find(p => String(p.id) === form.projectId);
  const selectedUser = userList.find(u => String(u.id) === form.ownerUserId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.assetName.trim()) {
      toast.error("资产名称必填 / Asset name is required");
      return;
    }

    // Build metadata for skill level + quality self-assessment
    const metadata: Record<string, unknown> = {};
    if (form.requiredSkillLevel) metadata.requiredSkillLevel = form.requiredSkillLevel;
    if (form.qualityScore) metadata.qualitySelfAssessment = {
      score: Number(form.qualityScore),
      notes: form.qualityNotes.trim() || undefined,
      assessedAt: new Date().toISOString(),
    };

    createAsset.mutate({
      assetName: form.assetName.trim(),
      assetNumber: form.assetNumber.trim() || undefined,
      projectId: selectedProject ? selectedProject.id : undefined,
      projectCode: selectedProject?.projectCode ?? undefined,
      fileFormat: form.fileFormat as any,
      description: form.description.trim() || undefined,
      ownerUserId: selectedUser ? selectedUser.id : undefined,
      ownerName: selectedUser?.name ?? undefined,
      tags: form.tags.trim() ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : undefined,
      storageUrl: `pending://upload/${Date.now()}`,
      sha256Hash: "0000000000000000000000000000000000000000000000000000000000000000",
      metadata: Object.keys(metadata).length > 0 ? metadata as any : undefined,
    });
  };

  const set = (key: keyof CreateFormState, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-slate-700/60 bg-slate-950 sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-cyan-400">
            <Plus className="h-5 w-5" />
            新建数字孪生资产 / Create Digital Twin Asset
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">

          {/* ── Section 1: Basic Info ── */}
          <div className="space-y-1">
            <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Database className="h-3.5 w-3.5" />
              基本信息 / Basic Info
            </h4>
            <Separator className="bg-slate-800" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400">资产名称 / Asset Name *</label>
            <Input
              placeholder="e.g., GRT-3000 涡轮增压器总成 v1"
              className="border-slate-700/60 bg-slate-900/80 text-slate-200 placeholder:text-slate-600"
              value={form.assetName}
              onChange={e => set("assetName", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400">资产编号 / Asset Number</label>
              <Input
                placeholder="e.g., DT-2026-0042"
                className="border-slate-700/60 bg-slate-900/80 font-mono text-slate-200 placeholder:text-slate-600"
                value={form.assetNumber}
                onChange={e => set("assetNumber", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400">文件格式 / File Format</label>
              <Select value={form.fileFormat} onValueChange={v => set("fileFormat", v)}>
                <SelectTrigger className="border-slate-700/60 bg-slate-900/80 text-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-900">
                  {FILE_FORMATS.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Section 2: Project & Owner Linkage ── */}
          <div className="space-y-1 pt-2">
            <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Network className="h-3.5 w-3.5" />
              项目与负责人关联 / Project & Owner Linkage
            </h4>
            <Separator className="bg-slate-800" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400">
                关联项目 / Linked Project
              </label>
              <Select value={form.projectId} onValueChange={v => set("projectId", v)}>
                <SelectTrigger className="border-slate-700/60 bg-slate-900/80 text-slate-300">
                  <SelectValue placeholder="选择项目..." />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-900 max-h-60">
                  {projectList.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-cyan-400">{p.projectCode ?? `#${p.id}`}</span>
                        <span className="truncate">{p.name}</span>
                        {p.currentPhase && (
                          <Badge variant="outline" className="ml-1 border-slate-600 text-[9px] text-slate-500">
                            {p.currentPhase}
                          </Badge>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProject && (
                <p className="text-[10px] text-cyan-400/70 font-mono">
                  {selectedProject.projectCode} — {selectedProject.currentPhase ?? "N/A"}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400">
                负责工程师 / Responsible Engineer
              </label>
              <Select value={form.ownerUserId} onValueChange={v => set("ownerUserId", v)}>
                <SelectTrigger className="border-slate-700/60 bg-slate-900/80 text-slate-300">
                  <SelectValue placeholder="选择工程师..." />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-900 max-h-60">
                  {userList.map(u => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      <span className="flex items-center gap-2">
                        <span>{u.name ?? "Unknown"}</span>
                        {u.email && (
                          <span className="text-[10px] text-slate-500">{u.email}</span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedUser && (
                <p className="text-[10px] text-emerald-400/70">
                  {selectedUser.name} {selectedUser.email ? `(${selectedUser.email})` : ""}
                </p>
              )}
            </div>
          </div>

          {/* ── Section 3: Skill Level & Quality Assessment ── */}
          <div className="space-y-1 pt-2">
            <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <ClipboardCheck className="h-3.5 w-3.5" />
              技能与质量评估 / Skill & Quality Assessment
            </h4>
            <Separator className="bg-slate-800" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400">
                所需技能等级 / Required Skill Level
              </label>
              <Select value={form.requiredSkillLevel} onValueChange={v => set("requiredSkillLevel", v)}>
                <SelectTrigger className="border-slate-700/60 bg-slate-900/80 text-slate-300">
                  <SelectValue placeholder="选择等级..." />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-900">
                  {SKILL_LEVELS.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      <span className="flex flex-col">
                        <span>{s.label}</span>
                        <span className="text-[10px] text-slate-500">{s.description}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400">
                质量自评分 / Quality Self-Assessment
              </label>
              <Select value={form.qualityScore} onValueChange={v => set("qualityScore", v)}>
                <SelectTrigger className="border-slate-700/60 bg-slate-900/80 text-slate-300">
                  <SelectValue placeholder="自评分数..." />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-900">
                  {QUALITY_SCORES.map(q => (
                    <SelectItem key={q.value} value={q.value}>
                      <span className={q.color}>{q.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.qualityScore && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400">
                质量评估说明 / Quality Assessment Notes
              </label>
              <Input
                placeholder="对资产质量完成度的自我评价..."
                className="border-slate-700/60 bg-slate-900/80 text-slate-200 placeholder:text-slate-600"
                value={form.qualityNotes}
                onChange={e => set("qualityNotes", e.target.value)}
              />
            </div>
          )}

          {/* ── Section 4: Description & Tags ── */}
          <div className="space-y-1 pt-2">
            <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <FileText className="h-3.5 w-3.5" />
              描述与标签 / Description & Tags
            </h4>
            <Separator className="bg-slate-800" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400">描述 / Description</label>
            <Input
              placeholder="资产的详细描述..."
              className="border-slate-700/60 bg-slate-900/80 text-slate-200 placeholder:text-slate-600"
              value={form.description}
              onChange={e => set("description", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400">
              标签 / Tags (逗号分隔 / comma-separated)
            </label>
            <Input
              placeholder="e.g., turbo, assembly, prototype"
              className="border-slate-700/60 bg-slate-900/80 text-slate-200 placeholder:text-slate-600"
              value={form.tags}
              onChange={e => set("tags", e.target.value)}
            />
          </div>

          <Separator className="bg-slate-800" />

          {/* ── Submit ── */}
          <div className="flex items-center justify-between">
            <div className="text-[10px] text-slate-600">
              {selectedProject && <span className="mr-3">项目: {selectedProject.projectCode}</span>}
              {selectedUser && <span className="mr-3">负责人: {selectedUser.name}</span>}
              {form.requiredSkillLevel && <span>技能: {form.requiredSkillLevel}</span>}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-slate-700 text-slate-400 hover:bg-slate-800"
                onClick={() => onOpenChange(false)}
              >
                取消 / Cancel
              </Button>
              <Button
                type="submit"
                className="bg-cyan-600 text-white hover:bg-cyan-500"
                disabled={createAsset.isPending}
              >
                {createAsset.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                创建资产 / Create Asset
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function DigitalTwinHub() {
  const [activeTab, setActiveTab] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [page, setPage] = useState(0);

  // Queries
  const { data: stats, isLoading: statsLoading } =
    trpc.digitalTwin.getStats.useQuery({});

  const {
    data: assetsData,
    isLoading: assetsLoading,
    isFetching: assetsFetching,
  } = trpc.digitalTwin.listAssets.useQuery({
    search: searchQuery || undefined,
    status: statusFilter === "all" ? undefined : (statusFilter as AssetStatus),
    fileFormat: formatFilter === "all" ? undefined : formatFilter,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const assets = (Array.isArray((assetsData as Record<string, unknown>)?.items)
    ? (assetsData as Record<string, unknown>).items
    : []) as Record<string, unknown>[];
  const assetsTotal = Number((assetsData as Record<string, unknown>)?.total ?? 0);
  const statsObj = (stats ?? {}) as Record<string, unknown>;

  const complianceRate = Number(statsObj.complianceRate ?? 0);

  const handleSelectAsset = useCallback((id: number) => {
    setSelectedAssetId(id);
    setViewerOpen(true);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      {/* ================================================================== */}
      {/* TOP HEADER BAR                                                     */}
      {/* ================================================================== */}
      <header className="relative border-b border-slate-800/80 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950">
        {/* Animated gradient line at top */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent" />

        <div className="px-6 py-4">
          {/* Title row */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Glowing icon */}
              <div className="relative">
                <Box className="h-8 w-8 text-cyan-400" />
                <div className="absolute inset-0 animate-ping text-cyan-400 opacity-20">
                  <Box className="h-8 w-8" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-100">
                  <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                    数字孪生中心
                  </span>
                  <span className="ml-2 text-lg font-normal text-slate-500">
                    / Digital Twin Hub
                  </span>
                </h1>
                <p className="mt-0.5 text-xs text-slate-500">
                  IATF 16949 compliant 3D asset management &amp; version control
                </p>
              </div>
            </div>

            {/* IATF compliance badge */}
            <div
              className={`flex items-center gap-2 rounded-full border px-4 py-1.5 font-mono text-sm font-semibold transition-all ${
                complianceRate >= 80
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                  : complianceRate >= 50
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                    : "border-red-500/40 bg-red-500/10 text-red-400"
              }`}
            >
              <Shield className="h-4 w-4" />
              IATF 16949
              <Separator orientation="vertical" className="mx-1 h-4 bg-slate-700" />
              <span>{complianceRate.toFixed(1)}%</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-4 flex flex-wrap gap-3">
            {statsLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading statistics...
              </div>
            ) : (
              <>
                <StatPill
                  icon={Database}
                  label="Total Assets"
                  value={Number(statsObj.total ?? 0)}
                  accent="cyan"
                />
                <StatPill
                  icon={CheckCircle2}
                  label="Released"
                  value={Number(statsObj.released ?? 0)}
                  accent="emerald"
                />
                <StatPill
                  icon={Eye}
                  label="Pending Review"
                  value={Number(statsObj.pendingReview ?? 0)}
                  accent="blue"
                />
                <StatPill
                  icon={Lock}
                  label="Frozen"
                  value={Number(statsObj.frozen ?? 0)}
                  accent="violet"
                />
                <StatPill
                  icon={Package}
                  label="GLB Viewable"
                  value={Number(statsObj.glbViewable ?? 0)}
                  accent="amber"
                />
                <StatPill
                  icon={Gauge}
                  label="Compliance"
                  value={`${complianceRate.toFixed(1)}%`}
                  accent="emerald"
                />
              </>
            )}
          </div>
        </div>

        {/* Bottom gradient line */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
      </header>

      {/* ================================================================== */}
      {/* MAIN CONTENT                                                        */}
      {/* ================================================================== */}
      <main className="flex-1 px-6 py-5">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <TabsList className="overflow-x-auto scrollbar-hide border border-slate-700/50 bg-slate-900/80">
              <TabsTrigger
                value="grid"
                className="data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-400"
              >
                <Package className="mr-1.5 h-4 w-4" />
                资产网格 / Asset Grid
              </TabsTrigger>
              <TabsTrigger
                value="audit"
                className="data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-400"
              >
                <FileText className="mr-1.5 h-4 w-4" />
                IATF 审计日志 / Audit Trail
              </TabsTrigger>
            </TabsList>

            {/* Search + filters (visible on grid tab) */}
            {activeTab === "grid" && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    placeholder="Search assets..."
                    className="w-64 border-slate-700/60 bg-slate-900/80 pl-9 text-sm text-slate-200 placeholder:text-slate-600"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(0);
                    }}
                  />
                </div>

                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setStatusFilter(v);
                    setPage(0);
                  }}
                >
                  <SelectTrigger className="w-36 border-slate-700/60 bg-slate-900/80 text-sm text-slate-300">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="border-slate-700 bg-slate-900">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending_review">Pending Review</SelectItem>
                    <SelectItem value="released">Released</SelectItem>
                    <SelectItem value="obsolete">Obsolete</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={formatFilter}
                  onValueChange={(v) => {
                    setFormatFilter(v);
                    setPage(0);
                  }}
                >
                  <SelectTrigger className="w-32 border-slate-700/60 bg-slate-900/80 text-sm text-slate-300">
                    <SelectValue placeholder="Format" />
                  </SelectTrigger>
                  <SelectContent className="border-slate-700 bg-slate-900">
                    <SelectItem value="all">All Formats</SelectItem>
                    <SelectItem value="glb">GLB</SelectItem>
                    <SelectItem value="gltf">glTF</SelectItem>
                    <SelectItem value="step">STEP</SelectItem>
                    <SelectItem value="stl">STL</SelectItem>
                    <SelectItem value="obj">OBJ</SelectItem>
                    <SelectItem value="fbx">FBX</SelectItem>
                    <SelectItem value="zw1">ZW1</SelectItem>
                    <SelectItem value="sldprt">SolidWorks Part</SelectItem>
                    <SelectItem value="sldasm">SolidWorks Assembly</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  className="gap-2 bg-cyan-600 text-white hover:bg-cyan-500"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  New Asset
                </Button>
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* TAB 1: ASSET GRID                                              */}
          {/* ============================================================== */}
          <TabsContent value="grid" className="mt-5">
            {assetsLoading ? (
              <div className="flex items-center justify-center py-32">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
                  <span className="font-mono text-sm text-cyan-400/60">
                    Loading digital twin assets...
                  </span>
                </div>
              </div>
            ) : assets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32">
                <Box className="mb-4 h-16 w-16 text-slate-700" />
                <h3 className="text-lg font-semibold text-slate-400">
                  No assets found
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {searchQuery || statusFilter !== "all" || formatFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Create your first digital twin asset to get started"}
                </p>
                {!searchQuery &&
                  statusFilter === "all" &&
                  formatFilter === "all" && (
                    <Button
                      className="mt-4 gap-2 bg-cyan-600 text-white hover:bg-cyan-500"
                      onClick={() => setCreateOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                      Create First Asset
                    </Button>
                  )}
              </div>
            ) : (
              <>
                {/* Fetching indicator */}
                {assetsFetching && !assetsLoading && (
                  <div className="mb-3 flex items-center gap-2 text-xs text-cyan-400/60">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Updating...
                  </div>
                )}

                {/* Grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {assets.map((asset, idx) => (
                    <AssetCard
                      key={(asset.id as number) ?? idx}
                      asset={asset}
                      onSelect={handleSelectAsset}
                    />
                  ))}
                </div>

                {/* Pagination */}
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Showing {page * PAGE_SIZE + 1}–
                    {page * PAGE_SIZE + assets.length} of {assetsTotal} assets
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-700 bg-slate-900/80 text-slate-400 hover:bg-slate-800"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-700 bg-slate-900/80 text-slate-400 hover:bg-slate-800"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={assets.length < PAGE_SIZE}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* ============================================================== */}
          {/* TAB 2: AUDIT TRAIL                                             */}
          {/* ============================================================== */}
          <TabsContent value="audit" className="mt-5">
            <AuditLogTable />
          </TabsContent>
        </Tabs>
      </main>

      {/* ================================================================== */}
      {/* 3D VIEWER DIALOG                                                    */}
      {/* ================================================================== */}
      <Dialog
        open={viewerOpen}
        onOpenChange={(open) => {
          setViewerOpen(open);
          if (!open) setSelectedAssetId(null);
        }}
      >
        <DialogContent className="h-[90vh] max-w-[95vw] border-slate-700/60 bg-slate-950 p-0 sm:max-w-[95vw]">
          <DialogHeader className="border-b border-slate-800/60 bg-slate-900/50 px-4 py-2.5">
            <DialogTitle className="flex items-center gap-2 text-sm text-cyan-400">
              <Maximize2 className="h-4 w-4" />
              <span className="font-mono text-xs text-slate-500">
                DIGITAL TWIN 3D VIEWER
              </span>
              <Separator
                orientation="vertical"
                className="mx-1 h-4 bg-slate-700"
              />
              <span className="text-slate-300">Asset #{selectedAssetId}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedAssetId !== null && (
            <ViewerDialogContent
              assetId={selectedAssetId}
              onClose={() => {
                setViewerOpen(false);
                setSelectedAssetId(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/* CREATE ASSET DIALOG                                                 */}
      {/* ================================================================== */}
      <CreateAssetDialog open={createOpen} onOpenChange={setCreateOpen} />

      {/* ================================================================== */}
      {/* FOOTER STATUS BAR                                                   */}
      {/* ================================================================== */}
      <footer className="relative border-t border-slate-800/60 bg-slate-950 px-6 py-2">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/15 to-transparent" />
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-600">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              SYSTEM ONLINE
            </span>
            <span>THREE.js r182</span>
            <span>WebGL2</span>
          </div>
          <div className="flex items-center gap-4">
            <span>IATF 16949:2016</span>
            <span>SHA-256 INTEGRITY</span>
            <span className="text-cyan-500/60">GRT DIGITAL TWIN v1.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
