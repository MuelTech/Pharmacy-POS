import React, { useState, useEffect } from 'react';
import './ManageProduct.css';
import { productsAPI, uploadAPI } from '../../services/api';
import { getImageUrl, handleImageError } from '../../utils/imageUtils';

const ManageProduct = ({ isVisible, onClose }) => {
  // Form state
  const [formData, setFormData] = useState({
    drug_name: '',
    dosage: '',
    form: '',
    manufacturer: '',
    base_price: '',
    category_id: '',
    image_path: ''
  });

  // Categories and products state
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  // Success popup state
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Image upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState('');

  // Fetch data when component mounts
  useEffect(() => {
    if (isVisible) {
      fetchCategories();
      fetchProducts();
    }
  }, [isVisible]);

  const fetchCategories = async () => {
    try {
      const response = await productsAPI.getCategories();
      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      setError('Failed to load categories');
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

  // Handle form submission with API calls
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const medicineData = {
        drug_name: formData.drug_name,
        dosage: formData.dosage,
        form: formData.form,
        manufacturer: formData.manufacturer,
        base_price: parseFloat(formData.base_price),
        category_id: parseInt(formData.category_id),
        image_path: formData.image_path || ''
      };
      
      let response;
      if (isEditMode) {
        // Update existing medicine
        response = await productsAPI.update(editingProductId, medicineData);
        if (response.data.success) {
          setSuccessMessage('Medicine updated successfully!');
          setIsEditMode(false);
          setEditingProductId(null);
          // Refresh products list from API
          await fetchProducts();
        }
      } else {
        // Create new medicine
        response = await productsAPI.create(medicineData);
        if (response.data.success) {
          setSuccessMessage('Medicine added successfully!');
          // Refresh products list from API
          await fetchProducts();
        }
      }
      
      // Clear form and show success popup
      clearForm();
      setShowSuccessPopup(true);
      
      // Auto-hide success popup after 3 seconds
      setTimeout(() => {
        setShowSuccessPopup(false);
      }, 3000);
      
    } catch (error) {
      console.error('Error saving medicine:', error);
      setError(error.response?.data?.message || 'Failed to save medicine. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Format price input
  const handlePriceChange = (e) => {
    let value = e.target.value.replace(/[^\d.]/g, ''); // Remove non-numeric characters except decimal
    setFormData(prev => ({
      ...prev,
      base_price: value
    }));
  };

  // Handle file selection and upload
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file (JPG, PNG, GIF, etc.)');
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image file size must be less than 5MB');
        return;
      }

      try {
        setUploadingImage(true);
        setError('');

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => setImagePreview(e.target.result);
        reader.readAsDataURL(file);

        // Upload image to server
        const response = await uploadAPI.uploadImage(file);
        
        if (response.data.success) {
          // Update form data with the server path
          setFormData(prev => ({
            ...prev,
            image_path: response.data.data.path
          }));
          
          console.log('Image uploaded successfully:', response.data.data);
        } else {
          throw new Error(response.data.message || 'Failed to upload image');
        }
      } catch (error) {
        console.error('Image upload error:', error);
        setError(error.response?.data?.message || error.message || 'Failed to upload image');
        setImagePreview('');
      } finally {
        setUploadingImage(false);
      }
    }
  };

  // Trigger file input click
  const handleBrowseClick = () => {
    document.getElementById('file-input').click();
  };

  // Clear form function
  const clearForm = () => {
    setFormData({
      drug_name: '',
      dosage: '',
      form: '',
      manufacturer: '',
      base_price: '',
      category_id: '',
      image_path: ''
    });
    setIsEditMode(false);
    setEditingProductId(null);
    setError('');
    setImagePreview('');
  };

  // Handle edit button click
  const handleEdit = (product) => {
    setFormData({
      drug_name: product.drug_name || '',
      dosage: product.dosage || '',
      form: product.form || '',
      manufacturer: product.manufacturer || '',
      base_price: (product.base_price || '').toString(), // Convert to string for input with fallback
      category_id: (product.category_id || '').toString(),
      image_path: product.image_path || ''
    });
    setIsEditMode(true);
    setEditingProductId(product.drug_id);
    
    // Set image preview if product has image
    if (product.image_path) {
      setImagePreview(getImageUrl(product.image_path));
    } else {
      setImagePreview('');
    }

    // Auto-scroll to form section
    setTimeout(() => {
      const formSection = document.querySelector('.form-section');
      if (formSection) {
        formSection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }
    }, 100);
  };

  // Handle delete button click
  const handleDelete = (product) => {
    setProductToDelete(product);
    setShowDeleteConfirm(true);
  };

  // Confirm delete action
  const confirmDelete = async () => {
    if (productToDelete) {
      setIsLoading(true);
      try {
        const response = await productsAPI.delete(productToDelete.drug_id);
        if (response.data.success) {
          // If we're currently editing this product, clear the form
          if (editingProductId === productToDelete.drug_id) {
            clearForm();
          }
          
          setSuccessMessage('Medicine deleted successfully!');
          setShowSuccessPopup(true);
          
          // Refresh products list from API
          await fetchProducts();
          
          // Auto-hide success popup after 3 seconds
          setTimeout(() => {
            setShowSuccessPopup(false);
          }, 3000);
        }
      } catch (error) {
        console.error('Error deleting medicine:', error);
        setError(error.response?.data?.message || 'Failed to delete medicine. Please try again.');
      } finally {
        setIsLoading(false);
      }
      
      setShowDeleteConfirm(false);
      setProductToDelete(null);
    }
  };

  // Cancel delete action
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setProductToDelete(null);
  };

  if (!isVisible) return null;

  return (
    <div className="manage-product-overlay">
      <div className="manage-product-modal">
        {/* Modal Header */}
        <div className="modal-header">
          <h2>Medicine Master List</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* Educational Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
          border: '1px solid #90caf9',
          borderRadius: '8px',
          padding: '12px 16px',
          margin: '0 20px 20px 20px',
          fontSize: '14px',
          lineHeight: '1.4'
        }}>
          <div style={{ fontWeight: 'bold', color: '#1565c0', marginBottom: '4px' }}>
            📋 Medicine Master List
          </div>
          <div style={{ color: '#424242' }}>
            This section manages the <strong>master list of medicines</strong> in your pharmacy. Each medicine should be unique (name + dosage + form + manufacturer). 
            For inventory management with multiple batches, use the <strong>Inventory Management</strong> section.
          </div>
        </div>

        {/* Modal Content */}
        <div className="modal-content">
          {/* Input Form Section */}
          <div className="form-section">
            <h3>{isEditMode ? 'Edit Medicine' : 'Add New Medicine'}</h3>
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
            <form onSubmit={handleSubmit} className="product-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="drug_name">Drug Name *</label>
                  <input
                    type="text"
                    id="drug_name"
                    name="drug_name"
                    value={formData.drug_name}
                    onChange={handleInputChange}
                    placeholder="Enter drug name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="dosage">Dosage *</label>
                  <select
                    id="dosage"
                    name="dosage"
                    value={formData.dosage}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select dosage</option>
                    
                    {/* Tablets/Capsules - mg */}
                    <option value="5mg">5mg</option>
                    <option value="10mg">10mg</option>
                    <option value="20mg">20mg</option>
                    <option value="25mg">25mg</option>
                    <option value="40mg">40mg</option>
                    <option value="50mg">50mg</option>
                    <option value="100mg">100mg</option>
                    <option value="125mg">125mg</option>
                    <option value="250mg">250mg</option>
                    <option value="500mg">500mg</option>
                    <option value="750mg">750mg</option>
                    <option value="1000mg">1000mg</option>
                    <option value="1mg">1mg</option>
                    <option value="2mg">2mg</option>
                    <option value="5mg">5mg</option>
                    
                    {/* Tablets/Capsules - mcg */}
                    <option value="25mcg">25mcg</option>
                    <option value="50mcg">50mcg</option>
                    <option value="100mcg">100mcg</option>
                    <option value="200mcg">200mcg</option>
                    <option value="400mcg">400mcg</option>
                    
                    {/* Liquids - ml */}
                    <option value="5ml">5ml</option>
                    <option value="10ml">10ml</option>
                    <option value="15ml">15ml</option>
                    <option value="30ml">30ml</option>
                    <option value="60ml">60ml</option>
                    <option value="100ml">100ml</option>
                    <option value="120ml">120ml</option>
                    <option value="250ml">250ml</option>
                    <option value="500ml">500ml</option>
                    
                    {/* Percentages for topicals/solutions */}
                    <option value="1%">1%</option>
                    <option value="2%">2%</option>
                    <option value="3%">3%</option>
                    <option value="5%">5%</option>
                    <option value="10%">10%</option>
                    <option value="15%">15%</option>
                    <option value="20%">20%</option>
                    
                    {/* Units for injections */}
                    <option value="10 units">10 units</option>
                    <option value="40 units">40 units</option>
                    <option value="100 units">100 units</option>
                    
                    {/* International Units */}
                    <option value="1000 IU">1000 IU</option>
                    <option value="2000 IU">2000 IU</option>
                    <option value="5000 IU">5000 IU</option>
                    <option value="10000 IU">10000 IU</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="form">Form *</label>
                  <select
                    id="form"
                    name="form"
                    value={formData.form}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select form</option>
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Syrup">Syrup</option>
                    <option value="Solution">Solution</option>
                    <option value="Injection">Injection</option>
                    <option value="Cream">Cream</option>
                    <option value="Ointment">Ointment</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="manufacturer">Manufacturer *</label>
                  <input
                    type="text"
                    id="manufacturer"
                    name="manufacturer"
                    value={formData.manufacturer}
                    onChange={handleInputChange}
                    placeholder="Enter manufacturer name"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="base_price">Base Price (PHP) *</label>
                  <div className="price-input">
                    <span className="currency-symbol">₱</span>
                    <input
                      type="text"
                      id="base_price"
                      name="base_price"
                      value={formData.base_price}
                      onChange={handlePriceChange}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="category_id">Category *</label>
                  <select
                    id="category_id"
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map((category, index) => (
                      <option key={`category-${category.category_id}-${index}`} value={category.category_id}>
                        {category.category_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group full-width">
                  <label htmlFor="image_path">Medicine Image</label>
                  <div className="image-upload-container">
                    {/* Image Preview */}
                    {(imagePreview || formData.image_path) && (
                      <div className="image-preview">
                        <img 
                          src={imagePreview || getImageUrl(formData.image_path)} 
                          alt="Medicine preview"
                          style={{
                            width: '100px',
                            height: '100px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            border: '2px solid #ddd'
                          }}
                          onError={(e) => handleImageError(e, 'Preview')}
                        />
                        <button 
                          type="button" 
                          className="remove-image-btn"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, image_path: '' }));
                            setImagePreview('');
                          }}
                          style={{
                            position: 'absolute',
                            top: '-5px',
                            right: '-5px',
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    )}
                    
                    {/* Upload Controls */}
                    <div className="file-input-container">
                      <input
                        type="text"
                        id="image_path"
                        name="image_path"
                        value={formData.image_path}
                        onChange={handleInputChange}
                        placeholder="Image will appear here after upload"
                        readOnly
                        style={{ backgroundColor: '#f8f9fa' }}
                      />
                      <button 
                        type="button" 
                        className="browse-btn"
                        onClick={handleBrowseClick}
                        disabled={uploadingImage}
                      >
                        {uploadingImage ? 'Uploading...' : 'Upload Image'}
                      </button>
                      <input
                        type="file"
                        id="file-input"
                        accept="image/*"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                      />
                    </div>
                    
                    <small style={{ color: '#666', fontSize: '12px' }}>
                      Supported formats: JPG, PNG, GIF, WebP (Max 5MB)
                    </small>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="add-btn" disabled={isLoading}>
                  {isLoading ? 'Saving...' : (isEditMode ? 'Update Medicine' : 'Add Medicine')}
                </button>
                <button type="button" className="clear-btn" onClick={clearForm} disabled={isLoading}>
                  {isEditMode ? 'Cancel Edit' : 'Clear Form'}
                </button>
              </div>
            </form>
          </div>

          {/* Medicine Information Table Section */}
          <div className="table-section">
            <div className="table-header">
              <h3>Medicine Information</h3>
              <div className="table-info">
                <small>Total Medicines: {products.length}</small>
              </div>
            </div>
            
            <div className="products-table-container">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Medicine ID</th>
                    <th>Image</th>
                    <th>Product Name</th>
                    <th>Dosage</th>
                    <th>Form</th>
                    <th>Manufacturer</th>
                    <th>Base Price</th>
                    <th>Category</th>
                    <th>Total Stock</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product, index) => (
                    <tr key={`product-${product.drug_id || index}`}>
                      <td>
                        <div className="medicine-id" style={{ 
                          fontSize: '12px', 
                          color: '#666',
                          fontFamily: 'monospace'
                        }}>
                          #{product.drug_id}
                        </div>
                      </td>
                      <td>
                        <div className="product-image-cell">
                          {product.image_path ? (
                            <img 
                              src={getImageUrl(product.image_path)}
                              alt={product.drug_name}
                              style={{
                                width: '40px',
                                height: '40px',
                                objectFit: 'cover',
                                borderRadius: '4px',
                                border: '1px solid #ddd'
                              }}
                              onError={(e) => handleImageError(e, 'No Image')}
                            />
                          ) : null}
                          <span 
                            style={{ 
                              display: product.image_path ? 'none' : 'block',
                              fontSize: '10px',
                              color: '#999',
                              textAlign: 'center'
                            }}
                          >
                            No Image
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="product-name">{product.drug_name}</div>
                      </td>
                      <td>{product.dosage}</td>
                      <td>{product.form}</td>
                      <td>
                        <div style={{ 
                          maxWidth: '150px', 
                          whiteSpace: 'normal', 
                          wordWrap: 'break-word',
                          lineHeight: '1.3'
                        }}>
                          {product.manufacturer}
                        </div>
                      </td>
                      <td>
                        <div className="product-price">₱{product.base_price}</div>
                      </td>
                      <td>
                        <div style={{ 
                          maxWidth: '120px', 
                          whiteSpace: 'normal', 
                          wordWrap: 'break-word',
                          lineHeight: '1.3'
                        }}>
                          {product.category_name || 'N/A'}
                        </div>
                      </td>
                      <td>
                        <div className="stock-info">
                          <span style={{ 
                            color: (product.total_stock || 0) > 0 ? '#059669' : '#dc2626',
                            fontWeight: 'bold'
                          }}>
                            {product.total_stock || 0}
                          </span>
                          {product.batch_count > 0 && (
                            <small style={{ 
                              display: 'block', 
                              color: '#666', 
                              fontSize: '11px'
                            }}>
                              {product.batch_count} batch{product.batch_count !== 1 ? 'es' : ''}
                            </small>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="edit-btn"
                            onClick={() => handleEdit(product)}
                            title="Edit Medicine"
                            disabled={isLoading}
                          >
                            ✏️
                          </button>
                          <button 
                            className="delete-btn"
                            onClick={() => handleDelete(product)}
                            title="Delete Medicine"
                            disabled={isLoading}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {products.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: '#666',
                  fontStyle: 'italic'
                }}>
                  No medicines available. Add your first medicine using the form above.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="delete-confirm-overlay">
            <div className="delete-confirm-modal">
              <div className="delete-confirm-header">
                <div className="delete-icon">🗑️</div>
                <h3>Delete Medicine</h3>
              </div>
              
              <div className="delete-confirm-content">
                <p>Are you sure you want to delete this medicine?</p>
                {productToDelete && (
                  <div className="product-preview">
                    <div className="preview-image">
                      <img 
                        src={getImageUrl(productToDelete.image_path) || 'https://via.placeholder.com/40x40/cccccc/666666?text=NO+IMG'} 
                        alt={productToDelete.drug_name}
                        onError={(e) => handleImageError(e, 'NO IMG')}
                      />
                    </div>
                    <div className="preview-details">
                      <div className="preview-name">{productToDelete.drug_name}</div>
                      <div className="preview-info">{productToDelete.dosage} • {productToDelete.form}</div>
                    </div>
                  </div>
                )}
                <p className="warning-text">
                  <strong>⚠️ This action cannot be undone.</strong>
                </p>
              </div>
              
              <div className="delete-confirm-actions">
                <button className="cancel-delete-btn" onClick={cancelDelete}>
                  Cancel
                </button>
                <button className="confirm-delete-btn" onClick={confirmDelete}>
                  Delete Medicine
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Popup */}
        {showSuccessPopup && (
          <div className="success-popup-overlay">
            <div className="success-popup">
              <div className="success-icon">✅</div>
              <div className="success-message">{successMessage}</div>
              <button 
                className="success-close-btn" 
                onClick={() => setShowSuccessPopup(false)}
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageProduct; 