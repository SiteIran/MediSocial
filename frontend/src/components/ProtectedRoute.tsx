// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth(); // Get auth status and loading state

  if (isLoading) {
    // Show a loading indicator while checking authentication
    return <div>Checking Authentication...</div>; // Or a proper spinner component
  }

  if (!isAuthenticated) {
    // User not authenticated, redirect to login page
    return <Navigate to="/login" replace />;
  }

  // User is authenticated, render the children or Outlet
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;