# 🏥 Pharmacy Management System

A comprehensive pharmacy management system built with React, Node.js, and Electron.

## 🚀 Features

- **Staff Dashboard**: Manage orders, products, and transactions
- **Payment Processing**: Multiple payment methods with receipt generation
- **Inventory Management**: Track medicines and stock levels
- **User Authentication**: Secure login with pharmacist profiles
- **Receipt System**: Automatic receipt generation with pharmacist names
- **Cross-Platform**: Available as web app and desktop application

## 🏗️ Project Structure

```
Pharmacy_System/
├── backend/          # Node.js/Express API server
│   ├── config/       # Database and app configuration
│   ├── routes/       # API routes (auth, orders, products)
│   ├── middleware/   # Authentication and validation middleware
│   └── .env.example  # Environment variables template
├── frontend/         # React/Vite web application
│   ├── src/          # Source code
│   ├── public/       # Static assets
│   └── dist/         # Build output (auto-generated)
├── electron/         # Electron desktop application
└── .gitignore        # Git ignore rules
```

## 🛠️ Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- MySQL/MariaDB database
- Git

### 1. Clone Repository

```bash
git clone <repository-url>
cd Pharmacy_System
```

### 2. Backend Setup

```bash
cd backend
npm install
```

**Configure Environment Variables:**
```bash
# Copy the example file
cp .env.example .env

# Edit .env with your actual values:
# - Database credentials
# - JWT secret key
# - Other configuration options
```

**Database Setup:**
- Create a MySQL database named `pharmacy_db`
- Import your database schema
- Update database credentials in `.env`

**Start Backend:**
```bash
npm start
# Server runs on http://localhost:5000
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Web app runs on http://localhost:5173
```

### 4. Electron Setup (Optional)

```bash
cd electron
npm install
npm start
# Desktop app launches
```

## 🔧 Development

### Environment Variables

The backend requires several environment variables. See `backend/.env.example` for all required variables:

- `DB_*`: Database connection settings
- `JWT_SECRET`: Secret key for authentication tokens
- `PORT`: Server port (default: 5000)
- `FRONTEND_URL`: Frontend URL for CORS

### Database Tables

Key tables in the system:
- `accounts`: User accounts and authentication
- `pharmacists`: Pharmacist profile information
- `orders`: Order transactions
- `payments`: Payment records
- `payment_types`: Available payment methods
- `medicines`: Product/medicine catalog
- `inventory`: Stock management

### API Endpoints

**Authentication:**
- `POST /api/auth/login` - User login
- `GET /api/auth/pharmacist` - Get pharmacist info

**Orders:**
- `POST /api/orders` - Create new order
- `GET /api/orders` - List orders
- `GET /api/orders/payment-types/all` - Get payment types

**Products:**
- `GET /api/products` - List products
- `GET /api/products/categories` - Get categories

## 📋 Important Notes

### Security

- **Never commit `.env` files** - They contain sensitive information
- Change default JWT secret in production
- Use strong database passwords
- Enable SSL/HTTPS in production

### Git Workflow

The `.gitignore` file is configured to exclude:
- Environment files (`.env*`)
- Node modules (`node_modules/`)
- Build outputs (`dist/`, `build/`)
- Log files (`*.log`)
- OS-specific files (`.DS_Store`, `Thumbs.db`)
- Editor files (`.vscode/`, `.idea/`)

### File Structure

- Keep sensitive data out of source code
- Use environment variables for configuration
- Follow the established folder structure
- Document any new features or endpoints

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Update documentation if needed
5. Submit a pull request

## 📝 License

[Add your license information here]

## 🆘 Support

For support or questions, contact [your contact information].

---

**⚠️ Important Security Reminder:**
Always ensure your `.env` files are never committed to version control. They contain sensitive information like database passwords and API keys. 