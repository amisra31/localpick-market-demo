import { UserRole } from '@/contexts/AuthContext';

/**
 * Get the default landing page for a user based on their role
 */
export const getRoleLandingPage = (role: UserRole): string => {
  switch (role) {
    case 'admin':
      return '/admin-dashboard';
    case 'merchant':
      return '/shop-owner-dashboard';
    case 'user':
    default:
      return '/';
  }
};

/**
 * Clear any cached navigation state that could leak between user sessions
 */
export const clearNavigationCache = (): void => {
  // Clear route-related localStorage items
  localStorage.removeItem('lastVisitedRoute');
  localStorage.removeItem('intendedRoute');
  localStorage.removeItem('previousRoute');
  localStorage.removeItem('returnTo');
  
  // Clear all session storage to prevent route leakage
  sessionStorage.clear();
  
  // Clear browser history state to prevent back button access to restricted pages
  if (window.history.replaceState) {
    window.history.replaceState(null, '', '/');
  }
};

/**
 * Navigate to the appropriate landing page for a user role
 */
export const navigateToRoleLandingPage = (role: UserRole, navigate: (to: string, options?: any) => void): void => {
  const landingPage = getRoleLandingPage(role);
  navigate(landingPage, { replace: true });
};