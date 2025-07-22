// src/hooks/use-auth.ts
"use client";

import { useState, useEffect, useCallback } from 'react';

const USER_STORAGE_KEY = 'bvp-auth-user';

interface User {
  name: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const storedUser = sessionStorage.getItem(USER_STORAGE_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse user from sessionStorage", error);
      sessionStorage.removeItem(USER_STORAGE_KEY);
    }
  }, []);

  const login = useCallback((userData: User) => {
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
  }, []);

  return { user, login, logout };
};

    