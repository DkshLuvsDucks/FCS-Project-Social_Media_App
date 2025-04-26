import { Request, Response } from 'express';
import prisma from '../config/db';
import dotenv from 'dotenv';
import { sendOtpEmail } from '../services/emailService';
import { sendOtpSms } from '../services/smsService';

// Load environment variables
dotenv.config();

// Create a map to store verification attempts for rate limiting
const verificationAttempts = new Map<string, number>();
const MAX_VERIFICATION_ATTEMPTS = 5;
const VERIFICATION_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// Generate a random 6-digit OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP for email verification
export const sendEmailOTP = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in the database
    await prisma.$transaction(async (tx) => {
      // Check if there's an existing verification code
      const existingVerification = await tx.verificationCode.findFirst({
        where: {
          type: 'EMAIL',
          value: email,
        },
      });

      if (existingVerification) {
        // Update existing verification
        await tx.verificationCode.update({
          where: { id: existingVerification.id },
          data: {
            code: otp,
            expiresAt,
            attempts: 0,
            verified: false,
          },
        });
      } else {
        // Create new verification
        await tx.verificationCode.create({
          data: {
            type: 'EMAIL',
            value: email,
            code: otp,
            expiresAt,
            attempts: 0,
          },
        });
      }
    });

    // Send OTP via email
    const success = await sendOtpEmail(email, otp);

    if (!success) {
      console.warn('Email delivery issue, but continuing for development');
    }

    // Always include the OTP in the response
    res.status(200).json({ 
      message: 'OTP sent to email', 
      expiresAt,
      otp,
      note: 'OTP included for development/testing'
    });
  } catch (error) {
    console.error('Send email OTP error:', error);
    res.status(500).json({ error: 'Server error during OTP generation' });
  }
};

// Send OTP for mobile verification
export const sendMobileOTP = async (req: Request, res: Response) => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({ error: 'Mobile number is required' });
    }
    
    // Validate and format mobile number for Indian format
    let formattedMobile = mobile;
    
    // If mobile starts with +91, keep it for database but format for SMS sending
    if (mobile.startsWith('+91')) {
      formattedMobile = mobile; // Keep the +91 format for database
    } 
    // If it's a 10-digit number, add +91
    else if (/^\d{10}$/.test(mobile)) {
      formattedMobile = `+91${mobile}`;
    } 
    // Invalid format
    else {
      return res.status(400).json({ error: 'Mobile number must be a 10-digit number or include +91 prefix' });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in the database
    await prisma.$transaction(async (tx) => {
      // Check if there's an existing verification code
      const existingVerification = await tx.verificationCode.findFirst({
        where: {
          type: 'MOBILE',
          value: formattedMobile,
        },
      });

      if (existingVerification) {
        // Update existing verification
        await tx.verificationCode.update({
          where: { id: existingVerification.id },
          data: {
            code: otp,
            expiresAt,
            attempts: 0,
            verified: false,
          },
        });
      } else {
        // Create new verification
        await tx.verificationCode.create({
          data: {
            type: 'MOBILE',
            value: formattedMobile,
            code: otp,
            expiresAt,
            attempts: 0,
          },
        });
      }
    });

    // Send OTP via SMS
    const success = await sendOtpSms(formattedMobile, otp);

    if (!success) {
      console.warn('SMS delivery issue, but continuing for development');
    }

    // Always include the OTP in the response
    res.status(200).json({ 
      message: 'OTP sent to mobile', 
      expiresAt,
      otp,
      note: 'OTP included for development/testing'
    });
  } catch (error) {
    console.error('Send mobile OTP error:', error);
    res.status(500).json({ error: 'Server error during OTP generation' });
  }
};

// Verify OTP for email
export const verifyEmailOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    // Find the verification code
    const verification = await prisma.verificationCode.findFirst({
      where: {
        type: 'EMAIL',
        value: email,
        expiresAt: {
          gte: new Date(),
        },
      },
    });

    if (!verification) {
      return res.status(400).json({ error: 'OTP expired or not found' });
    }

    // Increment attempt counter
    await prisma.verificationCode.update({
      where: { id: verification.id },
      data: { attempts: { increment: 1 } },
    });

    // Check if too many attempts
    if (verification.attempts >= 3) {
      return res.status(400).json({ error: 'Too many verification attempts. Please request a new OTP.' });
    }

    // Verify OTP
    if (verification.code !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Mark as verified
    await prisma.verificationCode.update({
      where: { id: verification.id },
      data: { verified: true },
    });

    res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify email OTP error:', error);
    res.status(500).json({ error: 'Server error during OTP verification' });
  }
};

// Verify OTP for mobile
export const verifyMobileOTP = async (req: Request, res: Response) => {
  try {
    const { mobile, otp } = req.body;

    if (!mobile || !otp) {
      return res.status(400).json({ error: 'Mobile number and OTP are required' });
    }

    // Format phone number
    let formattedMobile = mobile;
    if (mobile && !mobile.startsWith('+')) {
      formattedMobile = `+91${mobile}`;
    }
    
    // Find the verification code
    const verification = await prisma.verificationCode.findFirst({
      where: {
        type: 'MOBILE',
        value: formattedMobile,
        expiresAt: {
          gte: new Date(),
        },
      },
    });

    if (!verification) {
      return res.status(400).json({ error: 'OTP expired or not found' });
    }

    // Increment attempt counter
    await prisma.verificationCode.update({
      where: { id: verification.id },
      data: { attempts: { increment: 1 } },
    });

    // Check if too many attempts
    if (verification.attempts >= 3) {
      return res.status(400).json({ error: 'Too many verification attempts. Please request a new OTP.' });
    }

    // Verify OTP
    if (verification.code !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Mark as verified
    await prisma.verificationCode.update({
      where: { id: verification.id },
      data: { verified: true },
    });

    res.status(200).json({ message: 'Mobile number verified successfully' });
  } catch (error) {
    console.error('Verify mobile OTP error:', error);
    res.status(500).json({ error: 'Server error during OTP verification' });
  }
};

// Check verification status
export const checkVerificationStatus = async (req: Request, res: Response) => {
  try {
    const { userId, type } = req.params;

    if (!userId || !type) {
      return res.status(400).json({ error: 'User ID and verification type are required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: {
        id: true,
        email: true,
        mobile: true,
        emailVerified: true,
        phoneVerified: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (type.toLowerCase() === 'email') {
      res.status(200).json({ verified: user.emailVerified });
    } else if (type.toLowerCase() === 'phone') {
      res.status(200).json({ verified: user.phoneVerified });
    } else {
      res.status(400).json({ error: 'Invalid verification type' });
    }
  } catch (error) {
    console.error('Check verification status error:', error);
    res.status(500).json({ error: 'Server error during status check' });
  }
};

// Update verification status after successful verification
export const confirmVerification = async (req: Request, res: Response) => {
  try {
    const { userId, type, value } = req.body;

    if (!userId || !type) {
      return res.status(400).json({ error: 'User ID and verification type are required' });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId.toString()) },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (type.toLowerCase() === 'email') {
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          emailVerified: true,
          email: value || user.email, // Update email if provided
        },
      });
    } else if (type.toLowerCase() === 'phone') {
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          phoneVerified: true,
          mobile: value || user.mobile, // Update mobile if provided
        },
      });
    } else {
      return res.status(400).json({ error: 'Invalid verification type' });
    }

    res.status(200).json({ message: `${type} verification status updated` });
  } catch (error) {
    console.error('Confirm verification error:', error);
    res.status(500).json({ error: 'Server error during confirmation' });
  }
}; 