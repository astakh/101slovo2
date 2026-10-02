/**
 * Authentication context and provider.
 * Manages access token in memory and handles 401 responses.
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";

interface UserInfo {
  id: number;
  email: string;
  is_onboarded: boolean;
  is_admin: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserInfo | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  accessToken: string | null;
  completeOnboarding: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface TokenResponse {
  access_token: string;
  token_type: string;
}

/**
 * AuthProvider manages authentication state and provides auth methods.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  
  const refreshPromiseRef = useRef<Promise<string> | null>(null);
  const sessionRestoredRef = useRef(false);

  const isAuthenticated = accessToken !== null;

  const fetchUserInfo = useCallback(async (token: string): Promise<UserInfo> => {
    const response = await fetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    });
    
    if (!response.ok) {
      throw new Error("Failed to fetch user info");
    }
    
    return response.json();
  }, []);

  const refreshAccessToken = useCallback(async (): Promise<string> => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const promise = (async () => {
      try {
        const response = await apiClient.post<TokenResponse>("/auth/refresh");
        const newToken = response.access_token;
        setAccessToken(newToken);
        
        try {
          const userInfo = await fetchUserInfo(newToken);
          setUser(userInfo);
        } catch {
          // Ignore user info fetch errors during refresh
        }
        
        return newToken;
      } catch (error) {
        setAccessToken(null);
        setUser(null);
        navigate("/auth");
        throw error;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    refreshPromiseRef.current = promise;
    return promise;
  }, [navigate, fetchUserInfo]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post<TokenResponse>("/auth/login", { email, password });
      const token = response.access_token;
      setAccessToken(token);
      
      const userInfo = await fetchUserInfo(token);
      setUser(userInfo);
      
      if (!userInfo.is_onboarded) {
        navigate("/onboarding");
      } else {
        navigate("/");
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigate, fetchUserInfo]);

  const register = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post<TokenResponse>("/auth/register", { email, password });
      const token = response.access_token;
      setAccessToken(token);
      
      const userInfo = await fetchUserInfo(token);
      setUser(userInfo);
      
      navigate("/onboarding");
    } finally {
      setIsLoading(false);
    }
  }, [navigate, fetchUserInfo]);

  const completeOnboarding = useCallback(async () => {
    if (accessToken) {
      try {
        const userInfo = await fetchUserInfo(accessToken);
        setUser(userInfo);
      } catch {
        // Ignore errors
      }
    }
  }, [accessToken, fetchUserInfo]);

  const logout = useCallback(async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch (error) {
      console.warn("Logout error:", error);
    } finally {
      setAccessToken(null);
      setUser(null);
      navigate("/auth");
    }
  }, [navigate]);

  useEffect(() => {
    apiClient.setTokenProvider(() => accessToken);
  }, [accessToken]);

  useEffect(() => {
    if (user && !user.is_onboarded) {
      const currentPath = window.location.pathname;
      if (currentPath !== "/onboarding" && currentPath !== "/auth" && currentPath !== "/register") {
        navigate("/onboarding");
      }
    }
  }, [user, navigate]);

  useEffect(() => {
    let isRefreshing = false;
    
    const handleUnauthorized = async () => {
      if (!accessToken || isRefreshing) {
        return;
      }
      
      isRefreshing = true;
      
      try {
        await refreshAccessToken();
      } catch {
        // Refresh failed, already redirected in refreshAccessToken
      } finally {
        isRefreshing = false;
      }
    };

    window.addEventListener("api:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("api:unauthorized", handleUnauthorized);
    };
  }, [refreshAccessToken, accessToken]);

  useEffect(() => {
    if (sessionRestoredRef.current) {
      setIsLoading(false);
      return;
    }
    
    sessionRestoredRef.current = true;

    const restoreSession = async () => {
      try {
        const response = await apiClient.post<TokenResponse>("/auth/refresh");
        const newToken = response.access_token;
        setAccessToken(newToken);
        
        const userInfo = await fetchUserInfo(newToken);
        setUser(userInfo);
      } catch {
        setAccessToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, [fetchUserInfo]);

  const value: AuthContextValue = {
    isAuthenticated,
    isLoading,
    user,
    login,
    register,
    logout,
    accessToken,
    completeOnboarding,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-2xl mb-4">⏳</div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
