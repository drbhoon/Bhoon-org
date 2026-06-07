import axios from 'axios';

const api = axios.create({
  baseURL:          '/api',
  withCredentials:  true,   // send ksb_sso_token cookie on every request
});

// Attach localStorage JWT as fallback (for sessions created before SSO migration)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ksb_user_token');
  if (token && !config.headers['Authorization']) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ksb_user_token');
      localStorage.removeItem('ksb_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
