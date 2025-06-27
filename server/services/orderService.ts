import { eq } from "drizzle-orm";
import { db, schema } from "../db";
import { nanoid } from "nanoid";
import { getWebSocketManager } from "../websocket";

export type OrderStatus = 'pending' | 'reserved' | 'in_progress' | 'delivered' | 'cancelled';
export type UserRole = 'customer' | 'merchant' | 'admin';

interface OrderStatusUpdate {
  orderId: string;
  newStatus: OrderStatus;
  updatedBy: string;
  updatedByType: UserRole;
  notes?: string;
}

interface OrderStatusChangeResult {
  success: boolean;
  order?: any;
  error?: string;
}

export class OrderService {
  /**
   * Centralized function to update order status with validation,
   * database updates, and real-time notifications
   */
  static async updateOrderStatus({
    orderId,
    newStatus,
    updatedBy,
    updatedByType,
    notes
  }: OrderStatusUpdate): Promise<OrderStatusChangeResult> {
    try {
      console.log(`📦 OrderService.updateOrderStatus called:`, {
        orderId,
        newStatus,
        updatedBy,
        updatedByType,
        notes
      });

      // Validate status
      if (!this.isValidStatusTransition(newStatus)) {
        console.log(`❌ Invalid status transition attempted: ${newStatus}`);
        return { success: false, error: 'Invalid status' };
      }

      // Get existing order
      const [existingOrder] = await db.select()
        .from(schema.orders)
        .where(eq(schema.orders.id, orderId))
        .limit(1);

      if (!existingOrder) {
        return { success: false, error: 'Order not found' };
      }

      // Validate status transition
      if (!this.canTransitionStatus(existingOrder.status, newStatus)) {
        return { 
          success: false, 
          error: `Cannot transition from ${existingOrder.status} to ${newStatus}` 
        };
      }

      // Update order status
      const [updatedOrder] = await db.update(schema.orders)
        .set({ 
          status: newStatus,
          updated_at: Date.now()
        })
        .where(eq(schema.orders.id, orderId))
        .returning();

      if (!updatedOrder) {
        return { success: false, error: 'Failed to update order' };
      }

      // Log status change
      await this.logStatusChange({
        orderId,
        oldStatus: existingOrder.status,
        newStatus,
        changedBy: updatedBy,
        changedByType: updatedByType,
        notes
      });

      // Broadcast real-time updates
      console.log(`📡 Broadcasting order update for order ${updatedOrder.id}: ${existingOrder.status} → ${updatedOrder.status}`);
      await this.broadcastOrderUpdate(updatedOrder, existingOrder.status);

      console.log(`✅ OrderService.updateOrderStatus completed successfully for order ${updatedOrder.id}`);
      return { success: true, order: updatedOrder };
    } catch (error) {
      console.error('Error updating order status:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Cancel order - special case of status update with additional validation
   */
  static async cancelOrder(
    orderId: string, 
    cancelledBy: string, 
    cancelledByType: UserRole
  ): Promise<OrderStatusChangeResult> {
    try {
      // Get existing order
      const [existingOrder] = await db.select()
        .from(schema.orders)
        .where(eq(schema.orders.id, orderId))
        .limit(1);

      if (!existingOrder) {
        return { success: false, error: 'Order not found' };
      }

      // Check if order can be cancelled
      if (!this.canOrderBeCancelled(existingOrder.status)) {
        return { 
          success: false, 
          error: `Order cannot be cancelled when status is ${existingOrder.status}` 
        };
      }

      // Use centralized status update
      return await this.updateOrderStatus({
        orderId,
        newStatus: 'cancelled',
        updatedBy: cancelledBy,
        updatedByType: cancelledByType,
        notes: `Order cancelled by ${cancelledByType}`
      });
    } catch (error) {
      console.error('Error cancelling order:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Get order with full details (order, product, shop)
   */
  static async getOrderWithDetails(orderId: string) {
    try {
      const orderWithDetails = await db.select({
        order: schema.orders,
        product: schema.products,
        shop: schema.shops
      })
        .from(schema.orders)
        .leftJoin(schema.products, eq(schema.orders.product_id, schema.products.id))
        .leftJoin(schema.shops, eq(schema.orders.shop_id, schema.shops.id))
        .where(eq(schema.orders.id, orderId))
        .limit(1);

      return orderWithDetails[0] || null;
    } catch (error) {
      console.error('Error fetching order details:', error);
      return null;
    }
  }

  /**
   * Validate if status value is valid
   */
  private static isValidStatusTransition(status: string): status is OrderStatus {
    return ['pending', 'reserved', 'in_progress', 'delivered', 'cancelled'].includes(status);
  }

  /**
   * Check if status transition is allowed
   */
  private static canTransitionStatus(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      'pending': ['reserved', 'in_progress', 'cancelled'],
      'reserved': ['in_progress', 'delivered', 'cancelled'],
      'in_progress': ['delivered', 'cancelled'],
      'delivered': [], // Cannot change from delivered
      'cancelled': [] // Cannot change from cancelled
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  /**
   * Check if order can be cancelled based on current status
   */
  private static canOrderBeCancelled(currentStatus: OrderStatus): boolean {
    return ['pending', 'reserved', 'in_progress'].includes(currentStatus);
  }

  /**
   * Log status change for audit trail
   */
  private static async logStatusChange({
    orderId,
    oldStatus,
    newStatus,
    changedBy,
    changedByType,
    notes
  }: {
    orderId: string;
    oldStatus: OrderStatus;
    newStatus: OrderStatus;
    changedBy: string;
    changedByType: UserRole;
    notes?: string;
  }) {
    try {
      const statusChangeId = nanoid();
      await db.insert(schema.order_status_changes).values({
        id: statusChangeId,
        order_id: orderId,
        old_status: oldStatus,
        new_status: newStatus,
        changed_by: changedBy,
        changed_by_type: changedByType,
        notes: notes || null,
        created_at: Date.now()
      });
    } catch (error) {
      console.error('Error logging status change:', error);
      // Don't throw error here as the main operation already succeeded
    }
  }

  /**
   * Broadcast order updates via WebSocket to relevant users
   */
  private static async broadcastOrderUpdate(updatedOrder: any, previousStatus: OrderStatus) {
    try {
      const wsManager = getWebSocketManager();
      if (!wsManager) {
        console.log('WebSocket manager not available, skipping real-time broadcast');
        return;
      }

      // Get order details for broadcast
      const orderDetails = await this.getOrderWithDetails(updatedOrder.id);
      if (!orderDetails) {
        console.error('Could not get order details for broadcast');
        return;
      }

      const broadcastData = {
        type: 'order_status_updated',
        payload: {
          orderId: updatedOrder.id,
          customerId: updatedOrder.customer_id,
          shopId: updatedOrder.shop_id,
          previousStatus,
          newStatus: updatedOrder.status,
          order: orderDetails.order,
          product: orderDetails.product,
          shop: orderDetails.shop,
          timestamp: Date.now()
        }
      };

      console.log('📡 Broadcasting order update to users:', {
        customerId: updatedOrder.customer_id,
        shopId: updatedOrder.shop_id,
        shopOwnerId: orderDetails.shop?.owner_id
      });

      // Broadcast to customer
      console.log('📡 Broadcasting to customer:', updatedOrder.customer_id);
      wsManager.broadcastToUser(updatedOrder.customer_id, 'customer', broadcastData);

      // Broadcast to merchant (shop owner)
      if (orderDetails.shop?.owner_id) {
        console.log('📡 Broadcasting to shop owner:', orderDetails.shop.owner_id);
        wsManager.broadcastToUser(orderDetails.shop.owner_id, 'merchant', broadcastData);
      }

      // Broadcast to all merchants of this shop (if multiple users have access)
      console.log('📡 Broadcasting to shop merchants:', updatedOrder.shop_id);
      wsManager.broadcastToShop(updatedOrder.shop_id, broadcastData);

      // Broadcast to admin dashboard
      console.log('📡 Broadcasting to admins');
      wsManager.broadcastToRole('admin', broadcastData);

      console.log(`📡 Order status update broadcasted for order ${updatedOrder.id}: ${previousStatus} → ${updatedOrder.status}`);
    } catch (error) {
      console.error('Error broadcasting order update:', error);
      // Don't throw error as this is a non-critical operation
    }
  }
}