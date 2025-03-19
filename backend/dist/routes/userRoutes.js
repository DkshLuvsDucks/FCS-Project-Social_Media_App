"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const authMiddleware_1 = require("../middleware/authMiddleware");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// Configure multer for file upload
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../../uploads');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = crypto_1.default.randomBytes(16).toString('hex');
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'));
        }
    }
});
// Apply authentication to all routes
router.use(authMiddleware_1.authenticate);
// Upload profile picture
router.post('/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({ url: fileUrl });
    }
    catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});
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
            if (aStartsWithUsername && !bStartsWithUsername)
                return -1;
            if (!aStartsWithUsername && bStartsWithUsername)
                return 1;
            // If both or neither username starts with search term, check email
            const aStartsWithEmail = aEmail.startsWith(searchTerm);
            const bStartsWithEmail = bEmail.startsWith(searchTerm);
            if (aStartsWithEmail && !bStartsWithEmail)
                return -1;
            if (!aStartsWithEmail && bStartsWithEmail)
                return 1;
            // If still tied, sort alphabetically by username
            return aUsername.localeCompare(bUsername);
        });
        console.log(`Found ${sortedUsers.length} users matching query:`, sortedUsers);
        res.json(sortedUsers);
    }
    catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ error: 'Failed to search users' });
    }
});
// Get user profile
router.get('/profile/:username', async (req, res) => {
    var _a;
    try {
        const { username } = req.params;
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const user = await prisma.user.findUnique({
            where: { username },
            select: {
                id: true,
                username: true,
                email: true,
                bio: true,
                userImage: true,
                createdAt: true,
                posts: {
                    orderBy: { createdAt: 'desc' }
                },
                followers: true,
                following: true
            }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Check if the current user is following this profile
        let isFollowing = false;
        if (currentUserId) {
            const followRecord = await prisma.follows.findUnique({
                where: {
                    followerId_followingId: {
                        followerId: currentUserId,
                        followingId: user.id
                    }
                }
            });
            isFollowing = !!followRecord;
        }
        const userProfile = Object.assign(Object.assign({}, user), { followersCount: user.followers.length, followingCount: user.following.length, isFollowing });
        res.json(userProfile);
    }
    catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
});
// Update user profile
router.put('/profile', async (req, res) => {
    try {
        const { username, bio, userImage, currentPassword, newPassword } = req.body;
        const userId = req.user.id;
        // Validate current password if trying to change password
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ error: 'Current password is required to change password' });
            }
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { passwordHash: true }
            });
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            const isPasswordValid = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
            if (!isPasswordValid) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }
        }
        // Check if username is already taken by another user
        if (username) {
            const existingUser = await prisma.user.findFirst({
                where: {
                    username,
                    NOT: { id: userId }
                }
            });
            if (existingUser) {
                return res.status(400).json({ error: 'Username is already taken' });
            }
        }
        // Update user profile
        const updateData = {};
        if (username)
            updateData.username = username;
        if (bio !== undefined)
            updateData.bio = bio;
        if (userImage !== undefined)
            updateData.userImage = userImage;
        if (newPassword)
            updateData.passwordHash = await bcryptjs_1.default.hash(newPassword, 12);
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                username: true,
                email: true,
                bio: true,
                userImage: true,
                createdAt: true
            }
        });
        res.json(updatedUser);
    }
    catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ error: 'Failed to update user profile' });
    }
});
// Follow a user
router.post('/follow/:username', authMiddleware_1.authenticate, async (req, res) => {
    var _a;
    try {
        const { username } = req.params;
        const followerId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!followerId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Check if user exists
        const userToFollow = await prisma.user.findUnique({
            where: { username }
        });
        if (!userToFollow) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Check if already following
        const existingFollow = await prisma.follows.findUnique({
            where: {
                followerId_followingId: {
                    followerId,
                    followingId: userToFollow.id
                }
            }
        });
        if (existingFollow) {
            return res.status(400).json({ error: 'Already following this user' });
        }
        // Create follow relationship
        await prisma.follows.create({
            data: {
                followerId,
                followingId: userToFollow.id
            }
        });
        res.status(200).json({ message: 'Successfully followed user' });
    }
    catch (error) {
        console.error('Error following user:', error);
        res.status(500).json({ error: 'Failed to follow user' });
    }
});
// Unfollow a user
router.post('/unfollow/:username', authMiddleware_1.authenticate, async (req, res) => {
    var _a;
    try {
        const { username } = req.params;
        const followerId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!followerId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Check if user exists
        const userToUnfollow = await prisma.user.findUnique({
            where: { username }
        });
        if (!userToUnfollow) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Delete follow relationship
        await prisma.follows.delete({
            where: {
                followerId_followingId: {
                    followerId,
                    followingId: userToUnfollow.id
                }
            }
        });
        res.status(200).json({ message: 'Successfully unfollowed user' });
    }
    catch (error) {
        console.error('Error unfollowing user:', error);
        res.status(500).json({ error: 'Failed to unfollow user' });
    }
});
// Get user's followers and following
router.get('/follows', authMiddleware_1.authenticate, async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Get followers and following in parallel
        const [followers, following] = await Promise.all([
            prisma.follows.findMany({
                where: { followingId: userId },
                include: {
                    follower: {
                        select: {
                            id: true,
                            username: true,
                            userImage: true
                        }
                    }
                }
            }),
            prisma.follows.findMany({
                where: { followerId: userId },
                include: {
                    following: {
                        select: {
                            id: true,
                            username: true,
                            userImage: true
                        }
                    }
                }
            })
        ]);
        // Transform the data to match the expected format
        const response = {
            followers: followers.map(f => ({
                id: f.follower.id,
                username: f.follower.username,
                userImage: f.follower.userImage
            })),
            following: following.map(f => ({
                id: f.following.id,
                username: f.following.username,
                userImage: f.following.userImage
            }))
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error fetching follows:', error);
        res.status(500).json({ error: 'Failed to fetch follows' });
    }
});
exports.default = router;
