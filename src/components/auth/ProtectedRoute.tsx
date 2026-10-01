import React from 'react';
import { CircularProgress } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { LoginPage } from '../../pages/LoginPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Only show loader if we truly don't know the auth state yet
  // (loading AND no token AND not yet checked)
  const [hasChecked, setHasChecked] = React.useState(false);

  React.useEffect(() => {
    if (!isLoading) setHasChecked(true);
  }, [isLoading]);

  if (!hasChecked && isLoading) {

    return <div className="h-screen w-screen flex items-center justify-center bg-brand-dark">
      <CircularProgress className="!text-white" />
    </div>;
  }
  if (!isAuthenticated) return <LoginPage />;
  return <>{children}</>;
};