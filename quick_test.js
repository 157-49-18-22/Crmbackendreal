import pool from './config/db.js';

async function quickTest() {
  try {
    console.log('🚀 Quick LinkedIn Sync Test...');
    
    // Check if we have a valid token
    const [rows] = await pool.execute(
      'SELECT access_token FROM linkedin_integrations WHERE expires_at > NOW() ORDER BY created_at DESC LIMIT 1'
    );

    if (rows.length === 0) {
      console.log('❌ No valid token found!');
      // Insert demo token
      await pool.execute(
        'INSERT INTO linkedin_integrations (access_token, expires_at) VALUES (?, DATE_ADD(NOW(), INTERVAL 2 MONTH)) ON DUPLICATE KEY UPDATE access_token = ?, expires_at = DATE_ADD(NOW(), INTERVAL 2 MONTH)',
        ['demo_token_123', 'demo_token_123']
      );
      console.log('✅ Demo token inserted!');
    }

    // Mock leads data
    const mockLeads = [
      {
        id: 'linkedin_001',
        firstName: 'Rahul',
        lastName: 'Sharma',
        email: 'rahul.sharma@techcorp.com',
        phone: '+91-98765-43210',
        company: 'TechCorp India',
        position: 'Senior Software Engineer',
        industry: 'Technology',
        location: 'Mumbai, India',
        profileUrl: 'https://linkedin.com/in/rahul-sharma',
        leadScore: 85
      },
      {
        id: 'linkedin_002',
        firstName: 'Priya',
        lastName: 'Patel',
        email: 'priya.patel@healthcare.com',
        phone: '+91-87654-32109',
        company: 'Healthcare Solutions',
        position: 'Marketing Manager',
        industry: 'Healthcare',
        location: 'Delhi, India',
        profileUrl: 'https://linkedin.com/in/priya-patel',
        leadScore: 78
      }
    ];

    console.log('📥 Inserting mock leads...');
    
    // Insert leads
    for (const lead of mockLeads) {
      await pool.execute(
        `INSERT INTO linkedin_leads 
         (linkedin_id, first_name, last_name, email, phone, company, position, industry, location, profile_url, lead_score) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE 
         first_name = ?, last_name = ?, email = ?, phone = ?, company = ?, position = ?, industry = ?, location = ?, profile_url = ?, lead_score = ?`,
        [
          lead.id, lead.firstName, lead.lastName, lead.email, lead.phone, 
          lead.company, lead.position, lead.industry, lead.location, lead.profileUrl, lead.leadScore,
          lead.firstName, lead.lastName, lead.email, lead.phone, 
          lead.company, lead.position, lead.industry, lead.location, lead.profileUrl, lead.leadScore
        ]
      );
    }

    // Update sync timestamp
    await pool.execute(
      'UPDATE linkedin_integrations SET last_sync = NOW(), total_leads = (SELECT COUNT(*) FROM linkedin_leads) WHERE access_token = ?',
      ['demo_token_123']
    );

    // Check results
    const [leads] = await pool.execute('SELECT * FROM linkedin_leads');
    console.log('✅ Success! Total leads:', leads.length);
    console.log('📋 Leads:', leads.map(l => `${l.first_name} ${l.last_name} - ${l.company}`));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

quickTest(); 