"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const db_1 = __importDefault(require("../config/db"));
const encryption_1 = require("../utils/encryption");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const messageController_1 = require("../controllers/messageController");
const router = express_1.default.Router();
// Configure multer for media uploads in messages
const mediaUploadDir = path_1.default.join(__dirname, '../../uploads/media');
if (!fs_1.default.existsSync(mediaUploadDir)) {
    fs_1.default.mkdirSync(mediaUploadDir, { recursive: true });
}
const mediaStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, mediaUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = crypto_1.default.randomBytes(16).toString('hex');
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const mediaUpload = (0, multer_1.default)({
    storage: mediaStorage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
        const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WEBP, MP4, WEBM and MOV are allowed.'));
        }
    }
});
// Function to delete media file from storage
const deleteMediaFile = async (mediaUrl) => {
    if (!mediaUrl)
        return;
    try {
        // Extract the file name from the URL
        const fileName = mediaUrl.split('/').pop();
        if (!fileName)
            return;
        const filePath = path_1.default.join(__dirname, '../../uploads/media', fileName);
        // Check if file exists before attempting to delete
        if (fs_1.default.existsSync(filePath)) {
            await fs_1.default.promises.unlink(filePath);
            console.log(`Deleted media file: ${filePath}`);
        }
    }
    catch (error) {
        console.error('Error deleting media file:', error);
    }
};
// Apply authentication middleware to all message routes
router.use(authMiddleware_1.authenticate);
// Routes for direct messages from the controller
router.get('/conversations', messageController_1.getConversations);
router.get('/direct/:userId', messageController_1.getDirectMessages);
router.post('/direct/:userId', messageController_1.sendDirectMessage);
router.patch('/read/:messageId', messageController_1.markMessageAsRead);
router.delete('/:messageId', messageController_1.deleteMessage);
router.put('/:messageId', messageController_1.editMessage);
// Share a post to a user via DM
router.post('/share-post', messageController_1.sharePost);
// Share a post to a group chat
router.post('/share-post-group', messageController_1.sharePostGroup);
// Get messages between current user and another user - legacy route
router.get('/conversation/:userId', async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const otherUserId = parseInt(req.params.userId);
        const includeReplies = req.query.includeReplies === 'true';
        const messages = await db_1.default.message.findMany({
            where: {
                OR: [
                    {
                        senderId: currentUserId,
                        receiverId: otherUserId,
                        deletedForSender: false
                    },
                    {
                        senderId: otherUserId,
                        receiverId: currentUserId,
                        deletedForReceiver: false
                    }
                ]
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        username: true,
                        userImage: true
                    }
                },
                replyTo: {
                    include: {
                        sender: {
                            select: {
                                id: true,
                                username: true,
                                userImage: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'asc'
            }
        });
        res.json(messages);
    }
    catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});
// Send a message - legacy route
router.post('/send', async (req, res) => {
    try {
        const { receiverId, content, replyToId, mediaUrl, mediaType } = req.body;
        const senderId = req.user.id;
        if (!receiverId || (!content && !mediaUrl)) {
            return res.status(400).json({
                error: 'Receiver ID and either content or media are required'
            });
        }
        // Check if receiver exists
        const receiver = await db_1.default.user.findUnique({
            where: { id: parseInt(receiverId) },
        });
        if (!receiver) {
            return res.status(404).json({ error: 'Receiver not found' });
        }
        // Encrypt the message content if it exists
        let encrypted = null;
        if (content) {
            encrypted = (0, encryption_1.encryptMessage)(content, senderId, parseInt(receiverId));
        }
        // Create the message with both encrypted and unencrypted content
        const messageData = {
            senderId,
            receiverId: parseInt(receiverId),
            read: false,
            isEdited: false,
            deletedForSender: false,
            deletedForReceiver: false,
            replyToId: replyToId ? parseInt(replyToId) : null,
        };
        // Add content if it exists
        if (content) {
            messageData.content = content;
            if (encrypted) {
                messageData.encryptedContent = encrypted.encryptedContent;
                messageData.iv = encrypted.iv;
                messageData.algorithm = encrypted.algorithm;
                messageData.hmac = encrypted.hmac;
                messageData.authTag = encrypted.authTag;
            }
        }
        // Add media information if it exists
        if (mediaUrl) {
            messageData.mediaUrl = mediaUrl;
            messageData.mediaType = mediaType || 'image'; // Default to image if type not specified
            messageData.mediaEncrypted = true; // Media encryption enabled
        }
        const message = await db_1.default.message.create({
            data: messageData,
            include: {
                sender: {
                    select: {
                        id: true,
                        username: true,
                        userImage: true,
                    },
                },
                replyTo: {
                    select: {
                        id: true,
                        content: true,
                        sender: {
                            select: {
                                id: true,
                                username: true,
                                userImage: true,
                            },
                        },
                    },
                },
            },
        });
        // Return the created message
        return res.status(201).json(message);
    }
    catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});
// Create a new conversation
router.post('/conversations', async (req, res) => {
    try {
        const { userId: otherUserId } = req.body;
        const currentUserId = req.user.id;
        if (!otherUserId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        // Check if other user exists
        const otherUser = await db_1.default.user.findUnique({
            where: { id: parseInt(otherUserId) },
            select: {
                id: true,
                username: true,
                userImage: true
            }
        });
        if (!otherUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Check if conversation already exists
        const existingMessages = await db_1.default.message.findFirst({
            where: {
                OR: [
                    { AND: [{ senderId: currentUserId }, { receiverId: otherUser.id }] },
                    { AND: [{ senderId: otherUser.id }, { receiverId: currentUserId }] }
                ]
            }
        });
        // Return success even if conversation exists
        res.status(200).json({
            otherUserId: otherUser.id,
            otherUsername: otherUser.username,
            otherUserImage: otherUser.userImage,
            lastMessage: '',
            lastMessageTime: new Date(),
            unreadCount: 0
        });
    }
    catch (error) {
        console.error('Error creating conversation:', error);
        res.status(500).json({ error: 'Failed to create conversation' });
    }
});
// Delete all messages in a conversation
router.delete('/conversation/:userId/all', async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const otherUserId = parseInt(req.params.userId);
        if (!otherUserId || isNaN(otherUserId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        // Get messages with media URLs to delete files later
        const messagesToDelete = await db_1.default.message.findMany({
            where: {
                OR: [
                    {
                        senderId: currentUserId,
                        receiverId: otherUserId
                    },
                    {
                        senderId: otherUserId,
                        receiverId: currentUserId
                    }
                ],
                mediaUrl: {
                    not: null
                }
            },
            select: {
                id: true,
                mediaUrl: true
            }
        });
        // Update messages for the current user
        // If user is sender, mark as deletedForSender
        // If user is receiver, mark as deletedForReceiver
        await db_1.default.message.updateMany({
            where: {
                senderId: currentUserId,
                receiverId: otherUserId
            },
            data: {
                deletedForSender: true
            }
        });
        await db_1.default.message.updateMany({
            where: {
                senderId: otherUserId,
                receiverId: currentUserId
            },
            data: {
                deletedForReceiver: true
            }
        });
        // Find messages that are now deleted for both users and delete their media files
        for (const message of messagesToDelete) {
            const fullMessage = await db_1.default.message.findUnique({
                where: { id: message.id }
            });
            if (fullMessage && fullMessage.deletedForSender && fullMessage.deletedForReceiver) {
                if (message.mediaUrl) {
                    await deleteMediaFile(message.mediaUrl);
                }
            }
        }
        res.json({
            message: 'All messages in this conversation have been deleted',
            count: messagesToDelete.length
        });
    }
    catch (error) {
        console.error('Error deleting all messages:', error);
        res.status(500).json({ error: 'Failed to delete messages' });
    }
});
// Get message info
router.get('/:messageId/info', async (req, res) => {
    try {
        const messageId = parseInt(req.params.messageId);
        const userId = req.user.id;
        // Get message with read status
        const message = await db_1.default.message.findFirst({
            where: {
                id: messageId,
                OR: [
                    { senderId: userId },
                    { receiverId: userId }
                ]
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        username: true,
                        userImage: true
                    }
                }
            }
        });
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }
        res.json({
            id: message.id,
            sent: message.createdAt,
            delivered: message.createdAt, // For now, assuming instant delivery
            read: message.read,
            readAt: message.updatedAt,
            sender: message.sender
        });
    }
    catch (error) {
        console.error('Error fetching message info:', error);
        res.status(500).json({ error: 'Failed to fetch message info' });
    }
});
// Mark messages as read
router.post('/read', async (req, res) => {
    try {
        const { messageIds } = req.body;
        const userId = req.user.id;
        if (!messageIds || !Array.isArray(messageIds)) {
            return res.status(400).json({ error: 'Message IDs array is required' });
        }
        // Only mark messages as read if the current user is the receiver
        const updatedMessages = await db_1.default.message.updateMany({
            where: {
                id: { in: messageIds },
                receiverId: userId,
                read: false
            },
            data: {
                read: true
            }
        });
        res.json({ updatedCount: updatedMessages.count });
    }
    catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({ error: 'Failed to mark messages as read' });
    }
});
// Get unread messages count
router.get('/unread-count', async (req, res) => {
    try {
        const userId = req.user.id;
        const unreadCount = await db_1.default.message.count({
            where: {
                receiverId: userId,
                read: false,
                deletedForReceiver: false
            }
        });
        res.json({ count: unreadCount });
    }
    catch (error) {
        console.error('Error fetching unread messages count:', error);
        res.status(500).json({ error: 'Failed to fetch unread messages count' });
    }
});
// Upload media for messages
router.post('/upload-media', authMiddleware_1.authenticate, mediaUpload.single('media'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
        // Skip encryption, just use the direct file path
        const mediaUrl = `/uploads/media/${req.file.filename}`;
        res.json({
            url: mediaUrl,
            type: mediaType,
            filename: req.file.filename,
            originalName: req.file.originalname,
            encrypted: false
        });
    }
    catch (error) {
        console.error('Error uploading media:', error);
        res.status(500).json({ error: 'Failed to upload media file' });
    }
});
// Update last message in a conversation
router.put('/conversations/:userId/update-last-message', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const otherUserId = parseInt(req.params.userId);
        const { lastMessage, lastMessageTime } = req.body;
        if (!lastMessage) {
            return res.status(400).json({ error: 'Last message content is required' });
        }
        // Find the conversation
        let conversation = await db_1.default.$queryRaw `
      SELECT * FROM Conversation
      WHERE (user1Id = ${currentUserId} AND user2Id = ${otherUserId})
      OR (user1Id = ${otherUserId} AND user2Id = ${currentUserId})
      LIMIT 1
    `;
        // Ensure conversation is an array and extract the first result
        conversation = Array.isArray(conversation) && conversation.length > 0
            ? conversation[0]
            : null;
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }
        // Update the conversation's updatedAt timestamp
        await db_1.default.$executeRaw `
      UPDATE Conversation 
      SET updatedAt = ${new Date(lastMessageTime) || new Date()}
      WHERE id = ${conversation.id}
    `;
        res.status(200).json({ success: true });
    }
    catch (error) {
        console.error('Error updating conversation last message:', error);
        res.status(500).json({ error: 'Failed to update last message' });
    }
});
exports.default = router;
