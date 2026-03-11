import type { ElectronAPI } from './types/electron';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    __appIdle?: boolean;
  }
}

declare module '*?url' {
  const content: string;
  export default content;
}

export {};

