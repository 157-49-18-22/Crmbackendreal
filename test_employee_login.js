import axios from 'axios';
import bcrypt from 'bcryptjs';

const BASE_URL = 'http://localhost:5000/api';

// Test employee data
const testEmployee = {
  name: 'Test Employee',
  email: 'testemployee@company.com',
  password: 'password123'
};

async function testEmployeeLogin() {
  try {
    console.log('🧪 Testing Employee Management System...\n');

    // Step 1: Create a new employee
    console.log('1️⃣ Creating new employee...');
    const createResponse = await axios.post(`${BASE_URL}/users/employees`, testEmployee, {
      headers: {
        'Authorization': 'Bearer YOUR_ADMIN_TOKEN_HERE' // You'll need to replace this with actual admin token
      }
    });
    console.log('✅ Employee created successfully:', createResponse.data);

    // Step 2: Test employee login
    console.log('\n2️⃣ Testing employee login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: testEmployee.email,
      password: testEmployee.password
    });
    console.log('✅ Employee login successful:', loginResponse.data);

    // Step 3: Get employee list
    console.log('\n3️⃣ Getting employee list...');
    const employeesResponse = await axios.get(`${BASE_URL}/users/employees`, {
      headers: {
        'Authorization': 'Bearer YOUR_ADMIN_TOKEN_HERE' // You'll need to replace this with actual admin token
      }
    });
    console.log('✅ Employee list retrieved:', employeesResponse.data);

    console.log('\n🎉 All tests passed! Employee management system is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Manual test function for creating employee with bcrypt
async function createEmployeeWithBcrypt() {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(testEmployee.password, salt);
  
  console.log('🔐 Generated hashed password for testing:');
  console.log('Original password:', testEmployee.password);
  console.log('Hashed password:', hashedPassword);
  console.log('Salt rounds: 10');
  
  // Test password verification
  const isMatch = await bcrypt.compare(testEmployee.password, hashedPassword);
  console.log('Password verification test:', isMatch ? '✅ PASSED' : '❌ FAILED');
}

// Run tests
console.log('🚀 Starting Employee Management Tests...\n');

// First test bcrypt functionality
createEmployeeWithBcrypt().then(() => {
  console.log('\n' + '='.repeat(50) + '\n');
  // Then test the API (commented out since we need admin token)
  // testEmployeeLogin();
});

console.log('\n📝 To test the complete flow:');
console.log('1. Start the backend server: cd backend && npm run dev');
console.log('2. Start the frontend: npm run dev');
console.log('3. Login as admin and get the admin token');
console.log('4. Replace YOUR_ADMIN_TOKEN_HERE in the test script');
console.log('5. Run: node test_employee_login.js'); 