# Pharmacy POS System - Setup Guide

## Prerequisites

Before running the system, make sure you have:

1. **Node.js** (v16 or higher) - ✅ Already installed
2. **MySQL Server** (v5.7 or higher) - ⚠️ Required for database
3. **Git** - ✅ Already installed

## Quick Start

### 1. Environment Setup ✅ COMPLETED

All environment files have been created:
- `backend/.env` - Backend configuration
- `frontend/.env` - Frontend configuration
- Required directories created (`backend/uploads`, `backend/logs`)

### 2. Database Setup

**IMPORTANT:** Make sure MySQL is running on your system before proceeding.

Run the database setup script:
```bash
cd backend
npm run setup
```

This will:
- Create the `pharmacy_db` database
- Create all necessary tables (users, products, sales, etc.)
- Insert default admin user and sample data

### 3. Starting the Application

From the root directory, run:
```bash
npm start
```

This will start all three components:
- **Frontend** (React + Vite): http://localhost:5173
- **Backend** (Express API): http://localhost:5000
- **Electron** (Desktop App): Opens automatically

### 4. Default Login Credentials

After database setup, use these credentials to login:
- **Username:** `admin`
- **Password:** `admin123`

⚠️ **IMPORTANT:** Change the default password after first login!

## Configuration Details

### Database Configuration (backend/.env)
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=         # Update if you have a MySQL password
DB_NAME=pharmacy_db
DB_PORT=3306
```

### API Configuration
- **Backend API:** http://localhost:5000
- **Frontend:** http://localhost:5173
- **CORS enabled** for development

## Troubleshooting

### MySQL Connection Issues
1. Ensure MySQL service is running
2. Check if port 3306 is available
3. Verify MySQL credentials in `backend/.env`
4. Test connection: `mysql -u root -p`

### Port Conflicts
- Backend: Change `PORT` in `backend/.env`
- Frontend: Change port in `frontend/vite.config.js`

### Dependency Issues
Re-install dependencies:
```bash
npm run install:all
```

## Project Structure

```
pharmacy-pos/
├── backend/          # Express.js API server
├── frontend/         # React frontend (Vite)
├── electron/         # Electron desktop wrapper
├── package.json      # Root package with scripts
└── SETUP.md         # This file
```

## Next Steps

1. Run the database setup: `cd backend && npm run setup`
2. Start the application: `npm start`
3. Access the system at http://localhost:5173
4. Login with admin/admin123
5. Change default password
6. Start adding products and making sales!

## Features

- 🏪 Product Management
- 💰 Point of Sale (POS)
- 👥 Customer Management
- 📊 Sales Reporting
- 👤 User Management
- 🖥️ Desktop Application (Electron)
- 📱 Responsive Web Interface

---

**Need help?** Check the logs in `backend/logs/app.log` or console output for debugging information. 