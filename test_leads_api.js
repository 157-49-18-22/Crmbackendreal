import fetch from 'node-fetch';

async function testLeadsAPI() {
  try {
    console.log('Testing Leads API...');
    
    // First, let's try to get a token by logging in
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@crm.com',
        password: 'admin123'
      })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed. Server might not be running.');
      console.log('Please start the server with: npm start');
      return;
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    
    console.log('✅ Login successful, got token');
    
    // Now test the emails API
    const emailsResponse = await fetch('http://localhost:5000/api/leads/emails', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!emailsResponse.ok) {
      console.log('❌ Emails API failed:', emailsResponse.status);
      return;
    }
    
    const emailsData = await emailsResponse.json();
    
    console.log('✅ Emails API successful!');
    console.log('Emails found:', emailsData.emails.length);
    
    if (emailsData.emails.length > 0) {
      console.log('Real emails from database:');
      emailsData.emails.forEach((email, index) => {
        console.log(`${index + 1}. ${email}`);
      });
    } else {
      console.log('No emails found in database');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('Make sure the backend server is running on port 5000');
  }
}

testLeadsAPI(); 