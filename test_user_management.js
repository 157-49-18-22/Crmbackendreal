import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Test data
const testUsers = [
  {
    name: 'Test Manager',
    email: 'manager@test.com',
    password: 'password123',
    role: 'manager'
  },
  {
    name: 'Test Employee',
    email: 'employee@test.com',
    password: 'password123',
    role: 'employee'
  }
];

// Admin credentials for testing
const adminCredentials = {
  email: 'admin@crm.com',
  password: 'admin123'
};

let adminToken = '';

async function loginAdmin() {
  try {
    console.log('🔐 Logging in as admin...');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, adminCredentials);
    adminToken = response.data.token;
    console.log('✅ Admin login successful');
    return true;
  } catch (error) {
    console.error('❌ Admin login failed:', error.response?.data || error.message);
    return false;
  }
}

async function createUser(userData) {
  try {
    console.log(`👤 Creating ${userData.role}...`);
    const response = await axios.post(`${API_BASE_URL}/users/employees`, userData, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✅ ${userData.role} created successfully:`, response.data.message);
    return response.data.user;
  } catch (error) {
    console.error(`❌ Failed to create ${userData.role}:`, error.response?.data || error.message);
    return null;
  }
}

async function getUsers() {
  try {
    console.log('📋 Fetching users...');
    const response = await axios.get(`${API_BASE_URL}/users/employees`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('✅ Users fetched successfully:', response.data.length, 'users found');
    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch users:', error.response?.data || error.message);
    return [];
  }
}

async function testUserLogin(userData) {
  try {
    console.log(`🔐 Testing login for ${userData.email}...`);
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: userData.email,
      password: userData.password
    });
    console.log(`✅ Login successful for ${userData.role}:`, response.data.user.role);
    return response.data;
  } catch (error) {
    console.error(`❌ Login failed for ${userData.email}:`, error.response?.data || error.message);
    return null;
  }
}

async function deleteUser(userId) {
  try {
    console.log(`🗑️ Deleting user ${userId}...`);
    await axios.delete(`${API_BASE_URL}/users/${userId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('✅ User deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to delete user:', error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting User Management Tests...\n');

  // Step 1: Login as admin
  const adminLoggedIn = await loginAdmin();
  if (!adminLoggedIn) {
    console.log('❌ Cannot proceed without admin access');
    return;
  }

  // Step 2: Get existing users
  const existingUsers = await getUsers();
  console.log('📊 Existing users:', existingUsers.map(u => `${u.name} (${u.role})`));

  // Step 3: Create test users
  const createdUsers = [];
  for (const userData of testUsers) {
    const user = await createUser(userData);
    if (user) {
      createdUsers.push(user);
    }
  }

  // Step 4: Get updated user list
  const updatedUsers = await getUsers();
  console.log('📊 Updated users:', updatedUsers.map(u => `${u.name} (${u.role})`));

  // Step 5: Test login for created users
  for (const userData of testUsers) {
    await testUserLogin(userData);
  }

  // Step 6: Clean up - delete test users
  console.log('\n🧹 Cleaning up test users...');
  for (const user of createdUsers) {
    await deleteUser(user.id);
  }

  console.log('\n✅ User Management Tests Completed!');
}

// Run the tests
runTests().catch(console.error); 