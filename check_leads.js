import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'crm'
});

try {
  const [rows] = await pool.execute(
    'SELECT name, contact_email FROM leads WHERE contact_email IS NOT NULL AND contact_email != "" ORDER BY name'
  );
  
  console.log('Real leads with emails:');
  console.log('=======================');
  
  if (rows.length === 0) {
    console.log('No leads with emails found in database');
  } else {
    rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.name}: ${row.contact_email}`);
    });
  }
  
  console.log(`\nTotal: ${rows.length} leads with emails`);
  
} catch (error) {
  console.error('Database error:', error);
} finally {
  process.exit();
} 