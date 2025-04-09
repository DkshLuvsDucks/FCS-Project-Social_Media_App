"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const verificationController_1 = require("../controllers/verificationController");
const router = (0, express_1.Router)();
// Email verification routes
router.post('/email/send', verificationController_1.sendEmailOTP);
router.post('/email/verify', verificationController_1.verifyEmailOTP);
// Mobile verification routes
router.post('/mobile/send', verificationController_1.sendMobileOTP);
router.post('/mobile/verify', verificationController_1.verifyMobileOTP);
// Check verification status
router.get('/status', verificationController_1.checkVerificationStatus);
exports.default = router;
