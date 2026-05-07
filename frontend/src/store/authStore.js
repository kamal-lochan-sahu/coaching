import { create } from "zustand";
import api from "../services/api";

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem("user") || "null"),
  token: localStorage.getItem("accessToken") || null,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    const res = await api.post("/auth/login", { email, password });
    const { user, accessToken } = res.data.data;
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("user", JSON.stringify(user));
    set({ user, token: accessToken, isLoading: false });
    return user;
  },

  register: async (data) => {
    set({ isLoading: true });
    const res = await api.post("/auth/register", data);
    const { user, accessToken } = res.data.data;
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("user", JSON.stringify(user));
    set({ user, token: accessToken, isLoading: false });
    return user;
  },

  logout: async () => {
    try { await api.post("/auth/logout"); } catch {}
    localStorage.clear();
    set({ user: null, token: null });
    window.location.href = "/login";
  },

  setUser: (user) => {
    localStorage.setItem("user", JSON.stringify(user));
    set({ user });
  },
}));
