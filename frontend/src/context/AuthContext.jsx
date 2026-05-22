import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const API = `${import.meta.env.VITE_API_URL}/auth`;

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['x-auth-token'] = token;
      // In a real app, we'd fetch the user profile here to verify the token
      // For now, we decode it manually or rely on login state
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser(payload.user);
      } catch (e) {
        logout();
      }
    } else {
      delete axios.defaults.headers.common['x-auth-token'];
      setUser(null);
    }
    setLoading(false);
  }, [token]);

  const login = async (email, password) => {
    try {
      const res = await axios.post(`${API}/login`, { email, password });
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      toast.success('Logged in successfully!');
      navigate('/map');
      return { success: true };
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Login failed');
      return { success: false, msg: err.response?.data?.msg || 'Login failed' };
    }
  };

  const register = async (name, email, password) => {
    try {
      const res = await axios.post(`${API}/register`, { name, email, password });
      return { success: true, msg: res.data.msg };
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Registration failed');
      return { success: false, msg: err.response?.data?.msg || 'Registration failed' };
    }
  };

  const verifyOtp = async (email, otp) => {
    try {
      const res = await axios.post(`${API}/verify-otp`, { email, otp });
      toast.success('Email verified! You can now log in.');
      return { success: true, msg: res.data.msg };
    } catch (err) {
      toast.error(err.response?.data?.msg || 'OTP verification failed');
      return { success: false, msg: err.response?.data?.msg || 'OTP verification failed' };
    }
  };

  const forgotPassword = async (email) => {
    try {
      const res = await axios.post(`${API}/forgot-password`, { email });
      return { success: true, msg: res.data.msg };
    } catch (err) {
      return { success: false, msg: err.response?.data?.msg || 'Failed to send reset email' };
    }
  };

  const resetPassword = async (token, password) => {
    try {
      const res = await axios.post(`${API}/reset-password`, { token, password });
      return { success: true, msg: res.data.msg };
    } catch (err) {
      return { success: false, msg: err.response?.data?.msg || 'Failed to reset password' };
    }
  };

  const getProfile = async () => {
    try {
      const res = await axios.get(`${API}/profile`);
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, msg: err.response?.data?.msg || 'Failed to fetch profile' };
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const res = await axios.put(`${API}/profile`, profileData);
      // Update user name in context if changed
      if (res.data.name && user) {
        setUser({ ...user, name: res.data.name });
      }
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, msg: err.response?.data?.msg || 'Failed to update profile' };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const res = await axios.put(`${API}/change-password`, { currentPassword, newPassword });
      return { success: true, msg: res.data.msg };
    } catch (err) {
      return { success: false, msg: err.response?.data?.msg || 'Failed to change password' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    toast.success('Logged out successfully!');
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ 
      user, token, loading, 
      login, register, logout,
      verifyOtp,
      forgotPassword, resetPassword,
      getProfile, updateProfile, changePassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};
