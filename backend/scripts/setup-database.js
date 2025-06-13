const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
  let connection;
  
  try {
    console.log('🔧 Setting up pharmacy database...');
    
    // Connect to MySQL without specifying database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306,
      multipleStatements: true
    });
    
    console.log('✅ Connected to MySQL server');
    
    // Read and execute setup SQL
    const sqlPath = path.join(__dirname, '../config/setup.sql');
    const setupSQL = await fs.readFile(sqlPath, 'utf8');
    
    console.log('📄 Executing setup SQL...');
    await connection.execute(setupSQL);
    
    console.log('✅ Database setup completed successfully!');
    console.log('');
    console.log('📊 Default accounts created:');
    console.log('   Admin: username=admin, password=admin123');
    console.log('   Staff: username=staff1, password=admin123');
    console.log('');
    console.log('⚠️  Please change default passwords in production!');
    console.log('');
    console.log('🚀 You can now start the server with: npm start');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.error('');
    console.error('Please check:');
    console.error('1. MySQL server is running');
    console.error('2. Database credentials in .env file are correct');
    console.error('3. User has permission to create databases');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase; 