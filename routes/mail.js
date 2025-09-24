import express from 'express';
import nodemailer from 'nodemailer';
import db from '../config/db.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/mail/inbox - Get user's inbox emails
router.get('/inbox', auth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM emails WHERE user_id = ? AND type = "inbox" ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ emails: rows });
  } catch (error) {
    console.error('Get inbox error:', error);
    res.status(500).json({ message: 'Failed to fetch inbox emails.' });
  }
});

// GET /api/mail/sent - Get user's sent emails
router.get('/sent', auth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM emails WHERE user_id = ? AND type = "sent" ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ emails: rows });
  } catch (error) {
    console.error('Get sent emails error:', error);
    res.status(500).json({ message: 'Failed to fetch sent emails.' });
  }
});

// GET /api/mail/trash - Get user's trash emails (last 14 days)
router.get('/trash', auth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM emails WHERE user_id = ? AND type = "trash" AND deleted_at >= DATE_SUB(NOW(), INTERVAL 14 DAY) ORDER BY deleted_at DESC',
      [req.user.id]
    );
    res.json({ emails: rows });
  } catch (error) {
    console.error('Get trash emails error:', error);
    res.status(500).json({ message: 'Failed to fetch trash emails.' });
  }
});

// POST /api/mail/send - Send an email and save to database
router.post('/send', auth, async (req, res) => {
  const { to, subject, message } = req.body;
  if (!to || !subject || !message) {
    return res.status(400).json({ message: 'To, subject, and message are required.' });
  }
  
  try {
    // Use Gmail SMTP configuration from environment variables
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || 'maydivinfotech@gmail.com',
        pass: process.env.SMTP_PASS || 'djvd kzaf pzxb czwp',
      },
    });

    const info = await transporter.sendMail({
      from: process.env.FROM_EMAIL || 'maydivinfotech@gmail.com',
      to,
      subject,
      text: message,
      html: `<p>${message}</p>`
    });

    // Save to database
    const [result] = await db.execute(
      'INSERT INTO emails (user_id, type, from_email, from_name, to_email, to_name, subject, message) VALUES (?, "sent", ?, ?, ?, ?, ?, ?)',
      [req.user.id, process.env.FROM_EMAIL || 'maydivinfotech@gmail.com', 'Admin User', to, to.split('@')[0], subject, message]
    );

    console.log('Email sent successfully:', info.messageId);
    res.json({ 
      message: 'Email sent successfully!', 
      messageId: info.messageId,
      emailId: result.insertId,
      success: true 
    });
  } catch (error) {
    console.error('Mail send error:', error);
    res.status(500).json({ 
      message: 'Failed to send email.', 
      error: error.message,
      success: false 
    });
  }
});

// DELETE /api/mail/delete/:id - Move email to trash
router.delete('/delete/:id', auth, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if email exists and belongs to user
    const [rows] = await db.execute(
      'SELECT * FROM emails WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Email not found.' });
    }
    
    // Move email to trash instead of deleting
    await db.execute(
      'UPDATE emails SET type = "trash", deleted_at = NOW() WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    
    res.json({ message: 'Email moved to trash successfully.' });
  } catch (error) {
    console.error('Move to trash error:', error);
    res.status(500).json({ message: 'Failed to move email to trash.' });
  }
});

// DELETE /api/mail/permanent-delete/:id - Permanently delete email from trash
router.delete('/permanent-delete/:id', auth, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if email exists in trash and belongs to user
    const [rows] = await db.execute(
      'SELECT * FROM emails WHERE id = ? AND user_id = ? AND type = "trash"',
      [id, req.user.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Email not found in trash.' });
    }
    
    // Permanently delete the email
    await db.execute('DELETE FROM emails WHERE id = ? AND user_id = ? AND type = "trash"', [id, req.user.id]);
    
    res.json({ message: 'Email permanently deleted.' });
  } catch (error) {
    console.error('Permanent delete error:', error);
    res.status(500).json({ message: 'Failed to permanently delete email.' });
  }
});

// DELETE /api/mail/bulk-delete - Move multiple emails to trash
router.delete('/bulk-delete', auth, async (req, res) => {
  const { emailIds, type } = req.body;
  
  if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
    return res.status(400).json({ message: 'Email IDs are required.' });
  }
  
  try {
    if (type === 'trash') {
      // Permanently delete from trash
      const placeholders = emailIds.map(() => '?').join(',');
      const [rows] = await db.execute(
        `SELECT id FROM emails WHERE id IN (${placeholders}) AND user_id = ? AND type = "trash"`,
        [...emailIds, req.user.id]
      );
      
      if (rows.length !== emailIds.length) {
        return res.status(400).json({ message: 'Some emails not found in trash or access denied.' });
      }
      
      // Permanently delete the emails
      await db.execute(
        `DELETE FROM emails WHERE id IN (${placeholders}) AND user_id = ? AND type = "trash"`,
        [...emailIds, req.user.id]
      );
      
      res.json({ message: `${emailIds.length} email(s) permanently deleted.` });
    } else {
      // Move to trash (inbox/sent)
      const placeholders = emailIds.map(() => '?').join(',');
      const [rows] = await db.execute(
        `SELECT id FROM emails WHERE id IN (${placeholders}) AND user_id = ? AND type = ?`,
        [...emailIds, req.user.id, type]
      );
      
      if (rows.length !== emailIds.length) {
        return res.status(400).json({ message: 'Some emails not found or access denied.' });
      }
      
      // Move emails to trash
      await db.execute(
        `UPDATE emails SET type = "trash", deleted_at = NOW() WHERE id IN (${placeholders}) AND user_id = ? AND type = ?`,
        [...emailIds, req.user.id, type]
      );
      
      res.json({ message: `${emailIds.length} email(s) moved to trash successfully.` });
    }
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ message: 'Failed to delete emails.' });
  }
});

// PUT /api/mail/read/:id - Mark email as read
router.put('/read/:id', auth, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [result] = await db.execute(
      'UPDATE emails SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Email not found.' });
    }
    
    res.json({ message: 'Email marked as read.' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Failed to mark email as read.' });
  }
});

// PUT /api/mail/star/:id - Toggle star status
router.put('/star/:id', auth, async (req, res) => {
  const { id } = req.params;
  
  try {
    // First get current star status
    const [rows] = await db.execute(
      'SELECT is_starred FROM emails WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Email not found.' });
    }
    
    const newStarStatus = !rows[0].is_starred;
    
    // Update star status
    await db.execute(
      'UPDATE emails SET is_starred = ? WHERE id = ? AND user_id = ?',
      [newStarStatus, id, req.user.id]
    );
    
    res.json({ message: `Email ${newStarStatus ? 'starred' : 'unstarred'} successfully.` });
  } catch (error) {
    console.error('Toggle star error:', error);
    res.status(500).json({ message: 'Failed to toggle star status.' });
  }
});

// POST /api/mail/send-notification - Send notification to admin
router.post('/send-notification', async (req, res) => {
  const { subject, message } = req.body;
  const adminEmail = process.env.ADMIN_EMAIL || 'ravindranathjha76@gmail.com';
  
  if (!subject || !message) {
    return res.status(400).json({ message: 'Subject and message are required.' });
  }
  
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'maydivinfotech@gmail.com',
        pass: process.env.SMTP_PASS || 'djvd kzaf pzxb czwp',
      },
    });

    const info = await transporter.sendMail({
      from: process.env.FROM_EMAIL || 'maydivinfotech@gmail.com',
      to: adminEmail,
      subject: `CRM Notification: ${subject}`,
      text: message,
      html: `<p>${message}</p>`
    });

    console.log('Admin notification sent successfully:', info.messageId);
    res.json({ 
      message: 'Admin notification sent successfully!', 
      messageId: info.messageId,
      success: true 
    });
  } catch (error) {
    console.error('Admin notification error:', error);
    res.status(500).json({ 
      message: 'Failed to send admin notification.', 
      error: error.message,
      success: false 
    });
  }
});

export default router; 