import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('mams_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      const token = localStorage.getItem('mams_access_token');
      if (token) {
        try {
          const res = await apiClient.get('/auth/me/');
          setUser(res.data);
          localStorage.setItem('mams_user', JSON.stringify(res.data));
        } catch (err) {
          console.error("Session verification failed:", err);
          setUser(null);
          localStorage.removeItem('mams_access_token');
          localStorage.removeItem('mams_refresh_token');
          localStorage.removeItem('mams_user');
        }
      }
      setLoading(false);
    };

    fetchMe();
  }, []);

  const login = async (email, password) => {
    const res = await apiClient.post('/auth/login/', { email, password });
    const { access, refresh, user: loggedInUser } = res.data;

    localStorage.setItem('mams_access_token', access);
    localStorage.setItem('mams_refresh_token', refresh);
    localStorage.setItem('mams_user', JSON.stringify(loggedInUser));

    setUser(loggedInUser);
    return loggedInUser;
  };

  const logout = async () => {
    try {
      const refresh = localStorage.getItem('mams_refresh_token');
      if (refresh) {
        await apiClient.post('/auth/logout/', { refresh });
      }
    } catch (err) {
      console.error("Logout request error:", err);
    } finally {
      localStorage.removeItem('mams_access_token');
      localStorage.removeItem('mams_refresh_token');
      localStorage.removeItem('mams_user');
      setUser(null);
    }
  };

  const isAdmin = user?.role === 'ADMIN';
  const isCommander = user?.role === 'BASE_COMMANDER';
  const isLogistics = user?.role === 'LOGISTICS_OFFICER';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAdmin,
        isCommander,
        isLogistics,
        assignedBase: user?.base_details || null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
