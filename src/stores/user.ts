import { create } from "zustand";
import { usePermissionStore } from "@/stores/permission";

interface UserInfo {
    id: number;
    username: string;
    avatar: string;
    roles: string[];
    permissions: string[];
}

interface UserStore {
    token: string;
    setToken: (token: string) => void;
    userInfo: UserInfo | null;
    setUserInfo: (userInfo: UserInfo) => void;
    login: (token: string) => void;
    logout: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
    token: localStorage.getItem('token') || '',
    setToken: (token: string) => set({ token }),
    login:(token: string) => {
        localStorage.setItem('token', token)
        set({ token })
    },
    logout: () => {
        localStorage.removeItem('token')
        set({ token: '' })
        usePermissionStore.getState().reset()
    },
    userInfo: null,
    setUserInfo: (userInfo: any) => set({ userInfo }),
}))