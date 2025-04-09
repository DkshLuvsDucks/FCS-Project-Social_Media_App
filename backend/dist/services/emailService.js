"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOtpEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
// Configure email transport
const transporter = nodemailer_1.default.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'vendr.admn@gmail.com',
        pass: process.env.EMAIL_APP_PASSWORD || 'hrhi ykob xyvj mpco',
    },
});
// Send OTP via email
const sendOtpEmail = async (email, otp) => {
    try {
        const mailOptions = {
            from: `"${process.env.APP_NAME || 'Vendr'}" <${process.env.EMAIL_USER || 'vendr.admn@gmail.com'}>`,
            to: email,
            subject: 'Email Verification OTP',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Email Verification</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #555;">Hello,</p>
          <p style="font-size: 16px; line-height: 1.6; color: #555;">Thank you for registering with Vendr. Your verification code is:</p>
          <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; margin: 20px 0; border-radius: 4px;">
            ${otp}
          </div>
          <p style="font-size: 16px; line-height: 1.6; color: #555;">This code is valid for 10 minutes. If you didn't request this code, please ignore this email.</p>
          <p style="font-size: 16px; line-height: 1.6; color: #555; margin-top: 30px;">Regards,<br>The Vendr Team</p>
        </div>
      `,
        };
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: %s', info.messageId);
        return true;
    }
    catch (error) {
        console.error('Email sending failed:', error);
        return false;
    }
};
exports.sendOtpEmail = sendOtpEmail;
