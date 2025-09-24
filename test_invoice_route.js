import db from './config/db.js';

async function testInvoiceQuery() {
  try {
    console.log('🔍 Testing invoice query...');
    
    // Test the exact query from the route
    const query = `
      SELECT 
        i.*,
        '[]' as activities,
        '[]' as tasks,
        '[]' as payment_history,
        '[]' as files
      FROM invoices i
      ORDER BY i.created_at DESC
      LIMIT 10 OFFSET 0
    `;
    
    const [invoices] = await db.execute(query);
    console.log('✅ Query successful!');
    console.log('📊 Found invoices:', invoices.length);
    
    if (invoices.length > 0) {
      console.log('📋 First invoice:', {
        id: invoices[0].id,
        invoice_id: invoices[0].invoice_id,
        client_name: invoices[0].client_name,
        status: invoices[0].status
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    process.exit(0);
  }
}

testInvoiceQuery(); 