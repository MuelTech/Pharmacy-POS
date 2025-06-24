# Pharmacy Point of Sale Management System

A comprehensive pharmacy management system built with React, Node.js, Express, MySQL, and Electron.

## Project Structure

```
Pharmacy-POS/
├── backend/          # Node.js/Express API server
├── frontend/         # React web application
├── electron/         # Desktop application wrapper
└── README.md         # This file
```

## Prerequisites

- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- Git

## Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Pharmacy-POS
```

### 2. Install Dependencies
```bash
npm run install-all
```

### 3. Database Setup
1. Create a MySQL database named `pharmacy_db`
2. Update database credentials in `backend/.env` if needed
3. The application will create necessary tables automatically

### 4. Environment Configuration

#### Backend (.env)
The backend `.env` file has been created with default values:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=pharmacy_db
DB_PORT=3306
JWT_SECRET=your_super_secure_jwt_secret_key_for_pharmacy_system_2024_change_this_in_production
```

#### Frontend (.env)
The frontend `.env` file configures the API connection:
```
VITE_API_URL=http://localhost:5000/api
```

## Running the Application

### Development Mode

#### Start Backend Server
```bash
npm run dev:backend
```
Server runs on: http://localhost:5000

#### Start Frontend Development Server
```bash
npm run dev:frontend
```
Frontend runs on: http://localhost:5173

#### Start Both Backend and Frontend
```bash
npm run dev
```

#### Start Electron Desktop App
```bash
npm run dev:electron
```

### Production Mode

#### Build Frontend
```bash
npm run build:frontend
```

#### Start Backend in Production
```bash
npm run start:backend
```

## Features

- **User Authentication & Authorization**
  - Admin and Staff roles
  - JWT-based authentication
  
- **Product Management**
  - Add, edit, delete products
  - Image upload support
  - Category management
  
- **Inventory Management**
  - Stock tracking
  - Low stock notifications
  - Automated alerts
  
- **Point of Sale**
  - Quick product search
  - Cart management
  - Multiple payment types
  - Receipt generation
  
- **Dashboard & Analytics**
  - Sales metrics
  - Product performance
  - Transaction history
  
- **Desktop Application**
  - Cross-platform Electron app
  - Offline capability

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify token
- `POST /api/auth/logout` - User logout

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders` - Get all orders
- `GET /api/orders/dashboard/metrics` - Dashboard metrics

### Inventory
- `GET /api/inventory` - Get inventory
- `POST /api/inventory` - Add inventory item
- `PATCH /api/inventory/:id/stock` - Update stock

### Accounts
- `GET /api/accounts` - Get all accounts
- `POST /api/accounts` - Create account
- `PUT /api/accounts/:id` - Update account

## Configuration Files Created

- ✅ `backend/.env` - Backend environment variables
- ✅ `frontend/.env` - Frontend environment variables  
- ✅ `backend/.gitignore` - Backend git ignore rules
- ✅ `frontend/.gitignore` - Frontend git ignore rules
- ✅ `electron/.gitignore` - Electron git ignore rules
- ✅ `.gitignore` - Root level git ignore rules
- ✅ `backend/uploads/.gitkeep` - Uploads directory placeholder

## Security Notes

- The JWT secret in `.env` should be changed for production
- Database credentials should be secured
- The `.env` files are excluded from git for security

## Troubleshooting

### Database Connection Issues
1. Ensure MySQL is running
2. Verify database credentials in `backend/.env`
3. Check if `pharmacy_db` database exists

### CORS Issues
- The backend is configured to allow requests from `http://localhost:5173`
- Update `FRONTEND_URL` in `backend/.env` if using different port

### Port Conflicts
- Backend: Change `PORT` in `backend/.env`
- Frontend: Update port in `frontend/vite.config.js`

## License

MIT License

## Author

Lemuel 