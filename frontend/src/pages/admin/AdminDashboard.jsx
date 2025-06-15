import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ManageProduct from './ManageProduct';
import InventoryModal from './InventoryModal';
import ManageAccount from './ManageAccount';
import { ordersAPI } from '../../services/api';
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
  
  // State for ManageProduct modal
  const [showManageProduct, setShowManageProduct] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showManageAccount, setShowManageAccount] = useState(false);

  // State for API data
  const [metrics, setMetrics] = useState({
    sales: '₱0',
    transactions: '0',
    itemsSold: '0',
    products: '0'
  });
  const [dashboardProducts, setDashboardProducts] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [availableCashiers, setAvailableCashiers] = useState(['all']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const dateParams = { startDate, endDate };
      
      // Load all dashboard data in parallel
      const [metricsResponse, productsResponse, transactionsResponse, cashiersResponse] = await Promise.all([
        ordersAPI.getDashboardMetrics(dateParams),
        ordersAPI.getDashboardProducts(dateParams),
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
  }, [startDate, endDate, selectedCashier, searchTerm]);

  // Load data on component mount and when filters change
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleLogout = async () => {
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

  // Sort transactions (filtering is done on the backend)
  const filteredTransactions = useMemo(() => {
    if (!allTransactions || allTransactions.length === 0) {
      return [];
    }

    // Sort transactions if sort config is set
    if (sortConfig.key) {
      return [...allTransactions].sort((a, b) => {
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
          aValue = Number(aValue.replace(/\D/g, '')) || 0;
          bValue = Number(bValue.replace(/\D/g, '')) || 0;
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
    
    return allTransactions;
  }, [allTransactions, sortConfig]);

  // Format date for display
  const formatDateForDisplay = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
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
        transaction.total,
        transaction.paid,
        transaction.change,
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
        transaction.total,
        transaction.paid,
        transaction.change,
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

      // Save the PDF
      const fileName = `transactions_${startDate}_to_${endDate}.pdf`;
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
          <h3>Products</h3>
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
        </div>

        {/* Transaction Details Panel */}
        <div className="transaction-details-panel">
          <div className="panel-header">
            <h3>Transaction Details</h3>
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
          
          <div className="search-bar">
            <div className="transaction-count">
              <small>Showing {filteredTransactions.length} transactions</small>
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
                {filteredTransactions.map((transaction, index) => (
                  <tr key={index}>
                    <td>{transaction.invoice}</td>
                    <td>{formatDateForDisplay(transaction.date)}</td>
                    <td>{transaction.total}</td>
                    <td>{transaction.paid}</td>
                    <td>{transaction.change}</td>
                    <td>{transaction.method}</td>
                    <td>{transaction.cashier}</td>
                    <td>
                      <button className="view-btn">🔍</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
    </div>
  );
};

export default AdminDashboard; 