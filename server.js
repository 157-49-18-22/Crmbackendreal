import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';
import authRoutes from './routes/auth.js';
import leadRoutes from './routes/leads.js';
import userRoutes from './routes/users.js';
import pipelineRoutes from './routes/pipeline.js';
import tasksRoutes from './routes/tasks.js';
import mailRoutes from './routes/mail.js';
import activityLogRoutes from './routes/activityLogs.js';
import adminRoutes from './routes/admin.js';
import linkedinRoutes from './routes/linkedin.js';
import invoiceRoutes from './routes/invoices.js';
import groupRoutes from './routes/groups.js';

// Load environment variables
dotenv.config();

// Debug environment variables
console.log('Environment variables loaded:');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
console.log('DB_HOST:', process.env.DB_HOST || 'localhost');
console.log('PORT:', process.env.PORT || 5000);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: true, // Allow all origins temporarily for testing
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test database connection
pool.query('SELECT NOW()')
  .then(result => {
    console.log('Connected to PostgreSQL Database');
    console.log('Database time:', result.rows[0].now);
  })
  .catch(err => {
    console.error('PostgreSQL connection error:', err);
    console.log('Please make sure PostgreSQL is running and database exists');
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/pipeline', pipelineRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/mail', mailRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/linkedin', linkedinRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/groups', groupRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ message: 'CRM Backend is running!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 
