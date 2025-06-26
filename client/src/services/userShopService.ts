/**
 * Unified User/Shop Resolution Service
 * Handles all user-shop relationships, authentication, and ID resolution dynamically
 */

interface UserInfo {
  id: string;
  email: string;
  role: 'admin' | 'merchant' | 'user';
  name?: string;
  shop_id?: string;
  token?: string;
}

interface AuthHeaders {
  Authorization?: string;
  'Content-Type'?: string;
}

export class UserShopService {
  private static instance: UserShopService;

  private constructor() {}

  public static getInstance(): UserShopService {
    if (!UserShopService.instance) {
      UserShopService.instance = new UserShopService();
    }
    return UserShopService.instance;
  }

  /**
   * Get current user information from localStorage
   */
  getCurrentUser(): UserInfo | null {
    try {
      const userInfo = localStorage.getItem('localpick_user');
      if (!userInfo) return null;
      
      return JSON.parse(userInfo);
    } catch (error) {
      console.error('Failed to parse user info from localStorage:', error);
      return null;
    }
  }

  /**
   * Get authentication token
   */
  getAuthToken(): string | null {
    return localStorage.getItem('localpick_token');
  }

  /**
   * Get authentication headers for API calls
   */
  getAuthHeaders(includeContentType: boolean = false): AuthHeaders {
    const token = this.getAuthToken();
    const headers: AuthHeaders = {};
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }
    
    return headers;
  }

  /**
   * Get the current user's merchant ID (for use in messaging, etc.)
   * This resolves the ID mismatch issue by always using the current user's actual ID
   */
  getCurrentMerchantId(): string | null {
    const user = this.getCurrentUser();
    if (!user || user.role !== 'merchant') return null;
    
    return user.id; // Always use the actual user ID, not shop.ownerId
  }

  /**
   * Get the current user's shop ID
   * Handles both demo users (with shop_id) and database users
   */
  getCurrentUserShopId(): string | null {
    const user = this.getCurrentUser();
    if (!user) return null;

    // For demo users with direct shop_id
    if (user.shop_id) {
      return user.shop_id;
    }

    // For database users, we'll need to look it up via API
    // This will be handled by the enhanced data service
    return null;
  }

  /**
   * Check if current user owns a specific shop
   */
  doesUserOwnShop(shopId: string): boolean {
    const user = this.getCurrentUser();
    if (!user || user.role !== 'merchant') return false;

    // For demo users with shop_id
    if (user.shop_id) {
      return user.shop_id === shopId;
    }

    // For database users, this would need to be checked against the shop's owner_id
    // This is a limitation we'll need to handle in the data service layer
    return false;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null && this.getAuthToken() !== null;
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: 'admin' | 'merchant' | 'user'): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  /**
   * Get display name for current user
   */
  getCurrentUserDisplayName(): string {
    const user = this.getCurrentUser();
    return user?.name || user?.email?.split('@')[0] || 'User';
  }

  /**
   * Clear all user data (for logout)
   */
  clearUserData(): void {
    localStorage.removeItem('localpick_user');
    localStorage.removeItem('localpick_token');
  }

  /**
   * Debug helper - log current user and shop information
   */
  debugCurrentState(): void {
    const user = this.getCurrentUser();
    const token = this.getAuthToken();
    const shopId = this.getCurrentUserShopId();
    const merchantId = this.getCurrentMerchantId();

    console.log('🔍 UserShopService Debug State:', {
      user,
      hasToken: !!token,
      shopId,
      merchantId,
      isAuthenticated: this.isAuthenticated(),
      authHeaders: this.getAuthHeaders()
    });
  }
}

// Export singleton instance
export const userShopService = UserShopService.getInstance();