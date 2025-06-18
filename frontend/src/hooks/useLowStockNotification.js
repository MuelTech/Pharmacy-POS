import { useState, useEffect, useCallback } from 'react';
import { isLowStock } from '../utils/stockUtils';
import { productsAPI } from '../services/api';

// Session storage key to track if notification was shown this login
const NOTIFICATION_SHOWN_KEY = 'lowStockNotificationShown';
const LOGIN_SESSION_KEY = 'loginSessionId';

/**
 * Custom hook to manage low stock notifications
 * Shows notification once per login session when products are below reorder level
 */
export const useLowStockNotification = () => {
  const [showNotification, setShowNotification] = useState(false);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Generate or get current session ID
  const getCurrentSessionId = useCallback(() => {
    let sessionId = sessionStorage.getItem(LOGIN_SESSION_KEY);
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      sessionStorage.setItem(LOGIN_SESSION_KEY, sessionId);
    }
    return sessionId;
  }, []);

  // Check if notification was already shown this session
  const wasNotificationShown = useCallback(() => {
    const currentSessionId = getCurrentSessionId();
    const shownSessionId = sessionStorage.getItem(NOTIFICATION_SHOWN_KEY);
    return shownSessionId === currentSessionId;
  }, [getCurrentSessionId]);

  // Mark notification as shown for this session
  const markNotificationShown = useCallback(() => {
    const currentSessionId = getCurrentSessionId();
    sessionStorage.setItem(NOTIFICATION_SHOWN_KEY, currentSessionId);
  }, [getCurrentSessionId]);

  // Check for low stock products
  const checkLowStockProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch all products with inventory data
      const response = await productsAPI.getAll({ staff_view: 'true' });
      
      if (response.data.success) {
        const products = response.data.data;
        
        // Filter products that are low on stock
        const lowStock = products.filter(product => {
          const currentStock = product.total_stock || product.stock_level || 0;
          const reorderLevel = product.reorder_level || 0;
          return isLowStock(currentStock, reorderLevel);
        });
        
        setLowStockProducts(lowStock);
        
        // Show notification if there are low stock products and it hasn't been shown this session
        if (lowStock.length > 0 && !wasNotificationShown()) {
          setShowNotification(true);
          markNotificationShown();
        }
      }
    } catch (error) {
      console.error('Failed to check low stock products:', error);
    } finally {
      setIsLoading(false);
    }
  }, [wasNotificationShown, markNotificationShown]);

  // Initialize notification check on mount
  useEffect(() => {
    // Small delay to ensure dashboard has loaded
    const timer = setTimeout(() => {
      checkLowStockProducts();
    }, 1000);

    return () => clearTimeout(timer);
  }, [checkLowStockProducts]);

  // Close notification handler
  const closeNotification = useCallback(() => {
    setShowNotification(false);
  }, []);

  // Manual trigger for checking low stock (e.g., after transactions)
  const recheckLowStock = useCallback(async () => {
    await checkLowStockProducts();
  }, [checkLowStockProducts]);

  // Reset notification for new session (useful for logout/login)
  const resetNotificationForNewSession = useCallback(() => {
    sessionStorage.removeItem(NOTIFICATION_SHOWN_KEY);
    sessionStorage.removeItem(LOGIN_SESSION_KEY);
  }, []);

  return {
    showNotification,
    closeNotification,
    lowStockProducts,
    lowStockCount: lowStockProducts.length,
    isLoading,
    recheckLowStock,
    resetNotificationForNewSession
  };
}; 