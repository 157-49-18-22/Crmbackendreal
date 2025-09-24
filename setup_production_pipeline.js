import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function setupProductionPipeline() {
  let connection;
  try {
    console.log('Setting up production pipeline tables...');
    
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
      console.error('❌ Missing required environment variables!');
      console.error('Please set DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME');
      return;
    }

    // Connect to database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('✅ Connected to production database');

    // Create pipelines table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS pipelines (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL DEFAULT 'Sales Pipeline',
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        is_default BOOLEAN DEFAULT FALSE,
        created_by INT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Pipelines table created/verified');

    // Create pipeline_stages table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS pipeline_stages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pipeline_id INT NOT NULL,
        stage_key VARCHAR(100) NOT NULL,
        stage_name VARCHAR(255) NOT NULL,
        stage_order INT NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        is_custom BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE,
        UNIQUE KEY unique_stage_order (pipeline_id, stage_order)
      )
    `);
    console.log('✅ Pipeline stages table created/verified');

    // Create pipeline_hints table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS pipeline_hints (
        id INT AUTO_INCREMENT PRIMARY KEY,
        stage_id INT NOT NULL,
        hint_type ENUM('beginner', 'intermediate', 'expert') NOT NULL,
        hint_text TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (stage_id) REFERENCES pipeline_stages(id) ON DELETE CASCADE,
        UNIQUE KEY unique_stage_hint (stage_id, hint_type)
      )
    `);
    console.log('✅ Pipeline hints table created/verified');

    // Check if default pipeline exists
    const [pipelines] = await connection.execute('SELECT id FROM pipelines WHERE is_default = TRUE LIMIT 1');
    
    if (pipelines.length === 0) {
      console.log('Creating default pipeline...');
      
      // Insert default pipeline
      const [result] = await connection.execute(`
        INSERT INTO pipelines (name, description, is_default, created_by) VALUES 
        ('Sales Pipeline', 'Default sales pipeline for lead management', TRUE, 1)
      `);
      
      const pipelineId = result.insertId;
      console.log('✅ Default pipeline created with ID:', pipelineId);

      // Insert default stages
      const defaultStages = [
        { key: 'initialContact', name: 'Initial Contact', order: 1, isDefault: true },
        { key: 'discussions', name: 'Discussions', order: 2, isDefault: true },
        { key: 'decisionMaking', name: 'Decision Making', order: 3, isDefault: true },
        { key: 'contractDiscussion', name: 'Contract Discussion', order: 4, isDefault: true },
        { key: 'closedWon', name: 'Deal - won', order: 5, isDefault: true },
        { key: 'closedLost', name: 'Deal - lost', order: 6, isDefault: true }
      ];

      for (const stage of defaultStages) {
        await connection.execute(`
          INSERT INTO pipeline_stages (pipeline_id, stage_key, stage_name, stage_order, is_default) VALUES
          (?, ?, ?, ?, ?)
        `, [pipelineId, stage.key, stage.name, stage.order, stage.isDefault]);
      }
      
      console.log('✅ Default pipeline stages created');
    } else {
      console.log('✅ Default pipeline already exists');
    }

    console.log('🎉 Production pipeline setup completed successfully!');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupProductionPipeline();
