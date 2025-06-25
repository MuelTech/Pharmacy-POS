import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ManageProduct from './ManageProduct';
import InventoryModal from './InventoryModal';
import ManageAccount from './ManageAccount';
import Receipt from '../staff/Receipt';
import { ordersAPI } from '../../services/api';
import { useLowStockNotification } from '../../hooks/useLowStockNotification';
import LowStockNotification from '../../components/LowStockNotification';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // State for date filters - default to current month
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  const [selectedCashier, setSelectedCashier] = useState('all');
  
  // State for search and sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  
  // Simple pagination state for transactions (client-side)
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionsPerPage, setTransactionsPerPage] = useState(10);
  
  // State for ManageProduct modal
  const [showManageProduct, setShowManageProduct] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showManageAccount, setShowManageAccount] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  // State for API data
  const [metrics, setMetrics] = useState({
    sales: '₱0',
    transactions: '0',
    itemsSold: '0',
    products: '0'
  });
  const [dashboardProducts, setDashboardProducts] = useState([]);
  const [productsPagination, setProductsPagination] = useState({
    page: 1,
    limit: 6,
    total: 0,
    totalPages: 0
  });
  const [allTransactions, setAllTransactions] = useState([]);
  const [availableCashiers, setAvailableCashiers] = useState(['all']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Low stock notification hook
  const {
    showNotification,
    closeNotification,
    lowStockProducts,
    lowStockCount,
    resetNotificationForNewSession
  } = useLowStockNotification();

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const dateParams = { startDate, endDate };
      const productsParams = { 
        ...dateParams, 
        page: productsPagination.page, 
        limit: productsPagination.limit 
      };
      
      // Load all dashboard data in parallel
      const [metricsResponse, productsResponse, transactionsResponse, cashiersResponse] = await Promise.all([
        ordersAPI.getDashboardMetrics(dateParams),
        ordersAPI.getDashboardProducts(productsParams),
        ordersAPI.getDashboardTransactions({ ...dateParams, cashier: selectedCashier, search: searchTerm }),
        ordersAPI.getDashboardCashiers()
      ]);
      
      if (metricsResponse.data.success) {
        const data = metricsResponse.data.data;
        setMetrics({
          sales: `₱${parseFloat(data.sales || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          transactions: data.transactions.toString(),
          itemsSold: data.itemsSold.toString(),
          products: data.products.toString()
        });
      }
      
      if (productsResponse.data.success) {
        setDashboardProducts(productsResponse.data.data);
        if (productsResponse.data.pagination) {
          setProductsPagination(productsResponse.data.pagination);
        }
      }
      
      if (transactionsResponse.data.success) {
        setAllTransactions(transactionsResponse.data.data);
      }
      
      if (cashiersResponse.data.success) {
        setAvailableCashiers(['all', ...cashiersResponse.data.data]);
      }
      
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedCashier, searchTerm, productsPagination.page, productsPagination.limit]);

  // Load data on component mount and when filters change
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleLogout = async () => {
    // Reset notification session when logging out
    resetNotificationForNewSession();
    await logout();
    navigate('/');
  };

  // Navigation handlers
  const handleInventoryClick = () => {
    setShowInventory(true);
  };

  const handleProductClick = () => {
    setShowManageProduct(true);
  };

  const handleAccountClick = () => {
    setShowManageAccount(true);
  };

  const handleSettingsClick = () => {
    // TODO: Navigate to settings page
    console.log('Navigating to Settings');
  };

  // Sorting functions
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return '↑↓';
    }
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  // Handle filter changes
  const handleDateChange = useCallback((field, value) => {
    if (field === 'start') {
      setStartDate(value);
    } else {
      setEndDate(value);
    }
  }, []);

  const handleCashierChange = useCallback((value) => {
    setSelectedCashier(value);
  }, []);

  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
  }, []);

  // Products pagination handlers
  const handleProductsPageChange = useCallback((newPage) => {
    setProductsPagination(prev => ({
      ...prev,
      page: newPage
    }));
  }, []);

  const handleProductsLimitChange = useCallback((newLimit) => {
    setProductsPagination(prev => ({
      ...prev,
      page: 1, // Reset to first page when changing limit
      limit: newLimit
    }));
  }, []);

  // Simple pagination handlers for transactions
  const handleTransactionsPageChange = (newPage) => {
    setTransactionsPage(newPage);
  };

  const handleTransactionsPerPageChange = (newPerPage) => {
    setTransactionsPerPage(newPerPage);
    setTransactionsPage(1); // Reset to first page
  };

  // Reset transactions page when filters change
  useEffect(() => {
    setTransactionsPage(1);
  }, [startDate, endDate, selectedCashier, searchTerm]);

  // Sort transactions (filtering is done on the backend)
  const filteredTransactions = useMemo(() => {
    if (!allTransactions || allTransactions.length === 0) {
      return [];
    }

    let sortedTransactions = allTransactions;

    // Sort transactions if sort config is set
    if (sortConfig.key) {
      sortedTransactions = [...allTransactions].sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        // Handle different data types
        if (sortConfig.key === 'date') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        } else if (sortConfig.key === 'total' || sortConfig.key === 'paid' || sortConfig.key === 'change') {
          // Use raw values for sorting
          aValue = a[`raw_${sortConfig.key}`] || 0;
          bValue = b[`raw_${sortConfig.key}`] || 0;
        } else if (sortConfig.key === 'invoice') {
          aValue = Number(aValue) || 0;
          bValue = Number(bValue) || 0;
        } else {
          aValue = String(aValue || '').toLowerCase();
          bValue = String(bValue || '').toLowerCase();
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return sortedTransactions;
  }, [allTransactions, sortConfig]);

  // Paginated transactions for display
  const paginatedTransactions = useMemo(() => {
    const startIndex = (transactionsPage - 1) * transactionsPerPage;
    const endIndex = startIndex + transactionsPerPage;
    return filteredTransactions.slice(startIndex, endIndex);
  }, [filteredTransactions, transactionsPage, transactionsPerPage]);

  // Calculate pagination info
  const transactionsPaginationInfo = useMemo(() => {
    const totalTransactions = filteredTransactions.length;
    const totalPages = Math.ceil(totalTransactions / transactionsPerPage);
    return {
      totalTransactions,
      totalPages,
      currentPage: transactionsPage,
      startIndex: (transactionsPage - 1) * transactionsPerPage + 1,
      endIndex: Math.min(transactionsPage * transactionsPerPage, totalTransactions)
    };
  }, [filteredTransactions.length, transactionsPage, transactionsPerPage]);

  // Format date for display
  const formatDateForDisplay = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
  };

  // Check if user is authenticated before making API calls
  const checkAuthentication = () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      alert('You are not logged in. Please log in to view receipts.');
      return false;
    }
    return true;
  };

  // Handle viewing transaction receipt
  const handleViewReceipt = async (transaction) => {
    // Check authentication first
    if (!checkAuthentication()) {
      return;
    }

    try {
      setLoadingReceipt(true);
      setReceiptData(null); // Clear previous data
      setShowReceiptModal(true);
      
      // Use order ID directly (invoice is now the order_id)
      const orderId = parseInt(transaction.invoice);
      
      console.log('Fetching receipt for order ID:', orderId, 'from invoice:', transaction.invoice);
      
      // Validate order ID
      if (!orderId || isNaN(orderId)) {
        throw new Error('Invalid order ID');
      }
      
      // Fetch detailed order data
      const response = await ordersAPI.getById(orderId);
      
      if (response.data.success) {
        const orderData = response.data.data;
        console.log('Order data received:', orderData);
        
        // Validate order data
        if (!orderData || !orderData.items || orderData.items.length === 0) {
          throw new Error('Order data is incomplete or has no items');
        }
        
        // Format receipt data to match Receipt component expectations
        const formattedReceiptData = {
          invoiceNumber: orderId, // Use order_id as invoice number
          cashier: orderData.cashier_name || transaction.cashier,
          orderDate: orderData.order_date,
          orderItems: orderData.items.map(item => ({
            drug_name: item.drug_name,
            name: item.drug_name,
            quantity: item.quantity,
            base_price: item.unit_price,
            price: item.unit_price
          })),
          calculations: {
            subtotal: orderData.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0),
            discountAmount: orderData.discount || 0,
            grossPrice: orderData.total_amount
          },
          paymentData: {
            paid: orderData.payment_info?.amount_paid || orderData.total_amount,
            change: orderData.payment_info?.change_amount || 0,
            paymentType: orderData.payment_info?.payment_type || 'Cash'
          }
        };
        
        console.log('Formatted receipt data:', formattedReceiptData);
        setReceiptData(formattedReceiptData);
      } else {
        throw new Error(response.data.message || 'Failed to fetch order details');
      }
    } catch (error) {
      console.error('Error fetching receipt:', error);
      
      // Show user-friendly error message
      let errorMessage = 'Failed to load receipt details.';
      
      if (error.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log out and log in again to view receipts.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view this receipt.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Receipt not found. This transaction may have been deleted.';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
      setShowReceiptModal(false);
      setReceiptData(null);
    } finally {
      setLoadingReceipt(false);
    }
  };

  // Handle closing receipt modal
  const handleCloseReceipt = () => {
    setShowReceiptModal(false);
    setReceiptData(null);
    setLoadingReceipt(false);
  };

  // CSV Export Function
  const exportToCSV = () => {
    try {
      console.log('CSV Export started');
      console.log('Filtered transactions count:', filteredTransactions.length);
      
      const csvHeaders = ['Invoice', 'Date', 'Total', 'Paid', 'Change', 'Method', 'Cashier'];
      
      const csvData = filteredTransactions.map(transaction => [
        transaction.invoice,
        formatDateForDisplay(transaction.date),
        transaction.raw_total || transaction.total,
        transaction.raw_paid || transaction.paid,
        transaction.raw_change || transaction.change,
        transaction.method,
        transaction.cashier
      ]);

      // Create CSV content
      let csvContent = csvHeaders.join(',') + '\n';
      csvData.forEach(row => {
        csvContent += row.map(field => `"${field}"`).join(',') + '\n';
      });

      console.log('CSV content generated, length:', csvContent.length);

      // Create and download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.href = url;
      link.download = `transactions_${startDate}_to_${endDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('CSV export completed successfully');
      alert(`CSV exported successfully! ${filteredTransactions.length} transactions exported.`);
    } catch (error) {
      console.error('CSV Export Error:', error);
      alert('Error exporting CSV: ' + error.message);
    }
  };

  // PDF Export Function
  // Generate filename for dashboard PDF export
  const generateDashboardPDFFilename = () => {
    const now = new Date();
    const formattedDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const formattedTime = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS format
    
    // Create date range string
    const start = startDate.replace(/-/g, '');
    const end = endDate.replace(/-/g, '');
    const cashier = selectedCashier === 'all' ? 'AllCashiers' : selectedCashier.replace(/\s+/g, '');
    
    return `TransactionReport_${start}-${end}_${cashier}_${formattedDate}_${formattedTime}`;
  };

  const exportToPDF = () => {
    try {
      console.log('PDF Export started');
      console.log('Filtered transactions count:', filteredTransactions.length);
      
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text('Transaction Details Report', 20, 25);
      
      // Add report info
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      doc.text(`Date Range: ${formatDateForDisplay(startDate)} - ${formatDateForDisplay(endDate)}`, 20, 40);
      doc.text(`Cashier Filter: ${selectedCashier === 'all' ? 'All Cashiers' : selectedCashier}`, 20, 50);
      doc.text(`Total Transactions: ${filteredTransactions.length}`, 20, 60);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 70);

      // Prepare table data
      const tableHeaders = [['Invoice', 'Date', 'Total', 'Paid', 'Change', 'Method', 'Cashier']];
      const tableData = filteredTransactions.map(transaction => [
        transaction.invoice,
        formatDateForDisplay(transaction.date),
        transaction.raw_total || transaction.total,
        transaction.raw_paid || transaction.paid,
        transaction.raw_change || transaction.change,
        transaction.method,
        transaction.cashier
      ]);

      console.log('Table data prepared:', tableData.length, 'rows');

      // Add table using autoTable
      doc.autoTable({
        head: tableHeaders,
        body: tableData,
        startY: 85,
        styles: {
          fontSize: 9,
          cellPadding: 4,
          overflow: 'linebreak',
          halign: 'left',
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10,
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250],
        },
        columnStyles: {
          0: { cellWidth: 25 }, // Invoice
          1: { cellWidth: 22 }, // Date
          2: { cellWidth: 20 }, // Total
          3: { cellWidth: 20 }, // Paid
          4: { cellWidth: 20 }, // Change
          5: { cellWidth: 18 }, // Method
          6: { cellWidth: 25 }, // Cashier
        },
        margin: { top: 85, right: 15, bottom: 15, left: 15 },
        theme: 'striped'
      });

      // Add footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
      }

      console.log('PDF generated successfully');

      // Save the PDF with custom filename
      const fileName = `${generateDashboardPDFFilename()}.pdf`;
      doc.save(fileName);
      
      console.log('PDF export completed successfully');
      alert(`PDF exported successfully! ${filteredTransactions.length} transactions exported as ${fileName}`);
    } catch (error) {
      console.error('PDF Export Error:', error);
      alert('Error exporting PDF: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading-container" style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '50vh',
          flexDirection: 'column'
        }}>
          <div className="loading-spinner"></div>
          <p style={{ marginTop: '20px', color: '#666' }}>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="error-container" style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '50vh',
          flexDirection: 'column'
        }}>
          <p style={{ color: '#e74c3c', marginBottom: '20px' }}>{error}</p>
          <button 
            onClick={loadDashboardData}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Header with navigation and logout */}
      <div className="dashboard-header">
        <div className="header-left">
          <button 
            className="nav-btn products-btn active"
            onClick={handleInventoryClick}
            tabIndex="0"
          >
            <span className="icon">📦</span>
            Inventory
          </button>
          <button 
            className="nav-btn products-btn"
            onClick={handleProductClick}
            tabIndex="0"
          >
            <span className="icon">🏷️</span>
            Product
          </button>
          <button 
            className="nav-btn products-btn"
            onClick={handleAccountClick}
            tabIndex="0"
          >
            <span className="icon">👤</span>
            Account
          </button>
          <button 
            className="nav-btn products-btn"
            onClick={handleSettingsClick}
            tabIndex="0"
          >
            <span className="icon">⚙️</span>
            Settings
          </button>
        </div>
        <div className="header-right">
          <span className="user-info">👤 {user?.username}</span>
          <button 
            className="nav-btn logout-btn" 
            onClick={handleLogout}
            tabIndex="0"
          >
            🚪 Log out
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="metrics-container">
        <div className="metric-card sales">
          <div className="metric-label">SALES</div>
          <div className="metric-value">{metrics.sales}</div>
        </div>
        <div className="metric-card transactions">
          <div className="metric-label">TRANSACTIONS</div>
          <div className="metric-value">{metrics.transactions}</div>
        </div>
        <div className="metric-card items-sold">
          <div className="metric-label">ITEMS SOLD</div>
          <div className="metric-value">{metrics.itemsSold}</div>
        </div>
        <div className="metric-card products">
          <div className="metric-label">PRODUCTS</div>
          <div className="metric-value">{metrics.products}</div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <h2>Transactions</h2>
        <div className="filters">
          <div className="filter-group">
            <label>Cashier</label>
            <select value={selectedCashier} onChange={(e) => handleCashierChange(e.target.value)}>
              {availableCashiers.map((cashier, index) => (
                <option key={index} value={cashier}>
                  {cashier === 'all' ? 'All' : cashier}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Date</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => handleDateChange('start', e.target.value)}
            />
            <span>-</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => handleDateChange('end', e.target.value)}
            />
          </div>

        </div>
      </div>

      {/* Main Content Area */}
      <div className="content-panels">
        {/* Products Panel */}
        <div className="products-panel">
          <div className="panel-header">
            <h3>Products</h3>
            <div className="products-controls">
              <select 
                value={productsPagination.limit} 
                onChange={(e) => handleProductsLimitChange(parseInt(e.target.value))}
                className="limit-select"
              >
                <option value={6}>6 per page</option>
                <option value={10}>10 per page</option>
                <option value={15}>15 per page</option>
                <option value={20}>20 per page</option>
              </select>
            </div>
          </div>
          
          <div className="products-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Sold</th>
                  <th>Available</th>
                  <th>Sales</th>
                </tr>
              </thead>
              <tbody>
                {dashboardProducts.map((product, index) => (
                  <tr key={index}>
                    <td>{product.name}</td>
                    <td>{product.sold}</td>
                    <td>{product.available}</td>
                    <td>{product.sales}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Products Pagination */}
          {productsPagination.totalPages > 1 && (
            <div className="pagination-controls">
              <button 
                onClick={() => handleProductsPageChange(productsPagination.page - 1)}
                disabled={productsPagination.page <= 1}
                className="pagination-btn"
              >
                ← Previous
              </button>
              
              <div className="pagination-info">
                <span>
                  Page {productsPagination.page} of {productsPagination.totalPages}
                </span>
                <small>
                  ({productsPagination.total} total products)
                </small>
              </div>
              
              <button 
                onClick={() => handleProductsPageChange(productsPagination.page + 1)}
                disabled={productsPagination.page >= productsPagination.totalPages}
                className="pagination-btn"
              >
                Next →
              </button>
            </div>
          )}
        </div>

        {/* Transaction Details Panel */}
        <div className="transaction-details-panel">
          <div className="panel-header">
            <h3>Transaction Details</h3>
            <div className="panel-controls">
              <select 
                value={transactionsPerPage} 
                onChange={(e) => handleTransactionsPerPageChange(parseInt(e.target.value))}
                className="limit-select"
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={15}>15 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
              </select>
              <div className="export-buttons">
                <button 
                  className="export-btn csv" 
                  onClick={() => {
                    console.log('CSV button clicked');
                    exportToCSV();
                  }}
                >
                  CSV
                </button>
                <button 
                  className="export-btn pdf" 
                  onClick={() => {
                    console.log('PDF button clicked');
                    exportToPDF();
                  }}
                >
                  PDF
                </button>
              </div>
            </div>
          </div>
          
          <div className="search-bar">
            <div className="transaction-count">
              <small>
                Showing {transactionsPaginationInfo.startIndex}-{transactionsPaginationInfo.endIndex} of {transactionsPaginationInfo.totalTransactions} transactions
                {transactionsPaginationInfo.totalPages > 1 && (
                  <span> (Page {transactionsPaginationInfo.currentPage} of {transactionsPaginationInfo.totalPages})</span>
                )}
              </small>
            </div>
            <div className="search-input-container">
              <input 
                type="text" 
                placeholder="Search transactions..." 
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
              <button className="search-btn">🔍</button>
            </div>
          </div>

          <div className="transactions-table">
            <table>
              <thead>
                <tr>
                  <th 
                    className="sortable" 
                    onClick={() => handleSort('invoice')}
                  >
                    Invoice {getSortIcon('invoice')}
                  </th>
                  <th 
                    className="sortable" 
                    onClick={() => handleSort('date')}
                  >
                    Date {getSortIcon('date')}
                  </th>
                  <th 
                    className="sortable" 
                    onClick={() => handleSort('total')}
                  >
                    Total {getSortIcon('total')}
                  </th>
                  <th 
                    className="sortable" 
                    onClick={() => handleSort('paid')}
                  >
                    Paid {getSortIcon('paid')}
                  </th>
                  <th 
                    className="sortable" 
                    onClick={() => handleSort('change')}
                  >
                    Change {getSortIcon('change')}
                  </th>
                  <th 
                    className="sortable" 
                    onClick={() => handleSort('method')}
                  >
                    Method {getSortIcon('method')}
                  </th>
                  <th 
                    className="sortable" 
                    onClick={() => handleSort('cashier')}
                  >
                    Cashier {getSortIcon('cashier')}
                  </th>
                  <th>View</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransactions.map((transaction, index) => (
                  <tr key={index}>
                    <td>{transaction.invoice}</td>
                    <td>{formatDateForDisplay(transaction.date)}</td>
                    <td>{transaction.total}</td>
                    <td>{transaction.paid}</td>
                    <td>{transaction.change}</td>
                    <td>{transaction.method}</td>
                    <td>{transaction.cashier}</td>
                    <td>
                      <button className="view-btn" onClick={() => handleViewReceipt(transaction)}>🔍</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Transactions Pagination */}
          {transactionsPaginationInfo.totalPages > 1 && (
            <div className="pagination-controls">
              <button 
                onClick={() => handleTransactionsPageChange(transactionsPaginationInfo.currentPage - 1)}
                disabled={transactionsPaginationInfo.currentPage <= 1}
                className="pagination-btn"
              >
                ← Previous
              </button>
              
              <div className="pagination-info">
                <span>
                  Page {transactionsPaginationInfo.currentPage} of {transactionsPaginationInfo.totalPages}
                </span>
                <small>
                  ({transactionsPaginationInfo.totalTransactions} total transactions)
                </small>
              </div>
              
              <button 
                onClick={() => handleTransactionsPageChange(transactionsPaginationInfo.currentPage + 1)}
                disabled={transactionsPaginationInfo.currentPage >= transactionsPaginationInfo.totalPages}
                className="pagination-btn"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ManageProduct Modal */}
      <ManageProduct 
        isVisible={showManageProduct} 
        onClose={() => setShowManageProduct(false)} 
      />

      {/* Add InventoryModal */}
      <InventoryModal
        isOpen={showInventory}
        onClose={() => setShowInventory(false)}
      />

      {/* Add ManageAccount Modal */}
      <ManageAccount 
        isOpen={showManageAccount}
        onClose={() => setShowManageAccount(false)}
      />

      {/* Receipt Modal */}
      <Receipt
        isVisible={showReceiptModal}
        onClose={handleCloseReceipt}
        receiptData={receiptData}
        loading={loadingReceipt}
      />

      {/* Low Stock Notification */}
      <LowStockNotification
        isVisible={showNotification}
        onClose={closeNotification}
        lowStockCount={lowStockCount}
        lowStockProducts={lowStockProducts}
      />
    </div>
  );
};

export default AdminDashboard; 