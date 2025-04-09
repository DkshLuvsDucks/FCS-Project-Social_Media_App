import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

// Verify admin password for sensitive actions
export const verifyAdminPassword = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get the admin user
    const admin = await prisma.user.findUnique({
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
    const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Password is valid
    return res.status(200).json({ 
      success: true, 
      message: 'Password verified successfully' 
    });
  } catch (error) {
    console.error('Error verifying admin password:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 