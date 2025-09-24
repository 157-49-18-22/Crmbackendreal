import db from './config/db.js';

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic connection
    const [result] = await db.execute('SELECT 1 as test');
    console.log('✅ Database connection successful:', result);
    
    // Test if invoices table exists
    const [tables] = await db.execute('SHOW TABLES LIKE "invoices"');
    console.log('📋 Invoices table exists:', tables.length > 0);
    
    if (tables.length > 0) {
      // Test simple query
      const [invoices] = await db.execute('SELECT COUNT(*) as count FROM invoices');
      console.log('📊 Total invoices:', invoices[0].count);
      
      // Test the exact query from the route
      const [testInvoices] = await db.execute(`
        SELECT 
          i.*,
          '[]' as activities,
          '[]' as tasks,
          '[]' as payment_history
        FROM invoices i
        ORDER BY i.created_at DESC
        LIMIT 10 OFFSET 0
      `);
      console.log('✅ Query successful, found invoices:', testInvoices.length);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    process.exit(0);
  }
}

testConnection(); 