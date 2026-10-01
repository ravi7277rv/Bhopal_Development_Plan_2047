import React, { useState } from 'react';
import {
  TextField,
  Button,
  InputAdornment,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Person,
  Lock,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, isLoading, error, clearError } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login({ username, password });
      // App.tsx will redirect automatically since isAuthenticated becomes true
    } catch {
      // Error is surfaced via context
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-brand-dark relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-blue-400 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-blue-600 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo + Heading */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-brand-dark font-bold text-lg">BDP</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">
            Bhopal Development Plan
          </h1>
          <p className="text-sm text-gray-300">
            Objections & Suggestions Portal — Sign in to continue
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-6">
            Enter your credentials to access the dashboard
          </p>

          {error && (
            <Alert
              severity="error"
              className="mb-4"
              onClose={clearError}
            >
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <TextField
              fullWidth
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              disabled={isLoading}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person className="text-gray-400" />
                    </InputAdornment>
                  ),
                },
              }}
            />

            {/* Password */}
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={isLoading}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock className="text-gray-400" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword((s) => !s)}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            {/* Submit */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={isLoading || !username || !password}
              className="!bg-blue-600 hover:!bg-blue-700 !py-3 !capitalize !font-semibold !shadow-md"
              startIcon={
                isLoading ? (
                  <CircularProgress size={18} className="!text-white" />
                ) : null
              }
            >
              {isLoading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            © {new Date().getFullYear()} Bhopal Municipal Corporation
          </p>
        </div>
      </div>
    </div>
  );
};