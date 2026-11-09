import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});
let activeRequests = 0;

// In-memory + sessionStorage GET response cache
const memoryCache = new Map();
const CACHE_STORAGE_PREFIX = 'hygge_api_cache:';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL unless mutated or manually refreshed

const buildCacheKey = (url, config = {}) => {
  const params = config.params ? JSON.stringify(config.params) : '';
  return `${url}?${params}`;
};

export const clearApiCache = () => {
  memoryCache.clear();
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const keysToRemove = [];
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const k = window.sessionStorage.key(i);
        if (k && k.startsWith(CACHE_STORAGE_PREFIX)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => window.sessionStorage.removeItem(k));
    } catch (e) {
      // Ignore storage quota / security errors
    }
  }
};

const getCachedResponse = (key) => {
  const now = Date.now();
  if (memoryCache.has(key)) {
    const entry = memoryCache.get(key);
    if (now - entry.timestamp < CACHE_TTL_MS) {
      return entry.response;
    }
    memoryCache.delete(key);
  }
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const raw = window.sessionStorage.getItem(CACHE_STORAGE_PREFIX + key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (now - parsed.timestamp < CACHE_TTL_MS) {
          const reconstructed = {
            data: parsed.data,
            status: 200,
            statusText: 'OK (Cached)',
            headers: {},
            config: {},
            cached: true,
          };
          memoryCache.set(key, { timestamp: parsed.timestamp, response: reconstructed });
          return reconstructed;
        }
        window.sessionStorage.removeItem(CACHE_STORAGE_PREFIX + key);
      }
    } catch (e) {
      // Ignore parse errors
    }
  }
  return null;
};

const setCachedResponse = (key, response) => {
  const timestamp = Date.now();
  const cachedObj = {
    data: response.data,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    config: response.config,
    cached: true,
  };
  memoryCache.set(key, { timestamp, response: cachedObj });
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.setItem(
        CACHE_STORAGE_PREFIX + key,
        JSON.stringify({ timestamp, data: response.data })
      );
    } catch (e) {
      // Ignore quota exceeded
    }
  }
};

const notifyLoading = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('hygge:loading', {
        detail: { count: activeRequests, active: activeRequests > 0 }
      })
    );
  }
};

// Wrap api.get with smart caching (excluding blob/arraybuffer downloads)
const rawGet = api.get.bind(api);
api.get = async (url, config = {}) => {
  const isBinary = config?.responseType === 'blob' || config?.responseType === 'arraybuffer';
  if (!isBinary && !config?.skipCache) {
    const key = buildCacheKey(url, config);
    const cached = getCachedResponse(key);
    if (cached) {
      return Promise.resolve(cached);
    }
    const response = await rawGet(url, config);
    setCachedResponse(key, response);
    return response;
  }
  return rawGet(url, config);
};

// Interceptor to attach Bearer token to all requests
api.interceptors.request.use(
  (config) => {
    activeRequests++;
    notifyLoading();
    const token = localStorage.getItem('hygge_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    activeRequests = Math.max(0, activeRequests - 1);
    notifyLoading();
    return Promise.reject(error);
  }
);

// Interceptor for response handling, cache invalidation on mutations & 401 redirect
api.interceptors.response.use(
  (response) => {
    activeRequests = Math.max(0, activeRequests - 1);
    notifyLoading();
    const method = (response.config?.method || '').toLowerCase();
    if (['post', 'put', 'patch', 'delete'].includes(method)) {
      clearApiCache();
    }
    return response;
  },
  (error) => {
    activeRequests = Math.max(0, activeRequests - 1);
    notifyLoading();
    if (error.response && error.response.status === 401) {
      clearApiCache();
      localStorage.removeItem('hygge_token');
      localStorage.removeItem('hygge_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
