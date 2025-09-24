import db from './config/db.js';
import fs from 'fs';
import path from 'path';

async function updateEmailsTable() {
  try {
    console.log('Updating emails table for trash functionality...');
    const sqlPath = path.join(process.cwd(), 'update_emails_table.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    const statements = sqlContent.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await db.execute(statement);
          console.log('Executed:', statement.substring(0, 50) + '...');
        } catch (error) {
          // Ignore errors for IF NOT EXISTS clauses
          if (error.code === 'ER_DUP_FIELDNAME' || error.code === 'ER_DUP_KEYNAME') {
            console.log('Skipped (already exists):', statement.substring(0, 50) + '...');
          } else {
            console.error('Error executing statement:', error.message);
          }
        }
      }
    }
    
    console.log('✅ Emails table updated successfully for trash functionality!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating emails table:', error);
    process.exit(1);
  }
}

updateEmailsTable(); 