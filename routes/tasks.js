import express from 'express';
import pool from '../config/db.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/tasks - fetch all tasks for the authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const [tasks] = await pool.execute(`
      SELECT t.*, u.name as assigned_user_name, u.email as assigned_user_email, 
             a.name as assigned_by_name, a.email as assigned_by_email
      FROM tasks t 
      LEFT JOIN users u ON t.user_id = u.id 
      LEFT JOIN users a ON t.assigned_by = a.id
      WHERE t.user_id = ? 
      ORDER BY t.due_date ASC, t.createdAt DESC
    `, [req.user.id]);
    res.json({ tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/tasks/all - fetch all tasks without user filtering
router.get('/all', auth, async (req, res) => {
  try {
    const [tasks] = await pool.execute('SELECT * FROM tasks ORDER BY due_date ASC, createdAt DESC');
    res.json({ tasks });
  } catch (error) {
    console.error('Get all tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/tasks - create a new task
router.post('/', auth, async (req, res) => {
  try {
    console.log('Task creation request:', req.body);
    console.log('Current user:', req.user);
    
    const { title, description, due_date, type, assigned_to } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });
    
    // If assigned_to is provided, verify the user exists and has appropriate role
    let userId = req.user.id;
    if (assigned_to && req.user.role === 'admin') {
      // Admin can assign tasks to any user
      const [users] = await pool.execute('SELECT id, role FROM users WHERE id = ?', [assigned_to]);
      if (users.length === 0) {
        return res.status(400).json({ message: 'Assigned user not found' });
      }
      userId = assigned_to;
    } else if (assigned_to && req.user.role === 'manager') {
      // Manager can assign tasks to employees
      const [users] = await pool.execute('SELECT id, role FROM users WHERE id = ? AND role = "employee"', [assigned_to]);
      if (users.length === 0) {
        return res.status(400).json({ message: 'Can only assign tasks to employees' });
      }
      userId = assigned_to;
    }
    
    console.log('Inserting task with userId:', userId);
    
    const [result] = await pool.execute(
      'INSERT INTO tasks (title, description, due_date, user_id, type, assigned_by) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description || '', due_date || null, userId, type || 'Follow up', req.user.id]
    );
    
    console.log('Task inserted with ID:', result.insertId);
    
    // Return the created task with user details
    const [newTask] = await pool.execute(`
      SELECT t.*, u.name as assigned_user_name, u.email as assigned_user_email 
      FROM tasks t 
      LEFT JOIN users u ON t.user_id = u.id 
      WHERE t.id = ?
    `, [result.insertId]);
    res.status(201).json(newTask[0]);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/tasks/assignable-users - get users that can be assigned tasks
router.get('/assignable-users', auth, async (req, res) => {
  try {
    console.log('Getting assignable users for user:', req.user);
    
    let query = 'SELECT id, name, email, role FROM users WHERE (isActive = 1 OR isActive IS NULL)';
    let params = [];
    
    if (req.user.role === 'admin') {
      // Admin can assign to managers and employees except themselves
      query += ' AND role IN ("manager", "employee") AND id != ?';
      params.push(req.user.id);
    } else if (req.user.role === 'manager') {
      // Manager can assign to employees only
      query += ' AND role = "employee" AND id != ?';
      params.push(req.user.id);
    } else {
      // Employees cannot assign tasks
      return res.status(403).json({ message: 'Access denied' });
    }
    
    query += ' ORDER BY role ASC, name ASC';
    console.log('Query:', query);
    console.log('Params:', params);
    
    const [users] = await pool.execute(query, params);
    console.log('Found users:', users);
    res.json(users);
  } catch (error) {
    console.error('Get assignable users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/tasks/calendar/:userId - get tasks for a specific user's calendar
router.get('/calendar/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user has permission to view this calendar
    if (req.user.role === 'employee' && req.user.id != userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Admin and managers can view any user's calendar
    // Employees can only view their own calendar
    const [tasks] = await pool.execute(`
      SELECT t.*, u.name as assigned_user_name, u.email as assigned_user_email,
             a.name as assigned_by_name, a.email as assigned_by_email
      FROM tasks t 
      LEFT JOIN users u ON t.user_id = u.id 
      LEFT JOIN users a ON t.assigned_by = a.id
      WHERE t.user_id = ? 
      ORDER BY t.due_date ASC, t.createdAt DESC
    `, [userId]);
    
    res.json({ tasks });
  } catch (error) {
    console.error('Get calendar tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/tasks/:id/status - update task status
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['pending', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    // Check if user owns this task or is admin/manager
    const [task] = await pool.execute('SELECT user_id FROM tasks WHERE id = ?', [id]);
    if (task.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    if (req.user.role === 'employee' && task[0].user_id != req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    await pool.execute('UPDATE tasks SET status = ?, updatedAt = NOW() WHERE id = ?', [status, id]);
    
    res.json({ message: 'Task status updated successfully' });
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/tasks/:id - delete a task
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user owns this task or is admin/manager
    const [task] = await pool.execute('SELECT user_id, assigned_by FROM tasks WHERE id = ?', [id]);
    if (task.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    if (req.user.role === 'employee' && task[0].user_id != req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Only admin, manager, or the person who assigned the task can delete it
    if (req.user.role === 'employee' && task[0].assigned_by != req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    await pool.execute('DELETE FROM tasks WHERE id = ?', [id]);
    
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 