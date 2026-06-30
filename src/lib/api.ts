import axios from 'axios';
import { supabase } from './supabase';

// Get API base URL from Vite environment variables or fallback to a local default
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request Interceptor: Automatically inject Supabase access token (JWT) if active session exists
api.interceptors.request.use(
  async (config) => {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Could not fetch Supabase session for API header:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Simplify response handling and centralized error catching
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Process error response or fallback to general error message
    const formattedError = {
      message: error.response?.data?.message || error.message || 'Something went wrong',
      status: error.response?.status,
      data: error.response?.data,
    };

    console.error('API Error Response:', formattedError);

    // Global action for Unauthorized (401)
    if (formattedError.status === 401) {
      console.warn('Unauthorized request. Redirecting or signing out...');
      // Optional: Trigger custom sign-out or session cleanup here
    }

    return Promise.reject(formattedError);
  }
);

export default api;
