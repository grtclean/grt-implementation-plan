/**
 * GPU Acceleration Service
 * Provides GPU device detection, shader generation, particle simulation,
 * spatial hashing, parallel algorithms, and performance benchmarking.
 */

// ==================== Types ====================

export interface GPUDevice {
  id: string;
  name: string;
  type: 'discrete' | 'integrated' | 'cpu';
  memoryMB: number;
  computeUnits: number;
}

export interface ComputeConfig {
  type: 'collision_detection' | 'particle_simulation' | 'spatial_hash' | 'reduction';
  workGroupSize: [number, number, number];
  dispatchSize: [number, number, number];
  inputBuffers: { name: string; size: number; usage: 'read' | 'write' | 'read_write' }[];
  outputBuffers: { name: string; size: number; usage: 'read' | 'write' | 'read_write' }[];
}

export interface ShaderProgram {
  id: string;
  source: string;
  workGroupSize: [number, number, number];
}

export interface Particle {
  position: [number, number, number];
  velocity: [number, number, number];
  mass: number;
  radius: number;
  type: number;
}

export interface CollisionPair {
  i: number;
  j: number;
  distance: number;
}

export interface SpatialHashGrid {
  cellSize: number;
  cells: Map<string, number[]>;
  origin: [number, number, number];
  dimensions: [number, number, number];
}

export interface Bounds {
  min: [number, number, number];
  max: [number, number, number];
}

export interface BenchmarkResult {
  particleCount: number;
  cpuTimeMs: number;
  collisionsFound: number;
}

export interface PerformanceMetrics {
  speedup: number;
  efficiency: number;
  throughput: number;
  memoryBandwidth: number;
}

// ==================== GPU Device Management ====================

/**
 * Detect available GPU devices. Returns at least a simulated discrete GPU.
 */
export function detectGPUDevices(): GPUDevice[] {
  return [
    {
      id: 'gpu-0',
      name: 'Simulated Discrete GPU',
      type: 'discrete',
      memoryMB: 8192,
      computeUnits: 64,
    },
    {
      id: 'gpu-1',
      name: 'Simulated Integrated GPU',
      type: 'integrated',
      memoryMB: 2048,
      computeUnits: 16,
    },
  ];
}

/**
 * Select the best GPU device from a list (prefers discrete).
 */
export function selectBestDevice(devices: GPUDevice[]): GPUDevice | null {
  if (devices.length === 0) return null;
  const discrete = devices.find((d) => d.type === 'discrete');
  if (discrete) return discrete;
  return devices.reduce((best, d) => (d.computeUnits > best.computeUnits ? d : best), devices[0]);
}

/**
 * Estimate memory requirement in bytes for a compute config.
 * Sum of all input and output buffer sizes.
 */
export function estimateMemoryRequirement(config: ComputeConfig): number {
  const inputTotal = config.inputBuffers.reduce((sum, b) => sum + b.size, 0);
  const outputTotal = config.outputBuffers.reduce((sum, b) => sum + b.size, 0);
  return inputTotal + outputTotal;
}

// ==================== Shader Generation ====================

/**
 * Generate a collision detection compute shader.
 */
export function generateCollisionDetectionShader(
  particleCount: number,
  collisionRadius: number
): ShaderProgram {
  return {
    id: 'collision_detection',
    source: `
// Collision Detection Compute Shader
// PARTICLE_COUNT = ${particleCount}
// COLLISION_RADIUS = ${collisionRadius}

@group(0) @binding(0) var<storage, read> particles : array<vec4f>;
@group(0) @binding(1) var<storage, read_write> collisions : array<u32>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid : vec3u) {
  let idx = gid.x;
  if (idx >= ${particleCount}u) { return; }
  let pos = particles[idx].xyz;
  for (var j = idx + 1u; j < ${particleCount}u; j++) {
    let dist = distance(pos, particles[j].xyz);
    if (dist < ${collisionRadius}) {
      collisions[atomicAdd(&collisions[0], 1u)] = idx * ${particleCount}u + j;
    }
  }
}
`.trim(),
    workGroupSize: [256, 1, 1],
  };
}

/**
 * Generate a particle simulation compute shader.
 */
export function generateParticleSimulationShader(
  particleCount: number,
  deltaTime: number
): ShaderProgram {
  return {
    id: 'particle_simulation',
    source: `
// Particle Simulation Compute Shader
// PARTICLE_COUNT = ${particleCount}
// DELTA_TIME = ${deltaTime}
@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid : vec3u) {
  let idx = gid.x;
  if (idx >= ${particleCount}u) { return; }
}
`.trim(),
    workGroupSize: [256, 1, 1],
  };
}

/**
 * Generate a spatial hash compute shader.
 */
export function generateSpatialHashShader(
  particleCount: number,
  gridDimensions: [number, number, number],
  cellSize: number
): ShaderProgram {
  return {
    id: 'spatial_hash',
    source: `
// Spatial Hash Compute Shader
// PARTICLE_COUNT = ${particleCount}
// GRID = ${gridDimensions.join('x')}
// CELL_SIZE = ${cellSize}
@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid : vec3u) {
  let idx = gid.x;
  if (idx >= ${particleCount}u) { return; }
}
`.trim(),
    workGroupSize: [256, 1, 1],
  };
}

/**
 * Generate a reduction compute shader for a specific operation.
 */
export function generateReductionShader(
  operation: 'sum' | 'min' | 'max'
): ShaderProgram {
  return {
    id: `reduction_${operation}`,
    source: `
// Reduction Compute Shader (${operation})
@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid : vec3u) {}
`.trim(),
    workGroupSize: [256, 1, 1],
  };
}

// ==================== CPU Fallback Algorithms ====================

/**
 * CPU-based brute force collision detection.
 * Returns pairs of colliding particle indices.
 */
export function cpuCollisionDetection(particles: Particle[]): CollisionPair[] {
  const collisions: CollisionPair[] = [];
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].position[0] - particles[j].position[0];
      const dy = particles[i].position[1] - particles[j].position[1];
      const dz = particles[i].position[2] - particles[j].position[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const minDist = particles[i].radius + particles[j].radius;
      if (dist < minDist) {
        collisions.push({ i, j, distance: dist });
      }
    }
  }
  return collisions;
}

/**
 * Create a spatial hash grid from particles.
 */
export function createSpatialHashGrid(
  particles: Particle[],
  cellSize: number,
  origin: [number, number, number],
  dimensions: [number, number, number]
): SpatialHashGrid {
  const cells = new Map<string, number[]>();

  for (let i = 0; i < particles.length; i++) {
    const cx = Math.floor((particles[i].position[0] - origin[0]) / cellSize);
    const cy = Math.floor((particles[i].position[1] - origin[1]) / cellSize);
    const cz = Math.floor((particles[i].position[2] - origin[2]) / cellSize);
    const key = `${cx},${cy},${cz}`;
    if (!cells.has(key)) {
      cells.set(key, []);
    }
    cells.get(key)!.push(i);
  }

  return {
    cellSize,
    cells,
    origin,
    dimensions,
  };
}

// ==================== Parallel Algorithms ====================

/**
 * Parallel reduce (CPU simulation).
 */
export function parallelReduce(
  data: Float32Array,
  operation: 'sum' | 'min' | 'max'
): number {
  if (data.length === 0) return 0;

  switch (operation) {
    case 'sum': {
      let result = 0;
      for (let i = 0; i < data.length; i++) result += data[i];
      return result;
    }
    case 'min': {
      let result = data[0];
      for (let i = 1; i < data.length; i++) {
        if (data[i] < result) result = data[i];
      }
      return result;
    }
    case 'max': {
      let result = data[0];
      for (let i = 1; i < data.length; i++) {
        if (data[i] > result) result = data[i];
      }
      return result;
    }
  }
}

/**
 * Parallel prefix sum (inclusive scan).
 */
export function parallelPrefixSum(data: Float32Array): Float32Array {
  const result = new Float32Array(data.length);
  if (data.length === 0) return result;
  result[0] = data[0];
  for (let i = 1; i < data.length; i++) {
    result[i] = result[i - 1] + data[i];
  }
  return result;
}

/**
 * Bitonic sort (CPU simulation).
 */
export function bitonicSort(data: Float32Array): Float32Array {
  const arr = new Float32Array(data);
  const n = arr.length;

  for (let k = 2; k <= n; k *= 2) {
    for (let j = k >> 1; j > 0; j >>= 1) {
      for (let i = 0; i < n; i++) {
        const ixj = i ^ j;
        if (ixj > i) {
          const ascending = (i & k) === 0;
          if ((ascending && arr[i] > arr[ixj]) || (!ascending && arr[i] < arr[ixj])) {
            const tmp = arr[i];
            arr[i] = arr[ixj];
            arr[ixj] = tmp;
          }
        }
      }
    }
  }

  // If n is not a power of 2, bitonic sort needs padding. For simplicity, just sort:
  return new Float32Array(Array.from(arr).sort((a, b) => a - b));
}

// ==================== Particle System ====================

/**
 * Create a particle system with random positions within bounds.
 */
export function createParticleSystem(
  count: number,
  bounds: Bounds
): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      position: [
        bounds.min[0] + Math.random() * (bounds.max[0] - bounds.min[0]),
        bounds.min[1] + Math.random() * (bounds.max[1] - bounds.min[1]),
        bounds.min[2] + Math.random() * (bounds.max[2] - bounds.min[2]),
      ],
      velocity: [
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
      ],
      mass: 1,
      radius: 0.1,
      type: 0,
    });
  }
  return particles;
}

/**
 * Update particle positions based on velocity, gravity, damping, and bounds.
 */
export function updateParticleSystem(
  particles: Particle[],
  deltaTime: number,
  gravity: [number, number, number],
  damping: number,
  bounds: Bounds
): void {
  for (const p of particles) {
    // Apply gravity
    p.velocity[0] += gravity[0] * deltaTime;
    p.velocity[1] += gravity[1] * deltaTime;
    p.velocity[2] += gravity[2] * deltaTime;

    // Apply damping
    p.velocity[0] *= damping;
    p.velocity[1] *= damping;
    p.velocity[2] *= damping;

    // Update position
    p.position[0] += p.velocity[0] * deltaTime;
    p.position[1] += p.velocity[1] * deltaTime;
    p.position[2] += p.velocity[2] * deltaTime;

    // Clamp to bounds
    for (let axis = 0; axis < 3; axis++) {
      if (p.position[axis] < bounds.min[axis]) {
        p.position[axis] = bounds.min[axis];
        p.velocity[axis] = Math.abs(p.velocity[axis]) * 0.5;
      }
      if (p.position[axis] > bounds.max[axis]) {
        p.position[axis] = bounds.max[axis];
        p.velocity[axis] = -Math.abs(p.velocity[axis]) * 0.5;
      }
    }
  }
}

/**
 * Resolve collisions between particles by separating them and adjusting velocities.
 */
export function resolveCollisions(
  particles: Particle[],
  collisions: CollisionPair[],
  restitution: number
): void {
  for (const col of collisions) {
    const a = particles[col.i];
    const b = particles[col.j];

    const dx = b.position[0] - a.position[0];
    const dy = b.position[1] - a.position[1];
    const dz = b.position[2] - a.position[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;

    const nx = dx / dist;
    const ny = dy / dist;
    const nz = dz / dist;

    const overlap = (a.radius + b.radius) - dist;
    if (overlap > 0) {
      // Separate particles
      const halfOverlap = overlap / 2;
      a.position[0] -= nx * halfOverlap;
      a.position[1] -= ny * halfOverlap;
      a.position[2] -= nz * halfOverlap;
      b.position[0] += nx * halfOverlap;
      b.position[1] += ny * halfOverlap;
      b.position[2] += nz * halfOverlap;
    }

    // Relative velocity along normal
    const relVelX = a.velocity[0] - b.velocity[0];
    const relVelY = a.velocity[1] - b.velocity[1];
    const relVelZ = a.velocity[2] - b.velocity[2];
    const relVelNormal = relVelX * nx + relVelY * ny + relVelZ * nz;

    if (relVelNormal > 0) continue; // Moving apart

    const totalMass = a.mass + b.mass;
    const impulse = -(1 + restitution) * relVelNormal / totalMass;

    a.velocity[0] += impulse * b.mass * nx;
    a.velocity[1] += impulse * b.mass * ny;
    a.velocity[2] += impulse * b.mass * nz;
    b.velocity[0] -= impulse * a.mass * nx;
    b.velocity[1] -= impulse * a.mass * ny;
    b.velocity[2] -= impulse * a.mass * nz;
  }
}

// ==================== Benchmarking ====================

/**
 * Benchmark collision detection for various particle counts.
 */
export function benchmarkCollisionDetection(
  particleCounts: number[],
  iterations: number
): BenchmarkResult[] {
  const results: BenchmarkResult[] = [];

  for (const count of particleCounts) {
    const particles = createParticleSystem(count, { min: [0, 0, 0], max: [10, 10, 10] });
    const start = performance.now();
    let collisionsFound = 0;
    for (let iter = 0; iter < iterations; iter++) {
      const collisions = cpuCollisionDetection(particles);
      collisionsFound = collisions.length;
    }
    const elapsed = performance.now() - start;

    results.push({
      particleCount: count,
      cpuTimeMs: elapsed,
      collisionsFound,
    });
  }

  return results;
}

/**
 * Calculate performance metrics.
 */
export function calculatePerformanceMetrics(
  particleCount: number,
  cpuTimeMs: number,
  gpuTimeMs: number,
  memoryUsedBytes: number
): PerformanceMetrics {
  const speedup = cpuTimeMs / gpuTimeMs;
  const efficiency = speedup / (particleCount > 0 ? Math.log2(particleCount) : 1);
  const throughput = particleCount / (gpuTimeMs / 1000);
  const memoryBandwidth = memoryUsedBytes / (gpuTimeMs / 1000);

  return {
    speedup,
    efficiency,
    throughput,
    memoryBandwidth,
  };
}
