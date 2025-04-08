/**
 * Reset Admin Script
 * This script ensures the admin user exists with the correct credentials.
 * It can be run at any time to restore admin access if needed.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function resetAdmin() {
  console.log('Starting admin reset...');
  
  try {
    // Admin credentials
    const adminEmail = 'admin@vendr.com';
    const adminPassword = 'Admin@123';
    const adminUsername = 'admin';
    
    // Hash the password
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    
    // Check if admin exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });
    
    if (existingAdmin) {
      console.log('Admin user found. Resetting credentials...');
      
      // Update admin user
      await prisma.user.update({
        where: { email: adminEmail },
        data: {
          passwordHash,
          role: 'ADMIN',
          // These fields might cause TypeScript errors in some environments
          // but they will work if the schema has these fields
          emailVerified: true,
          phoneVerified: true,
          failedLoginAttempts: 0,
          lockedUntil: null,
          updatedAt: new Date()
        }
      });
      
      console.log('Admin credentials have been reset successfully.');
    } else {
      console.log('Admin user not found. Creating new admin user...');
      
      // Create new admin user
      await prisma.user.create({
        data: {
          email: adminEmail,
          username: adminUsername,
          passwordHash,
          role: 'ADMIN',
          emailVerified: true,
          phoneVerified: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      console.log('Admin user created successfully.');
    }
    
    console.log('\nAdmin credentials:');
    console.log('- Email: admin@vendr.com');
    console.log('- Password: Admin@123');
    console.log('- Role: ADMIN');
    
  } catch (error) {
    console.error('Error resetting admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdmin(); 