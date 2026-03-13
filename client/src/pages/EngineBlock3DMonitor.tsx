/**
 * EngineBlock3DMonitor — Closed-Loop Adaptive Cleaning Control Digital Twin
 *
 * 3D wireframe engine block with 20 cavity channel nodes.
 * Simulates real-time particle detection → PLC targeted re-wash → clearance.
 *
 * Dependencies: @react-three/fiber, @react-three/drei, three
 */
import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, Html } from "@react-three/drei";
import * as THREE from "three";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity,
  Radio,
  ShieldCheck,
  AlertTriangle,
  Cpu,
  Droplets,
  TerminalSquare,
  Gauge,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

// ═══════════════════════════════════════════════════════════════
// Types & Constants
// ═══════════════════════════════════════════════════════════════

interface ChannelNode {
  id: number;
  position: [number, number, number];
  status: "clean" | "contaminated" | "rewashing";
  particleSize?: number;
}

interface LogEntry {
  timestamp: string;
  type: "alert" | "command" | "status" | "success" | "info";
  message: string;
}

const ENGINE_ID = "RFID-ENG-2026-X7";

// 20 cavity channel positions distributed inside/around the engine block
const CHANNEL_POSITIONS: [number, number, number][] = [
  // Top surface (exhaust ports)
  [-1.2, 1.05, -0.6], [-0.4, 1.05, -0.6], [0.4, 1.05, -0.6], [1.2, 1.05, -0.6],
  [-1.2, 1.05, 0.6], [-0.4, 1.05, 0.6], [0.4, 1.05, 0.6], [1.2, 1.05, 0.6],
  // Internal mid-plane (cylinder bores)
  [-1.0, 0.0, 0.0], [-0.33, 0.0, 0.0], [0.33, 0.0, 0.0], [1.0, 0.0, 0.0],
  // Bottom oil galleries
  [-1.0, -0.9, -0.4], [-0.33, -0.9, -0.4], [0.33, -0.9, -0.4], [1.0, -0.9, -0.4],
  [-1.0, -0.9, 0.4], [-0.33, -0.9, 0.4], [0.33, -0.9, 0.4], [1.0, -0.9, 0.4],
];

const NODE_RADIUS = 0.12;

// ═══════════════════════════════════════════════════════════════
// 3D Sub-Components
// ═══════════════════════════════════════════════════════════════

/** Pulsing cavity channel node — changes color by status */
function CavityNode({
  node,
  isTarget,
}: {
  node: ChannelNode;
  isTarget: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  // Colors
  const colorMap = useMemo(
    () => ({
      clean: new THREE.Color(0x00ff88),
      contaminated: new THREE.Color(0xff2244),
      rewashing: new THREE.Color(0xffaa00),
    }),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const target = colorMap[node.status];

    // Animate color
    if (materialRef.current) {
      materialRef.current.color.lerp(target, 0.08);
      materialRef.current.emissive.lerp(target, 0.08);

      // Pulse intensity based on status
      if (node.status === "contaminated") {
        materialRef.current.emissiveIntensity = 1.5 + Math.sin(t * 8) * 1.0;
      } else if (node.status === "rewashing") {
        materialRef.current.emissiveIntensity = 0.8 + Math.sin(t * 4) * 0.5;
      } else {
        materialRef.current.emissiveIntensity = 0.3 + Math.sin(t * 1.5 + node.id) * 0.15;
      }
    }

    // Scale pulse for contaminated
    if (meshRef.current) {
      if (node.status === "contaminated") {
        const scale = 1.0 + Math.sin(t * 6) * 0.25;
        meshRef.current.scale.setScalar(scale);
      } else {
        meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.05);
      }
    }

    // Glow ring
    if (glowRef.current) {
      const glowScale = node.status === "clean" ? 1.8 : 2.5 + Math.sin(t * 5) * 0.5;
      glowRef.current.scale.setScalar(glowScale);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity =
        node.status === "contaminated" ? 0.25 + Math.sin(t * 8) * 0.15 : 0.08;
    }
  });

  return (
    <group position={node.position}>
      {/* Glow sphere */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[NODE_RADIUS, 16, 16]} />
        <meshBasicMaterial
          color={colorMap[node.status]}
          transparent
          opacity={0.1}
          depthWrite={false}
        />
      </mesh>

      {/* Core sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[NODE_RADIUS, 24, 24]} />
        <meshStandardMaterial
          ref={materialRef}
          color={colorMap[node.status]}
          emissive={colorMap[node.status]}
          emissiveIntensity={0.4}
          metalness={0.7}
          roughness={0.2}
          transparent
          opacity={0.92}
        />
      </mesh>

      {/* Channel label */}
      <Html position={[0, NODE_RADIUS + 0.12, 0]} center distanceFactor={5} style={{ pointerEvents: "none" }}>
        <div
          className="font-mono text-[10px] font-bold px-1 rounded whitespace-nowrap"
          style={{
            color: node.status === "clean" ? "#00ff88" : node.status === "contaminated" ? "#ff2244" : "#ffaa00",
            textShadow: "0 0 4px rgba(0,0,0,0.9)",
          }}
        >
          {`CH${String(node.id + 1).padStart(2, "0")}`}
        </div>
      </Html>
    </group>
  );
}

/** Wireframe engine block shell */
function EngineBlockShell() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      // Subtle breathing rotation
      groupRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.15) * 0.02;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Main block — wireframe outer shell */}
      <mesh>
        <boxGeometry args={[3.2, 2.2, 1.6]} />
        <meshStandardMaterial
          color="#1a3a5c"
          wireframe
          transparent
          opacity={0.35}
        />
      </mesh>

      {/* Solid inner block — translucent core */}
      <mesh>
        <boxGeometry args={[3.0, 2.0, 1.4]} />
        <meshStandardMaterial
          color="#0a1929"
          transparent
          opacity={0.15}
          metalness={0.9}
          roughness={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Edge highlight wireframe */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(3.2, 2.2, 1.6)]} />
        <lineBasicMaterial color="#3388cc" transparent opacity={0.6} />
      </lineSegments>

      {/* Cylinder bore cavities (4 inline) */}
      {[-1.0, -0.33, 0.33, 1.0].map((x, i) => (
        <group key={`bore-${i}`} position={[x, 0.2, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.28, 0.28, 1.6, 16, 1, true]} />
            <meshStandardMaterial
              color="#1a5a8c"
              wireframe
              transparent
              opacity={0.2}
            />
          </mesh>
        </group>
      ))}

      {/* Top intake manifold ridge */}
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[2.8, 0.15, 1.2]} />
        <meshStandardMaterial
          color="#1a3a5c"
          wireframe
          transparent
          opacity={0.25}
        />
      </mesh>

      {/* Oil pan base */}
      <mesh position={[0, -1.2, 0]}>
        <boxGeometry args={[2.6, 0.2, 1.3]} />
        <meshStandardMaterial
          color="#1a3a5c"
          wireframe
          transparent
          opacity={0.2}
        />
      </mesh>

      {/* Internal coolant passages — tubes connecting channels */}
      {[
        [[-1.2, 1.05, -0.6], [-1.0, 0, 0]],
        [[-0.4, 1.05, -0.6], [-0.33, 0, 0]],
        [[0.4, 1.05, -0.6], [0.33, 0, 0]],
        [[1.2, 1.05, -0.6], [1.0, 0, 0]],
        [[-1.0, 0, 0], [-1.0, -0.9, -0.4]],
        [[-0.33, 0, 0], [-0.33, -0.9, -0.4]],
        [[0.33, 0, 0], [0.33, -0.9, -0.4]],
        [[1.0, 0, 0], [1.0, -0.9, -0.4]],
      ].map(([start, end], i) => {
        const s = new THREE.Vector3(...(start as [number, number, number]));
        const e = new THREE.Vector3(...(end as [number, number, number]));
        const mid = s.clone().add(e).multiplyScalar(0.5);
        const dir = e.clone().sub(s);
        const len = dir.length();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          dir.normalize(),
        );
        return (
          <mesh key={`tube-${i}`} position={mid} quaternion={quaternion}>
            <cylinderGeometry args={[0.02, 0.02, len, 6]} />
            <meshBasicMaterial color="#2266aa" transparent opacity={0.3} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Camera controller — auto-focuses on contaminated node */
function CameraFocusController({
  targetPosition,
}: {
  targetPosition: [number, number, number] | null;
}) {
  const { camera } = useThree();
  const targetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const posRef = useRef<THREE.Vector3>(new THREE.Vector3(4, 3, 4));

  useFrame(() => {
    if (targetPosition) {
      // Zoom toward contaminated node
      const tp = new THREE.Vector3(...targetPosition);
      const offset = tp.clone().add(new THREE.Vector3(1.5, 1.2, 2.0));
      posRef.current.lerp(offset, 0.02);
      targetRef.current.lerp(tp, 0.03);
    } else {
      // Return to overview
      posRef.current.lerp(new THREE.Vector3(4, 3, 4), 0.015);
      targetRef.current.lerp(new THREE.Vector3(0, 0, 0), 0.015);
    }

    camera.position.copy(posRef.current);
    camera.lookAt(targetRef.current);
  });

  return null;
}

/** Scanning sweep plane */
function ScanPlane() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.position.x = Math.sin(clock.getElapsedTime() * 0.4) * 1.6;
      (meshRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.04 + Math.sin(clock.getElapsedTime() * 2) * 0.02;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[1.6, 2.2]} />
      <meshBasicMaterial
        color="#00aaff"
        transparent
        opacity={0.05}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// ═══════════════════════════════════════════════════════════════
// 3D Scene Composition
// ═══════════════════════════════════════════════════════════════

function EngineBlockScene({
  nodes,
  focusTarget,
}: {
  nodes: ChannelNode[];
  focusTarget: number | null;
}) {
  const targetPos = focusTarget !== null ? nodes[focusTarget]?.position ?? null : null;

  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 8, 5]} intensity={0.4} color="#aaccff" />
      <pointLight position={[-3, 2, 3]} intensity={0.3} color="#0066ff" />
      <pointLight position={[3, -2, -3]} intensity={0.2} color="#00ff88" />

      <CameraFocusController targetPosition={targetPos} />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={12}
        makeDefault
      />

      <EngineBlockShell />
      {nodes.map((node) => (
        <CavityNode
          key={node.id}
          node={node}
          isTarget={focusTarget === node.id}
        />
      ))}

      <ScanPlane />

      <Grid
        position={[0, -1.5, 0]}
        args={[20, 20]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#1a3a5c"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#2255aa"
        fadeDistance={12}
        fadeStrength={1}
        infiniteGrid
      />

      {/* Hemisphere light replaces Environment preset (avoids CDN fetch that fails behind GFW) */}
      <hemisphereLight args={["#b1e1ff", "#1a3a5c", 0.6]} />
    </>
  );
}

/** Suspense fallback inside Canvas — uses Html from drei (proven pattern) */
function CanvasLoader() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        <span className="font-mono text-xs text-cyan-400/70">Initializing 3D Engine...</span>
      </div>
    </Html>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════

export default function EngineBlock3DMonitor() {
  const { t } = useLanguage();
  const [nodes, setNodes] = useState<ChannelNode[]>(() =>
    CHANNEL_POSITIONS.map((pos, i) => ({
      id: i,
      position: pos,
      status: "clean" as const,
    })),
  );
  const [logs, setLogs] = useState<LogEntry[]>([
    { timestamp: ts(), type: "info", message: `System initialized. Engine Block ${ENGINE_ID} loaded.` },
    { timestamp: ts(), type: "info", message: "20 cavity channels online. Particle scanner active." },
    { timestamp: ts(), type: "info", message: "PLC handshake OK. Valve array standby." },
  ]);
  const [focusTarget, setFocusTarget] = useState<number | null>(null);
  const [stats, setStats] = useState({ detected: 0, cleared: 0, activeAlerts: 0 });
  const scrollRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((type: LogEntry["type"], message: string) => {
    setLogs((prev) => [...prev.slice(-80), { timestamp: ts(), type, message }]);
  }, []);

  // Auto-scroll log
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // ── Core Simulation Loop ──
  useEffect(() => {
    const interval = setInterval(() => {
      setNodes((prev) => {
        // Find clean nodes available for contamination
        const cleanNodes = prev.filter((n) => n.status === "clean");
        if (cleanNodes.length === 0) return prev;

        // Random chance of particle detection (roughly every ~4-6s with 2s interval)
        if (Math.random() > 0.4) return prev;

        // Pick a random clean channel
        const target = cleanNodes[Math.floor(Math.random() * cleanNodes.length)];
        const ch = String(target.id + 1).padStart(2, "0");
        const particleSize = 400 + Math.floor(Math.random() * 250); // 400-650μm
        const particleType = ["metallic", "ceramic", "polymer", "oxide"][Math.floor(Math.random() * 4)];

        // Contaminate
        const updated = prev.map((n) =>
          n.id === target.id ? { ...n, status: "contaminated" as const, particleSize } : n,
        );

        // Focus camera on this node
        setFocusTarget(target.id);

        // Log alert
        addLog("alert", `Channel #${ch}: ${particleSize}μm ${particleType} particle detected!`);
        addLog("command", `Transmitting Targeted High-Pressure Re-wash command to Valve Array ${ch}...`);

        setStats((s) => ({ ...s, detected: s.detected + 1, activeAlerts: s.activeAlerts + 1 }));

        // After 1.5s → start rewashing
        setTimeout(() => {
          setNodes((curr) =>
            curr.map((n) =>
              n.id === target.id && n.status === "contaminated"
                ? { ...n, status: "rewashing" as const }
                : n,
            ),
          );
          addLog("status", `Channel #${ch}: Re-washing in progress... Pressure: ${(3.5 + Math.random() * 2).toFixed(1)} bar`);
        }, 1500);

        // After 4s → cleared
        setTimeout(() => {
          setNodes((curr) =>
            curr.map((n) =>
              n.id === target.id && (n.status === "rewashing" || n.status === "contaminated")
                ? { ...n, status: "clean" as const, particleSize: undefined }
                : n,
            ),
          );
          setFocusTarget((current) => (current === target.id ? null : current));
          addLog("success", `Channel #${ch} cleared. Residual particle count: 0. ✓`);
          setStats((s) => ({ ...s, cleared: s.cleared + 1, activeAlerts: Math.max(0, s.activeAlerts - 1) }));
        }, 4500);

        return updated;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [addLog]);

  const activeAlertNodes = nodes.filter((n) => n.status !== "clean");

  return (
    <div className="h-screen flex flex-col bg-[#050d1a] text-white overflow-hidden">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-cyan-900/40 bg-[#0a1628]/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-cyan-400" />
            <span className="font-bold text-sm tracking-wider text-cyan-300">
              CLOSED-LOOP ADAPTIVE CLEANING CONTROL
            </span>
          </div>
          <span className="text-[10px] text-cyan-700 font-mono">v2.1.0</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs">
            <Radio className="h-3.5 w-3.5 text-green-400 animate-pulse" />
            <span className="text-green-400 font-mono">RFID LINKED</span>
          </div>
          <Badge className="bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono text-xs px-2">
            {ENGINE_ID}
          </Badge>
          <div className="flex items-center gap-1.5 text-xs">
            <Activity className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-cyan-500 font-mono">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex flex-1 min-h-0">
        {/* ── 3D Viewport ── */}
        <div className="flex-1 relative">
          <Canvas
            camera={{ position: [4, 3, 4], fov: 45, near: 0.1, far: 100 }}
            className="!bg-slate-950"
            gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
          >
            <Suspense fallback={<CanvasLoader />}>
              <EngineBlockScene nodes={nodes} focusTarget={focusTarget} />
            </Suspense>
          </Canvas>

          {/* Stats Overlay (bottom-left) */}
          <div className="absolute bottom-4 left-4 flex gap-2">
            <StatPill
              icon={<ShieldCheck className="h-3.5 w-3.5" />}
              label="Clean"
              value={nodes.filter((n) => n.status === "clean").length}
              color="text-green-400"
            />
            <StatPill
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              label="Alerts"
              value={stats.activeAlerts}
              color={stats.activeAlerts > 0 ? "text-red-400" : "text-gray-500"}
            />
            <StatPill
              icon={<Gauge className="h-3.5 w-3.5" />}
              label="Detected"
              value={stats.detected}
              color="text-yellow-400"
            />
            <StatPill
              icon={<ShieldCheck className="h-3.5 w-3.5" />}
              label="Cleared"
              value={stats.cleared}
              color="text-cyan-400"
            />
          </div>

          {/* Channel Status Grid (bottom-right) */}
          <div className="absolute bottom-4 right-[340px] bg-[#0a1628]/80 backdrop-blur border border-cyan-900/40 rounded-lg p-2.5">
            <div className="text-[10px] text-cyan-600 font-mono mb-1.5 tracking-wider">CHANNEL STATUS MAP</div>
            <div className="grid grid-cols-10 gap-1">
              {nodes.map((node) => (
                <div
                  key={node.id}
                  className={`w-5 h-5 rounded-sm flex items-center justify-center text-[8px] font-mono font-bold cursor-pointer transition-all ${
                    node.status === "clean"
                      ? "bg-green-900/40 text-green-400 border border-green-800/40"
                      : node.status === "contaminated"
                        ? "bg-red-900/60 text-red-300 border border-red-600 animate-pulse"
                        : "bg-yellow-900/50 text-yellow-300 border border-yellow-700"
                  }`}
                  title={`CH${String(node.id + 1).padStart(2, "0")}: ${node.status}${node.particleSize ? ` (${node.particleSize}μm)` : ""}`}
                  onClick={() => setFocusTarget(node.status !== "clean" ? node.id : null)}
                >
                  {node.id + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Focus info overlay */}
          {focusTarget !== null && nodes[focusTarget] && (
            <div className="absolute top-4 left-4 bg-red-950/80 backdrop-blur border border-red-700/60 rounded-lg px-3 py-2 animate-in fade-in">
              <div className="text-[10px] text-red-400 font-mono tracking-wider">FOCUS TARGET</div>
              <div className="text-sm font-bold text-red-300 font-mono">
                Channel #{String(focusTarget + 1).padStart(2, "0")}
              </div>
              {nodes[focusTarget].particleSize && (
                <div className="text-xs text-red-400/80 font-mono">
                  Particle: {nodes[focusTarget].particleSize}μm
                </div>
              )}
              <div className="text-xs mt-0.5">
                <Badge
                  className={`text-[10px] px-1.5 py-0 ${
                    nodes[focusTarget].status === "contaminated"
                      ? "bg-red-700 text-red-100"
                      : nodes[focusTarget].status === "rewashing"
                        ? "bg-yellow-700 text-yellow-100"
                        : "bg-green-700 text-green-100"
                  }`}
                >
                  {nodes[focusTarget].status.toUpperCase()}
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* ── Right Panel: PLC Communication Log ── */}
        <div className="w-[330px] border-l border-cyan-900/40 bg-[#060e1c] flex flex-col shrink-0">
          {/* Panel header */}
          <div className="px-3 py-2 border-b border-cyan-900/40 flex items-center gap-2">
            <TerminalSquare className="h-4 w-4 text-cyan-500" />
            <span className="text-xs font-bold text-cyan-400 tracking-wider">PLC COMM LOG</span>
            <div className="ml-auto flex items-center gap-1">
              <Cpu className="h-3 w-3 text-cyan-700" />
              <span className="text-[10px] text-cyan-700 font-mono">
                {logs.length} entries
              </span>
            </div>
          </div>

          {/* Active alerts summary */}
          {activeAlertNodes.length > 0 && (
            <div className="px-3 py-1.5 border-b border-red-900/40 bg-red-950/30">
              <div className="text-[10px] text-red-400 font-mono tracking-wider mb-1">
                ACTIVE ALERTS ({activeAlertNodes.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {activeAlertNodes.map((n) => (
                  <Badge
                    key={n.id}
                    className={`text-[9px] px-1 py-0 cursor-pointer ${
                      n.status === "contaminated"
                        ? "bg-red-800 text-red-200"
                        : "bg-yellow-800 text-yellow-200"
                    }`}
                    onClick={() => setFocusTarget(n.id)}
                  >
                    CH{String(n.id + 1).padStart(2, "0")}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Log entries */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 scrollbar-hide">
            <div className="space-y-0.5">
              {logs.map((log, i) => (
                <LogLine key={i} entry={log} />
              ))}
              <div className="h-2" />
            </div>
          </div>

          {/* Panel footer */}
          <div className="px-3 py-1.5 border-t border-cyan-900/40 text-[10px] text-cyan-800 font-mono flex items-center justify-between">
            <span>PLC: Siemens S7-1500 | Protocol: OPC-UA</span>
            <span className="text-green-600">● CONNECTED</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// UI Helpers
// ═══════════════════════════════════════════════════════════════

function StatPill({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-[#0a1628]/80 backdrop-blur border border-cyan-900/40 rounded-md px-2.5 py-1.5 flex items-center gap-1.5">
      <span className={color}>{icon}</span>
      <div>
        <div className={`text-sm font-bold font-mono ${color}`}>{value}</div>
        <div className="text-[9px] text-cyan-700 font-mono tracking-wider">{label}</div>
      </div>
    </div>
  );
}

function LogLine({ entry }: { entry: LogEntry }) {
  const colorMap: Record<LogEntry["type"], string> = {
    alert: "text-red-400",
    command: "text-cyan-400",
    status: "text-yellow-400",
    success: "text-green-400",
    info: "text-cyan-700",
  };
  const prefixMap: Record<LogEntry["type"], string> = {
    alert: "[ALERT]",
    command: "[PLC CMD]",
    status: "[STATUS]",
    success: "[SUCCESS]",
    info: "[INFO]",
  };

  return (
    <div className="font-mono text-[11px] leading-relaxed">
      <span className="text-cyan-900 mr-1">{entry.timestamp}</span>
      <span className={`${colorMap[entry.type]} font-bold mr-1`}>
        {prefixMap[entry.type]}
      </span>
      <span className={entry.type === "info" ? "text-cyan-800" : "text-gray-300"}>
        {entry.message}
      </span>
    </div>
  );
}

function ts(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}
