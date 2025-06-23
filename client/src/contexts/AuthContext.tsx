
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

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
  signUp: (email: string, password: string, role: UserRole, shopData?: any) => Promise<{ data: any; error: any; isExistingUser?: boolean; message?: string }>;
  signOut: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  canAccessRoute: (requiredRole: UserRole) => boolean;
  isAuthenticated: boolean;
  setUser: (user: AuthUser | null) => void;
  resendVerification: (email: string) => Promise<{ data: any; error: any }>;
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
  { id: '1', email: 'customer@demo.com', password: 'demo123', role: 'user' as UserRole, name: 'Customer' },
  { id: '2', email: 'merchant@demo.com', password: 'demo123', role: 'merchant' as UserRole, name: 'Merchant Demo', shop_id: 'shop_001' },
  { id: '3', email: 'admin@demo.com', password: 'demo123', role: 'admin' as UserRole, name: 'Admin Demo' },
  { id: 'owner_001', email: 'sarah@brooklynbites.com', password: 'demo123', role: 'merchant' as UserRole, name: 'Sarah Johnson', shop_id: 'shop_001' },
  { id: 'owner_002', email: 'mike@maplecrafts.com', password: 'demo123', role: 'merchant' as UserRole, name: 'Mike Chen', shop_id: 'shop_002' },
  { id: 'owner_003', email: 'emma@sunsetsouvenirs.com', password: 'demo123', role: 'merchant' as UserRole, name: 'Emma Rodriguez', shop_id: 'shop_003' }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing Supabase session
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && session.user.email_confirmed_at) {
          // Only set user if email is verified
          const authUser: AuthUser = {
            id: session.user.id,
            email: session.user.email!,
            role: session.user.user_metadata?.role || 'user',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
            shop_id: session.user.user_metadata?.shop_id
          };
          setUser(authUser);
          localStorage.setItem('localpick_user', JSON.stringify(authUser));
        } else {
          // Clear any invalid session and check localStorage for demo users
          if (session && !session.user.email_confirmed_at) {
            await supabase.auth.signOut();
          }
          
          const savedUser = localStorage.getItem('localpick_user');
          if (savedUser) {
            try {
              const parsedUser = JSON.parse(savedUser);
              // Verify this is a demo user or valid session
              if (parsedUser && (demoUsers.some(u => u.email === parsedUser.email) || parsedUser.id)) {
                setUser(parsedUser);
              } else {
                localStorage.removeItem('localpick_user');
              }
            } catch (error) {
              localStorage.removeItem('localpick_user');
            }
          }
        }
      } catch (error) {
        // Fallback to localStorage for demo users
        const savedUser = localStorage.getItem('localpick_user');
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            if (parsedUser && demoUsers.some(u => u.email === parsedUser.email)) {
              setUser(parsedUser);
            } else {
              localStorage.removeItem('localpick_user');
            }
          } catch (error) {
            localStorage.removeItem('localpick_user');
          }
        }
      } finally {
        setLoading(false);
      }
    };

    getSession();


    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session && session.user.email_confirmed_at) {
          // Only set user if email is verified
          const authUser: AuthUser = {
            id: session.user.id,
            email: session.user.email!,
            role: session.user.user_metadata?.role || 'user',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
            shop_id: session.user.user_metadata?.shop_id
          };
          setUser(authUser);
          localStorage.setItem('localpick_user', JSON.stringify(authUser));
        } else if (event === 'SIGNED_OUT') {
          // Keep demo users in localStorage, only clear Supabase users
          const savedUser = localStorage.getItem('localpick_user');
          if (savedUser) {
            try {
              const parsedUser = JSON.parse(savedUser);
              if (!parsedUser || !demoUsers.some(u => u.email === parsedUser.email)) {
                setUser(null);
                localStorage.removeItem('localpick_user');
              }
            } catch (error) {
              setUser(null);
              localStorage.removeItem('localpick_user');
            }
          } else {
            setUser(null);
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    // First, try demo users for backward compatibility
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
    
    // If not a demo user, try Supabase authentication for real users
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { data: null, error };
      }

      if (data.user) {
        // Check if email is verified
        if (!data.user.email_confirmed_at) {
          return { 
            data: null, 
            error: { message: 'Please verify your email before signing in.' } 
          };
        }

        // Create user object from Supabase session
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email!,
          role: data.user.user_metadata?.role || 'user',
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0],
          shop_id: data.user.user_metadata?.shop_id
        };

        setUser(authUser);
        localStorage.setItem('localpick_user', JSON.stringify(authUser));

        return { data: { user: authUser }, error: null };
      }
    } catch (err) {
      return { data: null, error: { message: 'Login failed. Please try again.' } };
    }
    
    return { data: null, error: { message: 'Invalid credentials' } };
  };

  const signUp = async (email: string, password: string, role: UserRole, shopData?: any) => {
    try {
      // Use Supabase for real authentication with email verification
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            role,
            name: email.split('@')[0],
            shop_id: role === 'merchant' ? `shop_${Date.now()}` : undefined,
            shop_data: shopData
          }
        }
      });

      if (error) {
        return { data: null, error };
      }

      // Check if this is an existing user who hasn't verified their email
      const isExistingUser = data.user && data.user.identities && data.user.identities.length === 0;
      
      if (data.user && !data.user.email_confirmed_at && isExistingUser) {
        // Return message for existing user without resending email
        return { 
          data, 
          error: null, 
          isExistingUser: true,
          message: 'Account already exists. Please check your email for the verification link.' 
        };
      }

      return { data, error: null, isExistingUser: false };
    } catch (err) {
      return { data: null, error: { message: 'Signup failed' } };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem('localpick_user');
  };

  const resendVerification = async (email: string) => {
    try {
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      return { data, error };
    } catch (err) {
      return { data: null, error: { message: 'Failed to resend verification email' } };
    }
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
    isAuthenticated: !!user,
    setUser,
    resendVerification
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
