import api from './api';

export const authService = {
  login: async (credentials: any) => {
    const response = await api.post('/auth/login/', credentials);
    if (response.data.access) {
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
    }
    return response.data;
  },

  register: async (userData: any) => {
    const response = await api.post('/auth/register/', userData);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile/');
    return response.data;
  }
};
