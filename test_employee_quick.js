import pool from './config/db.js';
import bcrypt from 'bcryptjs';

async function testEmployeeLogin() {
  try {
    console.log('🧪 Testing Employee Login...\n');
    
    // 1. Check if employee exists
    const [employees] = await pool.execute(
      'SELECT * FROM users WHERE role = "employee"'
    );
    
    console.log(`Found ${employees.length} employees in database`);
    
    if (employees.length === 0) {
      console.log('Creating test employee...');
      
      // Create test employee
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);
      
      await pool.execute(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        ['Test Employee', 'employee@test.com', hashedPassword, 'employee']
      );
      
      console.log('✅ Test employee created!');
    }
    
    // 2. Test login
    const testEmail = 'employee@test.com';
    const testPassword = 'password123';
    
    // Find user
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [testEmail]
    );
    
    if (users.length === 0) {
      console.log('❌ Employee not found');
      return;
    }
    
    const user = users[0];
    console.log(`Found user: ${user.name} (${user.role})`);
    
    // Test password
    const isMatch = await bcrypt.compare(testPassword, user.password);
    console.log(`Password match: ${isMatch ? '✅ YES' : '❌ NO'}`);
    
    if (isMatch) {
      console.log('\n🎉 Employee login test PASSED!');
      console.log('\n📝 Login Credentials:');
      console.log('Email: employee@test.com');
      console.log('Password: password123');
      console.log('\n🔗 Try logging in at: http://localhost:5173/login');
    } else {
      console.log('\n❌ Employee login test FAILED!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testEmployeeLogin(); 