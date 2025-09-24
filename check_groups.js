import pool from './config/db.js';

async function checkGroups() {
  try {
    console.log('Checking existing groups...');
    
    const [groups] = await pool.execute('SELECT * FROM `groups`');
    console.log('All groups:', groups);
    
    const [members] = await pool.execute('SELECT * FROM group_members');
    console.log('All group members:', members);
    
  } catch (error) {
    console.error('Error checking groups:', error);
  } finally {
    await pool.end();
  }
}

checkGroups(); 