import pool from './config/db.js';

async function setupEmployeeRole() {
  try {
    console.log('🔧 Setting up employee role in database...');
    
    // Update the role enum to include 'employee'
    await pool.execute(`
      ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'user', 'manager', 'employee') DEFAULT 'user'
    `);
    
    console.log('✅ Employee role added to database successfully!');
    
    // Add some test employees if they don't exist
    const testEmployees = [
      {
        name: 'Test Employee 1',
        email: 'employee1@test.com',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: admin123
        role: 'employee'
      },
      {
        name: 'Test Employee 2', 
        email: 'employee2@test.com',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: admin123
        role: 'employee'
      }
    ];
    
    for (const employee of testEmployees) {
      try {
        await pool.execute(`
          INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE id=id
        `, [employee.name, employee.email, employee.password, employee.role]);
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          console.log(`ℹ️  Employee ${employee.email} already exists`);
        } else {
          console.error(`❌ Error adding employee ${employee.email}:`, error.message);
        }
      }
    }
    
    console.log('✅ Test employees added successfully!');
    console.log('\n📝 Test Employee Credentials:');
    console.log('Email: employee1@test.com | Password: admin123');
    console.log('Email: employee2@test.com | Password: admin123');
    
  } catch (error) {
    console.error('❌ Error setting up employee role:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the setup
setupEmployeeRole(); 