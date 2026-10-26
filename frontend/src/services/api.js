import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// No cookies: the frontend (Vercel) and the API (Render) are different sites, and browsers do not
// store/send strict cookies between them. Tokens travel in headers / the JSON body instead.
const api = axios.create({ baseURL: API_URL });

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// These endpoints answer 401 for ordinary reasons (wrong password, expired session...). They must
// never trigger a token refresh or a redirect — otherwise a mistyped password reloads the login page.
const AUTH_ENDPOINTS = ["/auth/login", "/auth/register", "/auth/refresh-token", "/auth/forgot-password", "/auth/reset-password"];

// ONE refresh at a time: when the access token expires, a page fires several requests together and
// they all get 401. They must share a single refresh call instead of each starting their own.
let refreshPromise = null;
const refreshAccessToken = () => {
  if (!refreshPromise) {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) return Promise.reject(new Error("No refresh token"));
    refreshPromise = axios
      .post(`${API_URL}/auth/refresh-token`, { refreshToken })
      .then((res) => {
        const { accessToken, refreshToken: newRefreshToken } = res.data.data;
        localStorage.setItem("accessToken", accessToken);
        if (newRefreshToken) localStorage.setItem("refreshToken", newRefreshToken); // sliding session
        return accessToken;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
};

api.interceptors.response.use(
  (res) => {
    // Changing the password signs every other device out and gives THIS device a fresh session.
    const data = res.data?.data;
    if (res.config.url?.includes("/auth/change-password") && data?.accessToken) {
      localStorage.setItem("accessToken", data.accessToken);
      if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
    }
    return res;
  },
  async (error) => {
    const original = error.config;
    const isAuthEndpoint = AUTH_ENDPOINTS.some((p) => original?.url?.includes(p));

    if (error.response?.status === 401 && original && !original._retry && !isAuthEndpoint) {
      original._retry = true;

      // This request went out with a token that has since been replaced (another request already
      // refreshed while this one was in flight): just retry with the current token — no 2nd refresh.
      const sentToken = String(original.headers?.Authorization || "").replace(/^Bearer /, "");
      const currentToken = localStorage.getItem("accessToken");
      if (currentToken && sentToken && currentToken !== sentToken) {
        original.headers.Authorization = `Bearer ${currentToken}`;
        return api(original);
      }

      try {
        const newToken = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        localStorage.clear();
        if (window.location.pathname !== "/login") window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
