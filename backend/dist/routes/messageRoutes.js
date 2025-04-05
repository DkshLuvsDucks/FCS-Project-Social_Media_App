"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const db_1 = __importDefault(require("../config/db"));
const encryption_1 = require("../utils/encryption");
const client_1 = require("@prisma/client");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const router = express_1.default.Router();
const prismaClient = new client_1.PrismaClient();
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
// Get all conversations for the current user
router.get('/conversations', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        // Get all messages where the user is either sender or receiver
        const conversations = await db_1.default.$queryRaw `
      SELECT 
        DISTINCT 
        CASE 
          WHEN m.senderId = ${userId} THEN m.receiverId
          ELSE m.senderId 
        END as otherUserId,
        u.username as otherUsername,
        u.userImage as otherUserImage,
        (
          SELECT encryptedContent 
          FROM Message 
          WHERE (senderId = ${userId} AND receiverId = u.id) 
             OR (senderId = u.id AND receiverId = ${userId})
          ORDER BY createdAt DESC 
          LIMIT 1
        ) as lastMessageEncrypted,
        (
          SELECT iv 
          FROM Message 
          WHERE (senderId = ${userId} AND receiverId = u.id) 
             OR (senderId = u.id AND receiverId = ${userId})
          ORDER BY createdAt DESC 
          LIMIT 1
        ) as lastMessageIv,
        (
          SELECT algorithm 
          FROM Message 
          WHERE (senderId = ${userId} AND receiverId = u.id) 
             OR (senderId = u.id AND receiverId = ${userId})
          ORDER BY createdAt DESC 
          LIMIT 1
        ) as lastMessageAlgorithm,
        (
          SELECT hmac 
          FROM Message 
          WHERE (senderId = ${userId} AND receiverId = u.id) 
             OR (senderId = u.id AND receiverId = ${userId})
          ORDER BY createdAt DESC 
          LIMIT 1
        ) as lastMessageHmac,
        (
          SELECT authTag
          FROM Message 
          WHERE (senderId = ${userId} AND receiverId = u.id) 
             OR (senderId = u.id AND receiverId = ${userId})
          ORDER BY createdAt DESC 
          LIMIT 1
        ) as lastMessageAuthTag,
        (
          SELECT createdAt 
          FROM Message 
          WHERE (senderId = ${userId} AND receiverId = u.id) 
             OR (senderId = u.id AND receiverId = ${userId})
          ORDER BY createdAt DESC 
          LIMIT 1
        ) as lastMessageTime,
        (
          SELECT CAST(COUNT(*) AS SIGNED) 
          FROM Message 
          WHERE receiverId = ${userId} 
            AND senderId = u.id 
            AND \`read\` = false
        ) as unreadCount
      FROM Message m
      JOIN User u ON u.id = (
        CASE 
          WHEN m.senderId = ${userId} THEN m.receiverId
          ELSE m.senderId
        END
      )
      WHERE m.senderId = ${userId} OR m.receiverId = ${userId}
      ORDER BY lastMessageTime DESC
    `;
        // Convert BigInts to numbers in the response
        const conversationsWithNumbers = conversations.map(conv => (Object.assign(Object.assign({}, conv), { otherUserId: Number(conv.otherUserId), unreadCount: Number(conv.unreadCount) })));
        // Decrypt last messages
        const conversationsWithDecryptedMessages = await Promise.all(conversationsWithNumbers.map(async (conv) => {
            if (conv.lastMessageEncrypted) {
                try {
                    // Get the sender and receiver IDs from the last message query
                    const senderQuery = await db_1.default.message.findFirst({
                        where: {
                            OR: [
                                { AND: [{ senderId: userId }, { receiverId: conv.otherUserId }] },
                                { AND: [{ senderId: conv.otherUserId }, { receiverId: userId }] }
                            ]
                        },
                        orderBy: { createdAt: 'desc' },
                        select: { senderId: true, receiverId: true }
                    });
                    if (!senderQuery) {
                        console.log('No message found for conversation:', conv);
                        return {
                            otherUserId: conv.otherUserId,
                            otherUsername: conv.otherUsername,
                            otherUserImage: conv.otherUserImage,
                            lastMessage: '',
                            lastMessageTime: conv.lastMessageTime,
                            unreadCount: conv.unreadCount
                        };
                    }
                    const decrypted = (0, encryption_1.decryptMessage)({
                        encryptedContent: `${conv.lastMessageEncrypted}.${conv.lastMessageAuthTag}`,
                        iv: conv.lastMessageIv,
                        algorithm: conv.lastMessageAlgorithm,
                        hmac: conv.lastMessageHmac
                    }, Number(senderQuery.senderId), Number(senderQuery.receiverId));
                    return {
                        otherUserId: conv.otherUserId,
                        otherUsername: conv.otherUsername,
                        otherUserImage: conv.otherUserImage,
                        lastMessage: decrypted,
                        lastMessageTime: conv.lastMessageTime,
                        unreadCount: conv.unreadCount
                    };
                }
                catch (error) {
                    console.error('Failed to decrypt message:', error);
                    return {
                        otherUserId: conv.otherUserId,
                        otherUsername: conv.otherUsername,
                        otherUserImage: conv.otherUserImage,
                        lastMessage: '[Encrypted Message]',
                        lastMessageTime: conv.lastMessageTime,
                        unreadCount: conv.unreadCount
                    };
                }
            }
            return {
                otherUserId: conv.otherUserId,
                otherUsername: conv.otherUsername,
                otherUserImage: conv.otherUserImage,
                lastMessage: '',
                lastMessageTime: conv.lastMessageTime,
                unreadCount: conv.unreadCount
            };
        }));
        res.json(conversationsWithDecryptedMessages);
    }
    catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});
// Get messages between current user and another user
router.get('/conversation/:userId', authMiddleware_1.authenticate, async (req, res) => {
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
// Send a message
router.post('/send', authMiddleware_1.authenticate, async (req, res) => {
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
            messageData.mediaEncrypted = false; // Set to true if implementing media encryption
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
router.post('/conversations', authMiddleware_1.authenticate, async (req, res) => {
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
// Edit a message
router.put('/:id', authMiddleware_1.authenticate, async (req, res) => {
    var _a;
    try {
        const messageId = parseInt(req.params.id);
        const { content } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Find the message
        const message = await db_1.default.message.findUnique({
            where: { id: messageId }
        });
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }
        // Only sender can edit the message
        if (message.senderId !== userId) {
            return res.status(403).json({ error: 'Not authorized to edit this message' });
        }
        // Check if message is within 15 minutes
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        if (message.createdAt < fifteenMinutesAgo) {
            return res.status(403).json({ error: 'Message can only be edited within 15 minutes of sending' });
        }
        // Update the message
        const updateData = {
            content,
            isEdited: true
        };
        const updatedMessage = await db_1.default.message.update({
            where: { id: messageId },
            data: updateData
        });
        res.json(updatedMessage);
    }
    catch (error) {
        console.error('Error editing message:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete a message
router.delete('/:id', authMiddleware_1.authenticate, async (req, res) => {
    var _a;
    try {
        const messageId = parseInt(req.params.id);
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const deleteFor = req.query.deleteFor;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Find the message
        const message = await db_1.default.message.findUnique({
            where: { id: messageId }
        });
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }
        // Check if user is sender or receiver
        const isSender = message.senderId === userId;
        const isReceiver = message.receiverId === userId;
        if (!isSender && !isReceiver) {
            return res.status(403).json({ error: 'Not authorized to delete this message' });
        }
        // Handle delete for all (only sender can do this)
        if (deleteFor === 'all') {
            if (!isSender) {
                return res.status(403).json({ error: 'Only sender can delete for all' });
            }
            const updateData = {
                deletedForSender: true,
                deletedForReceiver: true
            };
            await db_1.default.message.update({
                where: { id: messageId },
                data: updateData
            });
            // Delete media file if this message has media and it's deleted for everyone
            if (message.mediaUrl) {
                await deleteMediaFile(message.mediaUrl);
            }
        }
        else {
            // Delete for individual user
            const updateData = isSender
                ? { deletedForSender: true }
                : { deletedForReceiver: true };
            await db_1.default.message.update({
                where: { id: messageId },
                data: updateData
            });
            // Check if the message is now deleted for both users, then delete media
            if ((isSender && message.deletedForReceiver) ||
                (isReceiver && message.deletedForSender)) {
                if (message.mediaUrl) {
                    await deleteMediaFile(message.mediaUrl);
                }
            }
        }
        res.json({ message: 'Message deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete all messages in a conversation
router.delete('/conversation/:userId/all', authMiddleware_1.authenticate, async (req, res) => {
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
router.get('/:messageId/info', authMiddleware_1.authenticate, async (req, res) => {
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
router.post('/read', authMiddleware_1.authenticate, async (req, res) => {
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
router.get('/unread-count', authMiddleware_1.authenticate, async (req, res) => {
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
        const mediaUrl = `/uploads/media/${req.file.filename}`;
        // Optional: implement media encryption
        // If encryption is required, you would encrypt the file here
        res.json({
            url: mediaUrl,
            type: mediaType,
            filename: req.file.filename,
            originalName: req.file.originalname
        });
    }
    catch (error) {
        console.error('Error uploading media:', error);
        res.status(500).json({ error: 'Failed to upload media file' });
    }
});
exports.default = router;
