import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');
  
  // Create the admin user
  const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@vendr.com' },
    update: {},
    create: {
      email: 'admin@vendr.com',
      username: 'admin',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
    },
  });
  
  console.log('Created admin user:', admin);
  
  // Add more seed data as needed
  
  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 