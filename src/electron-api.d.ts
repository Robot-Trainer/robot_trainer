interface SerialPort {
  path: string;
  manufacturer: string;
  serialNumber: string;
  productId?: string;
  vendorId?: string;
  pnpId?: string;
}

interface ElectronAPI {
  scanSerialPorts: () => Promise<SerialPort[]>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
