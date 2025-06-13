import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="admin-dashboard">
      {/* Admin Dashboard Content - Design this page manually */}
      <h1>Admin Dashboard</h1>
      <p>Welcome back, {user?.username}!</p>
      <p>Role: {user?.role}</p>
      <button onClick={handleLogout}>Logout</button>
      
      {/* Add your custom design here */}
    </div>
  );
};

export default AdminDashboard; 