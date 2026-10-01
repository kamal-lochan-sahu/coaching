import { create } from "zustand";

const applyTheme = (theme) => {
  document.documentElement.setAttribute("data-theme", theme);
};

const stored = localStorage.getItem("theme") || "light";
applyTheme(stored);

export const useThemeStore = create((set, get) => ({
  theme: stored,

  toggleTheme: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", next);
    applyTheme(next);
    set({ theme: next });
  },
}));
