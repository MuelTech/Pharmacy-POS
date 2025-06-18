import React, { useState, useEffect } from 'react';
import './ManageAccount.css';
import { accountsAPI } from '../../services/api';

const ManageAccount = ({ isOpen, onClose }) => {
  const [accounts, setAccounts] = useState([]);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    isActive: true,
    role: 'Staff',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    licenseNumber: ''
  });
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errors, setErrors] = useState({});

  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch accounts from API
  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await accountsAPI.getAll();
      if (response.data.success) {
        setAccounts(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to load accounts. Please try again.' 
      });
    }
  };



  const validateForm = () => {
    const newErrors = {};

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters long';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Password validation
    if (!editMode && !formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone number validation (Philippine format)
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^(\+63|0)9\d{2} \d{3} \d{4}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = '9XX XXX XXXX';
    }

    // License number validation
    if (!formData.licenseNumber.trim()) {
      newErrors.licenseNumber = 'License number is required';
    } else if (formData.licenseNumber.length < 5) {
      newErrors.licenseNumber = 'License number must be at least 5 characters long';
    }

    // Name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatPhoneNumber = (value) => {
    // Remove all non-digits and non-plus signs
    let cleaned = value.replace(/[^\d+]/g, '');
    
    // Handle different input scenarios
    if (cleaned.startsWith('+63')) {
      // International format: +63 9XX XXX XXXX
      const digits = cleaned.slice(3); // Remove +63
      if (digits.length >= 7) {
        return `+63 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
      } else if (digits.length >= 3) {
        return `+63 ${digits.slice(0, 3)} ${digits.slice(3)}`;
      } else if (digits.length > 0) {
        return `+63 ${digits}`;
      }
      return '+63 ';
    } else if (cleaned.startsWith('63')) {
      // Convert 63XXXXXXXXX to +63 format
      const digits = cleaned.slice(2);
      if (digits.length >= 7) {
        return `+63 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
      } else if (digits.length >= 3) {
        return `+63 ${digits.slice(0, 3)} ${digits.slice(3)}`;
      } else if (digits.length > 0) {
        return `+63 ${digits}`;
      }
      return '+63 ';
    } else if (cleaned.startsWith('0')) {
      // Local format: 09XX XXX XXXX
      const digits = cleaned;
      if (digits.length >= 8) {
        return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
      } else if (digits.length >= 4) {
        return `${digits.slice(0, 4)} ${digits.slice(4)}`;
      }
      return digits;
    } else if (cleaned.startsWith('9')) {
      // Convert 9XXXXXXXXX to 09XX XXX XXXX format
      const digits = '0' + cleaned;
      if (digits.length >= 8) {
        return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
      } else if (digits.length >= 4) {
        return `${digits.slice(0, 4)} ${digits.slice(4)}`;
      }
      return digits;
    } else {
      // For other cases, just return the cleaned input
      return cleaned;
    }
  };

    const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newValue = type === 'checkbox' ? checked : value;
    
    // Format phone number as user types
    if (name === 'phoneNumber') {
      newValue = formatPhoneNumber(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));

    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Clear general message when user starts typing
    if (message.text) {
      setMessage({ type: '', text: '' });
    }


  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    // Validate form
    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

    try {
      const accountData = {
        username: formData.username,
        role: formData.role,
        isActive: formData.isActive,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        email: formData.email,
        licenseNumber: formData.licenseNumber
      };

      // Only include password if it's provided
      if (formData.password) {
        accountData.password = formData.password;
      }
      
      let response;
      if (editMode) {
        // Update existing account
        response = await accountsAPI.update(editingId, accountData);
        setSuccessMessage('Account updated successfully!');
      } else {
        // Create new account
        response = await accountsAPI.create(accountData);
        setSuccessMessage('Account created successfully!');
      }

      if (response.data.success) {
        setShowSuccessPopup(true);
        // Refresh the accounts list
        await fetchAccounts();
        
        // Reset form after successful submission
        setTimeout(() => {
          resetForm();
          setShowSuccessPopup(false);
        }, 2000);
      }

    } catch (error) {
      console.error('Error saving account:', error);
      
      // Handle specific error messages
      if (error.response?.data?.message) {
        setMessage({ 
          type: 'error', 
          text: error.response.data.message 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: 'Failed to save account. Please try again.' 
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (account) => {
    setEditMode(true);
    setEditingId(account.id);
    setFormData({
      username: account.username,
      password: '',
      isActive: account.isActive,
      role: account.role,
      firstName: account.firstName || '',
      lastName: account.lastName || '',
      phoneNumber: account.phoneNumber || '',
      email: account.email || '',
      licenseNumber: account.licenseNumber || ''
    });
  };

  const handleToggleStatus = async (id) => {
    try {
      const response = await accountsAPI.toggleStatus(id);
      if (response.data.success) {
        // Refresh the accounts list to get updated data
        await fetchAccounts();
        setMessage({ 
          type: 'success', 
          text: response.data.message 
        });
        // Clear message after 3 seconds
        setTimeout(() => {
          setMessage({ type: '', text: '' });
        }, 3000);
      }
    } catch (error) {
      console.error('Error toggling account status:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to update account status.' 
      });
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      isActive: true,
      role: 'Staff',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      email: '',
      licenseNumber: ''
    });
    setEditMode(false);
    setEditingId(null);

          setErrors({});
      setMessage({ type: '', text: '' });
      setShowSuccessPopup(false);
      setSuccessMessage('');
  };

  if (!isOpen) return null;

  return (
    <div className="manage-account-modal">
      <div className="manage-account-content">
        <div className="manage-account-header">
          <h2>{editMode ? 'Edit Account' : 'Create New Account'}</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        <div className="scrollable-content">
          {message.text && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="account-form">
            <div className="form-section">
              <h3 className="section-title">Account Credentials</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="username">Username *</label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Enter username"
                    className={errors.username ? 'error' : ''}
                    required
                  />
                  {errors.username && <span className="error-message">{errors.username}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="password">Password {!editMode && '*'}</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder={editMode ? "Leave blank to keep current password" : "Enter password"}
                    className={errors.password ? 'error' : ''}
                    required={!editMode}
                  />
                  {errors.password && <span className="error-message">{errors.password}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="role">Role *</label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="Staff">Staff</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="status-label">Account Status</label>
                  <div className="toggle-container">
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleInputChange}
                      />
                      <span className="slider"></span>
                    </label>
                    <span className="status-text">{formData.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3 className="section-title">Personal Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">First Name *</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="Enter first name"
                    className={errors.firstName ? 'error' : ''}
                    required
                  />
                  {errors.firstName && <span className="error-message">{errors.firstName}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="lastName">Last Name *</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Enter last name"
                    className={errors.lastName ? 'error' : ''}
                    required
                  />
                  {errors.lastName && <span className="error-message">{errors.lastName}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="phoneNumber">Phone Number *</label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="9XX XXX XXXX"
                    maxLength="17"
                    className={errors.phoneNumber ? 'error' : ''}
                    required
                  />
                  {errors.phoneNumber && <span className="error-message">{errors.phoneNumber}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter email address"
                    className={errors.email ? 'error' : ''}
                    required
                  />
                  {errors.email && <span className="error-message">{errors.email}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="licenseNumber">License Number *</label>
                  <input
                    type="text"
                    id="licenseNumber"
                    name="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={handleInputChange}
                    placeholder="Enter license number"
                    className={errors.licenseNumber ? 'error' : ''}
                    required
                  />
                  {errors.licenseNumber && <span className="error-message">{errors.licenseNumber}</span>}
                </div>
                <div className="form-group"></div> {/* Empty div for grid alignment */}
              </div>
            </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-button" 
              onClick={resetForm}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : editMode ? 'Update Account' : 'Create Account'}
            </button>
          </div>
        </form>

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

        <table className="accounts-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Created At</th>
              <th>Updated At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map(account => (
              <tr key={account.id}>
                <td>{account.username}</td>
                <td>{account.role}</td>
                <td>{account.isActive ? 'Active' : 'Inactive'}</td>
                <td>{account.lastLogin || 'Never'}</td>
                <td>{account.createdAt ? new Date(account.createdAt).toLocaleString() : 'N/A'}</td>
                <td>{account.updatedAt ? new Date(account.updatedAt).toLocaleString() : 'N/A'}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="action-button edit-button"
                      onClick={() => handleEdit(account)}
                    >
                      Edit
                    </button>
                    <button
                      className={`action-button ${account.isActive ? 'disable-button' : 'enable-button'}`}
                      onClick={() => handleToggleStatus(account.id)}
                    >
                      {account.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

export default ManageAccount; 