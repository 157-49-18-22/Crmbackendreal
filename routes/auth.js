import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';

const router = express.Router();

// Generate JWT Token
const generateToken = (userId) => {
  console.log('JWT_SECRET from env:', process.env.JWT_SECRET);
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET not found in environment variables');
  }
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '30d'  // Increased from 7d to 30d
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  body('name', 'Name is required').not().isEmpty(),
  body('email', 'Please include a valid email').isEmail(),
  body('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let { name, email, password, role } = req.body;
    // Accept only allowed roles
    const allowedRoles = ['admin', 'user', 'manager', 'employee'];
    if (!role || !allowedRoles.includes(role)) {
      role = 'user';
    }

    // Check if user already exists
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const result = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, $2, $3, $4) RETURNING id',
      [name, email, hashedPassword, role]
    );

    // Get the created user
    const users = await pool.query(
      'SELECT id, name, email, role, avatar, isActive, createdAt FROM users WHERE id = ?',
      [result.rows[0].id]
    );

    const user = users.rows[0];

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      token,
      user
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', [
  body('email', 'Please include a valid email').isEmail(),
  body('password', 'Password is required').exists()
], async (req, res) => {
  console.log('Login request body:', req.body); // Debug log
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Check if user exists
    const users = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    console.log('User lookup result:', users.rows);

    if (users.rows.length === 0) {
      console.log('Invalid credentials: user not found');
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = users.rows[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match:', isMatch);
    if (!isMatch) {
      console.log('Invalid credentials: password mismatch');
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Remove password from user object
    const { password: _, ...userWithoutPassword } = user;

    // Generate token
    const token = generateToken(user.id);

    res.json({
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Login error:', error);
    
    // More specific error messages
    if (error.code === 'ECONNREFUSED') {
      return res.status(500).json({ message: 'Database connection refused. Please check database configuration.' });
    }
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      return res.status(500).json({ message: 'Database access denied. Please check credentials.' });
    }
    
    if (error.code === 'ER_BAD_DB_ERROR') {
      return res.status(500).json({ message: 'Database does not exist. Please check database name.' });
    }
    
    if (error.code === 'ENOTFOUND') {
      return res.status(500).json({ message: 'Database host not found. Please check host configuration.' });
    }
    
    res.status(500).json({ 
      message: 'Server error', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/auth/refresh
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Verify the current token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists
    const [users] = await pool.query(
      'SELECT id, name, email, role, avatar, isActive FROM users WHERE id = ?',
      [decoded.userId]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Generate new token
    const newToken = generateToken(decoded.userId);
    
    res.json({
      token: newToken,
      user: users[0]
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const [users] = await pool.query(
      'SELECT id, name, email, role, avatar, isActive, createdAt FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
  body('name', 'Name is required').not().isEmpty(),
  body('email', 'Please include a valid email').isEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { name, email, avatar } = req.body;

    // Check if email is already taken by another user
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, decoded.userId]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Update user
    await pool.query(
      'UPDATE users SET name = ?, email = ?, avatar = ? WHERE id = ?',
      [name, email, avatar || '', decoded.userId]
    );

    // Get updated user
    const [users] = await pool.query(
      'SELECT id, name, email, role, avatar, isActive, createdAt FROM users WHERE id = ?',
      [decoded.userId]
    );

    res.json(users[0]);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 
