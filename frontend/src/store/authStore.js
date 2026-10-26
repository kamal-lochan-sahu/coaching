import { create } from "zustand";
import api from "../services/api";

const saveSession = ({ user, accessToken, refreshToken }) => {
  localStorage.setItem("accessToken", accessToken);
  if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
  localStorage.setItem("user", JSON.stringify(user));
};

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem("user") || "null"),
  token: localStorage.getItem("accessToken") || null,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post("/auth/login", { email, password });
      saveSession(res.data.data);
      set({ user: res.data.data.user, token: res.data.data.accessToken, isLoading: false });
      return res.data.data.user;
    } catch (err) {
      set({ isLoading: false });   // otherwise the button stays "loading" after a wrong password
      throw err;
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const res = await api.post("/auth/register", data);
      saveSession(res.data.data);
      set({ user: res.data.data.user, token: res.data.data.accessToken, isLoading: false });
      return res.data.data.user;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    // Tell the server to forget THIS device (best effort — we log out locally either way).
    try { await api.post("/auth/logout", { refreshToken: localStorage.getItem("refreshToken") || undefined }); } catch {}
    localStorage.clear();
    set({ user: null, token: null });
    window.location.href = "/login";
  },

  setUser: (user) => {
    localStorage.setItem("user", JSON.stringify(user));
    set({ user });
  },
}));
