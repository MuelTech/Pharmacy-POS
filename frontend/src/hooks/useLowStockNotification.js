import { useState, useEffect, useCallback } from 'react';
import { isLowStock } from '../utils/stockUtils';
import { productsAPI } from '../services/api';

// Session storage key to track if notification was shown this login
const NOTIFICATION_SHOWN_KEY = 'lowStockNotificationShown';
const LOGIN_SESSION_KEY = 'loginSessionId';
const USER_LOGIN_KEY = 'auth_token'; // Use the auth token as session identifier

/**
 * Custom hook to manage low stock notifications
 * Shows notification once per login session when products are below reorder level
 */
export const useLowStockNotification = () => {
  const [showNotification, setShowNotification] = useState(false);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Get current login session identifier using auth token
  const getCurrentLoginSession = useCallback(() => {
    const authToken = localStorage.getItem(USER_LOGIN_KEY);
    return authToken ? `login_${authToken.slice(-10)}` : null; // Use last 10 chars of token as session ID
  }, []);

  // Check if notification was already shown for this login session
  const wasNotificationShown = useCallback(() => {
    const currentSession = getCurrentLoginSession();
    if (!currentSession) return false; // No valid session
    
    const shownForSession = sessionStorage.getItem(NOTIFICATION_SHOWN_KEY);
    return shownForSession === currentSession;
  }, [getCurrentLoginSession]);

  // Mark notification as shown for this login session
  const markNotificationShown = useCallback(() => {
    const currentSession = getCurrentLoginSession();
    if (currentSession) {
      sessionStorage.setItem(NOTIFICATION_SHOWN_KEY, currentSession);
    }
  }, [getCurrentLoginSession]);

  // Check for low stock products
  const checkLowStockProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Use the dedicated low stock check endpoint that aggregates stock properly
      const response = await productsAPI.getLowStockCheck();
      
      if (response.data.success) {
        const products = response.data.data;
        
        // Filter products that are low on stock based on total aggregated stock
        const lowStock = products.filter(product => {
          const currentStock = product.total_stock || 0;
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

  // Manual trigger for checking low stock (e.g., after transactions or inventory updates)
  // This will NOT show notification again in the same session - just updates the data
  const recheckLowStock = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await productsAPI.getLowStockCheck();
      
      if (response.data.success) {
        const products = response.data.data;
        const lowStock = products.filter(product => {
          const currentStock = product.total_stock || 0;
          const reorderLevel = product.reorder_level || 0;
          return isLowStock(currentStock, reorderLevel);
        });
        
        // Only update the products list, don't show notification again
        setLowStockProducts(lowStock);
      }
    } catch (error) {
      console.error('Failed to recheck low stock products:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Force recheck low stock and reset session (useful ONLY after inventory restocking by admin)
  const forceRecheckLowStock = useCallback(async () => {
    // Only clear notification flag and show again if there are NEW low stock items
    const currentSession = getCurrentLoginSession();
    if (currentSession) {
      sessionStorage.removeItem(NOTIFICATION_SHOWN_KEY);
      await checkLowStockProducts();
    }
  }, [checkLowStockProducts, getCurrentLoginSession]);

  // Reset notification for new session (useful for logout/login)
  const resetNotificationForNewSession = useCallback(() => {
    sessionStorage.removeItem(NOTIFICATION_SHOWN_KEY);
  }, []);

  return {
    showNotification,
    closeNotification,
    lowStockProducts,
    lowStockCount: lowStockProducts.length,
    isLoading,
    recheckLowStock,
    forceRecheckLowStock,
    resetNotificationForNewSession
  };
}; 