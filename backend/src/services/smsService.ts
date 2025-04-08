import twilio from 'twilio';

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Send OTP via SMS using Twilio
export const sendOtpSms = async (phoneNumber: string, otp: string): Promise<boolean> => {
  try {
    // Validate phone number format (must start with +)
    if (!phoneNumber.startsWith('+')) {
      console.error(`Invalid phone number format: ${phoneNumber}. Must include country code starting with +`);
      return false;
    }
    
    // Simple E.164 format validation
    if (!/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
      console.error(`Phone number ${phoneNumber} is not in valid E.164 format`);
      return false;
    }

    // Check if Twilio credentials are configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      console.error('Twilio credentials not configured');
      return false;
    }

    // Send SMS using Twilio
    const message = await twilioClient.messages.create({
      body: `Your Vendr verification code is: ${otp}. This code will expire in 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });

    console.log(`SMS sent successfully. Message SID: ${message.sid}`);
    return true;
  } catch (err) {
    // Type guard for Twilio errors
    if (err && typeof err === 'object' && 'code' in err && 'message' in err) {
      const twilioError = err as { code: string; message: string };
      console.error('SMS sending failed:');
      console.error('Twilio error code:', twilioError.code);
      console.error('Twilio error message:', twilioError.message);
    } else {
      console.error('SMS sending failed:', err);
    }
    return false;
  }
}; 