import { create } from 'zustand';
import { authService } from '../services/api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  restaurantId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Restaurant {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  restaurant: Restaurant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    restaurantName: string;
  }) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Inicializar desde localStorage
  const token = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refreshToken');

  return {
    user: null,
    token,
    refreshToken,
    restaurant: null,
    isAuthenticated: !!token,
    isLoading: false,

    login: async (email: string, password: string) => {
      set({ isLoading: true });
      try {
        const response = await authService.login(email, password);
        const { user, tokens, restaurant } = response.data;

        localStorage.setItem('token', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);

        set({
          user,
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          restaurant,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error: any) {
        set({ isLoading: false });
        throw error;
      }
    },

    register: async (data) => {
      set({ isLoading: true });
      try {
        const response = await authService.register(data);
        const { user, tokens, restaurant } = response.data;

        localStorage.setItem('token', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);

        set({
          user,
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          restaurant,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error: any) {
        set({ isLoading: false });
        throw error;
      }
    },

    logout: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      set({
        user: null,
        token: null,
        refreshToken: null,
        restaurant: null,
        isAuthenticated: false,
      });
    },

    setUser: (user: User | null) => {
      set({ user });
    },

    loadUser: async () => {
      const { token } = get();
      if (!token) {
        return;
      }

      set({ isLoading: true });
      try {
        const response = await authService.getMe();
        const { user, restaurant } = response.data;

        set({
          user,
          restaurant,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error: any) {
        set({ isLoading: false });
        // Si falla, limpiar el estado
        get().logout();
      }
    },
  };
});
