import express from 'express';
import mysql from 'mysql2/promise';
import db from '../config/db.js';

const router = express.Router();

// Get all invoices with optional filtering
router.get('/', async (req, res) => {
  try {
    console.log('🔍 Fetching invoices...');
    
    const query = `
      SELECT 
        i.*,
        '[]' as activities,
        '[]' as tasks,
        '[]' as payment_history,
        '[]' as files
      FROM invoices i
      ORDER BY i.created_at DESC
    `;
    
    console.log('Query:', query);
    
    const [invoices] = await db.execute(query);
    console.log('✅ Found invoices:', invoices.length);
    
    res.json({
      success: true,
      data: invoices,
      pagination: {
        page: 1,
        limit: 10,
        total: invoices.length,
        pages: 1
      }
    });

  } catch (error) {
    console.error('❌ Error fetching invoices:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching invoices',
      error: error.message 
    });
  }
});

// Get single invoice by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [invoices] = await db.execute(`
      SELECT 
        i.*,
        '[]' as activities,
        '[]' as tasks,
        '[]' as payment_history,
        '[]' as files
      FROM invoices i
      WHERE i.id = ? OR i.invoice_id = ?
    `, [id, id]);

    if (invoices.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    res.json({ success: true, data: invoices[0] });

  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ success: false, message: 'Error fetching invoice' });
  }
});

// Create new invoice
router.post('/', async (req, res) => {
  try {
    const {
      invoice_id,
      client_name,
      client_email,
      total,
      status = 'Draft',
      due_date,
      description,
      assigned_to,
      priority = 'Medium',
      tags = '[]',
      pipeline = 'Default',
      stage = 'New'
    } = req.body;

    const [result] = await db.execute(`
      INSERT INTO invoices (
        invoice_id, client_name, client_email, client_address, client_phone, 
        date, due_date, status, line_items, total, notes, 
        pipeline, stage, assigned_to, priority, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      invoice_id, client_name, client_email, '', '', 
      new Date().toISOString().split('T')[0], due_date, status, 
      JSON.stringify([]), total, description || '',
      pipeline, stage, assigned_to, priority, tags
    ]);

    res.status(201).json({
      success: true,
      data: { id: result.insertId, ...req.body }
    });

  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ success: false, message: 'Error creating invoice' });
  }
});

// Update invoice
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      invoice_id,
      client_name,
      client_email,
      total,
      status,
      due_date,
      description,
      assigned_to,
      priority,
      pipeline,
      stage
    } = req.body;

    console.log('Updating invoice ID:', id, 'with data:', req.body);

    const [result] = await db.execute(`
      UPDATE invoices 
      SET 
        invoice_id = ?,
        client_name = ?,
        client_email = ?,
        total = ?,
        status = ?,
        due_date = ?,
        notes = ?,
        assigned_to = ?,
        priority = ?,
        pipeline = ?,
        stage = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [
      invoice_id, client_name, client_email, total, status,
      due_date, description, assigned_to, priority, pipeline, stage, id
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    console.log('Invoice updated successfully, affected rows:', result.affectedRows);
    res.json({ success: true, message: 'Invoice updated successfully' });

  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ success: false, message: 'Error updating invoice: ' + error.message });
  }
});

// Delete invoice
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.execute('DELETE FROM invoices WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    res.json({ success: true, message: 'Invoice deleted successfully' });

  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ success: false, message: 'Error deleting invoice' });
  }
});

// Mark invoice as paid
router.patch('/:id/mark-paid', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.execute(`
      UPDATE invoices 
      SET status = 'Paid', updated_at = NOW() 
      WHERE id = ?
    `, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    res.json({ success: true, message: 'Invoice marked as paid' });

  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    res.status(500).json({ success: false, message: 'Error marking invoice as paid' });
  }
});

// Get invoice statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const [stats] = await db.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Paid' THEN 1 ELSE 0 END) as paid,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'Overdue' THEN 1 ELSE 0 END) as overdue,
        SUM(CASE WHEN status = 'Draft' THEN 1 ELSE 0 END) as draft,
        SUM(amount) as total_amount
      FROM invoices
    `);

    res.json({ success: true, data: stats[0] });

  } catch (error) {
    console.error('Error fetching invoice stats:', error);
    res.status(500).json({ success: false, message: 'Error fetching invoice stats' });
  }
});

export default router; 