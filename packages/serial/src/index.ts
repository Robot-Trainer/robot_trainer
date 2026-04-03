/**
 * @robot-trainer/serial — Web Serial API utilities for robot communication.
 *
 * Provides port scanning/discovery, a coordinator for exclusive port ownership,
 * a high-level Connection implementation, and a lightweight port wrapper.
 */

// Types
export type { SerialPortInfo, Connection } from "./types.js";

// Concurrency primitive
export { AsyncMutex } from "./mutex.js";

// Helpers
export { concatUint8 } from "./utils.js";

// Coordinator (singleton port ownership)
export { SerialPortCoordinator } from "./coordinator.js";
export type { SharedPortState } from "./coordinator.js";

// High-level Connection implementation
export { SerialConnection } from "./connection.js";

// Lightweight immediate-release wrapper
export { WebSerialPortWrapper } from "./port-wrapper.js";

// Port scanning / discovery
export {
  formatUsbId,
  mapWebSerialPort,
  filterInterestingPorts,
  getWebSerialPorts,
  getManagedWebSerialPorts,
  scanSerialPorts,
} from "./scanner.js";
export type { ManagedWebSerialPort } from "./scanner.js";
