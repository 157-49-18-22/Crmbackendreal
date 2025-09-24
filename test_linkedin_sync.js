import pool from './config/db.js';

async function testLinkedInSync() {
  try {
    console.log('🔍 Testing LinkedIn Sync...');
    
    // 1. Check if linkedin_integrations has data
    const [integrations] = await pool.execute('SELECT * FROM linkedin_integrations');
    console.log('📊 LinkedIn Integrations:', integrations.length);
    
    // 2. Check if linkedin_leads table exists
    const [tables] = await pool.execute("SHOW TABLES LIKE 'linkedin_leads'");
    console.log('📋 LinkedIn Leads table exists:', tables.length > 0);
    
    if (tables.length === 0) {
      console.log('❌ linkedin_leads table does not exist!');
      return;
    }
    
    // 3. Check current leads count
    const [leads] = await pool.execute('SELECT COUNT(*) as count FROM linkedin_leads');
    console.log('📈 Current leads count:', leads[0].count);
    
    // 4. Try to insert a test lead
    console.log('🧪 Inserting test lead...');
    await pool.execute(
      `INSERT INTO linkedin_leads 
       (linkedin_id, first_name, last_name, email, company, position, lead_score) 
       VALUES (?, ?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
       first_name = ?, last_name = ?, email = ?, company = ?, position = ?, lead_score = ?`,
      [
        'test_001', 'Test', 'User', 'test@example.com', 'Test Company', 'Test Position', 75,
        'Test', 'User', 'test@example.com', 'Test Company', 'Test Position', 75
      ]
    );
    
    // 5. Check leads count again
    const [newLeads] = await pool.execute('SELECT COUNT(*) as count FROM linkedin_leads');
    console.log('📈 New leads count:', newLeads[0].count);
    
    // 6. Show all leads
    const [allLeads] = await pool.execute('SELECT * FROM linkedin_leads');
    console.log('📋 All leads:', allLeads);
    
    console.log('✅ Test completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testLinkedInSync(); 