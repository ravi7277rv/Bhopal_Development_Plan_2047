import React from 'react';
import { CircularProgress } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { LoginPage } from '../../pages/LoginPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  // During initial hydration, show a loader
  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-brand-dark">
        <CircularProgress className="!text-white" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <>{children}</>;
};