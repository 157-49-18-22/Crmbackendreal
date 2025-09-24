import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

export const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log('Auth middleware: No token provided');
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    console.log('Auth middleware: Token received, length:', token.length);
    console.log('JWT_SECRET from env in auth:', process.env.JWT_SECRET);
    
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET not found in environment variables');
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Auth middleware: Token verified successfully, userId:', decoded.userId);
      
      const [users] = await pool.execute(
        'SELECT id, name, email, role, avatar, isActive FROM users WHERE id = ?',
        [decoded.userId]
      );
      
      if (users.length === 0) {
        console.log('Auth middleware: User not found in database');
        return res.status(401).json({ message: 'Token is not valid' });
      }

      req.user = users[0];
      console.log('Auth middleware: User authenticated successfully:', users[0].email);
      next();
    } catch (jwtError) {
      console.error('Auth middleware: JWT verification failed:', jwtError.message);
      console.error('JWT error details:', jwtError);
      return res.status(401).json({ message: 'Token is not valid' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

export const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
      }
      next();
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
}; 