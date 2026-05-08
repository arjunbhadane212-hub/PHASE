import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API = process.env.REACT_APP_BACKEND_URL + '/api';

// Token storage - in-memory primary, localStorage backup
let inMemoryToken = localStorage.getItem('access_token') || null;
let inMemoryRefreshToken = localStorage.getItem('refresh_token') || null;

function saveTokens(access, refresh) {
  inMemoryToken = access;
  inMemoryRefreshToken = refresh;
  if (access) localStorage.setItem('access_token', access);
  else localStorage.removeItem('access_token');
  if (refresh) localStorage.setItem('refresh_token', refresh);
  else localStorage.removeItem('refresh_token');
}

function clearTokens() {
  inMemoryToken = null;
  inMemoryRefreshToken = null;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

// Axios interceptor: attach Bearer token to every request
axios.interceptors.request.use((config) => {
  if (inMemoryToken) {
    config.headers.Authorization = `Bearer ${inMemoryToken}`;
  }
  config.withCredentials = true;
  return config;
});

// Axios response interceptor: auto-refresh on 401
let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token) {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
}

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Don't retry auth endpoints or already-retried requests
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axios(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${API}/auth/refresh`, {}, {
          headers: inMemoryRefreshToken
            ? { Authorization: `Bearer ${inMemoryRefreshToken}` }
            : {},
          withCredentials: true
        });
        
        if (data.access_token) {
          saveTokens(data.access_token, inMemoryRefreshToken);
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          processQueue(null, data.access_token);
          return axios(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = not auth, object = auth
  const [loading, setLoading] = useState(true);
  const hasChecked = useRef(false);

  const checkAuth = useCallback(async () => {
    if (hasChecked.current) return;
    hasChecked.current = true;
    
    try {
      const { data } = await axios.get(`${API}/auth/me`);
      setUser(data);
    } catch {
      // Try refresh
      try {
        const refreshResp = await axios.post(`${API}/auth/refresh`, {}, {
          headers: inMemoryRefreshToken
            ? { Authorization: `Bearer ${inMemoryRefreshToken}` }
            : {},
          withCredentials: true
        });
        if (refreshResp.data.access_token) {
          saveTokens(refreshResp.data.access_token, inMemoryRefreshToken);
        }
        const { data } = await axios.get(`${API}/auth/me`);
        setUser(data);
      } catch {
        clearTokens();
        setUser(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const { data } = await axios.post(`${API}/auth/login`, { email, password });
    if (data.access_token) {
      saveTokens(data.access_token, data.refresh_token || null);
    }
    setUser(data.user);
    return data.user;
  };

  const register = async (firstName, lastName, email, password) => {
    const { data } = await axios.post(`${API}/auth/register`, {
      first_name: firstName,
      last_name: lastName,
      email,
      password
    });
    if (data.access_token) {
      saveTokens(data.access_token, data.refresh_token || null);
    }
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`);
    } catch {
      // Ignore logout errors
    }
    clearTokens();
    setUser(false);
  };

  const updateUser = (updates) => {
    setUser(prev => prev ? { ...prev, ...updates } : prev);
  };

  const refreshUser = async () => {
    try {
      const { data } = await axios.get(`${API}/auth/me`);
      setUser(data);
      return data;
    } catch {
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      register, 
      logout, 
      updateUser,
      refreshUser,
      isAuthenticated: !!user && user !== false
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
