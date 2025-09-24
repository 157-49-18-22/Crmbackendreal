import pool from './config/db.js';

async function checkAndCreateTasksTable() {
  try {
    console.log('Checking if tasks table exists...');
    
    // Check if tasks table exists
    const [tables] = await pool.execute("SHOW TABLES LIKE 'tasks'");
    
    if (tables.length === 0) {
      console.log('Tasks table does not exist. Creating it...');
      
      // Create tasks table
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INT PRIMARY KEY AUTO_INCREMENT,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          due_date DATE,
          type VARCHAR(50) DEFAULT 'Follow up',
          status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
          priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
          user_id INT NOT NULL,
          assigned_by INT,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
        )
      `);
      
      console.log('Tasks table created successfully!');
      
      // Add indexes
      await pool.execute('CREATE INDEX idx_tasks_user_id ON tasks(user_id)');
      await pool.execute('CREATE INDEX idx_tasks_due_date ON tasks(due_date)');
      await pool.execute('CREATE INDEX idx_tasks_status ON tasks(status)');
      await pool.execute('CREATE INDEX idx_tasks_assigned_by ON tasks(assigned_by)');
      
      console.log('Indexes created successfully!');
      
      // Insert sample tasks
      await pool.execute(`
        INSERT INTO tasks (title, description, due_date, type, user_id, assigned_by) VALUES
        ('Follow up with client', 'Call client to discuss proposal', '2025-08-01', 'Follow up', 1, 1),
        ('Prepare presentation', 'Create slides for quarterly review', '2025-07-30', 'Document', 2, 1),
        ('Team meeting', 'Weekly team sync meeting', '2025-07-29', 'Meeting', 3, 1),
        ('Send proposal', 'Email proposal to potential client', '2025-08-02', 'Email', 4, 1)
      `);
      
      console.log('Sample tasks inserted successfully!');
      
    } else {
      console.log('Tasks table already exists!');
    }
    
    // Check users table
    const [users] = await pool.execute('SELECT id, name, email, role FROM users LIMIT 5');
    console.log('Available users:', users);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkAndCreateTasksTable(); 