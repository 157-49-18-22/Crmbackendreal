import pool from './config/db.js';

async function fixDatabase() {
  try {
    console.log('Checking if type column exists in tasks table...');
    
    // Check if column exists
    const [columns] = await pool.execute('SHOW COLUMNS FROM tasks LIKE "type"');
    
    if (columns.length === 0) {
      console.log('Adding type column to tasks table...');
      await pool.execute('ALTER TABLE tasks ADD COLUMN type VARCHAR(100) DEFAULT "Follow up"');
      console.log('Type column added successfully!');
    } else {
      console.log('Type column already exists!');
    }
    
    console.log('Database fixed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing database:', error);
    process.exit(1);
  }
}

fixDatabase(); 