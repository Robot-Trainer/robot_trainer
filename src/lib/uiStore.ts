import { create } from "zustand";
import ConfigManager from "./config_manager";

type UIState = {
  currentPage: string;
  setCurrentPage: (p: string) => void;
  resourceManagerShowForm: boolean;
    setResourceManagerShowForm: (v: boolean) => void;
    config: ConfigManager;
};

const useUIStore = create<UIState>((set) => ({
    currentPage: "home",
    setCurrentPage: (p: string) => set(() => ({ currentPage: p })),
    resourceManagerShowForm: false,
    setResourceManagerShowForm: (v: boolean) =>
        set(() => ({ resourceManagerShowForm: v })),
    config: new ConfigManager(),
    setConfig: (k: string, v: any) => set((s) => {
        s.config.set(k, v);
        return s;
    })
}));

export default useUIStore;
