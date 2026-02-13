/**
 * Physics Simulation Service
 * Vector3, Quaternion, collision detection, kinematics, stress analysis, physics world.
 */

// ==================== Types ====================

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

interface Transform {
  position: Vector3;
  rotation: Quaternion;
  scale: Vector3;
}

interface Collider {
  type: 'box' | 'sphere' | 'capsule';
  dimensions: Vector3;
  center: Vector3;
}

interface RigidBody {
  id: string;
  name: string;
  transform: Transform;
  velocity: Vector3;
  angularVelocity: Vector3;
  mass: number;
  inertia: Vector3;
  isStatic: boolean;
  isKinematic: boolean;
  friction: number;
  restitution: number;
  collider: Collider;
  forces: Vector3[];
  torques: Vector3[];
}

interface AABB {
  min: Vector3;
  max: Vector3;
}

interface CollisionResult {
  penetrationDepth: number;
  normal: Vector3;
  contactPoint: Vector3;
}

interface KinematicChain {
  id: string;
  name: string;
  joints: Array<{
    id: string;
    type: 'hinge' | 'ball' | 'prismatic';
    bodyA: string;
    bodyB: string;
    anchorA: Vector3;
    anchorB: Vector3;
    axis: Vector3;
  }>;
  endEffector: string;
  dofCount: number;
}

interface PhysicsWorldConfig {
  gravity: Vector3;
  timeStep: number;
  substeps: number;
  maxIterations: number;
  tolerance: number;
  enableCollisions: boolean;
  enableFriction: boolean;
  enableSleep: boolean;
  sleepThreshold: number;
}

interface PhysicsWorld {
  bodies: Map<string, RigidBody>;
  gravity: Vector3;
  time: number;
}

interface StressTensor {
  xx: number;
  yy: number;
  zz: number;
  xy: number;
  yz: number;
  xz: number;
}

// ==================== Vector3 Utils ====================

export const Vector3Utils = {
  create(x: number, y: number, z: number): Vector3 {
    return { x, y, z };
  },

  add(a: Vector3, b: Vector3): Vector3 {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  },

  subtract(a: Vector3, b: Vector3): Vector3 {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  },

  scale(v: Vector3, s: number): Vector3 {
    return { x: v.x * s, y: v.y * s, z: v.z * s };
  },

  dot(a: Vector3, b: Vector3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  },

  cross(a: Vector3, b: Vector3): Vector3 {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
    };
  },

  magnitude(v: Vector3): number {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  },

  normalize(v: Vector3): Vector3 {
    const mag = Vector3Utils.magnitude(v);
    if (mag === 0) return { x: 0, y: 0, z: 0 };
    return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
  },
};

// ==================== Quaternion Utils ====================

export const QuaternionUtils = {
  identity(): Quaternion {
    return { x: 0, y: 0, z: 0, w: 1 };
  },

  fromEuler(euler: Vector3): Quaternion {
    const cx = Math.cos(euler.x / 2);
    const sx = Math.sin(euler.x / 2);
    const cy = Math.cos(euler.y / 2);
    const sy = Math.sin(euler.y / 2);
    const cz = Math.cos(euler.z / 2);
    const sz = Math.sin(euler.z / 2);

    return {
      x: sx * cy * cz - cx * sy * sz,
      y: cx * sy * cz + sx * cy * sz,
      z: cx * cy * sz - sx * sy * cz,
      w: cx * cy * cz + sx * sy * sz,
    };
  },

  multiply(a: Quaternion, b: Quaternion): Quaternion {
    return {
      x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
      y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
      z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
      w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    };
  },

  conjugate(q: Quaternion): Quaternion {
    return { x: -q.x, y: -q.y, z: -q.z, w: q.w };
  },

  rotateVector(q: Quaternion, v: Vector3): Vector3 {
    const qv: Quaternion = { x: v.x, y: v.y, z: v.z, w: 0 };
    const qConj = QuaternionUtils.conjugate(q);
    const result = QuaternionUtils.multiply(QuaternionUtils.multiply(q, qv), qConj);
    return { x: result.x, y: result.y, z: result.z };
  },
};

// ==================== Collision Detection ====================

export function computeAABB(body: RigidBody): AABB {
  const pos = body.transform.position;
  const dim = body.collider.dimensions;
  const halfExtents = { x: dim.x / 2, y: dim.y / 2, z: dim.z / 2 };

  return {
    min: {
      x: pos.x - halfExtents.x,
      y: pos.y - halfExtents.y,
      z: pos.z - halfExtents.z,
    },
    max: {
      x: pos.x + halfExtents.x,
      y: pos.y + halfExtents.y,
      z: pos.z + halfExtents.z,
    },
  };
}

export function aabbIntersects(a: AABB, b: AABB): boolean {
  return (
    a.min.x <= b.max.x && a.max.x >= b.min.x &&
    a.min.y <= b.max.y && a.max.y >= b.min.y &&
    a.min.z <= b.max.z && a.max.z >= b.min.z
  );
}

export function sphereCollision(
  posA: Vector3, radiusA: number,
  posB: Vector3, radiusB: number
): CollisionResult | null {
  const dx = posB.x - posA.x;
  const dy = posB.y - posA.y;
  const dz = posB.z - posA.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const combinedRadius = radiusA + radiusB;

  if (dist >= combinedRadius) return null;

  const normal = dist > 0
    ? { x: dx / dist, y: dy / dist, z: dz / dist }
    : { x: 1, y: 0, z: 0 };

  return {
    penetrationDepth: combinedRadius - dist,
    normal,
    contactPoint: {
      x: posA.x + normal.x * radiusA,
      y: posA.y + normal.y * radiusA,
      z: posA.z + normal.z * radiusA,
    },
  };
}

// ==================== Kinematics ====================

export function forwardKinematics(
  chain: KinematicChain,
  jointAngles: number[],
  _bodyTransforms: Map<string, Transform>
): Transform[] {
  const transforms: Transform[] = [];

  for (let i = 0; i < chain.joints.length; i++) {
    const joint = chain.joints[i];
    const angle = jointAngles[i] || 0;

    // Create rotation quaternion around joint axis
    const halfAngle = angle / 2;
    const sinHalf = Math.sin(halfAngle);
    const cosHalf = Math.cos(halfAngle);
    const rotation: Quaternion = {
      x: joint.axis.x * sinHalf,
      y: joint.axis.y * sinHalf,
      z: joint.axis.z * sinHalf,
      w: cosHalf,
    };

    const position = Vector3Utils.add(joint.anchorA, joint.anchorB);

    transforms.push({
      position,
      rotation,
      scale: { x: 1, y: 1, z: 1 },
    });
  }

  return transforms;
}

export function inverseKinematics(
  chain: KinematicChain,
  targetPosition: Vector3,
  initialAngles: number[],
  maxIterations: number,
  tolerance: number
): { angles: number[]; error: number; iterations: number } {
  const angles = [...initialAngles];
  let error = Infinity;
  let iterations = 0;

  for (let i = 0; i < maxIterations; i++) {
    iterations = i + 1;
    const transforms = forwardKinematics(chain, angles, new Map());
    if (transforms.length === 0) break;

    const endPos = transforms[transforms.length - 1].position;
    const diff = Vector3Utils.subtract(targetPosition, endPos);
    error = Vector3Utils.magnitude(diff);

    if (error < tolerance) break;

    // Simple gradient descent
    for (let j = 0; j < angles.length; j++) {
      angles[j] += 0.01 * (j === 0 ? diff.x : diff.y);
    }
  }

  return { angles, error, iterations };
}

// ==================== Stress Analysis ====================

export function calculateVonMisesStress(stress: StressTensor): number {
  const { xx, yy, zz, xy, yz, xz } = stress;
  const term1 = (xx - yy) ** 2 + (yy - zz) ** 2 + (zz - xx) ** 2;
  const term2 = 6 * (xy ** 2 + yz ** 2 + xz ** 2);
  return Math.sqrt((term1 + term2) / 2);
}

export function calculatePrincipalStresses(stress: StressTensor): number[] {
  const { xx, yy, zz, xy, yz, xz } = stress;

  // For the simple case where shear stresses are zero, principal stresses are the diagonal
  if (xy === 0 && yz === 0 && xz === 0) {
    return [xx, yy, zz].sort((a, b) => b - a);
  }

  // Characteristic equation coefficients
  const I1 = xx + yy + zz;
  const I2 = xx * yy + yy * zz + zz * xx - xy * xy - yz * yz - xz * xz;
  const I3 = xx * yy * zz + 2 * xy * yz * xz - xx * yz * yz - yy * xz * xz - zz * xy * xy;

  // Solve cubic using Cardano's method (simplified)
  const p = I1 * I1 / 3 - I2;
  const q = 2 * I1 * I1 * I1 / 27 - I1 * I2 / 3 + I3;
  const discriminant = Math.sqrt(Math.max(p / 3, 0));

  if (discriminant === 0) return [I1 / 3, I1 / 3, I1 / 3];

  const phi = Math.acos(Math.max(-1, Math.min(1, -q / (2 * discriminant * discriminant * discriminant)))) / 3;

  const s1 = I1 / 3 + 2 * discriminant * Math.cos(phi);
  const s2 = I1 / 3 + 2 * discriminant * Math.cos(phi - 2 * Math.PI / 3);
  const s3 = I1 / 3 + 2 * discriminant * Math.cos(phi - 4 * Math.PI / 3);

  return [s1, s2, s3].sort((a, b) => b - a);
}

export function calculateSafetyFactor(appliedStress: number, yieldStrength: number): number {
  if (appliedStress === 0) return Infinity;
  return yieldStrength / appliedStress;
}

export function analyzeStress(
  force: Vector3,
  _area: number,
  crossSectionArea: number,
  _length: number,
  yieldStrength: number
): { vonMisesStress: number; safetyFactor: number; principalStresses: number[] } {
  const forceMag = Vector3Utils.magnitude(force);
  const normalStress = forceMag / crossSectionArea;

  const stressTensor: StressTensor = {
    xx: normalStress,
    yy: 0,
    zz: 0,
    xy: 0,
    yz: 0,
    xz: 0,
  };

  const vonMisesStress = calculateVonMisesStress(stressTensor);
  const safetyFactor = calculateSafetyFactor(vonMisesStress, yieldStrength);
  const principalStresses = calculatePrincipalStresses(stressTensor);

  return { vonMisesStress, safetyFactor, principalStresses };
}

// ==================== Physics World ====================

export function createPhysicsWorld(config: PhysicsWorldConfig): PhysicsWorld {
  return {
    bodies: new Map(),
    gravity: { ...config.gravity },
    time: 0,
  };
}

export function addRigidBody(world: PhysicsWorld, body: RigidBody): void {
  world.bodies.set(body.id, body);
}

export function applyForce(world: PhysicsWorld, bodyId: string, force: Vector3): void {
  const body = world.bodies.get(bodyId);
  if (body) {
    body.forces.push({ ...force });
  }
}

export function stepPhysicsWorld(world: PhysicsWorld, config: PhysicsWorldConfig): void {
  const dt = config.timeStep;

  for (const body of world.bodies.values()) {
    if (body.isStatic || body.isKinematic) continue;

    // Accumulate forces (gravity + applied)
    let totalForce = { x: 0, y: 0, z: 0 };
    totalForce = Vector3Utils.add(totalForce, Vector3Utils.scale(config.gravity, body.mass));

    for (const f of body.forces) {
      totalForce = Vector3Utils.add(totalForce, f);
    }

    // Acceleration = Force / mass
    const acceleration = Vector3Utils.scale(totalForce, 1 / body.mass);

    // Update velocity
    body.velocity = Vector3Utils.add(body.velocity, Vector3Utils.scale(acceleration, dt));

    // Update position
    body.transform.position = Vector3Utils.add(
      body.transform.position,
      Vector3Utils.scale(body.velocity, dt)
    );

    // Clear forces
    body.forces.length = 0;
  }

  world.time += dt;
}
