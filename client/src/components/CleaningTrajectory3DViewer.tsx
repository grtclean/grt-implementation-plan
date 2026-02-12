import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Play, Pause, RotateCcw, Eye, Box } from "lucide-react";

// 零件特征类型
type FeatureType = 
  | "blind_hole" 
  | "ribbing" 
  | "sealing_face" 
  | "deep_cavity" 
  | "thread" 
  | "groove" 
  | "flat_surface" 
  | "complex_geometry";

// 清洗动作类型
type CleaningAction = 
  | "high_pressure_spray" 
  | "oscillating_nozzle" 
  | "pulsed_spray" 
  | "targeted_flush" 
  | "ultrasonic" 
  | "air_knife";

// 轨迹点
interface TrajectoryPoint {
  x: number;
  y: number;
  z: number;
  action: CleaningAction;
  pressure: number;
  duration: number;
  nozzleAngle: number;
}

// 清洗策略
interface CleaningStrategy {
  featureType: FeatureType;
  featureName: string;
  featureNameEn: string;
  trajectory: TrajectoryPoint[];
  totalDuration: number;
  description: string;
}

// 预定义的清洗策略轨迹
const CLEANING_STRATEGIES: CleaningStrategy[] = [
  {
    featureType: "blind_hole",
    featureName: "盲孔清洗",
    featureNameEn: "Blind Hole Cleaning",
    description: "螺旋运动，15°倾斜角度，脉冲喷射确保盲孔底部残留物清除",
    totalDuration: 15,
    trajectory: [
      { x: 0, y: 0, z: 0, action: "high_pressure_spray", pressure: 120, duration: 2, nozzleAngle: 0 },
      { x: 0, y: 0, z: 20, action: "pulsed_spray", pressure: 150, duration: 3, nozzleAngle: 15 },
      { x: 5, y: 5, z: 40, action: "oscillating_nozzle", pressure: 100, duration: 3, nozzleAngle: 15 },
      { x: -5, y: 5, z: 60, action: "pulsed_spray", pressure: 130, duration: 3, nozzleAngle: 15 },
      { x: -5, y: -5, z: 80, action: "oscillating_nozzle", pressure: 100, duration: 2, nozzleAngle: 15 },
      { x: 5, y: -5, z: 100, action: "targeted_flush", pressure: 80, duration: 2, nozzleAngle: 0 },
    ],
  },
  {
    featureType: "ribbing",
    featureName: "加强筋清洗",
    featureNameEn: "Ribbing Cleaning",
    description: "45°推扫沿筋根部，多角度扫描喷射覆盖加强筋侧面",
    totalDuration: 12,
    trajectory: [
      { x: -40, y: 0, z: 30, action: "high_pressure_spray", pressure: 100, duration: 2, nozzleAngle: -45 },
      { x: -20, y: 0, z: 30, action: "oscillating_nozzle", pressure: 110, duration: 2, nozzleAngle: -30 },
      { x: 0, y: 0, z: 30, action: "oscillating_nozzle", pressure: 110, duration: 2, nozzleAngle: 0 },
      { x: 20, y: 0, z: 30, action: "oscillating_nozzle", pressure: 110, duration: 2, nozzleAngle: 30 },
      { x: 40, y: 0, z: 30, action: "high_pressure_spray", pressure: 100, duration: 2, nozzleAngle: 45 },
      { x: 0, y: 0, z: 10, action: "air_knife", pressure: 60, duration: 2, nozzleAngle: 0 },
    ],
  },
  {
    featureType: "sealing_face",
    featureName: "密封面清洗",
    featureNameEn: "Sealing Face Cleaning",
    description: "高频重叠扫描，低压精密清洗确保密封面无残留",
    totalDuration: 18,
    trajectory: [
      { x: -30, y: -30, z: 20, action: "targeted_flush", pressure: 60, duration: 3, nozzleAngle: 0 },
      { x: 30, y: -30, z: 20, action: "targeted_flush", pressure: 60, duration: 3, nozzleAngle: 0 },
      { x: 30, y: 30, z: 20, action: "targeted_flush", pressure: 60, duration: 3, nozzleAngle: 0 },
      { x: -30, y: 30, z: 20, action: "targeted_flush", pressure: 60, duration: 3, nozzleAngle: 0 },
      { x: -30, y: -30, z: 20, action: "targeted_flush", pressure: 60, duration: 3, nozzleAngle: 0 },
      { x: 0, y: 0, z: 10, action: "air_knife", pressure: 80, duration: 3, nozzleAngle: 0 },
    ],
  },
  {
    featureType: "deep_cavity",
    featureName: "深腔清洗",
    featureNameEn: "Deep Cavity Cleaning",
    description: "分层递进清洗，从腔体底部向上逐层清洗",
    totalDuration: 25,
    trajectory: [
      { x: 0, y: 0, z: 100, action: "high_pressure_spray", pressure: 140, duration: 4, nozzleAngle: 0 },
      { x: 10, y: 10, z: 80, action: "pulsed_spray", pressure: 130, duration: 4, nozzleAngle: 15 },
      { x: -10, y: 10, z: 60, action: "oscillating_nozzle", pressure: 120, duration: 4, nozzleAngle: 30 },
      { x: -10, y: -10, z: 40, action: "oscillating_nozzle", pressure: 110, duration: 4, nozzleAngle: 45 },
      { x: 10, y: -10, z: 20, action: "pulsed_spray", pressure: 100, duration: 4, nozzleAngle: 30 },
      { x: 0, y: 0, z: 10, action: "air_knife", pressure: 70, duration: 5, nozzleAngle: 0 },
    ],
  },
  {
    featureType: "thread",
    featureName: "螺纹清洗",
    featureNameEn: "Thread Cleaning",
    description: "螺旋轨迹清洗，确保螺纹牙间残留物清除",
    totalDuration: 20,
    trajectory: [
      { x: 0, y: 20, z: 0, action: "targeted_flush", pressure: 90, duration: 3, nozzleAngle: 60 },
      { x: 14, y: 14, z: 20, action: "pulsed_spray", pressure: 100, duration: 3, nozzleAngle: 45 },
      { x: 20, y: 0, z: 40, action: "pulsed_spray", pressure: 100, duration: 3, nozzleAngle: 45 },
      { x: 14, y: -14, z: 60, action: "pulsed_spray", pressure: 100, duration: 3, nozzleAngle: 45 },
      { x: 0, y: -20, z: 80, action: "pulsed_spray", pressure: 100, duration: 3, nozzleAngle: 45 },
      { x: -14, y: -14, z: 100, action: "targeted_flush", pressure: 90, duration: 5, nozzleAngle: 60 },
    ],
  },
  {
    featureType: "groove",
    featureName: "沟槽清洗",
    featureNameEn: "Groove Cleaning",
    description: "沿沟槽方向线性扫描，确保槽底清洁",
    totalDuration: 16,
    trajectory: [
      { x: -50, y: 0, z: 20, action: "high_pressure_spray", pressure: 100, duration: 3, nozzleAngle: 30 },
      { x: -25, y: 0, z: 15, action: "oscillating_nozzle", pressure: 110, duration: 3, nozzleAngle: 20 },
      { x: 0, y: 0, z: 10, action: "pulsed_spray", pressure: 120, duration: 4, nozzleAngle: 0 },
      { x: 25, y: 0, z: 15, action: "oscillating_nozzle", pressure: 110, duration: 3, nozzleAngle: -20 },
      { x: 50, y: 0, z: 20, action: "high_pressure_spray", pressure: 100, duration: 3, nozzleAngle: -30 },
    ],
  },
  {
    featureType: "flat_surface",
    featureName: "平面清洗",
    featureNameEn: "Flat Surface Cleaning",
    description: "均匀扫描覆盖，确保平面无残留",
    totalDuration: 12,
    trajectory: [
      { x: -40, y: -40, z: 30, action: "high_pressure_spray", pressure: 80, duration: 2, nozzleAngle: 0 },
      { x: 40, y: -40, z: 30, action: "high_pressure_spray", pressure: 80, duration: 2, nozzleAngle: 0 },
      { x: 40, y: 0, z: 30, action: "high_pressure_spray", pressure: 80, duration: 2, nozzleAngle: 0 },
      { x: -40, y: 0, z: 30, action: "high_pressure_spray", pressure: 80, duration: 2, nozzleAngle: 0 },
      { x: -40, y: 40, z: 30, action: "high_pressure_spray", pressure: 80, duration: 2, nozzleAngle: 0 },
      { x: 40, y: 40, z: 30, action: "high_pressure_spray", pressure: 80, duration: 2, nozzleAngle: 0 },
    ],
  },
  {
    featureType: "complex_geometry",
    featureName: "复杂几何清洗",
    featureNameEn: "Complex Geometry Cleaning",
    description: "多角度组合清洗，适应复杂表面形状",
    totalDuration: 30,
    trajectory: [
      { x: 0, y: 0, z: 50, action: "high_pressure_spray", pressure: 120, duration: 4, nozzleAngle: 0 },
      { x: 30, y: 0, z: 40, action: "oscillating_nozzle", pressure: 110, duration: 4, nozzleAngle: 30 },
      { x: 0, y: 30, z: 30, action: "pulsed_spray", pressure: 130, duration: 4, nozzleAngle: 45 },
      { x: -30, y: 0, z: 40, action: "oscillating_nozzle", pressure: 110, duration: 4, nozzleAngle: -30 },
      { x: 0, y: -30, z: 30, action: "pulsed_spray", pressure: 130, duration: 4, nozzleAngle: -45 },
      { x: 0, y: 0, z: 20, action: "targeted_flush", pressure: 100, duration: 5, nozzleAngle: 0 },
      { x: 0, y: 0, z: 10, action: "air_knife", pressure: 70, duration: 5, nozzleAngle: 0 },
    ],
  },
];

// 动作颜色映射
const ACTION_COLORS: Record<CleaningAction, number> = {
  high_pressure_spray: 0x3b82f6, // 蓝色
  oscillating_nozzle: 0x22c55e, // 绿色
  pulsed_spray: 0xf59e0b, // 橙色
  targeted_flush: 0x8b5cf6, // 紫色
  ultrasonic: 0xec4899, // 粉色
  air_knife: 0x06b6d4, // 青色
};

// 动作名称映射
const ACTION_NAMES: Record<CleaningAction, string> = {
  high_pressure_spray: "高压喷射",
  oscillating_nozzle: "振荡喷嘴",
  pulsed_spray: "脉冲喷射",
  targeted_flush: "定向冲洗",
  ultrasonic: "超声波",
  air_knife: "气刀",
};

interface CleaningTrajectory3DViewerProps {
  initialFeature?: FeatureType;
  height?: number;
}

export default function CleaningTrajectory3DViewer({ 
  initialFeature = "blind_hole",
  height = 400 
}: CleaningTrajectory3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const nozzleRef = useRef<THREE.Group | null>(null);
  const trajectoryPointsRef = useRef<THREE.Mesh[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const progressRef = useRef<number>(0);
  const rotationRef = useRef<number>(0);

  const [selectedFeature, setSelectedFeature] = useState<FeatureType>(initialFeature);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [showTrajectory, setShowTrajectory] = useState(true);
  const [currentAction, setCurrentAction] = useState<CleaningAction | null>(null);
  const [currentPressure, setCurrentPressure] = useState(0);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapIntensity, setHeatmapIntensity] = useState(0.7);
  const heatmapMeshRef = useRef<THREE.Mesh | null>(null);

  const strategy = CLEANING_STRATEGIES.find(s => s.featureType === selectedFeature)!;

  // 初始化Three.js场景
  useEffect(() => {
    if (!containerRef.current) return;

    // 创建场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    // 创建相机
    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / height,
      0.1,
      1000
    );
    camera.position.set(150, 150, 150);
    camera.lookAt(0, 0, 50);
    cameraRef.current = camera;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 添加环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // 添加方向光
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 100);
    scene.add(directionalLight);

    // 创建坐标轴辅助
    const axesHelper = new THREE.AxesHelper(50);
    scene.add(axesHelper);

    // 创建网格地面
    const gridHelper = new THREE.GridHelper(200, 20, 0x444444, 0x333333);
    gridHelper.rotation.x = Math.PI / 2;
    scene.add(gridHelper);

    // 创建喷嘴模型
    const nozzleGroup = new THREE.Group();
    
    // 喷嘴主体（圆锥）
    const nozzleGeometry = new THREE.ConeGeometry(5, 20, 16);
    const nozzleMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x4a90d9,
      shininess: 100 
    });
    const nozzle = new THREE.Mesh(nozzleGeometry, nozzleMaterial);
    nozzle.rotation.x = Math.PI;
    nozzleGroup.add(nozzle);

    // 喷嘴喷射效果（粒子）
    const sprayGeometry = new THREE.ConeGeometry(8, 30, 16, 1, true);
    const sprayMaterial = new THREE.MeshBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const spray = new THREE.Mesh(sprayGeometry, sprayMaterial);
    spray.position.y = -25;
    spray.name = "spray";
    nozzleGroup.add(spray);

    nozzleGroup.position.set(0, 0, 0);
    scene.add(nozzleGroup);
    nozzleRef.current = nozzleGroup;

    // 创建零件示意（简单立方体）
    const partGeometry = new THREE.BoxGeometry(80, 80, 20);
    const partMaterial = new THREE.MeshPhongMaterial({
      color: 0x666666,
      transparent: true,
      opacity: 0.5,
    });
    const part = new THREE.Mesh(partGeometry, partMaterial);
    part.position.set(0, 0, -10);
    scene.add(part);

    // 创建清洗效果热力图平面
    const heatmapSize = 100;
    const heatmapResolution = 64;
    const heatmapCanvas = document.createElement('canvas');
    heatmapCanvas.width = heatmapResolution;
    heatmapCanvas.height = heatmapResolution;
    const heatmapCtx = heatmapCanvas.getContext('2d')!;
    
    // 生成热力图数据
    const generateHeatmapData = (trajectoryPoints: TrajectoryPoint[]) => {
      heatmapCtx.fillStyle = 'rgba(0, 0, 0, 0)';
      heatmapCtx.clearRect(0, 0, heatmapResolution, heatmapResolution);
      
      trajectoryPoints.forEach(point => {
        const x = ((point.x + 50) / 100) * heatmapResolution;
        const y = ((point.y + 50) / 100) * heatmapResolution;
        const radius = (point.pressure / 150) * 15;
        
        const gradient = heatmapCtx.createRadialGradient(x, y, 0, x, y, radius);
        // 根据压力设置颜色 - 绿色(低) -> 黄色(中) -> 红色(高)
        const intensity = point.pressure / 150;
        if (intensity < 0.5) {
          gradient.addColorStop(0, `rgba(0, 255, 0, ${0.8 * intensity * 2})`);
          gradient.addColorStop(1, 'rgba(0, 255, 0, 0)');
        } else {
          gradient.addColorStop(0, `rgba(255, ${Math.floor(255 * (1 - (intensity - 0.5) * 2))}, 0, 0.8)`);
          gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        }
        
        heatmapCtx.fillStyle = gradient;
        heatmapCtx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      });
    };
    
    const heatmapTexture = new THREE.CanvasTexture(heatmapCanvas);
    const heatmapGeometry = new THREE.PlaneGeometry(heatmapSize, heatmapSize);
    const heatmapMaterial = new THREE.MeshBasicMaterial({
      map: heatmapTexture,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const heatmapMesh = new THREE.Mesh(heatmapGeometry, heatmapMaterial);
    heatmapMesh.position.set(0, 0, 1);
    heatmapMesh.visible = false;
    scene.add(heatmapMesh);
    heatmapMeshRef.current = heatmapMesh;
    
    // 存储热力图更新函数
    (window as any).__updateHeatmap = (points: TrajectoryPoint[], intensity: number) => {
      generateHeatmapData(points);
      heatmapTexture.needsUpdate = true;
      heatmapMaterial.opacity = intensity;
    };

    // 渲染循环
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      // 相机自动旋转
      rotationRef.current += 0.002;
      if (cameraRef.current) {
        cameraRef.current.position.x = Math.cos(rotationRef.current) * 200;
        cameraRef.current.position.y = Math.sin(rotationRef.current) * 100 + 100;
        cameraRef.current.lookAt(0, 0, 50);
      }
      
      renderer.render(scene, camera);
    };
    animate();

    // 窗口大小调整
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = containerRef.current.clientWidth / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(containerRef.current.clientWidth, height);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, [height]);

  // 更新轨迹线和点
  useEffect(() => {
    if (!sceneRef.current) return;

    // 移除旧轨迹点
    trajectoryPointsRef.current.forEach(point => {
      sceneRef.current?.remove(point);
    });
    trajectoryPointsRef.current = [];

    if (!showTrajectory) return;

    // 创建轨迹线
    const points = strategy.trajectory.map(
      (p) => new THREE.Vector3(p.x, p.y, p.z)
    );

    // 创建渐变颜色轨迹
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const colors: number[] = [];
    strategy.trajectory.forEach((p) => {
      const color = new THREE.Color(ACTION_COLORS[p.action]);
      colors.push(color.r, color.g, color.b);
    });
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 2,
    });

    const line = new THREE.Line(geometry, material);
    line.name = "trajectoryLine";
    sceneRef.current.add(line);

    // 添加轨迹点标记
    strategy.trajectory.forEach((p, index) => {
      const sphereGeometry = new THREE.SphereGeometry(3, 16, 16);
      const sphereMaterial = new THREE.MeshBasicMaterial({
        color: ACTION_COLORS[p.action],
      });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.set(p.x, p.y, p.z);
      sceneRef.current!.add(sphere);
      trajectoryPointsRef.current.push(sphere);
    });

    return () => {
      // 清理轨迹线
      const line = sceneRef.current?.getObjectByName("trajectoryLine");
      if (line) {
        sceneRef.current?.remove(line);
      }
    };
  }, [selectedFeature, showTrajectory, strategy]);

  // 动画播放逻辑
  useEffect(() => {
    if (!isPlaying || !nozzleRef.current) return;

    let lastTime = performance.now();
    const totalDuration = strategy.totalDuration * 1000; // 转换为毫秒

    const animateNozzle = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) * speed;
      lastTime = currentTime;

      progressRef.current += deltaTime / totalDuration;
      
      if (progressRef.current >= 1) {
        progressRef.current = 0;
        setProgress(0);
        setIsPlaying(false);
        return;
      }

      setProgress(progressRef.current * 100);

      // 计算当前位置
      const trajectory = strategy.trajectory;
      const totalPoints = trajectory.length;
      const currentIndex = Math.floor(progressRef.current * (totalPoints - 1));
      const nextIndex = Math.min(currentIndex + 1, totalPoints - 1);
      const localProgress = (progressRef.current * (totalPoints - 1)) % 1;

      const current = trajectory[currentIndex];
      const next = trajectory[nextIndex];

      // 插值计算位置
      const x = current.x + (next.x - current.x) * localProgress;
      const y = current.y + (next.y - current.y) * localProgress;
      const z = current.z + (next.z - current.z) * localProgress;

      nozzleRef.current!.position.set(x, y, z);

      // 更新喷嘴角度
      const angle = current.nozzleAngle + (next.nozzleAngle - current.nozzleAngle) * localProgress;
      nozzleRef.current!.rotation.z = (angle * Math.PI) / 180;

      // 更新当前动作和压力
      setCurrentAction(current.action);
      setCurrentPressure(current.pressure + (next.pressure - current.pressure) * localProgress);

      // 更新喷射效果颜色
      const spray = nozzleRef.current!.getObjectByName("spray") as THREE.Mesh;
      if (spray) {
        (spray.material as THREE.MeshBasicMaterial).color.setHex(
          ACTION_COLORS[current.action]
        );
      }

      animationFrameRef.current = requestAnimationFrame(animateNozzle);
    };

    animationFrameRef.current = requestAnimationFrame(animateNozzle);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, speed, strategy]);

  // 重置动画
  const resetAnimation = useCallback(() => {
    setIsPlaying(false);
    progressRef.current = 0;
    setProgress(0);
    setCurrentAction(null);
    setCurrentPressure(0);
    
    if (nozzleRef.current) {
      const firstPoint = strategy.trajectory[0];
      nozzleRef.current.position.set(firstPoint.x, firstPoint.y, firstPoint.z);
      nozzleRef.current.rotation.z = (firstPoint.nozzleAngle * Math.PI) / 180;
    }
  }, [strategy]);

  // 切换特征时重置
  useEffect(() => {
    resetAnimation();
  }, [selectedFeature, resetAnimation]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Box className="h-5 w-5 text-primary" />
          清洗轨迹3D可视化
        </CardTitle>
        <CardDescription>
          Three.js实时渲染喷嘴运动轨迹和清洗动作
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 控制面板 */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-48">
            <Label className="text-xs text-muted-foreground mb-1 block">特征类型</Label>
            <Select value={selectedFeature} onValueChange={(v) => setSelectedFeature(v as FeatureType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLEANING_STRATEGIES.map((s) => (
                  <SelectItem key={s.featureType} value={s.featureType}>
                    {s.featureName} ({s.featureNameEn})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={resetAnimation}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant={showTrajectory ? "default" : "outline"}
              size="icon"
              onClick={() => setShowTrajectory(!showTrajectory)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 速度控制 */}
        <div className="flex items-center gap-4">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">播放速度</Label>
          <Slider
            value={[speed]}
            onValueChange={([v]) => setSpeed(v)}
            min={0.25}
            max={3}
            step={0.25}
            className="flex-1"
          />
          <span className="text-sm font-mono w-12">{speed}x</span>
        </div>

        {/* 热力图控制 */}
        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Button
              variant={showHeatmap ? "default" : "outline"}
              size="sm"
              onClick={() => {
                const newShow = !showHeatmap;
                setShowHeatmap(newShow);
                if (heatmapMeshRef.current) {
                  heatmapMeshRef.current.visible = newShow;
                  if (newShow && (window as any).__updateHeatmap) {
                    (window as any).__updateHeatmap(strategy.trajectory, heatmapIntensity);
                  }
                }
              }}
              className="flex items-center gap-1"
            >
              <span className="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500" />
              清洗效果热力图
            </Button>
          </div>
          {showHeatmap && (
            <div className="flex items-center gap-2 flex-1">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">热力图透明度</Label>
              <Slider
                value={[heatmapIntensity]}
                onValueChange={([v]) => {
                  setHeatmapIntensity(v);
                  if ((window as any).__updateHeatmap) {
                    (window as any).__updateHeatmap(strategy.trajectory, v);
                  }
                }}
                min={0.1}
                max={1}
                step={0.1}
                className="flex-1 max-w-32"
              />
              <span className="text-sm font-mono w-12">{(heatmapIntensity * 100).toFixed(0)}%</span>
            </div>
          )}
        </div>

        {/* 热力图图例 */}
        {showHeatmap && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>清洗强度:</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-green-500" />
              <span>低</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-yellow-500" />
              <span>中</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-red-500" />
              <span>高</span>
            </div>
          </div>
        )}

        {/* 进度条 */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>进度</span>
            <span>{progress.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 3D视图容器 */}
        <div
          ref={containerRef}
          className="w-full rounded-lg overflow-hidden border border-border"
          style={{ height: `${height}px` }}
        />

        {/* 当前状态显示 */}
        <div className="flex flex-wrap gap-2">
          {currentAction && (
            <Badge
              style={{ backgroundColor: `#${ACTION_COLORS[currentAction].toString(16).padStart(6, "0")}` }}
            >
              {ACTION_NAMES[currentAction]}
            </Badge>
          )}
          {currentPressure > 0 && (
            <Badge variant="outline">
              压力: {currentPressure.toFixed(0)} bar
            </Badge>
          )}
          <Badge variant="secondary">
            总时长: {strategy.totalDuration}s
          </Badge>
        </div>

        {/* 策略描述 */}
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">{strategy.description}</p>
        </div>

        {/* 动作图例 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {Object.entries(ACTION_NAMES).map(([action, name]) => (
            <div key={action} className="flex items-center gap-2 text-xs">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: `#${ACTION_COLORS[action as CleaningAction].toString(16).padStart(6, "0")}` }}
              />
              <span>{name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
