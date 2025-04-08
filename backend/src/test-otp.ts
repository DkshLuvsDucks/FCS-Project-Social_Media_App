import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

// Load environment variables
dotenv.config();

// Simple function to generate a 6-digit OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Create NodeMailer Transporter
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

// Send email OTP
async function sendEmailOTP(email: string, otp: string): Promise<boolean> {
  try {
    const mailOptions = {
      from: `"${process.env.APP_NAME || 'Social Media App'}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #3b82f6; text-align: center;">Email Verification</h2>
          <p>Please use the verification code below to verify your account:</p>
          <div style="padding: 12px; background-color: #f7f7f7; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 8px; margin: 20px 0; border-radius: 4px;">
            ${otp}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this verification, please ignore this email.</p>
        </div>
      `
    };

    const info = await emailTransporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

// Test function - this will be executed when this script is run
async function testEmailOTP() {
  console.log('Testing Email OTP functionality...');
  
  // Check if environment variables are set
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    console.error('Error: EMAIL_USER and EMAIL_APP_PASSWORD must be set in .env file');
    return;
  }
  
  // Get the test email from command line arguments or use a default
  const testEmail = process.argv[2] || 'test@example.com';
  
  // Generate an OTP
  const otp = generateOTP();
  console.log(`Generated OTP: ${otp}`);
  
  // Send the OTP
  console.log(`Sending OTP to ${testEmail}...`);
  const result = await sendEmailOTP(testEmail, otp);
  
  if (result) {
    console.log('Email sent successfully!');
  } else {
    console.error('Failed to send email');
  }
}

// Run the test
testEmailOTP()
  .then(() => console.log('Test completed'))
  .catch(error => console.error('Test failed:', error)); 