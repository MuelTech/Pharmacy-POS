import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Only redirect on 401 if it's not a login request
    if (error.response?.status === 401 && !error.config.url.includes('/auth/login')) {
      // Token expired or invalid for authenticated requests
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  verifyToken: () => api.get('/auth/verify'),
  getProfile: () => api.get('/auth/profile'),
  getPharmacist: () => api.get('/auth/pharmacist'),
};

// Products API endpoints
export const productsAPI = {
  getAll: (params = {}) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  getCategories: () => api.get('/products/categories'),
  getLowStockCheck: () => api.get('/products/low-stock-check'),
  create: (productData) => api.post('/products', productData),
  update: (id, productData) => api.put(`/products/${id}`, productData),
  delete: (id) => api.delete(`/products/${id}`),
};

// Orders API endpoints
export const ordersAPI = {
  create: (orderData) => api.post('/orders', orderData),
  getById: (id) => api.get(`/orders/${id}`),
  getAll: (params = {}) => api.get('/orders', { params }),
  getPaymentTypes: () => api.get('/orders/payment-types/all'),
  // Dashboard endpoints
  getDashboardMetrics: (params = {}) => api.get('/orders/dashboard/metrics', { params }),
  getDashboardProducts: (params = {}) => api.get('/orders/dashboard/products', { params }),
  getDashboardTransactions: (params = {}) => api.get('/orders/dashboard/transactions', { params }),
  getDashboardCashiers: () => api.get('/orders/dashboard/cashiers'),
};

// Accounts API endpoints
export const accountsAPI = {
  getAll: () => api.get('/accounts'),
  getById: (id) => api.get(`/accounts/${id}`),
  create: (accountData) => api.post('/accounts', accountData),
  update: (id, accountData) => api.put(`/accounts/${id}`, accountData),
  toggleStatus: (id) => api.patch(`/accounts/${id}/status`),
};

// Inventory API endpoints
export const inventoryAPI = {
  getAll: (params = {}) => api.get('/inventory', { params }),
  getById: (id) => api.get(`/inventory/${id}`),
  create: (inventoryData) => api.post('/inventory', inventoryData),
  update: (id, inventoryData) => api.put(`/inventory/${id}`, inventoryData),
  delete: (id) => api.delete(`/inventory/${id}`),
  archive: (id) => api.patch(`/inventory/${id}/archive`),
  updateStock: (id, stockData) => api.patch(`/inventory/${id}/stock`, stockData),
};

// Upload API endpoints
export const uploadAPI = {
  uploadImage: (imageFile) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    return api.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getImages: () => api.get('/upload/images'),
  deleteImage: (filename) => api.delete(`/upload/image/${filename}`),
};

// Health check
export const healthAPI = {
  check: () => api.get('/health'),
};

export default api; 