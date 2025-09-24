import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

async function setupDatabase() {
  let connection;
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'gullygang123!',
      database: 'crm'
    });

    console.log('Connected to database');

    // Read and execute setup_permissions.sql
    const permissionsSQL = fs.readFileSync('setup_permissions.sql', 'utf8');
    const statements = permissionsSQL.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.execute(statement);
          console.log('Executed:', statement.substring(0, 50) + '...');
        } catch (error) {
          if (!error.message.includes('already exists')) {
            console.error('Error executing statement:', error.message);
          }
        }
      }
    }

    console.log('Database setup completed successfully');
  } catch (error) {
    console.error('Setup error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase(); 