
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { getRoleLandingPage } from '@/utils/roleNavigation';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  allowedRoles?: UserRole[];
  showAccessDenied?: boolean; // Option to show access denied instead of redirect
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole, 
  allowedRoles,
  showAccessDenied = false
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has required role or is in allowed roles
  const hasAccess = () => {
    if (!user.role) return false;
    
    // Admin can access everything
    if (user.role === 'admin') return true;
    
    if (requiredRole) {
      return user.role === requiredRole;
    }
    
    if (allowedRoles) {
      return allowedRoles.includes(user.role);
    }
    
    return true;
  };

  if (!hasAccess()) {
    // If showAccessDenied is true, show the error page
    if (showAccessDenied) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl text-red-600">Access Denied</CardTitle>
              <CardDescription>
                You don't have permission to access this page.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-4">
                Required role: {requiredRole || allowedRoles?.join(', ')}
              </p>
              <p className="text-sm text-gray-500">
                Your role: {user.role || 'No role assigned'}
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    // Default: Redirect to role-based landing page instead of showing error
    const landingPage = getRoleLandingPage(user.role);
    return <Navigate to={landingPage} replace />;
  }

  return <>{children}</>;
};
