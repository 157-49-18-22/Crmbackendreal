import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function testProductionDB() {
  let connection;
  try {
    console.log('Testing production database connection...');
    console.log('Environment variables:');
    console.log('DB_HOST:', process.env.DB_HOST);
    console.log('DB_USER:', process.env.DB_USER);
    console.log('DB_NAME:', process.env.DB_NAME);
    console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '[HIDDEN]' : 'NOT SET');
    
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
      console.error('❌ Missing required environment variables!');
      console.error('Please set DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME');
      return;
    }

    // Test connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('✅ Database connection successful!');

    // Check if required tables exist
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('Available tables:', tables.map(t => Object.values(t)[0]));

    // Check pipelines table
    try {
      const [pipelines] = await connection.execute('SELECT COUNT(*) as count FROM pipelines');
      console.log('✅ Pipelines table exists with', pipelines[0].count, 'records');
    } catch (error) {
      console.error('❌ Pipelines table missing or error:', error.message);
    }

    // Check pipeline_stages table
    try {
      const [stages] = await connection.execute('SELECT COUNT(*) as count FROM pipeline_stages');
      console.log('✅ Pipeline stages table exists with', stages[0].count, 'records');
    } catch (error) {
      console.error('❌ Pipeline stages table missing or error:', error.message);
    }

    // Check users table
    try {
      const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
      console.log('✅ Users table exists with', users[0].count, 'records');
    } catch (error) {
      console.error('❌ Users table missing or error:', error.message);
    }

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testProductionDB();
