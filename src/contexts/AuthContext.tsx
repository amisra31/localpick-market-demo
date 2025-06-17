
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';

export type UserRole = 'user' | 'merchant' | 'admin';

export interface AuthUser extends User {
  role?: UserRole;
  shop_id?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signUp: (email: string, password: string, role: UserRole, shopData?: any) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  canAccessRoute: (requiredRole: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (session?.user) {
        await fetchUserProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (authUser: User) => {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('role, shop_id')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        setUser(authUser as AuthUser);
      } else {
        setUser({
          ...authUser,
          role: profile.role,
          shop_id: profile.shop_id
        });
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      setUser(authUser as AuthUser);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const result = await supabase.auth.signInWithPassword({ email, password });
    return result;
  };

  const signUp = async (email: string, password: string, role: UserRole, shopData?: any) => {
    const result = await supabase.auth.signUp({ email, password });
    
    if (result.data.user && !result.error) {
      // Create user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: result.data.user.id,
          email: email,
          role: role,
          created_at: new Date().toISOString()
        });

      if (profileError) {
        console.error('Error creating user profile:', profileError);
      }

      // If merchant, create shop
      if (role === 'merchant' && shopData) {
        const { error: shopError } = await supabase
          .from('shops')
          .insert({
            ...shopData,
            owner_id: result.data.user.id
          });

        if (shopError) {
          console.error('Error creating shop:', shopError);
        }
      }
    }

    return result;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
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
    session,
    loading,
    signIn,
    signUp,
    signOut,
    hasRole,
    canAccessRoute
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
