import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/db.js';
import { auth } from '../middleware/auth.js';
import activityLogger from '../utils/activityLogger.js';

const router = express.Router();

// GET /api/leads/public - Get all leads without authentication (for WhatsApp bot)
router.get('/public', async (req, res) => {
  try {
    const [leads] = await pool.execute(
      `SELECT * FROM leads ORDER BY createdAt DESC`
    );
    res.json(leads);
  } catch (error) {
    console.error('Get public leads error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/leads/all - Get all leads without user filtering
router.get('/all', auth, async (req, res) => {
  try {
    const { page = 1, limit = 100, stage, status, search, pipeline } = req.query;
    const limitNum = parseInt(limit, 10) || 100;
    const pageNum = parseInt(page, 10) || 1;
    const offsetNum = (pageNum - 1) * limitNum;
    let where = 'WHERE 1=1';
    let params = [];
    
    if (pipeline) {
      where += ' AND pipeline = ?';
      params.push(pipeline);
    }
    if (stage) {
      where += ' AND stage = ?';
      params.push(stage);
    }
    if (status) {
      where += ' AND status = ?';
      params.push(status);
    }
    if (search) {
      where += ' AND (name LIKE ? OR contact_name LIKE ? OR company_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    const [leads] = await pool.execute(
      `SELECT * FROM leads ${where} ORDER BY createdAt DESC LIMIT ${limitNum} OFFSET ${offsetNum}`,
      params
    );
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM leads ${where}`,
      params
    );
    const total = countRows[0].total;
    res.json({
      leads,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      total
    });
  } catch (error) {
    console.error('Get all leads error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/leads - Get all leads for the authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, stage, status, search, pipeline } = req.query;
    const limitNum = parseInt(limit, 10) || 10;
    const pageNum = parseInt(page, 10) || 1;
    const offsetNum = (pageNum - 1) * limitNum;
    let where = 'WHERE assigned_to = ?';
    let params = [req.user.id];
    if (pipeline) {
      where += ' AND pipeline = ?';
      params.push(pipeline);
    }
    if (stage) {
      where += ' AND stage = ?';
      params.push(stage);
    }
    if (status) {
      where += ' AND status = ?';
      params.push(status);
    }
    if (search) {
      where += ' AND (name LIKE ? OR contact_name LIKE ? OR company_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    const [leads] = await pool.execute(
      `SELECT * FROM leads ${where} ORDER BY createdAt DESC LIMIT ${limitNum} OFFSET ${offsetNum}`,
      params
    );
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM leads ${where}`,
      params
    );
    const total = countRows[0].total;
    res.json({
      leads,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      total
    });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/leads/:id - Get lead by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const [leads] = await pool.execute(
      `SELECT * FROM leads WHERE id = ?`,
      [req.params.id]
    );
    if (leads.length === 0) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    const lead = leads[0];
    if (lead.assigned_to !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    // Get notes
    const [notes] = await pool.execute(
      `SELECT n.*, u.name as created_by_name FROM notes n LEFT JOIN users u ON n.created_by = u.id WHERE n.lead_id = ? ORDER BY n.createdAt DESC`,
      [lead.id]
    );
    lead.notes = notes;
    res.json(lead);
  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/leads - Create a new lead
router.post('/', auth, [
  body('name', 'Name is required').not().isEmpty(),
  body('stage', 'Stage is required').not().isEmpty()
], async (req, res) => {
  console.log('Create lead request body:', req.body); // Debug log
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const {
      name,
      amount = 0,
      stage,
      pipeline = 'Sales Pipeline',
      contactName = '',
      contactPhone = '',
      contactEmail = '',
      contactPosition = '',
      companyName = '',
      companyAddress = '',
      source = '',
      priority = 'medium',
      expectedCloseDate = null
    } = req.body;
    const [result] = await pool.execute(
      `INSERT INTO leads (name, amount, stage, pipeline, contact_name, contact_phone, contact_email, contact_position, company_name, company_address, assigned_to, created_by, source, priority, expected_close_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, amount, stage, pipeline, contactName, contactPhone, contactEmail, contactPosition, companyName, companyAddress, req.user.id, req.user.id, source, priority, expectedCloseDate]
    );
    const [leads] = await pool.execute(
      `SELECT * FROM leads WHERE id = ?`,
      [result.insertId]
    );
    res.status(201).json(leads[0]);
    
    // Log lead creation activity
    await activityLogger.logLeadCreated(
      req.user.id, 
      result.insertId, 
      name, 
      source || 'Manual', 
      stage
    );
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/leads/:id - Update a lead
router.put('/:id', auth, async (req, res) => {
  console.log('PUT /api/leads/:id - Request received');
  console.log('Lead ID:', req.params.id);
  console.log('Request body:', req.body);
  console.log('User:', req.user);
  
  try {
    const [leads] = await pool.execute(
      `SELECT * FROM leads WHERE id = ?`,
      [req.params.id]
    );
    if (leads.length === 0) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    const lead = leads[0];
    console.log('Current lead data:', lead);
    
    if (lead.assigned_to !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    // Only allow updating certain fields
    const fields = [
      'name', 'amount', 'stage', 'pipeline', 'contact_name', 'contact_phone', 'contact_email', 'contact_position', 'company_name', 'company_address', 'status', 'source', 'priority', 'expected_close_date', 'last_contact_date', 'assigned_to'
    ];
    
    // Handle field name mapping
    const fieldMapping = {
      'contactName': 'contact_name',
      'companyName': 'company_name',
      'contactPhone': 'contact_phone',
      'contactEmail': 'contact_email',
      'contactPosition': 'contact_position',
      'companyAddress': 'company_address',
      'assignedTo': 'assigned_to'
    };
    const updates = [];
    const params = [];
    
    // Process each field in the request body
    for (const [frontendField, value] of Object.entries(req.body)) {
      console.log(`Processing field: ${frontendField} = "${value}"`);
      
      // Map frontend field name to backend field name
      const backendField = fieldMapping[frontendField] || frontendField;
      console.log(`Mapped to backend field: ${backendField}`);
      
      // Check if this field is allowed to be updated
      if (fields.includes(backendField) && value !== undefined) {
        console.log(`Field ${backendField} is allowed and has value`);
        
        // Check if the value is actually different from the current value
        const currentValue = lead[backendField];
        console.log(`Current value: "${currentValue}", New value: "${value}"`);
        
        // Handle null/undefined current values properly
        const normalizedCurrentValue = currentValue === null || currentValue === undefined ? '' : String(currentValue);
        const normalizedNewValue = value === null || value === undefined ? '' : String(value);
        
        if (normalizedCurrentValue !== normalizedNewValue) {
          console.log(`Values are different, adding to updates`);
          updates.push(`${backendField} = ?`);
          params.push(value);
        } else {
          console.log(`Field ${backendField} unchanged: "${currentValue}" -> "${value}"`);
        }
      } else {
        console.log(`Field ${backendField} not allowed or has no value. Allowed: ${fields.includes(backendField)}, Value: ${value}`);
      }
    }
    if (updates.length === 0) {
      console.log('No valid fields to update. Received:', req.body);
      console.log('Allowed fields:', fields);
      console.log('Current lead values:', lead);
      return res.status(400).json({ 
        message: 'No changes detected - all values are the same',
        received: req.body,
        allowedFields: fields,
        currentValues: lead
      });
    }
    console.log('Updating lead with:', { updates, params, leadId: req.params.id });
    params.push(req.params.id);
    await pool.execute(
      `UPDATE leads SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    const [updatedLeads] = await pool.execute(
      `SELECT * FROM leads WHERE id = ?`,
      [req.params.id]
    );
    res.json(updatedLeads[0]);
    
    // Log lead update activity
    if (req.body.stage && req.body.stage !== lead.stage) {
      await activityLogger.logLeadStageChanged(
        req.user.id,
        req.params.id,
        lead.name,
        lead.stage,
        req.body.stage
      );
    }
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/leads/:id/stage - Update only the stage of a lead
router.patch('/:id/stage', auth, async (req, res) => {
  const { id } = req.params;
  const { stage } = req.body;
  try {
    const [leads] = await pool.execute(
      `SELECT * FROM leads WHERE id = ?`,
      [id]
    );
    if (leads.length === 0) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    const lead = leads[0];
    if (lead.assigned_to !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    await pool.execute(
      `UPDATE leads SET stage = ? WHERE id = ?`,
      [stage, id]
    );
    
    // Log stage change activity
    await activityLogger.logLeadStageChanged(
      req.user.id,
      id,
      lead.name,
      lead.stage,
      stage
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update lead stage error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/leads/:id - Delete a lead
router.delete('/:id', auth, async (req, res) => {
  try {
    const [leads] = await pool.execute(
      `SELECT * FROM leads WHERE id = ?`,
      [req.params.id]
    );
    if (leads.length === 0) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    const lead = leads[0];
    if (lead.assigned_to !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    await pool.execute(
      `DELETE FROM leads WHERE id = ?`,
      [req.params.id]
    );
    res.json({ message: 'Lead removed' });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/leads/:id/notes - Add a note to a lead
router.post('/:id/notes', auth, [
  body('content', 'Note content is required').not().isEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const [leads] = await pool.execute(
      `SELECT * FROM leads WHERE id = ?`,
      [req.params.id]
    );
    if (leads.length === 0) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    const lead = leads[0];
    if (lead.assigned_to !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    await pool.execute(
      `INSERT INTO notes (lead_id, content, created_by) VALUES (?, ?, ?)`,
      [req.params.id, req.body.content, req.user.id]
    );
    // Return updated notes
    const [notes] = await pool.execute(
      `SELECT n.*, u.name as created_by_name FROM notes n LEFT JOIN users u ON n.created_by = u.id WHERE n.lead_id = ? ORDER BY n.createdAt DESC`,
      [req.params.id]
    );
    res.json(notes);
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/leads/:id/stage - Update lead stage
router.patch('/:id/stage', auth, [
  body('stage', 'Stage is required').not().isEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const [leads] = await pool.execute(
      `SELECT * FROM leads WHERE id = ?`,
      [req.params.id]
    );
    if (leads.length === 0) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    
    const lead = leads[0];
    if (lead.assigned_to !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const oldStage = lead.stage;
    const newStage = req.body.stage;
    
    // Update the lead stage
    await pool.execute(
      `UPDATE leads SET stage = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      [newStage, req.params.id]
    );
    
    // Log the stage change activity
    await pool.execute(
      `INSERT INTO activity_logs (user_id, object_type, object_id, object_name, event_type, event_description, value_before, value_after, impact, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'Lead',
        req.params.id,
        lead.name,
        'Stage updated',
        `Lead stage changed from ${oldStage} to ${newStage}`,
        JSON.stringify([{ type: 'Stage', value: oldStage, color: 'blue' }]),
        JSON.stringify([{ type: 'Stage', value: newStage, color: 'blue' }]),
        'positive',
        'medium'
      ]
    );
    
    res.json({ message: 'Stage updated successfully', stage: newStage });
  } catch (error) {
    console.error('Update stage error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/leads/stats/overview - Get lead statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    let where = 'WHERE assigned_to = ?';
    let params = [req.user.id];
    const [stats] = await pool.execute(
      `SELECT stage, COUNT(*) as count, SUM(amount) as totalAmount FROM leads ${where} GROUP BY stage`,
      params
    );
    const [statusStats] = await pool.execute(
      `SELECT status, COUNT(*) as count FROM leads ${where} GROUP BY status`,
      params
    );
    const [totalLeadsRow] = await pool.execute(
      `SELECT COUNT(*) as totalLeads FROM leads ${where}`,
      params
    );
    const [totalAmountRow] = await pool.execute(
      `SELECT SUM(amount) as totalAmount FROM leads ${where}`,
      params
    );
    res.json({
      stageStats: stats,
      statusStats,
      totalLeads: totalLeadsRow[0].totalLeads,
      totalAmount: totalAmountRow[0].totalAmount || 0
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/leads/stats/win-loss - Get win-loss analysis data
router.get('/stats/win-loss', auth, async (req, res) => {
  try {
    let where = 'WHERE assigned_to = ?';
    let params = [req.user.id];
    
    // Get total new leads (leads created in the last 30 days)
    const [newLeadsResult] = await pool.execute(
      `SELECT COUNT(*) as count FROM leads ${where} AND createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      params
    );
    
    // Get stage-wise analysis with entered and lost counts
    const [stageAnalysis] = await pool.execute(`
      SELECT 
        stage,
        COUNT(*) as currentLeads,
        SUM(amount) as currentAmount,
        SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as wonCount,
        SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as lostCount,
        SUM(CASE WHEN status = 'won' THEN amount ELSE 0 END) as wonAmount,
        SUM(CASE WHEN status = 'lost' THEN amount ELSE 0 END) as lostAmount
      FROM leads ${where}
      GROUP BY stage
      ORDER BY 
        CASE stage
          WHEN 'Initial contact' THEN 1
          WHEN 'Discussions' THEN 2
          WHEN 'Decision making' THEN 3
          WHEN 'Contract discussion' THEN 4
          WHEN 'Won' THEN 5
          WHEN 'Lost' THEN 6
          ELSE 7
        END
    `, params);
    
    // Get historical stage transitions (entered counts)
    const [stageTransitions] = await pool.execute(`
      SELECT 
        stage,
        COUNT(*) as enteredCount
      FROM leads ${where} AND stage IN ('Initial contact', 'Discussions', 'Decision making', 'Contract discussion', 'Won', 'Lost')
      GROUP BY stage
      ORDER BY 
        CASE stage
          WHEN 'Initial contact' THEN 1
          WHEN 'Discussions' THEN 2
          WHEN 'Decision making' THEN 3
          WHEN 'Contract discussion' THEN 4
          WHEN 'Won' THEN 5
          WHEN 'Lost' THEN 6
          ELSE 7
        END
    `, params);
    
    // Get overall win/loss summary
    const [overallStats] = await pool.execute(`
      SELECT 
        COUNT(*) as totalLeads,
        SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as totalWon,
        SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as totalLost,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as totalActive,
        SUM(amount) as totalAmount,
        SUM(CASE WHEN status = 'won' THEN amount ELSE 0 END) as totalWonAmount,
        SUM(CASE WHEN status = 'lost' THEN amount ELSE 0 END) as totalLostAmount
      FROM leads ${where}
    `, params);
    
    // Format the response
    const pipelineStages = [
      'Initial contact',
      'Discussions', 
      'Decision making',
      'Contract discussion',
      'Won',
      'Lost'
    ];
    
    const formattedStages = pipelineStages.map(stageName => {
      const stageData = stageAnalysis.find(s => s.stage === stageName) || {
        currentLeads: 0,
        currentAmount: 0,
        wonCount: 0,
        lostCount: 0,
        wonAmount: 0,
        lostAmount: 0
      };
      
      const transitionData = stageTransitions.find(s => s.stage === stageName) || { enteredCount: 0 };
      
      return {
        name: stageName,
        leads: stageData.currentLeads,
        amount: stageData.currentAmount || 0,
        summary: `${transitionData.enteredCount} entered, ${stageData.lostCount} lost`,
        highlight: stageName === 'Won',
        lostCard: stageName === 'Lost'
      };
    });
    
    res.json({
      newLeads: newLeadsResult[0].count,
      pipelineStages: formattedStages,
      overallStats: overallStats[0],
      pipelineSummary: formattedStages.map(stage => ({
        stage: stage.name,
        leads: stage.leads
      }))
    });
  } catch (error) {
    console.error('Get win-loss stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/leads/emails - Get all unique contact emails for the logged-in user
router.get('/emails', auth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT DISTINCT contact_email FROM leads WHERE contact_email IS NOT NULL AND contact_email != "" ORDER BY contact_email',
      []
    );
    const emails = rows.map(r => r.contact_email).filter(Boolean);
    res.json({ emails });
  } catch (error) {
    console.error('Get lead emails error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/leads/emails/public - Get all unique contact emails without authentication
router.get('/emails/public', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT DISTINCT contact_email FROM leads WHERE contact_email IS NOT NULL AND contact_email != "" ORDER BY contact_email',
      []
    );
    const emails = rows.map(r => r.contact_email).filter(Boolean);
    res.json({ emails });
  } catch (error) {
    console.error('Get public lead emails error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 