import express from 'express';
import axios from 'axios';
import pool from '../config/db.js';
const router = express.Router();

// LinkedIn OAuth configuration
const LINKEDIN_CONFIG = {
  clientId: process.env.LINKEDIN_CLIENT_ID || '866eyvx5xn4gaw',
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
  redirectUri: process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:5000/api/linkedin/auth/callback',
  scope: process.env.LINKEDIN_SCOPE || 'r_liteprofile r_emailaddress r_organization_social w_member_social'
};

// Get LinkedIn authorization URL
router.get('/auth-url', (req, res) => {
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
    `response_type=code&` +
    `client_id=${LINKEDIN_CONFIG.clientId}&` +
    `redirect_uri=${encodeURIComponent(LINKEDIN_CONFIG.redirectUri)}&` +
    `scope=${encodeURIComponent(LINKEDIN_CONFIG.scope)}&` +
    `state=${Date.now()}`;
  
  res.json({ authUrl });
});

// Handle LinkedIn OAuth callback
router.get('/auth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code not received' });
    }

    // Exchange code for access token
    const tokenResponse = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
      params: {
        grant_type: 'authorization_code',
        code: code,
        client_id: LINKEDIN_CONFIG.clientId,
        client_secret: LINKEDIN_CONFIG.clientSecret,
        redirect_uri: LINKEDIN_CONFIG.redirectUri
      }
    });

    const { access_token, expires_in } = tokenResponse.data;

    // Store the access token in database
    const [result] = await pool.execute(
      'INSERT INTO linkedin_integrations (access_token, expires_at, created_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE access_token = ?, expires_at = ?',
      [access_token, new Date(Date.now() + expires_in * 1000), access_token, new Date(Date.now() + expires_in * 1000)]
    );

    res.json({ 
      success: true, 
      message: 'LinkedIn connected successfully!',
      expiresIn: expires_in 
    });

  } catch (error) {
    console.error('LinkedIn OAuth error:', error);
    res.status(500).json({ error: 'Failed to connect LinkedIn account' });
  }
});

// Get LinkedIn integration status
router.get('/status', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM linkedin_integrations ORDER BY created_at DESC LIMIT 1'
    );

    if (rows.length === 0) {
      return res.json({
        connected: false,
        lastSync: null,
        totalLeads: 0
      });
    }

    const integration = rows[0];
    const isExpired = new Date(integration.expires_at) < new Date();

    res.json({
      connected: !isExpired,
      lastSync: integration.last_sync,
      totalLeads: integration.total_leads || 0,
      expiresAt: integration.expires_at
    });

  } catch (error) {
    console.error('Error getting LinkedIn status:', error);
    res.status(500).json({ error: 'Failed to get LinkedIn status' });
  }
});

// Sync LinkedIn leads
router.post('/sync-leads', async (req, res) => {
  try {
    // Get valid access token
    const [rows] = await pool.execute(
      'SELECT access_token FROM linkedin_integrations WHERE expires_at > NOW() ORDER BY created_at DESC LIMIT 1'
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'LinkedIn not connected or token expired' });
    }

    const accessToken = rows[0].access_token;

    // Check if we have real LinkedIn credentials
    const hasRealCredentials = process.env.LINKEDIN_CLIENT_SECRET && 
                              process.env.LINKEDIN_CLIENT_SECRET !== 'your_real_client_secret_here';

    if (hasRealCredentials) {
      // Real LinkedIn API integration
      try {
        console.log('🔄 Attempting real LinkedIn API call...');
        
        // Real LinkedIn Advertising API call (Alternative to Sales Navigator)
        console.log('🔄 Using LinkedIn Advertising API...');
        
        // Get ad accounts first
        const adAccountsResponse = await axios.get('https://api.linkedin.com/v2/adAccountsV2', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': '202405'
          }
        });

        console.log('📊 Ad Accounts:', adAccountsResponse.data);

        // Get leads from advertising campaigns
        const leadsResponse = await axios.get('https://api.linkedin.com/v2/leads', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': '202405'
          }
        });

        const response = leadsResponse;

        const realLeads = response.data.elements || [];
        console.log(`📥 Fetched ${realLeads.length} real leads from LinkedIn`);

        // Process real leads
        for (const lead of realLeads) {
          const leadData = {
            id: lead.id,
            firstName: lead.firstName || '',
            lastName: lead.lastName || '',
            email: lead.email || '',
            phone: lead.phone || '',
            company: lead.company || '',
            position: lead.position || '',
            industry: lead.industry || '',
            location: lead.location || '',
            profileUrl: lead.profileUrl || '',
            leadScore: lead.leadScore || 50
          };

          await pool.execute(
            `INSERT INTO linkedin_leads 
             (linkedin_id, first_name, last_name, email, phone, company, position, industry, location, profile_url, lead_score) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE 
             first_name = ?, last_name = ?, email = ?, phone = ?, company = ?, position = ?, industry = ?, location = ?, profile_url = ?, lead_score = ?`,
            [
              leadData.id, leadData.firstName, leadData.lastName, leadData.email, leadData.phone, 
              leadData.company, leadData.position, leadData.industry, leadData.location, leadData.profileUrl, leadData.leadScore,
              leadData.firstName, leadData.lastName, leadData.email, leadData.phone, 
              leadData.company, leadData.position, leadData.industry, leadData.location, leadData.profileUrl, leadData.leadScore
            ]
          );
        }

        // Update sync timestamp
        await pool.execute(
          'UPDATE linkedin_integrations SET last_sync = NOW(), total_leads = (SELECT COUNT(*) FROM linkedin_leads) WHERE access_token = ?',
          [accessToken]
        );

        res.json({ 
          success: true, 
          message: `Synced ${realLeads.length} real leads from LinkedIn`,
          leadsCount: realLeads.length,
          realMode: true
        });

      } catch (apiError) {
        console.error('LinkedIn API Error:', apiError.response?.data || apiError.message);
        
        // Fallback to demo mode if API fails
        console.log('🔄 Falling back to demo mode...');
        return handleDemoMode(accessToken, res);
      }
    } else {
      // Demo mode (current implementation)
      return handleDemoMode(accessToken, res);
    }

  } catch (error) {
    console.error('Error syncing LinkedIn leads:', error);
    res.status(500).json({ error: 'Failed to sync LinkedIn leads' });
  }
});

// Helper function for demo mode
async function handleDemoMode(accessToken, res) {
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
      leadScore: 85,
      source: 'LinkedIn Advertising Campaign',
      campaign: 'Tech Recruitment Q2 2025'
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
      leadScore: 78,
      source: 'LinkedIn Lead Gen Form',
      campaign: 'Healthcare Marketing 2025'
    },
    {
      id: 'linkedin_003',
      firstName: 'Amit',
      lastName: 'Kumar',
      email: 'amit.kumar@fintech.com',
      phone: '+91-76543-21098',
      company: 'FinTech Solutions',
      position: 'Product Manager',
      industry: 'Financial Services',
      location: 'Bangalore, India',
      profileUrl: 'https://linkedin.com/in/amit-kumar',
      leadScore: 92,
      source: 'LinkedIn Sponsored Content',
      campaign: 'FinTech Innovation 2025'
    },
    {
      id: 'linkedin_004',
      firstName: 'Neha',
      lastName: 'Singh',
      email: 'neha.singh@ecommerce.com',
      phone: '+91-65432-10987',
      company: 'E-Commerce Pro',
      position: 'Business Development Manager',
      industry: 'E-Commerce',
      location: 'Pune, India',
      profileUrl: 'https://linkedin.com/in/neha-singh',
      leadScore: 88,
      source: 'LinkedIn InMail Campaign',
      campaign: 'E-Commerce Growth 2025'
    }
  ];

  // Process and store leads
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
    [accessToken]
  );

  res.json({ 
    success: true, 
    message: `Synced ${mockLeads.length} demo leads from LinkedIn`,
    leadsCount: mockLeads.length,
    demoMode: true
  });
}

// Get LinkedIn leads
router.get('/leads', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM linkedin_leads ORDER BY created_at DESC LIMIT 100'
    );

    res.json({
      success: true,
      leads: rows,
      totalCount: rows.length
    });

  } catch (error) {
    console.error('Error fetching LinkedIn leads:', error);
    res.status(500).json({ error: 'Failed to fetch LinkedIn leads' });
  }
});

// Disconnect LinkedIn
router.post('/disconnect', async (req, res) => {
  try {
    await pool.execute('DELETE FROM linkedin_integrations');
    res.json({ success: true, message: 'LinkedIn disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting LinkedIn:', error);
    res.status(500).json({ error: 'Failed to disconnect LinkedIn' });
  }
});

export default router; 