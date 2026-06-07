import axios from 'axios';

const browserOrigin = typeof window !== 'undefined'
  ? window.location.origin
  : 'http://localhost';

const envApiUrl = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL
  : undefined;

// Si estamos en desarrollo, forzamos la ruta del backend local (así evitamos que apunte a producción por error)
const isDevelopment = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';
const API_URL = isDevelopment 
  ? `${browserOrigin.replace(/:\d+$/, '')}:8000/api` 
  : (envApiUrl || `${browserOrigin.replace(/:\d+$/, '')}:8000/api`);

const api = axios.create({
  baseURL: API_URL,
});

// Interceptor to add the JWT token to requests
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    // If sending FormData, let the browser set the Content-Type automatically
    // (it needs to add the multipart boundary). Otherwise use JSON.
    if (config.data instanceof FormData) {
      if (typeof config.headers.delete === 'function') {
        config.headers.delete('Content-Type');
      } else {
        delete config.headers['Content-Type'];
      }
    } else {
      if (typeof config.headers.set === 'function') {
        config.headers.set('Content-Type', 'application/json');
      } else {
        config.headers['Content-Type'] = 'application/json';
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to handle 401 Unauthorized (invalid/expired token)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If the error is 401 Unauthorized and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      if (typeof window !== 'undefined') {
        // Clear invalid tokens
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('refresh_token');
        
        // Remove the Authorization header and retry the request
        if (originalRequest.headers) {
          delete originalRequest.headers.Authorization;
        }
        
        // This will allow public endpoints to succeed on the retry
        return api(originalRequest);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
