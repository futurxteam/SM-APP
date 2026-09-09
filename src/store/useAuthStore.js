import { create } from 'zustand';
import api from '../services/api';

export const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('hygge_user')) || null,
  token: localStorage.getItem('hygge_token') || null,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, data } = response.data;
      const user = data.user;

      localStorage.setItem('hygge_token', token);
      localStorage.setItem('hygge_user', JSON.stringify(user));

      set({ token, user, isLoading: false });
      return user;
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  logout: () => {
    localStorage.removeItem('hygge_token');
    localStorage.removeItem('hygge_user');
    set({ user: null, token: null });
  },

  fetchMe: async () => {
    if (!get().token) return;
    try {
      const res = await api.get('/auth/me');
      const user = res.data.data.user;
      localStorage.setItem('hygge_user', JSON.stringify(user));
      set({ user });
    } catch (err) {
      get().logout();
    }
  },

  // Role Helper Utilities
  isSuperAdmin: () => get().user?.role === 'super_admin',
  isProjectManager: () => get().user?.role === 'project_manager',
  isSiteSupervisor: () => get().user?.role === 'site_supervisor',
  isAccounts: () => get().user?.role === 'accounts',
}));
