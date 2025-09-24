import express from 'express';
import pool from '../config/db.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Test endpoint without authentication
router.get('/test', async (req, res) => {
  try {
    const [activities] = await pool.execute('SELECT COUNT(*) as count FROM activity_logs');
    res.json({ 
      message: 'Activity logs test successful', 
      count: activities[0].count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ message: 'Test failed', error: error.message });
  }
});

// Simple test endpoint for POST
router.post('/test', async (req, res) => {
  try {
    res.json({ 
      message: 'POST test successful',
      received: req.body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST test error:', error);
    res.status(500).json({ message: 'POST test failed', error: error.message });
  }
});

// Test database connection and table structure
router.get('/test-db', async (req, res) => {
  try {
    // Test if table exists
    const [tables] = await pool.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'activity_logs'
    `);
    
    if (tables.length === 0) {
      return res.json({ 
        message: 'Activity logs table does not exist',
        tables: tables
      });
    }
    
    // Test table structure
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'activity_logs'
      ORDER BY ORDINAL_POSITION
    `);
    
    res.json({ 
      message: 'Activity logs table exists',
      tableExists: true,
      columns: columns
    });
    
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({ 
      message: 'Database test failed', 
      error: error.message 
    });
  }
});

// Get all activity logs with optional filtering
router.get('/', auth, async (req, res) => {
  try {
    console.log('Activity logs request received');
    
    const { leadId } = req.query;
    
    let query = `
      SELECT 
        al.id,
        al.created_at as timestamp,
        u.name as user,
        al.object_type as objectType,
        al.object_name as objectName,
        al.event_type as event,
        al.event_description as action,
        al.value_before,
        al.value_after,
        al.impact,
        al.priority
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
    `;
    
    let params = [];
    
    // Add leadId filter if provided
    if (leadId) {
      query += ` WHERE al.object_id = ?`;
      params.push(leadId);
    }
    
    query += ` ORDER BY al.created_at DESC LIMIT 50`;

    const [activities] = await pool.execute(query, params);

    console.log('Query executed successfully, found', activities.length, 'activities');

    // Format activities for frontend
    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      timestamp: new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      action: activity.action,
      type: activity.event,
      details: {
        changedBy: activity.user || 'Unknown',
        ...JSON.parse(activity.valueBefore || '{}')
      }
    }));

    res.json({
      activityLogs: formattedActivities,
      total: activities.length
    });

  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ message: 'Error fetching activity logs', error: error.message });
  }
});

// Create new activity log (temporarily without auth for testing)
router.post('/', async (req, res) => {
  try {
    console.log('Activity log request body:', req.body);
    console.log('User from auth:', req.user);
    
    // Handle both old and new format
    let objectType, objectId, objectName, eventType, eventDescription, valueBefore, valueAfter, impact, priority;
    
    // Simplified format handling
    objectType = req.body.leadId ? 'lead' : (req.body.objectType || 'lead');
    objectId = req.body.leadId || req.body.objectId || '1';
    objectName = req.body.action || req.body.objectName || 'Lead activity';
    eventType = req.body.type || req.body.eventType || 'general';
    eventDescription = req.body.action || req.body.eventDescription || 'Lead activity';
    valueBefore = req.body.details || req.body.valueBefore || {};
    valueAfter = req.body.details || req.body.valueAfter || {};
    impact = req.body.impact || 'neutral';
    priority = req.body.priority || 'medium';

    // Ensure all required fields have values
    objectType = objectType || 'lead';
    objectId = objectId || '1';
    objectName = objectName || 'Lead activity';
    eventType = eventType || 'general';
    eventDescription = eventDescription || 'Lead activity';

    // Use default user ID if not authenticated (for testing)
    const userId = req.user?.id || 1;

    const query = `
      INSERT INTO activity_logs 
      (user_id, object_type, object_id, object_name, event_type, event_description, value_before, value_after, impact, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      userId,
      objectType,
      objectId,
      objectName,
      eventType,
      eventDescription,
      JSON.stringify(valueBefore),
      JSON.stringify(valueAfter),
      impact,
      priority
    ];

    console.log('Executing query with params:', params);

    const [result] = await pool.execute(query, params);

    console.log('Activity log created successfully with ID:', result.insertId);

    res.status(201).json({
      message: 'Activity log created successfully',
      id: result.insertId
    });

  } catch (error) {
    console.error('Error creating activity log:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    res.status(500).json({ 
      message: 'Error creating activity log', 
      error: error.message,
      details: {
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      }
    });
  }
});

// Get activity log by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        al.id,
        al.created_at as date,
        u.name as user,
        al.object_type as objectType,
        al.object_name as objectName,
        al.event_type as event,
        al.event_description as description,
        al.value_before,
        al.value_after,
        al.impact,
        al.priority
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.id = ?
    `;

    const [activities] = await pool.execute(query, [id]);

    if (activities.length === 0) {
      return res.status(404).json({ message: 'Activity log not found' });
    }

    const activity = activities[0];
    activity.valueBefore = JSON.parse(activity.valueBefore || '[]');
    activity.valueAfter = JSON.parse(activity.valueAfter || '[]');

    res.json(activity);

  } catch (error) {
    console.error('Error fetching activity log:', error);
    res.status(500).json({ message: 'Error fetching activity log' });
  }
});

// Delete activity log (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const [result] = await pool.execute('DELETE FROM activity_logs WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Activity log not found' });
    }

    res.json({ message: 'Activity log deleted successfully' });

  } catch (error) {
    console.error('Error deleting activity log:', error);
    res.status(500).json({ message: 'Error deleting activity log' });
  }
});

export default router; 