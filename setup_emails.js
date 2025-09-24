import db from './config/db.js';
import fs from 'fs';
import path from 'path';

async function setupEmailsTable() {
  try {
    console.log('Setting up emails table...');
    
    // Read the SQL file
    const sqlPath = path.join(process.cwd(), 'setup_emails_table.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split by semicolon to get individual statements
    const statements = sqlContent.split(';').filter(stmt => stmt.trim());
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        await db.execute(statement);
        console.log('Executed:', statement.substring(0, 50) + '...');
      }
    }
    
    console.log('✅ Emails table setup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up emails table:', error);
    process.exit(1);
  }
}

setupEmailsTable(); 