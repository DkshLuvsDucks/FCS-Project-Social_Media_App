"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAdminPassword = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = __importDefault(require("../config/db"));
// Verify admin password for sensitive actions
const verifyAdminPassword = async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Get the admin user
        const admin = await db_1.default.user.findUnique({
            where: { id: userId }
        });
        if (!admin) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Verify the user is an admin
        if (admin.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
        }
        // Compare the provided password with the stored hash
        const isPasswordValid = await bcrypt_1.default.compare(password, admin.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid password' });
        }
        // Password is valid
        return res.status(200).json({
            success: true,
            message: 'Password verified successfully'
        });
    }
    catch (error) {
        console.error('Error verifying admin password:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.verifyAdminPassword = verifyAdminPassword;
