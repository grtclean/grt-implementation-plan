/**
 * 3D模型在线预览 (US-019)
 * WebGL在线预览 · 支持STL/OBJ格式 · 旋转/缩放/平移
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Box, Upload, RotateCw, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import * as THREE from "three";

interface ModelInfo {
  fileName: string;
  vertices: number;
  faces: number;
  boundingBox: { x: number; y: number; z: number };
}

function parseSTLBinary(buffer: ArrayBuffer): THREE.BufferGeometry {
  const dv = new DataView(buffer);
  const triangles = dv.getUint32(80, true);
  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array(triangles * 9);
  const normals = new Float32Array(triangles * 9);
  let offset = 84;
  for (let i = 0; i < triangles; i++) {
    const nx = dv.getFloat32(offset, true); offset += 4;
    const ny = dv.getFloat32(offset, true); offset += 4;
    const nz = dv.getFloat32(offset, true); offset += 4;
    for (let j = 0; j < 3; j++) {
      vertices[i * 9 + j * 3] = dv.getFloat32(offset, true); offset += 4;
      vertices[i * 9 + j * 3 + 1] = dv.getFloat32(offset, true); offset += 4;
      vertices[i * 9 + j * 3 + 2] = dv.getFloat32(offset, true); offset += 4;
      normals[i * 9 + j * 3] = nx;
      normals[i * 9 + j * 3 + 1] = ny;
      normals[i * 9 + j * 3 + 2] = nz;
    }
    offset += 2; // attribute byte count
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  return geometry;
}

function parseOBJ(text: string): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const verts: number[][] = [];
  const norms: number[][] = [];
  const lines = text.split("\n");
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts[0] === "v") {
      verts.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
    } else if (parts[0] === "vn") {
      norms.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
    } else if (parts[0] === "f") {
      const faceVerts: number[] = [];
      const faceNorms: number[] = [];
      for (let i = 1; i < parts.length; i++) {
        const indices = parts[i].split("/");
        faceVerts.push(parseInt(indices[0]) - 1);
        if (indices[2]) faceNorms.push(parseInt(indices[2]) - 1);
      }
      // Triangulate face (fan triangulation)
      for (let i = 1; i < faceVerts.length - 1; i++) {
        const triIndices = [faceVerts[0], faceVerts[i], faceVerts[i + 1]];
        for (const idx of triIndices) {
          const v = verts[idx] || [0, 0, 0];
          positions.push(v[0], v[1], v[2]);
        }
        if (faceNorms.length > 0) {
          const normIndices = [faceNorms[0], faceNorms[i], faceNorms[i + 1]];
          for (const idx of normIndices) {
            const n = norms[idx] || [0, 1, 0];
            normals.push(n[0], n[1], n[2]);
          }
        }
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
  if (normals.length > 0) {
    geometry.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(normals), 3));
  } else {
    geometry.computeVertexNormals();
  }
  return geometry;
}

export default function ModelViewer3D() {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const frameIdRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Orbit control state
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const sphericalRef = useRef({ theta: Math.PI / 4, phi: Math.PI / 3, radius: 5 });

  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const updateCamera = useCallback(() => {
    if (!cameraRef.current) return;
    const { theta, phi, radius } = sphericalRef.current;
    cameraRef.current.position.set(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
    cameraRef.current.lookAt(0, 0, 0);
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    cameraRef.current = camera;
    updateCamera();

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);
    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    dirLight2.position.set(-5, -5, -5);
    scene.add(dirLight2);

    // Grid helper
    const grid = new THREE.GridHelper(10, 20, 0x444466, 0x333355);
    scene.add(grid);

    // Axes helper
    const axes = new THREE.AxesHelper(2);
    scene.add(axes);

    // Animation loop
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Mouse orbit controls
    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - prevMouseRef.current.x;
      const dy = e.clientY - prevMouseRef.current.y;
      sphericalRef.current.theta -= dx * 0.005;
      sphericalRef.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, sphericalRef.current.phi + dy * 0.005));
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
      updateCamera();
    };
    const onMouseUp = () => {
      isDraggingRef.current = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      sphericalRef.current.radius = Math.max(1, Math.min(50, sphericalRef.current.radius + e.deltaY * 0.01));
      updateCamera();
    };

    const canvas = renderer.domElement;
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mouseleave", onMouseUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(frameIdRef.current);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("mouseleave", onMouseUp);
      canvas.removeEventListener("wheel", onWheel);
      resizeObserver.disconnect();
      renderer.dispose();
      if (container.contains(canvas)) {
        container.removeChild(canvas);
      }
    };
  }, [updateCamera]);

  const loadGeometry = useCallback((geometry: THREE.BufferGeometry, fileName: string) => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove existing mesh
    if (meshRef.current) {
      scene.remove(meshRef.current);
      meshRef.current.geometry.dispose();
      (meshRef.current.material as THREE.Material).dispose();
    }

    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const center = new THREE.Vector3();
    box.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);

    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 3 / maxDim;
    geometry.scale(scale, scale, scale);

    const material = new THREE.MeshPhongMaterial({
      color: 0x4488cc,
      specular: 0x222222,
      shininess: 40,
      flatShading: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    meshRef.current = mesh;

    // Reset camera
    sphericalRef.current = { theta: Math.PI / 4, phi: Math.PI / 3, radius: 5 };
    updateCamera();

    // Update model info
    const posAttr = geometry.getAttribute("position");
    const vertexCount = posAttr ? posAttr.count : 0;
    setModelInfo({
      fileName,
      vertices: vertexCount,
      faces: Math.floor(vertexCount / 3),
      boundingBox: {
        x: parseFloat(size.x.toFixed(2)),
        y: parseFloat(size.y.toFixed(2)),
        z: parseFloat(size.z.toFixed(2)),
      },
    });
  }, [updateCamera]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.toLowerCase().split(".").pop();
    const reader = new FileReader();

    if (ext === "stl") {
      reader.onload = () => {
        const buffer = reader.result as ArrayBuffer;
        const geometry = parseSTLBinary(buffer);
        loadGeometry(geometry, file.name);
      };
      reader.readAsArrayBuffer(file);
    } else if (ext === "obj") {
      reader.onload = () => {
        const text = reader.result as string;
        const geometry = parseOBJ(text);
        loadGeometry(geometry, file.name);
      };
      reader.readAsText(file);
    }
    // Reset input so same file can be re-uploaded
    e.target.value = "";
  }, [loadGeometry]);

  const handleResetView = () => {
    sphericalRef.current = { theta: Math.PI / 4, phi: Math.PI / 3, radius: 5 };
    updateCamera();
  };

  const handleZoomIn = () => {
    sphericalRef.current.radius = Math.max(1, sphericalRef.current.radius - 1);
    updateCamera();
  };

  const handleZoomOut = () => {
    sphericalRef.current.radius = Math.min(50, sphericalRef.current.radius + 1);
    updateCamera();
  };

  const handleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={Box}
          title={t("ai.modelViewer.title")}
          description={t("ai.modelViewer.description")}
          actions={
            <Badge variant="outline" className="gap-1">
              <Box className="h-3 w-3" />
              {t("ai.modelViewer.webglRendering")}
            </Badge>
          }
        />

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-5 w-5 text-primary" />
              {t("ai.modelViewer.uploadControl")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".stl,.obj"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                {t("ai.modelViewer.uploadModel")}
              </Button>
              <span className="text-xs text-muted-foreground">{t("ai.modelViewer.supportedFormats")}</span>
              <div className="flex-1" />
              <Button variant="outline" size="sm" onClick={handleResetView}>
                <RotateCw className="h-4 w-4 mr-1" />
                {t("ai.modelViewer.resetView")}
              </Button>
              <Button variant="outline" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleFullscreen}>
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 3D Viewer */}
          <Card className="lg:col-span-3">
            <CardContent className="p-0 relative">
              <div
                ref={containerRef}
                className="w-full rounded-lg overflow-hidden"
                style={{ height: "500px" }}
              />
              {!modelInfo && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <Box className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground text-lg font-medium">{t("ai.modelViewer.uploadPrompt")}</p>
                  <p className="text-muted-foreground/70 text-sm mt-1">{t("ai.modelViewer.dragHint")}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Model Info */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Box className="h-5 w-5 text-primary" />
                  {t("ai.modelViewer.modelInfo")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {modelInfo ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{t("ai.modelViewer.fileName")}</p>
                      <p className="text-sm font-medium truncate">{modelInfo.fileName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("ai.modelViewer.vertices")}</p>
                      <p className="text-sm font-medium">{modelInfo.vertices.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("ai.modelViewer.faces")}</p>
                      <p className="text-sm font-medium">{modelInfo.faces.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("ai.modelViewer.boundingBox")}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary">X: {modelInfo.boundingBox.x}</Badge>
                        <Badge variant="secondary">Y: {modelInfo.boundingBox.y}</Badge>
                        <Badge variant="secondary">Z: {modelInfo.boundingBox.z}</Badge>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t("ai.modelViewer.noModelData")}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("ai.modelViewer.tips")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-medium flex-shrink-0">1.</span>
                    <span>{t("ai.modelViewer.tip1")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-medium flex-shrink-0">2.</span>
                    <span>{t("ai.modelViewer.tip2")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-medium flex-shrink-0">3.</span>
                    <span>{t("ai.modelViewer.tip3")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-medium flex-shrink-0">4.</span>
                    <span>{t("ai.modelViewer.tip4")}</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  );
}
