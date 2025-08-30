import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permissions?: string[];
  roles?: string[];
}

export function ProtectedRoute({ children, permissions = [], roles = [] }: ProtectedRouteProps) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access
  if (roles.length > 0 && !roles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  // For permission-based access, we'd need to check against user permissions
  // This would require the permissions to be included in the JWT or fetched separately
  // For now, we'll use role-based checks

  return <>{children}</>;
}