import fetch from 'node-fetch';

async function testServer() {
  try {
    console.log('🔍 Testing server connection...');
    
    // Test health endpoint
    const healthResponse = await fetch('http://localhost:5000/api/health');
    console.log('✅ Health check status:', healthResponse.status);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('📋 Health response:', healthData);
      
      // Test invoices endpoint
      console.log('🔍 Testing invoices endpoint...');
      const invoicesResponse = await fetch('http://localhost:5000/api/invoices');
      console.log('📊 Invoices status:', invoicesResponse.status);
      
      if (invoicesResponse.ok) {
        const invoicesData = await invoicesResponse.json();
        console.log('✅ Invoices response:', {
          success: invoicesData.success,
          count: invoicesData.data?.length || 0
        });
      } else {
        const errorText = await invoicesResponse.text();
        console.log('❌ Invoices error response:', errorText);
      }
    }
    
  } catch (error) {
    console.error('❌ Connection error:', error.message);
    console.log('💡 Make sure the server is running on port 5000');
  }
}

testServer(); 