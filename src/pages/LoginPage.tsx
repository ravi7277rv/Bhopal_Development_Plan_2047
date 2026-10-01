import React, { useState, useEffect } from 'react';
import {
  TextField,
  Button,
  InputAdornment,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Person, Lock, Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { forceLogout, SESSION_CONFLICT_CODE } from '../services/auth.service';
import { ForceLogoutModal } from '../components/auth/ForceLogoutModal';

export const LoginPage: React.FC = () => {
  const { login, isLoading, error, clearError } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Modal state
  const [conflictOpen, setConflictOpen] = useState(false);
  const [isForcing, setIsForcing] = useState(false);
  const [forceError, setForceError] = useState<string | null>(null);

  // ✅ Auto-open modal whenever the context error is the conflict code
  useEffect(() => {
    if (error === SESSION_CONFLICT_CODE) {
      setConflictOpen(true);
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setForceError(null);
    try {
      debugger
      await login({ username, password });
    } catch {
      // Error is already stored in context; useEffect above handles modal
    }
  };

  const handleForceLogout = async () => {
    setIsForcing(true);
    setForceError(null);
    try {
      debugger
      // 1. Call the force-logout API
      await forceLogout(username, password);

      // 2. Clear the "already logged in" error so the modal doesn't reopen
      clearError();
      setConflictOpen(false);

      // 3. Retry login with the same credentials
      try {
        await login({ username, password });
      } catch {
        // If it fails again, AuthContext.error will drive the UI
      }
    } catch (err) {
      setForceError(err instanceof Error ? err.message : 'Force logout failed.');
    } finally {
      setIsForcing(false);
    }
  };

  const handleCancelConflict = () => {
    setConflictOpen(false);
    setForceError(null);
    clearError(); // clear the conflict error so it doesn't retrigger the modal
  };

  return (
    <>
      <div className="min-h-screen w-screen flex items-center justify-center bg-brand-dark overflow-hidden">
        {/* Decorative background */}
        <div className="fixed inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-blue-400 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-blue-600 blur-3xl" />
        </div>

        <div className="w-full max-w-md" style={{ position: 'relative', zIndex: 1 }}>
          {/* Heading */}
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

            {/* Show error only if it's NOT the conflict code (modal handles that) */}
            {error && error !== SESSION_CONFLICT_CODE && (
              <Alert severity="error" className="mb-4" onClose={clearError}>
                {error}
              </Alert>
            )}

            {forceError && (
              <Alert
                severity="warning"
                className="mb-4"
                onClose={() => setForceError(null)}
              >
                {forceError}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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

      {/* Force Logout Modal */}
      <ForceLogoutModal
        open={conflictOpen}
        username={username}
        isProcessing={isForcing}
        onCancel={handleCancelConflict}
        onConfirm={handleForceLogout}
      />
    </>
  );
};