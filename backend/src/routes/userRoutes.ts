import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/authMiddleware';

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticate);

// Search users by username or email
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    console.log('Searching users with query:', query);
    
    const searchTerm = query.toLowerCase();
    
    // First, get all matching users
    const users = await prisma.user.findMany({
      where: {
        AND: [
          { role: 'USER' },
          {
            OR: [
              { username: { contains: searchTerm } },
              { email: { contains: searchTerm } }
            ]
          }
        ]
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        userImage: true
      },
      take: 10
    });

    // Sort results by relevance:
    // 1. Username starts with search term
    // 2. Email starts with search term
    // 3. Username contains search term
    // 4. Email contains search term
    const sortedUsers = users.sort((a, b) => {
      const aUsername = a.username.toLowerCase();
      const bUsername = b.username.toLowerCase();
      const aEmail = a.email.toLowerCase();
      const bEmail = b.email.toLowerCase();

      // Check if usernames start with search term
      const aStartsWithUsername = aUsername.startsWith(searchTerm);
      const bStartsWithUsername = bUsername.startsWith(searchTerm);
      if (aStartsWithUsername && !bStartsWithUsername) return -1;
      if (!aStartsWithUsername && bStartsWithUsername) return 1;

      // If both or neither username starts with search term, check email
      const aStartsWithEmail = aEmail.startsWith(searchTerm);
      const bStartsWithEmail = bEmail.startsWith(searchTerm);
      if (aStartsWithEmail && !bStartsWithEmail) return -1;
      if (!aStartsWithEmail && bStartsWithEmail) return 1;

      // If still tied, sort alphabetically by username
      return aUsername.localeCompare(bUsername);
    });

    console.log(`Found ${sortedUsers.length} users matching query:`, sortedUsers);
    res.json(sortedUsers);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

export default router; 