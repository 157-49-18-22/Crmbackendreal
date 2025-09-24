import pool from './config/db.js';

async function fixTasksTable() {
  try {
    console.log('Checking tasks table structure...');
    
    // Check if assigned_by column exists
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'crm' 
      AND TABLE_NAME = 'tasks' 
      AND COLUMN_NAME = 'assigned_by'
    `);
    
    if (columns.length === 0) {
      console.log('Adding assigned_by column to tasks table...');
      await pool.execute(`
        ALTER TABLE tasks 
        ADD COLUMN assigned_by INT,
        ADD FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
      `);
      console.log('✅ assigned_by column added successfully!');
    } else {
      console.log('✅ assigned_by column already exists');
    }
    
    // Show current table structure
    const [tableStructure] = await pool.execute('DESCRIBE tasks');
    console.log('\nCurrent tasks table structure:');
    tableStructure.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
    });
    
    console.log('\n✅ Tasks table is ready!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing tasks table:', error);
    process.exit(1);
  }
}

fixTasksTable(); 