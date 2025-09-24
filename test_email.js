import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

// Load environment variables
dotenv.config();

async function testEmail() {
  console.log('Testing Gmail SMTP Configuration...');
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('SMTP_PORT:', process.env.SMTP_PORT);
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('FROM_EMAIL:', process.env.FROM_EMAIL);
  console.log('ADMIN_EMAIL:', process.env.ADMIN_EMAIL);
  console.log('SMTP_PASS set:', !!process.env.SMTP_PASS);
  console.log('---');

  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'maydivinfotech@gmail.com',
        pass: process.env.SMTP_PASS || 'djvd kzaf pzxb czwp',
      },
    });

    // Verify connection
    console.log('Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!');

    // Send test email
    console.log('Sending test email...');
    const info = await transporter.sendMail({
      from: process.env.FROM_EMAIL || 'maydivinfotech@gmail.com',
      to: process.env.ADMIN_EMAIL || 'ravindranathjha76@gmail.com',
      subject: 'CRM Email Test - Real-time Email Configuration',
      text: 'This is a test email to verify that your Gmail SMTP configuration is working correctly for real-time email functionality in your CRM system.',
      html: `
        <h2>CRM Email Test</h2>
        <p>This is a test email to verify that your Gmail SMTP configuration is working correctly for real-time email functionality in your CRM system.</p>
        <p><strong>Test Details:</strong></p>
        <ul>
          <li>SMTP Host: ${process.env.SMTP_HOST}</li>
          <li>SMTP Port: ${process.env.SMTP_PORT}</li>
          <li>From Email: ${process.env.FROM_EMAIL}</li>
          <li>Timestamp: ${new Date().toLocaleString()}</li>
        </ul>
        <p>If you receive this email, your real-time email functionality is working correctly! 🎉</p>
      `
    });

    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    console.log('\n📧 Check your email inbox for the test message!');

  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    console.error('Full error:', error);
    
    if (error.code === 'EAUTH') {
      console.log('\n💡 Authentication Error - Please check:');
      console.log('1. Gmail App Password is correct');
      console.log('2. 2-Factor Authentication is enabled on Gmail');
      console.log('3. App Password is generated for this application');
    } else if (error.code === 'ECONNECTION') {
      console.log('\n💡 Connection Error - Please check:');
      console.log('1. Internet connection is working');
      console.log('2. Gmail SMTP settings are correct');
      console.log('3. Firewall is not blocking the connection');
    }
  }
}

// Run the test
testEmail(); 