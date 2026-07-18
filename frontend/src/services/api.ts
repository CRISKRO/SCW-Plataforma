import axios from 'axios';

const browserOrigin = typeof window !== 'undefined'
  ? window.location.origin
  : 'http://localhost';

const envApiUrl = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL
  : undefined;

// Si estamos en desarrollo, forzamos la ruta del backend local (así evitamos que apunte a producción por error)
const isDevelopment = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';
const fallbackProductionUrl = 'https://renescw.pythonanywhere.com/api';
const API_URL = isDevelopment 
  ? `${browserOrigin.replace(/:\d+$/, '')}:8000/api` 
  : (envApiUrl || fallbackProductionUrl);

const api = axios.create({
  baseURL: API_URL,
});

export const getMediaUrl = (url?: string | null) => {
  if (!url) return '';
  
  // If the backend returned an absolute URL (like http://renescw.pythonanywhere.com/media/...)
  // We MUST force https to avoid mixed content errors on Vercel
  if (url.startsWith('http://') && url.includes('pythonanywhere.com')) {
    return url.replace('http://', 'https://');
  }

  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  
  // Get the base host without /api
  const host = API_URL.replace(/\/api\/?$/, '');
  return `${host}${url.startsWith('/') ? '' : '/'}${url}`;
};

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

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.map((cb) => cb(token));
  refreshSubscribers = [];
};

// Interceptor to handle 401 Unauthorized (invalid/expired token)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If the error is 401 Unauthorized and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      
      if (typeof window !== 'undefined') {
        try {
          const refreshToken = localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          const isLocal = !!localStorage.getItem('refresh_token');

          // Use axios directly to avoid interceptor loops
          const response = await axios.post(`${API_URL}/auth/login/refresh/`, {
            refresh: refreshToken
          });

          const newAccessToken = response.data.access;

          if (isLocal) {
            localStorage.setItem('access_token', newAccessToken);
            if (response.data.refresh) {
              localStorage.setItem('refresh_token', response.data.refresh);
            }
          } else {
            sessionStorage.setItem('access_token', newAccessToken);
            if (response.data.refresh) {
              sessionStorage.setItem('refresh_token', response.data.refresh);
            }
          }

          isRefreshing = false;
          onRefreshed(newAccessToken);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          return api(originalRequest);
        } catch (refreshError) {
          isRefreshing = false;
          refreshSubscribers = [];
          
          // Clear invalid tokens
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          sessionStorage.removeItem('access_token');
          sessionStorage.removeItem('refresh_token');
          
          // Remove the Authorization header and retry the request to let it fail or succeed as public
          if (originalRequest.headers) {
            delete originalRequest.headers.Authorization;
          }
          
          return Promise.reject(refreshError);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
