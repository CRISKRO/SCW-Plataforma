import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// URL de PythonAnywhere del usuario (o desarrollo local)
const API_URL = 'https://renescw.pythonanywhere.com/api'; 

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para inyectar el token JWT en cada petición
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para desloguear si el token expira (401)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Si el servidor rechaza el token, cerramos sesión
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);
