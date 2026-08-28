import api from './client';
import type { LoginResponse, User } from '../types';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ data: LoginResponse }>('/auth/login', { email, password }),

  me: () => api.get<{ data: User }>('/auth/me'),

  register: (email: string, password: string, fullName: string) =>
    api.post('/auth/register', { email, password, fullName }),

  refresh: (refreshToken: string) =>
    api.post<{ data: { accessToken: string; refreshToken: string } }>('/auth/refresh', { refreshToken }),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }),

  verifyEmail: (token: string) =>
    api.get(`/auth/verify-email?token=${token}`),
};
