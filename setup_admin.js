import pool from './config/db.js';
import fs from 'fs';
import path from 'path';

async function setupAdminTables() {
  try {
    console.log('Setting up admin dashboard tables...');
    
    const sqlFile = fs.readFileSync('./setup_admin_tables.sql', 'utf8');
    const statements = sqlFile.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await pool.execute(statement);
      }
    }
    
    console.log('Admin dashboard tables setup completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error setting up admin tables:', error);
    process.exit(1);
  }
}

setupAdminTables(); 