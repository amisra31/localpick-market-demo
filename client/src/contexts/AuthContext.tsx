
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { clearNavigationCache } from '@/utils/roleNavigation';

// Helper function to get the correct base URL for email redirects
const getBaseUrl = (): string => {
  const currentHostname = window.location.hostname;
  const currentOrigin = window.location.origin;
  
  console.log('🔗 Email redirect URL debug:', {
    hostname: currentHostname,
    origin: currentOrigin,
    env: import.meta.env.VITE_PRODUCTION_URL
  });
  
  // If we're on the Render production domain, use that
  if (currentHostname === 'localpick-market-demo-osvx.onrender.com') {
    console.log('🔗 Using Render production URL');
    return 'https://localpick-market-demo-osvx.onrender.com';
  }
  
  // Check if hostname contains render.com (for any Render deployment)
  if (currentHostname.includes('onrender.com')) {
    console.log('🔗 Using detected Render URL');
    return currentOrigin;
  }
  
  // Check if we're in any production environment (not localhost)
  if (currentHostname !== 'localhost' && currentHostname !== '127.0.0.1') {
    console.log('🔗 Using current origin for production');
    return currentOrigin;
  }
  
  // Check for environment variable (if set via build process)
  const prodUrl = import.meta.env.VITE_PRODUCTION_URL;
  if (prodUrl) {
    console.log('🔗 Using environment variable URL');
    return prodUrl;
  }
  
  // Fallback to current origin (for local development)
  console.log('🔗 Using current origin for development');
  return currentOrigin;
};

// Simple JWT creation for demo users (in production, this would be done server-side)
const createDemoToken = (user: any) => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ 
    userId: user.id, 
    email: user.email, 
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  }));
  const signature = btoa('demo-signature'); // In production, use proper HMAC
  return `${header}.${payload}.${signature}`;
};

export type UserRole = 'user' | 'merchant' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  shop_id?: string;
  name?: string;
  token?: string;
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
  { id: 'owner_003', email: 'emma@sunsetsouvenirs.com', password: 'demo123', role: 'merchant' as UserRole, name: 'Emma Rodriguez', shop_id: 'shop_003' },
  // Missing merchant accounts requested by user
  { id: 'sticks_owner', email: 'sticks_coffee_shopowner@demo.com', password: 'demo123', role: 'merchant' as UserRole, name: 'Sticks Coffee Owner', shop_id: '6k-vyXS9iM97p7jCfXqVn' },
  { id: 'yosemite_owner', email: 'yosemite_gifts_shopowner@demo.com', password: 'demo123', role: 'merchant' as UserRole, name: 'Yosemite Gifts Owner', shop_id: 'T1eJ-LdhpXprNSV0ZAFXq' },
  { id: 'mariposa_owner', email: 'mariposa_marketplace_shopowner@demo.com', password: 'demo123', role: 'merchant' as UserRole, name: 'Mariposa Marketplace Owner', shop_id: 'BByngmaE_569eC_jxc6d6' },
  { id: 'cinnamon_owner', email: 'cinnamon_roll_bakery_shopowner@demo.com', password: 'demo123', role: 'merchant' as UserRole, name: 'Cinnamon Roll Bakery Owner', shop_id: 'nFL7pcsejHPWuV3QgaOfa' }
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
                // Ensure demo users have tokens
                if (!parsedUser.token && demoUsers.some(u => u.email === parsedUser.email)) {
                  const demoUser = demoUsers.find(u => u.email === parsedUser.email);
                  if (demoUser) {
                    parsedUser.token = createDemoToken(demoUser);
                    localStorage.setItem('localpick_user', JSON.stringify(parsedUser));
                    localStorage.setItem('localpick_token', parsedUser.token);
                  }
                }
                setUser(parsedUser);
              } else {
                localStorage.removeItem('localpick_user');
                localStorage.removeItem('localpick_token');
              }
            } catch (error) {
              localStorage.removeItem('localpick_user');
              localStorage.removeItem('localpick_token');
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
        shop_id: demoUser.shop_id,
        token: createDemoToken(demoUser)
      };
      
      setUser(authUser);
      localStorage.setItem('localpick_user', JSON.stringify(authUser));
      localStorage.setItem('localpick_token', authUser.token);
      
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
          emailRedirectTo: `${getBaseUrl()}/auth/callback`,
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
    
    // Clear all cached routes and navigation state to prevent route reuse
    clearNavigationCache();
  };

  const resendVerification = async (email: string) => {
    try {
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${getBaseUrl()}/auth/callback`
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
