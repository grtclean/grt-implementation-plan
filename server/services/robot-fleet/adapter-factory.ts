/**
 * Robot Adapter Factory
 *
 * Creates brand-specific adapter instances and manages a singleton registry
 * keyed by robotId to avoid creating duplicate adapters.
 */

import type { RobotBrand, IRobotAdapter } from "./types";
import { KukaAdapter } from "./kuka-adapter";
import { FanucAdapter } from "./fanuc-adapter";
import { AbbAdapter } from "./abb-adapter";
import { StaubliAdapter } from "./staubli-adapter";

/** Singleton registry: robotId → adapter instance */
const adapterRegistry = new Map<number, IRobotAdapter>();

/** Create a new adapter for the given brand */
export function createAdapter(brand: RobotBrand): IRobotAdapter {
  switch (brand) {
    case "kuka":
      return new KukaAdapter();
    case "fanuc":
      return new FanucAdapter();
    case "abb":
      return new AbbAdapter();
    case "staubli":
      return new StaubliAdapter();
    default:
      throw new Error(`Unsupported robot brand: ${brand}`);
  }
}

/** Get existing adapter for a robotId, or create a new one */
export function getOrCreateAdapter(robotId: number, brand: RobotBrand): IRobotAdapter {
  const existing = adapterRegistry.get(robotId);
  if (existing && existing.brand === brand) {
    return existing;
  }

  const adapter = createAdapter(brand);
  adapterRegistry.set(robotId, adapter);
  return adapter;
}

/** Remove adapter from registry (on decommission) */
export function removeAdapter(robotId: number): void {
  adapterRegistry.delete(robotId);
}

/** Get all active adapter entries */
export function getActiveAdapters(): Array<{ robotId: number; brand: RobotBrand }> {
  return Array.from(adapterRegistry.entries()).map(([robotId, adapter]) => ({
    robotId,
    brand: adapter.brand,
  }));
}
