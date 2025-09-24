import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'crm',
  port: process.env.DB_PORT || 3306
};

async function setupInvoicesDatabase() {
  let connection;
  
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('Connected to database successfully!');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'setup_invoices.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('Setting up invoices tables...');
    
    // Split SQL by semicolon and execute each statement
    const statements = sqlContent.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.execute(statement);
          console.log('✓ Executed SQL statement');
        } catch (error) {
          if (error.code === 'ER_DUP_ENTRY' || error.code === 'ER_TABLE_EXISTS_ERROR') {
            console.log('⚠ Table or data already exists, skipping...');
          } else {
            console.error('✗ Error executing statement:', error.message);
          }
        }
      }
    }
    
    console.log('\n✅ Invoices database setup completed successfully!');
    console.log('\n📋 What was created:');
    console.log('   • invoices table - Main invoice data');
    console.log('   • invoice_activities table - Activity tracking');
    console.log('   • invoice_tasks table - Task management');
    console.log('   • invoice_files table - File attachments');
    console.log('   • invoice_payment_history table - Payment tracking');
    console.log('   • Sample data with 3 invoices');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure MySQL is running');
    console.log('   2. Check your database credentials in .env file');
    console.log('   3. Ensure the CRM database exists');
    console.log('   4. Run: CREATE DATABASE IF NOT EXISTS crm;');
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the setup
setupInvoicesDatabase(); 