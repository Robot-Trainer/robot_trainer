import type { PortInfo } from "@serialport/bindings-cpp"
 

const filterInterestingPorts = function(port: Partial<PortInfo>): boolean {
    return !!(
      (port.manufacturer && port.manufacturer !== "N/A") ||
      (port.serialNumber && port.serialNumber !== "N/A") ||
      (port.pnpId && port.pnpId !== "N/A") ||
      (port.locationId && port.locationId !== "N/A") ||
      (port.productId && port.productId !== "N/A") ||
      (port.vendorId && port.vendorId !== "N/A")
    );
}

export { filterInterestingPorts };
