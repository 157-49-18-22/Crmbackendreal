import pool from './config/db.js';
import fs from 'fs';

async function setupPermissions() {
  try {
    console.log('Setting up permissions tables...');
    
    // Create user_permissions table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS user_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        permission_name VARCHAR(100) NOT NULL,
        status ENUM('granted', 'pending', 'revoked') DEFAULT 'granted',
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        granted_by INT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (granted_by) REFERENCES users(id),
        UNIQUE KEY unique_user_permission (user_id, permission_name)
      )
    `);

    // Create activity_logs table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        action VARCHAR(100) NOT NULL,
        description TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Create advertisements table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS advertisements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        image_url VARCHAR(500),
        target_audience VARCHAR(255),
        budget DECIMAL(10,2),
        views INT DEFAULT 0,
        clicks INT DEFAULT 0,
        status ENUM('active', 'inactive', 'draft') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create packages table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS packages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        features JSON,
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create user_packages table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS user_packages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        package_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        status ENUM('active', 'expired', 'cancelled') DEFAULT 'active',
        subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE
      )
    `);

    // Create messages table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        recipient VARCHAR(255) NOT NULL,
        subject VARCHAR(255),
        content TEXT,
        type ENUM('email', 'sms', 'whatsapp') DEFAULT 'email',
        status ENUM('sent', 'delivered', 'failed') DEFAULT 'sent',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Create payments table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'INR',
        status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
        payment_method VARCHAR(50),
        transaction_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Insert sample data
    await pool.execute(`
      INSERT IGNORE INTO user_permissions (user_id, permission_name, status) VALUES
      (1, 'view_leads', 'granted'),
      (1, 'create_leads', 'granted'),
      (1, 'edit_leads', 'granted'),
      (1, 'delete_leads', 'granted'),
      (1, 'view_reports', 'granted'),
      (1, 'manage_users', 'granted'),
      (1, 'manage_packages', 'granted'),
      (1, 'manage_advertisements', 'granted'),
      (1, 'view_analytics', 'granted'),
      (1, 'export_data', 'granted'),
      (1, 'manage_settings', 'granted')
    `);

    await pool.execute(`
      INSERT IGNORE INTO activity_logs (user_id, event_type, event_description) VALUES
      (1, 'LOGIN', 'User logged in successfully'),
      (1, 'LEAD_CREATED', 'Created new lead: Test Lead'),
      (1, 'PERMISSION_UPDATED', 'Updated user permissions')
    `);

    await pool.execute(`
      INSERT IGNORE INTO advertisements (title, description, image_url, target_audience, budget, views, clicks) VALUES
      ('Summer Sale Campaign', 'Promote our summer deals with attractive discounts', 'https://via.placeholder.com/300x200', 'General audience', 5000.00, 1200, 150),
      ('New Product Launch', 'Introducing our latest product line', 'https://via.placeholder.com/300x200', 'Tech enthusiasts', 8000.00, 800, 120)
    `);

    await pool.execute(`
      INSERT IGNORE INTO packages (name, description, price, features, status) VALUES
      ('Basic', 'Essential features for small businesses', 999.00, '["Lead Management", "Basic Analytics", "Email Support"]', 'active'),
      ('Premium', 'Advanced features for growing businesses', 1999.00, '["Lead Management", "Advanced Analytics", "Priority Support", "Custom Reports"]', 'active'),
      ('Enterprise', 'Full-featured solution for large organizations', 4999.00, '["Lead Management", "Advanced Analytics", "Priority Support", "Custom Reports", "API Access", "White Label"]', 'active')
    `);

    await pool.execute(`
      INSERT IGNORE INTO user_packages (user_id, package_id, amount, status) VALUES
      (1, 1, 999.00, 'active'),
      (1, 2, 1999.00, 'active')
    `);

    await pool.execute(`
      INSERT IGNORE INTO messages (user_id, recipient, subject, content, type, status) VALUES
      (1, 'test@example.com', 'Welcome to CRM', 'Thank you for joining our CRM platform!', 'email', 'sent'),
      (1, '+1234567890', 'Lead Update', 'Your lead status has been updated', 'sms', 'delivered'),
      (1, 'bulk@example.com', 'Bulk Email Campaign', 'Special offer for all customers', 'email', 'delivered'),
      (1, '+9876543210', 'Bulk SMS Alert', 'Important announcement for all users', 'sms', 'sent'),
      (1, 'whatsapp@example.com', 'WhatsApp Campaign', 'New product launch notification', 'whatsapp', 'delivered'),
      (1, 'newsletter@example.com', 'Monthly Newsletter', 'Latest updates and news', 'email', 'sent'),
      (1, '+1111111111', 'Promotional SMS', 'Flash sale alert', 'sms', 'delivered'),
      (1, 'marketing@example.com', 'Marketing Campaign', 'Holiday season offers', 'email', 'sent'),
      (1, '+2222222222', 'Service Update', 'System maintenance notification', 'sms', 'delivered'),
      (1, 'support@example.com', 'Support Update', 'Ticket resolution notification', 'email', 'sent')
    `);

    await pool.execute(`
      INSERT IGNORE INTO payments (user_id, amount, status, payment_method, transaction_id) VALUES
      (1, 999.00, 'completed', 'credit_card', 'TXN_001'),
      (1, 1999.00, 'completed', 'bank_transfer', 'TXN_002')
    `);

    console.log('✅ Permissions tables setup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up permissions tables:', error);
    process.exit(1);
  }
}

setupPermissions(); 