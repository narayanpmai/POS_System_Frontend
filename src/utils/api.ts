import axios from 'axios';

const getBaseURL = () => {
  let url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

export const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
