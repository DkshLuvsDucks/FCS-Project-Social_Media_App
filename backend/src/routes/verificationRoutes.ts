import { Router } from 'express';
import { 
  sendEmailOTP, 
  sendMobileOTP, 
  verifyEmailOTP, 
  verifyMobileOTP, 
  checkVerificationStatus 
} from '../controllers/verificationController';

const router = Router();

// Email verification routes
router.post('/email/send', sendEmailOTP);
router.post('/email/verify', verifyEmailOTP);

// Mobile verification routes
router.post('/mobile/send', sendMobileOTP);
router.post('/mobile/verify', verifyMobileOTP);

// Check verification status
router.get('/status', checkVerificationStatus);

export default router; 