import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/db.js';
import { auth, adminAuth } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// GET /api/users - Get all users (admin only)
router.get('/', adminAuth, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, name, email, role, avatar, isActive, createdAt FROM users'
    );
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/users/employees - Get all employees and managers (admin only)
router.get('/employees', adminAuth, async (req, res) => {
  try {
    const [employees] = await pool.execute(
      'SELECT id, name, email, role, avatar, isActive, createdAt FROM users WHERE role IN ("employee", "manager") ORDER BY createdAt DESC'
    );
    res.json(employees);
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/users/employees - Create new employee or manager (admin only)
router.post('/employees', adminAuth, [
  body('name', 'Name is required').not().isEmpty(),
  body('email', 'Please include a valid email').isEmail(),
  body('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
  body('role', 'Role must be either employee or manager').isIn(['employee', 'manager'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role } = req.body;

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user with specified role
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, role]
    );

    // Get the created user
    const [users] = await pool.execute(
      'SELECT id, name, email, role, avatar, isActive, createdAt FROM users WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} created successfully`,
      user: users[0]
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/users/:id - Get user by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, name, email, role, avatar, isActive, createdAt FROM users WHERE id = ?',
      [req.params.id]
    );
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Users can only view their own profile unless they're admin
    if (req.user.id !== Number(req.params.id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(users[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/users/:id - Update user (admin only or own profile)
router.put('/:id', auth, [
  body('name', 'Name is required').not().isEmpty(),
  body('email', 'Please include a valid email').isEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Users can only update their own profile unless they're admin
    if (req.user.id !== Number(req.params.id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { name, email, role, isActive } = req.body;
    const updates = ['name = ?', 'email = ?'];
    const params = [name, email];
    // Only admins can update role and isActive
    if (req.user.role === 'admin') {
      if (role) {
        updates.push('role = ?');
        params.push(role);
      }
      if (typeof isActive === 'boolean') {
        updates.push('isActive = ?');
        params.push(isActive);
      }
    }
    params.push(req.params.id);
    await pool.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    const [users] = await pool.execute(
      'SELECT id, name, email, role, avatar, isActive, createdAt FROM users WHERE id = ?',
      [req.params.id]
    );
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(users[0]);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/users/:id - Delete user (admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE id = ?',
      [req.params.id]
    );
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Prevent admin from deleting themselves
    if (req.user.id === Number(req.params.id)) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    await pool.execute(
      'DELETE FROM users WHERE id = ?',
      [req.params.id]
    );
    res.json({ message: 'User removed' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 