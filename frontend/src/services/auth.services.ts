import api from './api';

export const authService = {
  login: async (credentials: any, remember: boolean = true) => {
    const response = await api.post('/auth/login/', credentials);
    if (response.data.access) {
      if (remember) {
        localStorage.setItem('access_token', response.data.access);
        localStorage.setItem('refresh_token', response.data.refresh);
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('refresh_token');
      } else {
        sessionStorage.setItem('access_token', response.data.access);
        sessionStorage.setItem('refresh_token', response.data.refresh);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
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
