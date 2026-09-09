import { create } from 'zustand';
import api from '../services/api';

export const useProjectStore = create((set, get) => ({
  projects: [],
  activeProject: null,
  summary: null,
  isLoading: false,
  error: null,

  fetchProjects: async (statusFilter = '') => {
    set({ isLoading: true, error: null });
    try {
      const url = statusFilter ? `/projects?status=${statusFilter}` : '/projects';
      const res = await api.get(url);
      set({ projects: res.data.data, isLoading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch projects', isLoading: false });
    }
  },

  fetchProjectById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get(`/projects/${id}`);
      set({ activeProject: res.data.data, isLoading: false });
      return res.data.data;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Project not found', isLoading: false });
    }
  },

  fetchProjectSummary: async (id) => {
    try {
      const res = await api.get(`/projects/${id}/summary`);
      set({ summary: res.data.data });
    } catch (err) {
      console.error('Failed to load project summary', err);
    }
  },
}));
