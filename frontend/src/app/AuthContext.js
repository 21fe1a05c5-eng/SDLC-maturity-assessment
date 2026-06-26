'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Intercept global fetch to attach Authorization header if token exists in sessionStorage
    if (typeof window !== 'undefined') {
      const originalFetch = window.fetch;
      window.fetch = async function (url, options = {}) {
        let targetUrl = url;
        if (typeof url === 'string' && url.startsWith('/api/')) {
          const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
          targetUrl = `${apiBase}${url}`;
        }
        const token = sessionStorage.getItem('token');
        if (token) {
          if (!options.headers) {
            options.headers = {};
          }
          if (options.headers instanceof Headers) {
            options.headers.set('Authorization', `Bearer ${token}`);
          } else if (Array.isArray(options.headers)) {
            const hasAuth = options.headers.some(([k]) => k.toLowerCase() === 'authorization');
            if (!hasAuth) {
              options.headers.push(['Authorization', `Bearer ${token}`]);
            }
          } else {
            options.headers['Authorization'] = `Bearer ${token}`;
          }
        }
        return originalFetch(targetUrl, options);
      };
    }
    checkUserLoggedIn();
  }, []);

  const checkUserLoggedIn = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (data.token) {
          sessionStorage.setItem('token', data.token);
        }
      } else {
        setUser(null);
        sessionStorage.removeItem('token');
      }
    } catch (error) {
      console.warn('Error checking user session:', error.message || error);
      setUser(null);
      sessionStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        return { success: false, message: data.message || 'Login failed' };
      }
      setUser(data.user);
      if (data.token) {
        sessionStorage.setItem('token', data.token);
      }
      router.push('/dashboard');
      return { success: true };
    } catch (error) {
      console.warn('Login attempt failed:', error.message);
      return { success: false, message: error.message || 'Login failed' };
    }
  };

  const signup = async (email, password) => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        return { success: false, message: data.message || 'Signup failed' };
      }
      setUser(data.user);
      if (data.token) {
        sessionStorage.setItem('token', data.token);
      }
      router.push('/dashboard');
      return { success: true };
    } catch (error) {
      console.warn('Signup attempt failed:', error.message);
      return { success: false, message: error.message || 'Signup failed' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      sessionStorage.removeItem('token');
      router.push('/login');
    } catch (error) {
      console.warn('Logout error:', error.message || error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser: checkUserLoggedIn }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
