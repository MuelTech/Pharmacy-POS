import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { FaUser, FaLock, FaPills, FaExclamationTriangle, FaExclamationCircle, FaShieldAlt, FaCheckCircle, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState('danger'); // danger, warning, info
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [preventRedirect, setPreventRedirect] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Use ref to reliably track redirect prevention during success animation
  const isShowingSuccessAnimation = useRef(false);

  const { login, isAuthenticated, user, loginLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated (but not if we're showing success animation)
  useEffect(() => {
    if (isAuthenticated && user && !isShowingSuccessAnimation.current) {
      // If we're showing success animation, wait for it to complete
      if (!preventRedirect) {
        redirectBasedOnRole(user.role);
      }
    }
  }, [isAuthenticated, user, preventRedirect, loginSuccess]);

  const redirectBasedOnRole = (role) => {
    if (role === 'admin') {
      navigate('/admin');
    } else if (role === 'staff') {
      navigate('/staff');
    } else {
      console.error('Unknown role:', role);
    }
    isShowingSuccessAnimation.current = false;
  };

  const getErrorIcon = () => {
    switch (errorType) {
      case 'warning':
        return <FaExclamationTriangle className="me-2" />;
      case 'info':
        return <FaShieldAlt className="me-2" />;
      default:
        return <FaExclamationCircle className="me-2" />;
    }
  };

  const categorizeError = (message) => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('too many')) {
      setErrorType('warning');
    } else if (lowerMessage.includes('network') || lowerMessage.includes('timeout')) {
      setErrorType('info');
    } else {
      setErrorType('danger');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    // Clear error when user starts typing
    if (error) {
      setError('');
      setErrorType('danger');
    }
    // Clear success state when user starts typing
    if (loginSuccess) {
      setLoginSuccess(false);
      setPreventRedirect(false);
      isShowingSuccessAnimation.current = false;
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoginSuccess(false);
    setPreventRedirect(true);
    isShowingSuccessAnimation.current = true; // Set ref immediately to prevent race conditions

    try {
      const result = await login(formData);
      
      if (result.success) {
        // Show success animation
        setLoginSuccess(true);
        
        // Wait for animation to complete before allowing redirect
        setTimeout(() => {
          setPreventRedirect(false);
          isShowingSuccessAnimation.current = false;
          redirectBasedOnRole(result.user.role);
        }, 3000); // Wait 3 seconds for animation
      } else {
        // Reset prevention states on failure so user can try again
        setPreventRedirect(false);
        isShowingSuccessAnimation.current = false;
        categorizeError(result.message);
        setError(result.message);
      }
    } catch (error) {
      const errorMessage = 'An unexpected error occurred. Please try again.';
      // Reset prevention states on error so user can try again
      setPreventRedirect(false);
      isShowingSuccessAnimation.current = false;
      categorizeError(errorMessage);
      setError(errorMessage);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <Card className="login-card shadow-lg">
          <Card.Body className="p-5">
            {/* Header */}
            <div className="text-center mb-4">
              <FaPills className="logo-icon mb-3" />
              <h2 className="app-title">Pharmalat</h2>
              <p className="app-subtitle">Offline Medicine POS And Inventory Management System</p>
            </div>

            {/* Success Alert */}
            {loginSuccess && (
              <Alert 
                variant="success" 
                className="mb-3 success-alert"
                style={{ 
                  display: 'block',
                  visibility: 'visible',
                  opacity: 1
                }}
              >
                <div className="d-flex align-items-center">
                  <FaCheckCircle className="me-2 success-icon" />
                  <div className="success-content">
                    <div className="success-message">Login Successfully!</div>
                    <small className="success-help-text">
                      Redirecting to your dashboard...
                    </small>
                  </div>
                </div>
              </Alert>
            )}

            {/* Enhanced Error Alert */}
            {error && !loginSuccess && (
              <Alert 
                variant={errorType} 
                className={`mb-3 error-alert error-alert-${errorType}`}
                dismissible 
                onClose={() => setError('')}
              >
                <div className="d-flex align-items-center">
                  {getErrorIcon()}
                  <div className="error-content">
                    <div className="error-message">{error}</div>
                    {errorType === 'warning' && (
                      <small className="error-help-text">
                        Please wait before trying again.
                      </small>
                    )}
                    {errorType === 'danger' && error.includes('Invalid') && (
                      <small className="error-help-text">
                        Please check your username and password.
                      </small>
                    )}
                  </div>
                </div>
              </Alert>
            )}

            {/* Login Form */}
            <Form onSubmit={handleLogin}>
              <Form.Group className="mb-3">
                <Form.Label className="form-label">
                  <FaUser className="me-2" />
                  Username
                </Form.Label>
                <Form.Control
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Enter your username"
                  className={`form-input ${error && error.includes('Invalid') ? 'is-invalid-custom' : ''} ${loginSuccess ? 'is-valid-custom' : ''}`}
                  required
                  disabled={loginLoading || loginSuccess}
                />
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label className="form-label">
                  <FaLock className="me-2" />
                  Password
                </Form.Label>
                <div className="password-input-container">
                  <Form.Control
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                    className={`form-input password-input ${error && error.includes('Invalid') ? 'is-invalid-custom' : ''} ${loginSuccess ? 'is-valid-custom' : ''}`}
                    required
                    disabled={loginLoading || loginSuccess}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={togglePasswordVisibility}
                    disabled={loginLoading || loginSuccess}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </Form.Group>

              <div className="d-grid">
                <Button
                  type="submit"
                  className={`login-btn btn-lg ${loginSuccess ? 'login-btn-success' : ''}`}
                  variant="primary"
                  disabled={loginLoading || loginSuccess}
                >
                  {loginSuccess ? (
                    <>
                      <FaCheckCircle className="me-2" />
                      Success!
                    </>
                  ) : loginLoading ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      Logging in...
                    </>
                  ) : (
                    'Login'
                  )}
                </Button>
              </div>
            </Form>

            {/* Footer */}
          
          </Card.Body>
        </Card>
      </div>
    </div>
  );
};

export default Login; 