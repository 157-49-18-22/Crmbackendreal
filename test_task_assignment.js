import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

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

async function getAssignableUsers() {
  try {
    console.log('👥 Fetching assignable users...');
    const response = await axios.get(`${API_BASE_URL}/tasks/assignable-users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('✅ Assignable users:', response.data.map(u => `${u.name} (${u.role})`));
    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch assignable users:', error.response?.data || error.message);
    return [];
  }
}

async function assignTask(taskData) {
  try {
    console.log(`📋 Assigning task: ${taskData.title} to user ${taskData.assigned_to}...`);
    const response = await axios.post(`${API_BASE_URL}/tasks`, taskData, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('✅ Task assigned successfully:', response.data.title);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to assign task:', error.response?.data || error.message);
    return null;
  }
}

async function getAllTasks() {
  try {
    console.log('📋 Fetching all tasks...');
    const response = await axios.get(`${API_BASE_URL}/tasks/all`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('✅ Tasks fetched:', response.data.tasks.length, 'tasks found');
    return response.data.tasks;
  } catch (error) {
    console.error('❌ Failed to fetch tasks:', error.response?.data || error.message);
    return [];
  }
}

async function runTests() {
  console.log('🚀 Starting Task Assignment Tests...\n');

  // Step 1: Login as admin
  const adminLoggedIn = await loginAdmin();
  if (!adminLoggedIn) {
    console.log('❌ Cannot proceed without admin access');
    return;
  }

  // Step 2: Get assignable users
  const assignableUsers = await getAssignableUsers();
  if (assignableUsers.length === 0) {
    console.log('❌ No assignable users found. Please create some users first.');
    return;
  }

  // Step 3: Get existing tasks
  const existingTasks = await getAllTasks();
  console.log('📊 Existing tasks:', existingTasks.length);

  // Step 4: Assign test tasks
  const testTasks = [
    {
      title: 'Follow up with client',
      description: 'Call the client to discuss proposal',
      due_date: '2024-02-15',
      assigned_to: assignableUsers[0].id,
      type: 'Call'
    },
    {
      title: 'Prepare meeting agenda',
      description: 'Create agenda for team meeting',
      due_date: '2024-02-10',
      assigned_to: assignableUsers[0].id,
      type: 'Meeting'
    }
  ];

  const assignedTasks = [];
  for (const taskData of testTasks) {
    const task = await assignTask(taskData);
    if (task) {
      assignedTasks.push(task);
    }
  }

  // Step 5: Get updated task list
  const updatedTasks = await getAllTasks();
  console.log('📊 Updated tasks:', updatedTasks.length);

  console.log('\n✅ Task Assignment Tests Completed!');
  console.log(`📋 Created ${assignedTasks.length} tasks`);
}

// Run the tests
runTests().catch(console.error); 