
import React, { createContext, useContext, useEffect, useState } from 'react';

export type UserRole = 'user' | 'merchant' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  shop_id?: string;
  name?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signUp: (email: string, password: string, role: UserRole, shopData?: any) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  canAccessRoute: (requiredRole: UserRole) => boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Demo users for authentication
const demoUsers = [
  { id: '1', email: 'customer@demo.com', password: 'demo123', role: 'user' as UserRole, name: 'Customer Demo' },
  { id: '2', email: 'merchant@demo.com', password: 'demo123', role: 'merchant' as UserRole, name: 'Merchant Demo', shop_id: 'shop_001' },
  { id: '3', email: 'admin@demo.com', password: 'demo123', role: 'admin' as UserRole, name: 'Admin Demo' }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session in localStorage
    const savedUser = localStorage.getItem('localpick_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('localpick_user');
      }
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    const demoUser = demoUsers.find(u => u.email === email && u.password === password);
    
    if (demoUser) {
      const authUser: AuthUser = {
        id: demoUser.id,
        email: demoUser.email,
        role: demoUser.role,
        name: demoUser.name,
        shop_id: demoUser.shop_id
      };
      
      setUser(authUser);
      localStorage.setItem('localpick_user', JSON.stringify(authUser));
      
      return { data: { user: authUser }, error: null };
    }
    
    return { data: null, error: { message: 'Invalid credentials' } };
  };

  const signUp = async (email: string, password: string, role: UserRole, shopData?: any) => {
    // For demo purposes, simulate signup
    const newUser: AuthUser = {
      id: Date.now().toString(),
      email,
      role,
      name: email.split('@')[0],
      shop_id: role === 'merchant' ? `shop_${Date.now()}` : undefined
    };
    
    setUser(newUser);
    localStorage.setItem('localpick_user', JSON.stringify(newUser));
    
    return { data: { user: newUser }, error: null };
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem('localpick_user');
  };

  const hasRole = (role: UserRole): boolean => {
    return user?.role === role;
  };

  const canAccessRoute = (requiredRole: UserRole): boolean => {
    if (!user) return false;
    
    // Admin can access everything
    if (user.role === 'admin') return true;
    
    // Check specific role access
    return user.role === requiredRole;
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    hasRole,
    canAccessRoute,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
