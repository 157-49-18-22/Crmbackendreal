import pool from './config/db.js';
import bcrypt from 'bcryptjs';

async function quickFixEmployee() {
  try {
    console.log('🔧 Quick fixing employee login...');
    
    // 1. Update database to support employee role
    try {
      await pool.execute(`
        ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'user', 'manager', 'employee') DEFAULT 'user'
      `);
      console.log('✅ Database updated for employee role');
    } catch (error) {
      console.log('ℹ️ Database already supports employee role');
    }
    
    // 2. Create a test employee
    const testEmployee = {
      name: 'Test Employee',
      email: 'employee@test.com',
      password: 'password123'
    };
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(testEmployee.password, salt);
    
    // Check if employee already exists
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [testEmployee.email]
    );
    
    if (existing.length === 0) {
      // Create new employee
      await pool.execute(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [testEmployee.name, testEmployee.email, hashedPassword, 'employee']
      );
      console.log('✅ Test employee created successfully!');
    } else {
      console.log('ℹ️ Test employee already exists');
    }
    
    console.log('\n🎉 Employee login is now ready!');
    console.log('\n📝 Test Employee Credentials:');
    console.log('Email: employee@test.com');
    console.log('Password: password123');
    console.log('\n🔗 Login URL: http://localhost:5173/login');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

quickFixEmployee(); 