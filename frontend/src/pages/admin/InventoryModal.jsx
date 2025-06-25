import React, { useState, useMemo, useEffect } from 'react';
import './InventoryModal.css';
import SelectMedicineModal from './SelectMedicineModal';
import { inventoryAPI, productsAPI } from '../../services/api';
import { useLowStockNotification } from '../../hooks/useLowStockNotification';

const InventoryModal = ({ isOpen, onClose }) => {
  // Low stock notification hook for triggering recheck after inventory changes
  const { forceRecheckLowStock } = useLowStockNotification();
  // Form state for adding new inventory
  const [formData, setFormData] = useState({
    batch_number: '',
    drug_id: '',
    medicine_name: '',
    stock_level: '',
    expiry_date: '',
    reorder_level: '',
    date_received: new Date().toISOString().split('T')[0] // Current date as default
  });

  // State for data
  const [inventoryData, setInventoryData] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingInventoryId, setEditingInventoryId] = useState(null);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [inventoryToDelete, setInventoryToDelete] = useState(null);

  // Table state - default sort by medicine name then by expiry date
  const [sortConfig, setSortConfig] = useState({ key: 'drug_name', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // State for SelectMedicineModal
  const [showSelectMedicineModal, setShowSelectMedicineModal] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);

  const itemsPerPage = 5;

  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchInventoryData();
      fetchProducts();
    }
  }, [isOpen]);

  const fetchInventoryData = async () => {
    try {
      setIsLoading(true);
      const response = await inventoryAPI.getAll();
      if (response.data.success) {
        setInventoryData(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch inventory data:', error);
      setError('Failed to load inventory data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll();
      if (response.data.success) {
        setProducts(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setError('Failed to load products');
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle numeric input with validation
  const handleNumericChange = (e) => {
    const { name, value } = e.target;
    // Only allow positive numbers
    if (value === '' || (Number(value) >= 0 && !isNaN(Number(value)))) {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.batch_number || !formData.stock_level || 
        !formData.expiry_date || !formData.reorder_level || !formData.date_received) {
      setError('Please fill in all required fields');
      return;
    }

    if (!selectedMedicine) {
      setError('Please select a medicine');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const inventoryData = {
        batch_number: formData.batch_number,
        drug_id: selectedMedicine.drug_id,
        stock_level: parseInt(formData.stock_level),
        expiry_date: formData.expiry_date,
        reorder_level: parseInt(formData.reorder_level),
        date_received: formData.date_received
      };

      let response;
      if (isEditMode) {
        // Update existing inventory item
        response = await inventoryAPI.update(editingInventoryId, inventoryData);
        if (response.data.success) {
          setSuccessMessage('Inventory item updated successfully!');
          setIsEditMode(false);
          setEditingInventoryId(null);
        }
      } else {
        // Create new inventory item
        response = await inventoryAPI.create(inventoryData);
        if (response.data.success) {
          setSuccessMessage('Inventory item added successfully!');
        }
      }

      // Clear form and refresh data
      clearForm();
      await fetchInventoryData();
      
      // Force recheck low stock notifications after inventory changes
      setTimeout(() => {
        forceRecheckLowStock();
      }, 500); // Small delay to ensure data is updated
      
      // Show success message
      setShowSuccessPopup(true);
      setTimeout(() => setShowSuccessPopup(false), 3000);

    } catch (error) {
      console.error('Error saving inventory item:', error);
      setError(error.response?.data?.message || 'Failed to save inventory item. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Sorting functionality
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

  // Filter and sort inventory data
  const filteredAndSortedData = useMemo(() => {
    let filtered = inventoryData.filter(item =>
      item.drug_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.batch_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'expiry_date' || sortConfig.key === 'date_received') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        } else if (sortConfig.key === 'stock_level' || sortConfig.key === 'reorder_level') {
          aValue = Number(aValue);
          bValue = Number(bValue);
        } else {
          aValue = String(aValue).toLowerCase();
          bValue = String(bValue).toLowerCase();
        }

        let result = 0;
        if (aValue < bValue) {
          result = sortConfig.direction === 'asc' ? -1 : 1;
        } else if (aValue > bValue) {
          result = sortConfig.direction === 'asc' ? 1 : -1;
        }

        // Secondary sort: if sorting by medicine name, also sort by expiry date
        if (result === 0 && sortConfig.key === 'drug_name') {
          const aExpiry = new Date(a.expiry_date);
          const bExpiry = new Date(b.expiry_date);
          result = aExpiry < bExpiry ? -1 : (aExpiry > bExpiry ? 1 : 0);
        }

        return result;
      });
    }

    return filtered;
  }, [inventoryData, searchTerm, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredAndSortedData.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  // Check if stock is below reorder level
  const isLowStock = (stockLevel, reorderLevel) => {
    return stockLevel <= reorderLevel;
  };

  // Clear form function
  const clearForm = () => {
    setFormData({
      batch_number: '',
      drug_id: '',
      medicine_name: '',
      stock_level: '',
      expiry_date: '',
      reorder_level: '',
      date_received: new Date().toISOString().split('T')[0]
    });
    setSelectedMedicine(null);
    setIsEditMode(false);
    setEditingInventoryId(null);
    setError('');
  };

  // Handle edit button click
  const handleEdit = (inventoryItem) => {
    setFormData({
      batch_number: inventoryItem.batch_number || '',
      drug_id: inventoryItem.drug_id || '',
      medicine_name: inventoryItem.drug_name || '',
      stock_level: (inventoryItem.stock_level || '').toString(),
      expiry_date: inventoryItem.expiry_date || '',
      reorder_level: (inventoryItem.reorder_level || '').toString(),
      date_received: inventoryItem.date_received || ''
    });
    
    // Set selected medicine based on the inventory item
    const medicine = products.find(p => p.drug_id === inventoryItem.drug_id);
    setSelectedMedicine(medicine || null);
    
    setIsEditMode(true);
    setEditingInventoryId(inventoryItem.inventory_id);
  };

  // Handle delete button click
  const handleDelete = (inventoryItem) => {
    setInventoryToDelete(inventoryItem);
    setShowDeleteConfirm(true);
  };

  // Confirm delete action
  const confirmDelete = async () => {
    if (inventoryToDelete) {
      setIsLoading(true);
      setError(''); // Clear any previous errors
      
      try {
        const response = await inventoryAPI.delete(inventoryToDelete.inventory_id);
        if (response.data.success) {
          // If we're currently editing this item, clear the form
          if (editingInventoryId === inventoryToDelete.inventory_id) {
            clearForm();
          }
          
          setSuccessMessage('Inventory item deleted successfully!');
          setShowSuccessPopup(true);
          
          // Close the delete modal
          setShowDeleteConfirm(false);
          setInventoryToDelete(null);
          
          // Refresh data
          await fetchInventoryData();
          
          // Force recheck low stock notifications after deletion
          setTimeout(() => {
            forceRecheckLowStock();
          }, 500); // Small delay to ensure data is updated
          
          // Auto-hide success popup after 3 seconds
          setTimeout(() => {
            setShowSuccessPopup(false);
          }, 3000);
        }
      } catch (error) {
        console.error('Error deleting inventory item:', error);
        
        // Enhanced error handling for new batch management scenarios
        let errorMessage = 'Failed to delete inventory item. Please try again.';
        
        if (error.response?.status === 400) {
          const errorData = error.response.data;
          
          if (errorData.code === 'USED_IN_ORDERS_ZERO_STOCK') {
            // Special case: item used in orders but has 0 stock
            errorMessage = `This inventory item cannot be deleted because it's linked to sales history. Since it has 0 stock, leave it as-is and create a new inventory entry with a different batch number for fresh stock.`;
          } else if (errorData.code === 'USED_IN_ORDERS_HAS_STOCK') {
            // Item used in orders and still has stock
            errorMessage = 'Cannot delete inventory items that have been used in sales and still have stock.';
          } else {
            // Use the server message as fallback
            errorMessage = errorData.message || 'This inventory item cannot be deleted.';
          }
        } else if (error.response?.status === 404) {
          errorMessage = 'Inventory item not found. It may have already been deleted.';
        } else if (error.response?.status === 403) {
          errorMessage = 'You do not have permission to delete inventory items.';
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
        
        // Set error and keep the modal open to show the error
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Cancel delete action
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setInventoryToDelete(null);
    setError(''); // Clear any error messages
  };

  // Handle medicine selection from modal
  const handleMedicineSelect = (product) => {
    setSelectedMedicine(product);
    setFormData(prev => ({
      ...prev,
      drug_id: product.drug_id,
      medicine_name: product.drug_name
    }));
  };

  // Clear selected medicine
  const clearSelectedMedicine = () => {
    setSelectedMedicine(null);
    setFormData(prev => ({
      ...prev,
      drug_id: '',
      medicine_name: ''
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="inventory-modal-overlay">
      <div className="inventory-modal">
        <div className="inventory-modal-header">
          <h2>Inventory Management</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="inventory-modal-content">
          {/* Add/Edit Medicine Form */}
          <div className="inventory-form-section">
            <h3>{isEditMode ? 'Edit Inventory Item' : 'Add Medicine Stock'}</h3>
            {!isEditMode && (
              <div className="info-banner" style={{
                background: '#e8f4fd',
                color: '#1976d2',
                padding: '10px',
                borderRadius: '4px',
                marginBottom: '15px',
                border: '1px solid #bbdefb',
                fontSize: '14px'
              }}>
                💡 <strong>Batch Management:</strong> Each inventory entry represents a unique batch of medicine. You can have multiple entries for the same medicine with different batch numbers, expiry dates, and stock levels. This allows proper tracking of medicine batches and maintains sales history integrity.
              </div>
            )}
            {error && (
              <div className="error-message" style={{
                background: '#fee',
                color: '#c33',
                padding: '10px',
                borderRadius: '4px',
                marginBottom: '15px',
                border: '1px solid #fcc'
              }}>
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="inventory-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="batch_number">Batch Number * 
                    <small style={{ fontWeight: 'normal', color: '#666', marginLeft: '5px' }}>
                      (Must be unique)
                    </small>
                  </label>
                  <input
                    type="text"
                    id="batch_number"
                    name="batch_number"
                    value={formData.batch_number}
                    onChange={handleInputChange}
                    placeholder="e.g., BTH240101-A, LOT2024001"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="medicine_name">Medicine Name *</label>
                  <div className="medicine-selector">
                    <div className="selected-medicine-display">
                      {selectedMedicine ? (
                        <div className="selected-medicine-info">
                          <div className="selected-medicine-details">
                            <div className="selected-medicine-name">{selectedMedicine.drug_name}</div>
                            <div className="selected-medicine-meta">
                              {selectedMedicine.dosage} • {selectedMedicine.form} • {selectedMedicine.manufacturer}
                            </div>
                          </div>
                          <button 
                            type="button" 
                            className="clear-selection-btn"
                            onClick={clearSelectedMedicine}
                            title="Clear selection"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="no-medicine-selected">
                          <span>No medicine selected</span>
                        </div>
                      )}
                    </div>
                    <button 
                      type="button" 
                      className="select-medicine-btn"
                      onClick={() => setShowSelectMedicineModal(true)}
                    >
                      {selectedMedicine ? 'Change Medicine' : 'Select Medicine'}
                    </button>
                  </div>
                  <input
                    type="hidden"
                    name="medicine_name"
                    value={formData.medicine_name}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="stock_level">Stock Level *</label>
                  <input
                    type="number"
                    id="stock_level"
                    name="stock_level"
                    value={formData.stock_level}
                    onChange={handleNumericChange}
                    placeholder="Enter stock quantity"
                    min="0"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="reorder_level">Reorder Level *</label>
                  <input
                    type="number"
                    id="reorder_level"
                    name="reorder_level"
                    value={formData.reorder_level}
                    onChange={handleNumericChange}
                    placeholder="Enter reorder level"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="expiry_date">Expiry Date *</label>
                  <input
                    type="date"
                    id="expiry_date"
                    name="expiry_date"
                    value={formData.expiry_date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="date_received">Date Received *</label>
                  <input
                    type="date"
                    id="date_received"
                    name="date_received"
                    value={formData.date_received}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="add-btn" disabled={isLoading}>
                  {isLoading ? 'Saving...' : (isEditMode ? 'Update Inventory' : 'Add to Inventory')}
                </button>
                <button type="button" className="clear-btn" onClick={clearForm} disabled={isLoading}>
                  {isEditMode ? 'Cancel Edit' : 'Clear Form'}
                </button>
              </div>
            </form>
          </div>

          {/* Inventory Table */}
          <div className="inventory-table-section">
            <div className="table-header">
              <h3>Inventory Items</h3>
              <div className="table-info" style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                Each row represents a unique batch of medicine. The same medicine can appear multiple times with different batch numbers.
              </div>
              <div className="table-controls">
                <input
                  type="text"
                  placeholder="Search by medicine name or batch number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                <span className="item-count">
                  {(() => {
                    const uniqueMedicines = new Set(filteredAndSortedData.map(item => item.drug_name)).size;
                    return `${filteredAndSortedData.length} batch${filteredAndSortedData.length !== 1 ? 'es' : ''} • ${uniqueMedicines} medicine${uniqueMedicines !== 1 ? 's' : ''}`;
                  })()}
                </span>
              </div>
            </div>

            <div className="inventory-table-container">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('drug_name')} className="sortable">
                      Medicine Name {getSortIcon('drug_name')}
                    </th>
                    <th onClick={() => handleSort('batch_number')} className="sortable">
                      Batch Number {getSortIcon('batch_number')}
                    </th>
                    <th onClick={() => handleSort('stock_level')} className="sortable">
                      Stock Level {getSortIcon('stock_level')}
                    </th>
                    <th onClick={() => handleSort('expiry_date')} className="sortable">
                      Expiry Date {getSortIcon('expiry_date')}
                    </th>
                    <th onClick={() => handleSort('reorder_level')} className="sortable">
                      Reorder Level {getSortIcon('reorder_level')}
                    </th>
                    <th onClick={() => handleSort('date_received')} className="sortable">
                      Date Received {getSortIcon('date_received')}
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((item, index) => {
                    // Check if this medicine appears multiple times
                    const sameNameItems = currentItems.filter(i => i.drug_name === item.drug_name);
                    const isMultipleBatches = sameNameItems.length > 1;
                    const isFirstInstance = index === currentItems.findIndex(i => i.drug_name === item.drug_name);
                    
                    return (
                      <tr key={item.inventory_id} className={isLowStock(item.stock_level, item.reorder_level) ? 'low-stock' : ''}>
                        <td>
                          <div>
                            {item.drug_name}
                            {isMultipleBatches && (
                              <small style={{ 
                                display: 'block', 
                                color: '#666', 
                                fontSize: '12px',
                                marginTop: '2px'
                              }}>
                                ({sameNameItems.length} batches total)
                              </small>
                            )}
                          </div>
                        </td>
                        <td>
                          <strong>{item.batch_number}</strong>
                        </td>
                      <td>
                        <span className={isLowStock(item.stock_level, item.reorder_level) ? 'stock-warning' : ''}>
                          {item.stock_level}
                          {isLowStock(item.stock_level, item.reorder_level) && ' ⚠️'}
                        </span>
                      </td>
                      <td>{formatDate(item.expiry_date)}</td>
                      <td>{item.reorder_level}</td>
                      <td>{formatDate(item.date_received)}</td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="edit-btn"
                            onClick={() => handleEdit(item)}
                            title="Edit Inventory Item"
                            disabled={isLoading}
                          >
                            ✏️
                          </button>
                          <button 
                            className="delete-btn"
                            onClick={() => handleDelete(item)}
                            title="Delete Inventory Item"
                            disabled={isLoading}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  Previous
                </button>
                
                {[...Array(totalPages)].map((_, index) => (
                  <button
                    key={index}
                    onClick={() => handlePageChange(index + 1)}
                    className={`pagination-btn ${currentPage === index + 1 ? 'active' : ''}`}
                  >
                    {index + 1}
                  </button>
                ))}
                
                <button 
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Success Popup */}
        {showSuccessPopup && (
          <div className="success-popup">
            <div className="success-popup-content">
              <span className="success-icon">✓</span>
              <span className="success-message">{successMessage}</span>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="delete-confirm-overlay">
            <div className="delete-confirm-modal">
              <div className="delete-confirm-header">
                <div className="delete-icon">🗑️</div>
                <h3>Delete Inventory Item</h3>
              </div>
              
              <div className="delete-confirm-content">
                {error && (
                  <div className="error-message" style={{
                    background: '#fee',
                    color: '#c33',
                    padding: '10px',
                    borderRadius: '4px',
                    marginBottom: '15px',
                    border: '1px solid #fcc',
                    fontSize: '14px'
                  }}>
                    <strong>❌ Error:</strong> {error}
                  </div>
                )}
                
                <p>Are you sure you want to delete this inventory item?</p>
                {inventoryToDelete && (
                  <div className="inventory-preview">
                    <div className="preview-details">
                      <div className="preview-name">{inventoryToDelete.drug_name}</div>
                      <div className="preview-info">Batch: {inventoryToDelete.batch_number} • Stock: {inventoryToDelete.stock_level}</div>
                    </div>
                  </div>
                )}
                <p className="warning-text">
                  <strong>⚠️ This action cannot be undone.</strong>
                </p>
                <div className="info-note" style={{
                  background: '#fff3cd',
                  color: '#856404',
                  padding: '10px',
                  borderRadius: '4px',
                  marginTop: '10px',
                  border: '1px solid #ffeaa7',
                  fontSize: '13px'
                }}>
                  <strong>💡 Tip:</strong> If you need to restock this medicine with a new batch, create a new inventory entry instead. Items used in sales cannot be deleted to maintain transaction history.
                </div>
              </div>
              
              <div className="delete-confirm-actions">
                <button className="cancel-delete-btn" onClick={cancelDelete} disabled={isLoading}>
                  Cancel
                </button>
                <button className="confirm-delete-btn" onClick={confirmDelete} disabled={isLoading}>
                  {isLoading ? 'Deleting...' : 'Delete Item'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Select Medicine Modal */}
        <SelectMedicineModal
          isOpen={showSelectMedicineModal}
          onClose={() => setShowSelectMedicineModal(false)}
          products={products || []}
          onSelectMedicine={handleMedicineSelect}
        />
      </div>
    </div>
  );
};

export default InventoryModal; 