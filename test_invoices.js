import pool from './config/db.js';

async function testInvoices() {
  try {
    console.log('Testing invoices table...');
    
    // Test basic connection
    const connection = await pool.getConnection();
    console.log('✓ Database connection successful');
    
    // Check if table exists
    const [tables] = await connection.execute(`
      SHOW TABLES LIKE 'invoices'
    `);
    
    if (tables.length === 0) {
      console.log('❌ Invoices table does not exist!');
      return;
    }
    
    console.log('✓ Invoices table exists');
    
    // Test simple query
    const [invoices] = await connection.execute(`
      SELECT COUNT(*) as count FROM invoices
    `);
    
    console.log(`✓ Found ${invoices[0].count} invoices`);
    
    // Test the actual query we're using
    const [testInvoices] = await connection.execute(`
      SELECT 
        i.*,
        '[]' as activities,
        '[]' as tasks,
        '[]' as payment_history
      FROM invoices i
      ORDER BY i.created_at DESC
      LIMIT 5
    `);
    
    console.log(`✓ Query successful, returned ${testInvoices.length} invoices`);
    console.log('Sample invoice:', testInvoices[0]);
    
    connection.release();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testInvoices(); 