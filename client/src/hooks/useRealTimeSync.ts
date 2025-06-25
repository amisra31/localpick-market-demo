import { useEffect, useCallback, useRef } from 'react';
import { enhancedDataService } from '@/services/enhancedDataService';

export function useRealTimeSync() {
  const subscriptionsRef = useRef<(() => void)[]>([]);

  const subscribe = useCallback((event: string, callback: (data: any) => void) => {
    const unsubscribe = enhancedDataService.subscribe(event, callback);
    subscriptionsRef.current.push(unsubscribe);
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Cleanup subscriptions on unmount
    return () => {
      subscriptionsRef.current.forEach(unsubscribe => unsubscribe());
      subscriptionsRef.current = [];
    };
  }, []);

  return { subscribe };
}

// Specific hooks for different data types
export function useProductSync(onProductUpdate?: (product: any) => void) {
  const { subscribe } = useRealTimeSync();

  useEffect(() => {
    if (!onProductUpdate) return;

    const unsubscribers = [
      subscribe('product:created', onProductUpdate),
      subscribe('product:updated', onProductUpdate),
      subscribe('product:archived', (data) => onProductUpdate(data.product)),
      subscribe('product:deleted', onProductUpdate),
      subscribe('products:bulk-created', onProductUpdate),
    ];

    return () => unsubscribers.forEach(unsub => unsub());
  }, [subscribe, onProductUpdate]);
}

export function useShopSync(onShopUpdate?: (shop: any) => void) {
  const { subscribe } = useRealTimeSync();

  useEffect(() => {
    if (!onShopUpdate) return;

    const unsubscribers = [
      subscribe('shop:created', onShopUpdate),
      subscribe('shop:updated', onShopUpdate),
      subscribe('shop:hours-updated', onShopUpdate),
      subscribe('shops:bulk-created', onShopUpdate),
    ];

    return () => unsubscribers.forEach(unsub => unsub());
  }, [subscribe, onShopUpdate]);
}

export function useOrderSync(onOrderUpdate?: (order: any) => void) {
  const { subscribe } = useRealTimeSync();

  useEffect(() => {
    if (!onOrderUpdate) return;

    const unsubscribers = [
      subscribe('order:created', onOrderUpdate),
      subscribe('order:status-updated', onOrderUpdate),
      subscribe('reservation:created', onOrderUpdate),
    ];

    return () => unsubscribers.forEach(unsub => unsub());
  }, [subscribe, onOrderUpdate]);
}

export function useMessageSync(onMessageUpdate?: (message: any) => void) {
  const { subscribe } = useRealTimeSync();

  useEffect(() => {
    if (!onMessageUpdate) return;

    const unsubscriber = subscribe('message:sent', onMessageUpdate);
    return unsubscriber;
  }, [subscribe, onMessageUpdate]);
}