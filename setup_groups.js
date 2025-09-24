import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupGroups() {
  try {
    console.log('Setting up groups tables...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'setup_groups_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        await pool.execute(statement);
        console.log('Executed:', statement.substring(0, 50) + '...');
      }
    }
    
    console.log('✅ Groups tables setup completed successfully!');
    
    // Test the setup
    const [groups] = await pool.execute('SELECT * FROM `groups`');
    const [members] = await pool.execute('SELECT * FROM group_members');
    
    console.log(`Found ${groups.length} groups and ${members.length} group members`);
    
  } catch (error) {
    console.error('❌ Error setting up groups tables:', error);
  } finally {
    await pool.end();
  }
}

setupGroups(); 