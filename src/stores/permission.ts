import { create } from "zustand";
import type { RouteConfig } from "@/router/routes";

interface PermissionStore {
  routes: RouteConfig[];
  setRoutes: (routes: RouteConfig[]) => void;

  tabs: RouteConfig[];
  setTabs: (updater: (prev: RouteConfig[]) => RouteConfig[]) => void;

  lastAccess: Record<string, number>;
  setLastAccess: (path: string, time: number) => void;
  deleteLastAccess: (path: string) => void;

  reset: () => void;
}

export const usePermissionStore = create<PermissionStore>((set) => ({
  // 默认静态路由 + 动态路由
  routes: [],
  setRoutes: (routes: RouteConfig[]) => set({ routes }),

  tabs: [],
  setTabs: (updater) => set((state) => ({ tabs: updater(state.tabs) })),

  lastAccess: {},
  setLastAccess: (path, time) => set((state) => ({ lastAccess: { ...state.lastAccess, [path]: time } })),
  deleteLastAccess: (path) => set((state) => {
    const next = { ...state.lastAccess };
    delete next[path];
    return { lastAccess: next };
  }),

  reset: () => set({ routes: [], tabs: [], lastAccess: {} }),
}))