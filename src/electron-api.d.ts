interface UsbPort {
  path: string;
  manufacturer: string;
  serialNumber: string;
  productId?: string;
  vendorId?: string;
}

interface ElectronAPI {
  scanUsbPorts: () => Promise<UsbPort[]>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
