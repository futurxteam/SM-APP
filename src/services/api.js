import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

let activeRequests = 0;

const notifyLoading = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('hygge:loading', {
        detail: { count: activeRequests, active: activeRequests > 0 }
      })
    );
  }
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

// Interceptor for response handling & 401 redirect
api.interceptors.response.use(
  (response) => {
    activeRequests = Math.max(0, activeRequests - 1);
    notifyLoading();
    return response;
  },
  (error) => {
    activeRequests = Math.max(0, activeRequests - 1);
    notifyLoading();
    if (error.response && error.response.status === 401) {
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
