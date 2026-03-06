'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: number;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, full_name: string, phone: string, role?: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Загрузить токен из localStorage при монтировании
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    if (savedToken) {
      setToken(savedToken);
      checkAuth(savedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Проверить аутентификацию по токену
  // В файле app/context/AuthContext.tsx

// Проверить аутентификацию по токену
const checkAuth = async (authToken?: string) => {
  const tokenToUse = authToken || token;
  
  if (!tokenToUse) {
    setIsLoading(false);
    return;
  }

  try {
    // --- ИЗМЕНЕНИЯ ЗДЕСЬ ---
    const response = await fetch(`${API_URL}/api/auth/verify-token`, {
      method: 'POST', // 1. Метод теперь POST
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token: tokenToUse }) // 2. Токен передается в теле запроса
    });

    if (response.ok) {
      const userData = await response.json();
      setUser(userData);
      setToken(tokenToUse); // Убедимся, что токен остается в состоянии
    } else {
      // Токен невалидный
      localStorage.removeItem('auth_token');
      setToken(null);
      setUser(null);
    }
  } catch (error) {
    console.error('Auth check error:', error);
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  } finally {
    setIsLoading(false);
  }
};


  // Логин
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }

      const data = await response.json();
      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem('auth_token', data.access_token);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Регистрация
  // В файле app/context/AuthContext.tsx

// Регистрация с автоматическим логином после успеха
const register = async (
  email: string,
  password: string,
  full_name: string,
  phone: string,
  role: string = 'customer'
) => {
  setIsLoading(true);
  try {
    // --- ШАГ 1: РЕГИСТРАЦИЯ ---
    const registerResponse = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name, phone, role })
    });

    if (!registerResponse.ok) {
      // Если регистрация не удалась, выбрасываем ошибку
      const error = await registerResponse.json();
      throw new Error(error.detail || 'Registration failed');
    }

    // Регистрация прошла успешно! Теперь логинимся.
    console.log('✅ Registration successful. Now logging in...');

    // --- ШАГ 2: АВТОМАТИЧЕСКИЙ ЛОГИН ---
    // Вызываем нашу уже существующую функцию login
    await login(email, password);

    // Функция login сама обработает токен, пользователя и localStorage.
    // Больше здесь ничего делать не нужно.

  } catch (error) {
    console.error('Register process error:', error);
    // Передаем ошибку дальше, чтобы форма могла ее показать
    throw error;
  } finally {
    // В любом случае выключаем загрузку
    setIsLoading(false);
  }
};


  // Логаут
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        checkAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook для использования контекста
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
