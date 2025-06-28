import { supabase } from '@/lib/supabase';

// Import auth context to prevent logout on refresh failures
let authContext: any = null;
const setAuthContext = (context: any) => {
  authContext = context;
};

export { setAuthContext };

interface ApiCallOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  retryOnAuth?: boolean;
}

class AuthApiService {
  private static instance: AuthApiService;
  private lastRefreshAttempt: number = 0;
  private refreshCooldown: number = 5000; // 5 seconds between refresh attempts

  private constructor() {}

  public static getInstance(): AuthApiService {
    if (!AuthApiService.instance) {
      AuthApiService.instance = new AuthApiService();
    }
    return AuthApiService.instance;
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      return payload.exp && payload.exp < now;
    } catch (e) {
      return true; // Assume expired if we can't parse
    }
  }

  /**
   * Get fresh authentication headers
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      // Try to get current session (this will refresh if needed)
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        // Check for demo user token
        const demoToken = localStorage.getItem('localpick_token');
        if (demoToken) {
          return { 'Authorization': `Bearer ${demoToken}` };
        }
        throw new Error('No valid session');
      }

      // Update localStorage with fresh token
      localStorage.setItem('localpick_token', session.access_token);
      
      return {
        'Authorization': `Bearer ${session.access_token}`
      };
    } catch (error) {
      console.error('Failed to get auth headers:', error);
      // Fallback to stored token
      const storedToken = localStorage.getItem('localpick_token');
      if (storedToken) {
        return { 'Authorization': `Bearer ${storedToken}` };
      }
      return {};
    }
  }

  /**
   * Make authenticated API call with automatic token refresh
   */
  async authenticatedFetch(url: string, options: ApiCallOptions = {}): Promise<Response> {
    const { retryOnAuth = true, ...fetchOptions } = options;

    try {
      // Get fresh auth headers
      const authHeaders = await this.getAuthHeaders();
      
      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...fetchOptions.headers,
        }
      });

      // If we get 401 and retryOnAuth is true, try to refresh and retry once
      if (response.status === 401 && retryOnAuth) {
        const now = Date.now();
        const timeSinceLastRefresh = now - this.lastRefreshAttempt;
        
        
        // Rate limit refresh attempts to avoid Supabase 429 errors
        if (timeSinceLastRefresh < this.refreshCooldown) {
          return response; // Return the 401 without attempting refresh
        }
        
        this.lastRefreshAttempt = now;
        
        try {
          // Force refresh session
          const { data: { session }, error } = await supabase.auth.refreshSession();
          
          
          if (!error && session) {
            
            // Update localStorage with fresh token
            localStorage.setItem('localpick_token', session.access_token);
            
            // Also update the user object in localStorage
            const savedUser = localStorage.getItem('localpick_user');
            if (savedUser) {
              try {
                const userObj = JSON.parse(savedUser);
                userObj.token = session.access_token;
                localStorage.setItem('localpick_user', JSON.stringify(userObj));
              } catch (e) {
                console.error('Failed to update user object:', e);
              }
            }
            
            // Retry the request with new token
            const newAuthHeaders = { 'Authorization': `Bearer ${session.access_token}` };
            
            const retryResponse = await fetch(url, {
              ...fetchOptions,
              headers: {
                'Content-Type': 'application/json',
                ...newAuthHeaders,
                ...fetchOptions.headers,
              }
            });
            
            
            return retryResponse;
          } else {
            // Prevent automatic logout when refresh fails
            if (authContext?.setPreventLogout) {
              authContext.setPreventLogout(true);
            }
            return response;
          }
        } catch (refreshError) {
          // Prevent automatic logout when refresh fails
          if (authContext?.setPreventLogout) {
            authContext.setPreventLogout(true);
          }
          return response;
        }
      }

      return response;
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  }

  /**
   * Check if current token is expired and refresh if needed
   */
  async ensureValidToken(): Promise<boolean> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        // Check if we have a demo user token
        const demoToken = localStorage.getItem('localpick_token');
        return !!demoToken;
      }

      // Update localStorage with fresh token
      localStorage.setItem('localpick_token', session.access_token);
      return true;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }
}

export const authApiService = AuthApiService.getInstance();