import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db, schema } from '../db/index';
import { eq } from 'drizzle-orm';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'admin' | 'merchant' | 'customer';
  name?: string;
  shop_id?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Demo users for server-side validation (must match client-side)
const demoUsers = [
  { id: '1', email: 'customer@demo.com', role: 'user', name: 'Customer' },
  { id: '2', email: 'merchant@demo.com', role: 'merchant', name: 'Merchant Demo', shop_id: 'shop_001' },
  { id: '3', email: 'admin@demo.com', role: 'admin', name: 'Admin Demo' },
  { id: 'owner_001', email: 'sarah@brooklynbites.com', role: 'merchant', name: 'Sarah Johnson', shop_id: 'shop_001' },
  { id: 'owner_002', email: 'mike@maplecrafts.com', role: 'merchant', name: 'Mike Chen', shop_id: 'shop_002' },
  { id: 'owner_003', email: 'emma@sunsetsouvenirs.com', role: 'merchant', name: 'Emma Rodriguez', shop_id: 'shop_003' },
  { id: 'sticks_owner', email: 'sticks_coffee_shopowner@demo.com', role: 'merchant', name: 'Sticks Coffee Owner', shop_id: '6k-vyXS9iM97p7jCfXqVn' },
  { id: 'yosemite_owner', email: 'yosemite_gifts_shopowner@demo.com', role: 'merchant', name: 'Yosemite Gifts Owner', shop_id: 'T1eJ-LdhpXprNSV0ZAFXq' },
  { id: 'mariposa_owner', email: 'mariposa_marketplace_shopowner@demo.com', role: 'merchant', name: 'Mariposa Marketplace Owner', shop_id: 'BByngmaE_569eC_jxc6d6' },
  { id: 'cinnamon_owner', email: 'cinnamon_roll_bakery_shopowner@demo.com', role: 'merchant', name: 'Cinnamon Roll Bakery Owner', shop_id: 'nFL7pcsejHPWuV3QgaOfa' }
];

/**
 * Middleware to authenticate requests using JWT
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      // Try parsing as demo token first (base64 encoded)
      const [header, payload, signature] = token.split('.');
      if (header && payload && signature) {
        try {
          const decodedPayload = JSON.parse(atob(payload));
          
          // Check if this is a demo user token
          if (decodedPayload.userId && decodedPayload.email && decodedPayload.role) {
            const demoUser = demoUsers.find(u => u.id === decodedPayload.userId && u.email === decodedPayload.email);
            
            if (demoUser) {
              req.user = {
                id: demoUser.id,
                email: demoUser.email,
                role: demoUser.role as AuthenticatedUser['role'],
                name: demoUser.name,
                shop_id: demoUser.shop_id
              };
              return next();
            }
          }
        } catch (demoError) {
          // Not a demo token, try regular JWT
        }
      }
      
      // Try regular JWT verification
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Verify user still exists in database
      const users = await db.select().from(schema.users).where(eq(schema.users.id, decoded.userId));
      
      if (users.length === 0) {
        return res.status(401).json({ error: 'User not found' });
      }

      const user = users[0];
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role as AuthenticatedUser['role'],
        name: user.name || undefined
      };
      
      next();
    } catch (jwtError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Middleware to require admin role
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
};

/**
 * Middleware to require merchant role
 */
export const requireMerchant = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (req.user.role !== 'merchant' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Merchant access required' });
  }
  
  next();
};

/**
 * Middleware to require customer role (or any authenticated user)
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  next();
};

/**
 * Middleware to check shop ownership
 */
export const requireShopOwnership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admin can access any shop
    if (req.user.role === 'admin') {
      return next();
    }

    const shopId = req.params.id || req.params.shopId || req.body.shopId;
    
    if (!shopId) {
      return res.status(400).json({ error: 'Shop ID required' });
    }

    // For demo users, check against their shop_id
    if (req.user.shop_id) {
      if (req.user.shop_id !== shopId) {
        return res.status(403).json({ error: 'You can only access your own shop' });
      }
      return next();
    }

    // For database users, check shop ownership in database
    const shops = await db.select()
      .from(schema.shops)
      .where(eq(schema.shops.id, shopId));

    if (shops.length === 0) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    const shop = shops[0];
    if (shop.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only access your own shop' });
    }

    next();
  } catch (error) {
    console.error('Shop ownership check error:', error);
    return res.status(500).json({ error: 'Authorization check failed' });
  }
};

/**
 * Optional authentication - sets user if token is valid but doesn't require it
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        
        const users = await db.select().from(schema.users).where(eq(schema.users.id, decoded.userId));
        
        if (users.length > 0) {
          const user = users[0];
          req.user = {
            id: user.id,
            email: user.email,
            role: user.role as AuthenticatedUser['role'],
            name: user.name || undefined
          };
        }
      } catch (jwtError) {
        // Token invalid, but that's ok for optional auth
      }
    }
    
    next();
  } catch (error) {
    // Error in optional auth is not blocking
    next();
  }
};