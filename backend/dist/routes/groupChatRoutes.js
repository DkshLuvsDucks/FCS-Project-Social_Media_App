"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const multer_1 = __importDefault(require("multer"));
const client_1 = require("@prisma/client");
const authMiddleware_1 = require("../middleware/authMiddleware");
const uuid_1 = require("uuid");
const prisma = new client_1.PrismaClient();
const router = express_1.default.Router();
// Add a helper function for creating system messages
const createSystemMessage = async (groupId, content, transaction) => {
    try {
        // Create a system message
        const systemMessage = transaction
            ? await transaction.groupMessage.create({
                data: {
                    groupId,
                    content,
                    isSystem: true,
                    senderId: 1, // Use admin ID instead of 0 which might be causing issues
                },
            })
            : await prisma.groupMessage.create({
                data: {
                    groupId,
                    content,
                    isSystem: true,
                    senderId: 1, // Use admin ID instead of 0
                },
            });
        return systemMessage;
    }
    catch (error) {
        console.error('Error creating system message:', error);
        throw error;
    }
};
// Configure multer for group image uploads
const groupImagesDir = path_1.default.join(__dirname, '../../uploads/group-images');
// Ensure the upload directory exists
const ensureDirectoryExists = async () => {
    try {
        await promises_1.default.access(groupImagesDir);
    }
    catch (error) {
        await promises_1.default.mkdir(groupImagesDir, { recursive: true });
        console.log(`Created directory: ${groupImagesDir}`);
    }
};
// Initialize directory
ensureDirectoryExists();
// Configure storage for uploaded files
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, groupImagesDir);
    },
    filename: function (req, file, cb) {
        // Generate a unique filename using UUID
        const fileExt = path_1.default.extname(file.originalname).toLowerCase();
        const uniqueFilename = `${(0, uuid_1.v4)()}${fileExt}`;
        cb(null, uniqueFilename);
    }
});
// Configure multer with file size and type restrictions
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max file size
    },
    fileFilter: function (req, file, cb) {
        // Only allow image files
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WEBP are allowed.'));
        }
    }
});
// Helper function to delete group image files
const deleteGroupImage = async (imageUrl) => {
    if (!imageUrl)
        return;
    try {
        // Extract the filename from the URL
        const fileName = imageUrl.split('/').pop();
        if (!fileName)
            return;
        const filePath = path_1.default.join(groupImagesDir, fileName);
        // Check if file exists before attempting to delete
        try {
            await promises_1.default.access(filePath);
            await promises_1.default.unlink(filePath);
            console.log(`Deleted group image: ${filePath}`);
        }
        catch (error) {
            // File doesn't exist or can't be accessed
            console.log(`File ${filePath} not found or cannot be accessed`);
        }
    }
    catch (error) {
        console.error('Error deleting group image:', error);
    }
};
// Create a new group chat
router.post('/', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const { name, description, members } = req.body;
        const userId = req.user.id;
        // Validate input
        if (!name || !members || !Array.isArray(members)) {
            return res.status(400).json({ error: 'Group name and members are required' });
        }
        // Limit group size to 8 members (including the creator)
        if (members.length > 7) {
            return res.status(400).json({ error: 'Groups are limited to a maximum of 8 members including you' });
        }
        // Ensure creator is included in members list
        const memberIds = [...new Set([...members, userId])]; // Unique IDs
        // Check if all members exist
        const foundUsers = await prisma.user.findMany({
            where: {
                id: { in: memberIds }
            },
            select: { id: true, username: true }
        });
        if (foundUsers.length !== memberIds.length) {
            return res.status(400).json({ error: 'One or more selected members do not exist' });
        }
        // Create group with transaction to ensure atomicity
        const createdGroup = await prisma.$transaction(async (txn) => {
            // Create the group
            const newGroup = await txn.groupChat.create({
                data: {
                    name,
                    description,
                    ownerId: userId
                }
            });
            // Add all members (including the creator)
            const memberPromises = memberIds.map(memberId => txn.groupMember.create({
                data: {
                    userId: memberId,
                    groupId: newGroup.id,
                    isAdmin: memberId === userId // Creator is admin by default
                }
            }));
            await Promise.all(memberPromises);
            // Create a welcome system message
            await createSystemMessage(newGroup.id, `${req.user.username} created the group "${name}"`, txn);
            // If additional members were added, create system messages for them
            const otherMembers = memberIds.filter(id => id !== userId);
            if (otherMembers.length > 0) {
                const memberUsers = await txn.user.findMany({
                    where: { id: { in: otherMembers } },
                    select: { username: true }
                });
                const usernames = memberUsers.map(u => u.username).join(', ');
                await createSystemMessage(newGroup.id, `${req.user.username} added ${usernames} to the group`, txn);
            }
            return newGroup;
        });
        // Fetch the complete group with member details
        const group = await prisma.groupChat.findUnique({
            where: { id: createdGroup.id },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                userImage: true
                            }
                        }
                    }
                }
            }
        });
        // Check if group exists
        if (!group) {
            return res.status(404).json({ error: 'Created group could not be found' });
        }
        // Format the response
        const formattedGroup = {
            id: group.id,
            name: group.name,
            description: group.description,
            groupImage: group.groupImage,
            createdAt: group.createdAt,
            updatedAt: group.updatedAt,
            ownerId: group.ownerId,
            members: group.members.map(member => ({
                id: member.user.id,
                username: member.user.username,
                userImage: member.user.userImage,
                isAdmin: member.isAdmin,
                isOwner: member.userId === group.ownerId
            }))
        };
        res.status(201).json(formattedGroup);
    }
    catch (error) {
        console.error('Error creating group chat:', error);
        res.status(500).json({ error: 'Failed to create group chat' });
    }
});
// Update a group chat
router.put('/:groupId', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId);
        const userId = req.user.id;
        const { name, description } = req.body;
        // Check if group exists and user is a member
        const groupChat = await prisma.groupChat.findFirst({
            where: {
                id: groupId,
                members: {
                    some: {
                        userId: userId
                    }
                }
            },
            include: {
                members: {
                    where: {
                        userId: userId
                    },
                }
            }
        });
        if (!groupChat) {
            return res.status(404).json({ error: 'Group chat not found or you are not a member' });
        }
        // Check if user is an admin
        const member = groupChat.members[0];
        if (!member.isAdmin) {
            return res.status(403).json({ error: 'You do not have permission to update this group' });
        }
        // Track changes for system message
        const changes = [];
        if (name !== undefined && name !== groupChat.name) {
            changes.push('name');
        }
        if (description !== undefined && description !== groupChat.description) {
            changes.push('description');
        }
        if (changes.length === 0) {
            return res.json({
                name: groupChat.name,
                description: groupChat.description
            });
        }
        // Update with transaction
        const updatedGroup = await prisma.$transaction(async (txn) => {
            // Update the group
            const updated = await txn.groupChat.update({
                where: { id: groupId },
                data: {
                    name: name !== undefined ? name : undefined,
                    description: description !== undefined ? description : undefined,
                    updatedAt: new Date()
                }
            });
            // Create appropriate system message based on what changed
            let systemMessage = '';
            if (changes.includes('name') && changes.includes('description')) {
                systemMessage = `${req.user.username} updated the group name to "${name}" and changed the description`;
            }
            else if (changes.includes('name')) {
                systemMessage = `${req.user.username} updated the group name to "${name}"`;
            }
            else if (changes.includes('description')) {
                if (description) {
                    systemMessage = `${req.user.username} updated the group description`;
                }
                else {
                    systemMessage = `${req.user.username} removed the group description`;
                }
            }
            await createSystemMessage(groupId, systemMessage, txn);
            return updated;
        });
        res.json({
            name: updatedGroup.name,
            description: updatedGroup.description
        });
    }
    catch (error) {
        console.error('Error updating group chat:', error);
        res.status(500).json({ error: 'Failed to update group chat' });
    }
});
// Upload/update group image
router.post('/:groupId/image', authMiddleware_1.authenticate, upload.single('image'), async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId);
        const userId = req.user.id;
        // Check if image was uploaded
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }
        // Check if user is a member and has admin rights
        const groupChat = await prisma.groupChat.findFirst({
            where: {
                id: groupId,
                members: {
                    some: {
                        userId: userId
                    }
                }
            },
            include: {
                members: {
                    where: {
                        userId: userId
                    }
                }
            }
        });
        if (!groupChat) {
            // Group not found or user not a member, delete the uploaded file
            try {
                await promises_1.default.unlink(req.file.path);
            }
            catch (error) {
                console.error('Error deleting uploaded file:', error);
            }
            return res.status(404).json({ error: 'Group chat not found or you are not a member' });
        }
        // Check if user is an admin or the owner
        const member = groupChat.members[0];
        if (!member.isAdmin && groupChat.ownerId !== userId) {
            // User not authorized, delete the uploaded file
            try {
                await promises_1.default.unlink(req.file.path);
            }
            catch (error) {
                console.error('Error deleting uploaded file:', error);
            }
            return res.status(403).json({ error: 'You do not have permission to update this group' });
        }
        // Store filename for use after null check
        const filename = req.file.filename;
        // Update with transaction
        const result = await prisma.$transaction(async (txn) => {
            // Store the old image URL for later deletion
            const oldImageUrl = groupChat.groupImage;
            // Update the group with the new image URL
            const imageUrl = `/uploads/group-images/${filename}`;
            const updatedGroup = await txn.groupChat.update({
                where: { id: groupId },
                data: {
                    groupImage: imageUrl,
                    updatedAt: new Date()
                }
            });
            // Create system message
            await createSystemMessage(groupId, `${req.user.username} updated the group photo`, txn);
            return { updatedGroup, oldImageUrl };
        });
        // Delete old image if it exists (after transaction completes)
        if (result.oldImageUrl) {
            await deleteGroupImage(result.oldImageUrl);
        }
        res.json({
            message: 'Group image updated successfully',
            url: result.updatedGroup.groupImage,
            filename: filename
        });
    }
    catch (error) {
        console.error('Error uploading group image:', error);
        // Delete the uploaded file if there was an error
        if (req.file) {
            try {
                await promises_1.default.unlink(req.file.path);
            }
            catch (unlinkError) {
                console.error('Error deleting uploaded file after error:', unlinkError);
            }
        }
        res.status(500).json({ error: 'Failed to upload group image' });
    }
});
// Delete group image
router.delete('/:groupId/image', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId);
        const userId = req.user.id;
        // Check if user is a member and has admin rights
        const groupChat = await prisma.groupChat.findFirst({
            where: {
                id: groupId,
                members: {
                    some: {
                        userId: userId
                    }
                }
            },
            include: {
                members: {
                    where: {
                        userId: userId
                    }
                }
            }
        });
        if (!groupChat) {
            return res.status(404).json({ error: 'Group chat not found or you are not a member' });
        }
        // Check if the user is an admin or the owner
        const member = groupChat.members[0];
        if (!member.isAdmin && groupChat.ownerId !== userId) {
            return res.status(403).json({ error: 'You do not have permission to update this group' });
        }
        // Check if there's an image to delete
        if (!groupChat.groupImage) {
            return res.status(400).json({ error: 'Group does not have an image to delete' });
        }
        // Store the old image URL for later deletion
        const oldImageUrl = groupChat.groupImage;
        // Update with transaction
        await prisma.$transaction(async (txn) => {
            // Remove the image reference from the group
            await txn.groupChat.update({
                where: { id: groupId },
                data: {
                    groupImage: null,
                    updatedAt: new Date()
                }
            });
            // Create system message
            await createSystemMessage(groupId, `${req.user.username} removed the group photo`, txn);
        });
        // Delete the image file after transaction completes
        await deleteGroupImage(oldImageUrl);
        res.json({ message: 'Group image removed successfully' });
    }
    catch (error) {
        console.error('Error removing group image:', error);
        res.status(500).json({ error: 'Failed to remove group image' });
    }
});
// Add a member to a group
router.post('/:groupId/members', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId);
        const userId = req.user.id;
        const { memberId } = req.body;
        if (!memberId) {
            return res.status(400).json({ error: 'Member ID is required' });
        }
        // Check if group exists and user is a member
        const groupChat = await prisma.groupChat.findFirst({
            where: {
                id: groupId,
                members: {
                    some: {
                        userId: userId
                    }
                }
            },
            include: {
                members: {
                    where: {
                        userId: userId
                    }
                }
            }
        });
        if (!groupChat) {
            return res.status(404).json({ error: 'Group chat not found or you are not a member' });
        }
        // Check if user is an admin
        const member = groupChat.members[0];
        if (!member.isAdmin) {
            return res.status(403).json({ error: 'You do not have permission to add members to this group' });
        }
        // Get current member count
        const memberCount = await prisma.groupMember.count({
            where: { groupId }
        });
        if (memberCount >= 8) {
            return res.status(400).json({ error: 'This group already has the maximum number of members (8)' });
        }
        // Check if user to add exists
        const userToAdd = await prisma.user.findUnique({
            where: { id: memberId },
            select: {
                id: true,
                username: true,
                userImage: true
            }
        });
        if (!userToAdd) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Check if user is already a member
        const existingMember = await prisma.groupMember.findUnique({
            where: {
                userId_groupId: {
                    userId: memberId,
                    groupId
                }
            }
        });
        if (existingMember) {
            return res.status(400).json({ error: 'User is already a member of this group' });
        }
        // Add member with transaction
        const newMember = await prisma.$transaction(async (txn) => {
            // Add the member
            const addedMember = await txn.groupMember.create({
                data: {
                    userId: memberId,
                    groupId,
                    isAdmin: false
                }
            });
            // Create system message
            await createSystemMessage(groupId, `${req.user.username} added ${userToAdd.username} to the group`, txn);
            return addedMember;
        });
        // Return the new member info
        res.status(201).json({
            id: userToAdd.id,
            username: userToAdd.username,
            userImage: userToAdd.userImage,
            isAdmin: newMember.isAdmin,
            isOwner: false
        });
    }
    catch (error) {
        console.error('Error adding member to group:', error);
        res.status(500).json({ error: 'Failed to add member to group' });
    }
});
// Remove a member from a group
router.delete('/:groupId/members/:memberId', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId);
        const userId = req.user.id;
        const memberId = parseInt(req.params.memberId);
        const isSelfRemoval = memberId === userId;
        // Fetch the group chat with members
        const groupChat = await prisma.groupChat.findUnique({
            where: { id: groupId },
            include: {
                members: {
                    include: {
                        user: {
                            select: { id: true, username: true }
                        }
                    }
                }
            }
        });
        if (!groupChat) {
            return res.status(404).json({ error: 'Group chat not found' });
        }
        // Check if the current user is a member
        const currentUserMember = groupChat.members.find(m => m.userId === userId);
        if (!currentUserMember) {
            return res.status(403).json({ error: 'You are not a member of this group' });
        }
        // Check if the target member exists
        const memberToRemove = groupChat.members.find(m => m.userId === memberId);
        if (!memberToRemove) {
            return res.status(404).json({ error: 'Member not found in this group' });
        }
        // Permission checks:
        // 1. Users can remove themselves
        // 2. Admins can remove non-owner members
        // 3. Owner can be removed only by themselves
        if (!isSelfRemoval &&
            (!currentUserMember.isAdmin || memberToRemove.userId === groupChat.ownerId)) {
            return res.status(403).json({
                error: isSelfRemoval ? 'You cannot remove yourself' : 'You do not have permission to remove this member'
            });
        }
        // Handle member removal with transaction
        await prisma.$transaction(async (txn) => {
            // Handle owner leaving - transfer ownership
            if (memberId === groupChat.ownerId) {
                // Find next admin or oldest member
                const nextAdmin = groupChat.members.find(m => m.isAdmin && m.userId !== groupChat.ownerId);
                const nextOwner = nextAdmin ||
                    groupChat.members.sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime()).find(m => m.userId !== groupChat.ownerId);
                if (nextOwner) {
                    // Transfer ownership
                    await txn.groupChat.update({
                        where: { id: groupId },
                        data: { ownerId: nextOwner.userId }
                    });
                    // Make new owner an admin if not already
                    if (!nextOwner.isAdmin) {
                        await txn.groupMember.update({
                            where: {
                                userId_groupId: {
                                    userId: nextOwner.userId,
                                    groupId
                                }
                            },
                            data: { isAdmin: true }
                        });
                    }
                    // Create system message for ownership transfer
                    await createSystemMessage(groupId, `${memberToRemove.user.username} left the group and ${nextOwner.user.username} is now the owner`, txn);
                }
                else {
                    // Delete the entire group if no other members
                    await txn.groupChat.delete({
                        where: { id: groupId }
                    });
                    // No need for system message as group is deleted
                    return;
                }
            }
            else {
                // Regular member removal
                const actionVerb = isSelfRemoval ? "left" : "was removed from";
                let message = isSelfRemoval
                    ? `${memberToRemove.user.username} left the group`
                    : `${memberToRemove.user.username} was removed from the group by ${currentUserMember.user.username}`;
                await createSystemMessage(groupId, message, txn);
            }
            // Remove the member
            await txn.groupMember.delete({
                where: {
                    userId_groupId: {
                        userId: memberId,
                        groupId
                    }
                }
            });
        });
        res.json({
            message: isSelfRemoval
                ? 'You have left the group'
                : 'Member has been removed from the group'
        });
    }
    catch (error) {
        console.error('Error removing member from group:', error);
        res.status(500).json({ error: 'Failed to remove member from group' });
    }
});
// Toggle admin status for a member
router.put('/:groupId/members/:memberId/admin', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId);
        const userId = req.user.id;
        const memberId = parseInt(req.params.memberId);
        const { isAdmin } = req.body;
        // Validate isAdmin input
        if (typeof isAdmin !== 'boolean') {
            return res.status(400).json({ error: 'isAdmin must be a boolean value' });
        }
        // Check if current user is the owner
        const groupChat = await prisma.groupChat.findUnique({
            where: { id: groupId }
        });
        if (!groupChat) {
            return res.status(404).json({ error: 'Group not found' });
        }
        if (groupChat.ownerId !== userId) {
            return res.status(403).json({ error: 'Only the group owner can change admin status' });
        }
        // Check if the target member exists
        const targetMember = await prisma.groupMember.findUnique({
            where: {
                userId_groupId: {
                    userId: memberId,
                    groupId
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        userImage: true
                    }
                }
            }
        });
        if (!targetMember) {
            return res.status(404).json({ error: 'Member not found in this group' });
        }
        // Update admin status with transaction
        const updatedMember = await prisma.$transaction(async (txn) => {
            // Update member status
            const updated = await txn.groupMember.update({
                where: {
                    userId_groupId: {
                        userId: memberId,
                        groupId
                    }
                },
                data: { isAdmin },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            userImage: true
                        }
                    }
                }
            });
            // Create system message
            const message = isAdmin
                ? `${req.user.username} made ${targetMember.user.username} an admin`
                : `${req.user.username} removed admin rights from ${targetMember.user.username}`;
            await createSystemMessage(groupId, message, txn);
            return updated;
        });
        res.json({
            id: updatedMember.user.id,
            username: updatedMember.user.username,
            userImage: updatedMember.user.userImage,
            isAdmin: updatedMember.isAdmin,
            isOwner: updatedMember.userId === groupChat.ownerId
        });
    }
    catch (error) {
        console.error('Error updating admin status:', error);
        res.status(500).json({ error: 'Failed to update admin status' });
    }
});
// Mark all messages in a group chat as read
router.post('/:groupId/mark-read', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId);
        const userId = req.user.id;
        // Check if user is a member of the group
        const membership = await prisma.groupMember.findUnique({
            where: {
                userId_groupId: {
                    userId,
                    groupId
                }
            }
        });
        if (!membership) {
            return res.status(403).json({ error: 'You are not a member of this group' });
        }
        // Get the latest message in the group
        const latestMessage = await prisma.groupMessage.findFirst({
            where: { groupId },
            orderBy: { createdAt: 'desc' }
        });
        if (!latestMessage) {
            return res.json({ message: 'No messages in this group' });
        }
        // Update the member's last read message ID
        await prisma.groupMember.update({
            where: {
                userId_groupId: {
                    userId,
                    groupId
                }
            },
            data: {
                lastReadMessageId: latestMessage.id
            }
        });
        res.json({
            message: 'Messages marked as read',
            lastReadMessageId: latestMessage.id
        });
    }
    catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({ error: 'Failed to mark messages as read' });
    }
});
// Get all group chats for the current user
router.get('/', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        // Fetch all group chats the user is a member of
        const groupChats = await prisma.groupChat.findMany({
            where: {
                members: {
                    some: {
                        userId: userId
                    }
                }
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                userImage: true
                            }
                        }
                    }
                },
                messages: {
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 1,
                    include: {
                        sender: {
                            select: {
                                id: true,
                                username: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });
        // Format the response with unread counts
        const formattedGroups = await Promise.all(groupChats.map(async (group) => {
            // Find current user's membership
            const currentUserMembership = group.members.find(member => member.userId === userId);
            // Calculate unread count
            let unreadCount = 0;
            if (currentUserMembership) {
                // Get the last read message ID for the current user
                const lastReadMessageId = currentUserMembership.lastReadMessageId;
                // Count messages after the last read message
                if (!lastReadMessageId) {
                    // If user has never read any messages, count all messages 
                    // except the user's own messages and system messages sent when user joined
                    unreadCount = await prisma.groupMessage.count({
                        where: {
                            groupId: group.id,
                            NOT: {
                                OR: [
                                    { senderId: userId }, // Don't count user's own messages
                                    {
                                        isSystem: true,
                                        createdAt: {
                                            // Exclude system messages from within 5 seconds of joining
                                            lte: new Date(new Date(currentUserMembership.joinedAt).getTime() + 5000)
                                        }
                                    }
                                ]
                            }
                        }
                    });
                }
                else {
                    // Count messages after the last read message
                    unreadCount = await prisma.groupMessage.count({
                        where: {
                            groupId: group.id,
                            id: {
                                gt: lastReadMessageId
                            },
                            NOT: {
                                senderId: userId // Don't count user's own messages as unread
                            }
                        }
                    });
                }
            }
            return {
                id: group.id,
                name: group.name,
                description: group.description,
                groupImage: group.groupImage,
                createdAt: group.createdAt,
                updatedAt: group.updatedAt,
                ownerId: group.ownerId,
                unreadCount, // Add the calculated unread count
                members: group.members.map(member => ({
                    id: member.user.id,
                    username: member.user.username,
                    userImage: member.user.userImage,
                    isAdmin: member.isAdmin,
                    isOwner: member.userId === group.ownerId
                })),
                latestMessage: group.messages[0] ? {
                    id: group.messages[0].id,
                    content: group.messages[0].content,
                    senderId: group.messages[0].senderId,
                    senderName: group.messages[0].sender.username,
                    isSystem: group.messages[0].isSystem,
                    createdAt: group.messages[0].createdAt
                } : null
            };
        }));
        res.json(formattedGroups);
    }
    catch (error) {
        console.error('Error fetching group chats:', error);
        res.status(500).json({ error: 'Failed to fetch group chats' });
    }
});
// Update the last message for a group chat
router.post('/:groupId/update-last-message', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId);
        const userId = req.user.id;
        const { content, timestamp, senderId } = req.body;
        console.log(`[update-last-message] Group ${groupId}, User ${userId}, Content: "${content}"`);
        console.log('Request body:', req.body);
        if (!content) {
            return res.status(400).json({ error: 'Message content is required' });
        }
        // Verify user is a member of the group
        const membership = await prisma.groupMember.findUnique({
            where: {
                userId_groupId: {
                    userId,
                    groupId
                }
            }
        });
        if (!membership) {
            console.log(`[update-last-message] User ${userId} is not a member of group ${groupId}`);
            return res.status(403).json({ error: 'You are not a member of this group' });
        }
        // Get user details for the sender
        const sender = await prisma.user.findUnique({
            where: { id: senderId || userId },
            select: { id: true, username: true }
        });
        if (!sender) {
            console.log(`[update-last-message] Sender ${senderId || userId} not found`);
            return res.status(404).json({ error: 'Sender not found' });
        }
        console.log(`[update-last-message] Sender: ${sender.username} (${sender.id})`);
        // Update the group chat's last message timestamp WITHOUT creating a new message
        const updatedGroup = await prisma.groupChat.update({
            where: { id: groupId },
            data: { updatedAt: new Date(timestamp) || new Date() }
        });
        // Find the most recent message to return in the response
        const latestMessage = await prisma.groupMessage.findFirst({
            where: { groupId },
            orderBy: { createdAt: 'desc' },
            include: {
                sender: {
                    select: {
                        id: true,
                        username: true
                    }
                }
            }
        });
        res.status(200).json({
            success: true,
            updatedAt: updatedGroup.updatedAt,
            message: latestMessage
        });
    }
    catch (error) {
        console.error('Error updating group last message:', error);
        res.status(500).json({ error: 'Failed to update last message' });
    }
});
// Add promote member route
router.put('/:groupId/promote/:memberId', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId);
        const userId = req.user.id;
        const memberId = parseInt(req.params.memberId);
        // Check if current user is owner or admin
        const groupChat = await prisma.groupChat.findUnique({
            where: { id: groupId },
            include: {
                members: {
                    where: {
                        userId
                    }
                }
            }
        });
        if (!groupChat) {
            return res.status(404).json({ error: 'Group not found' });
        }
        // Check if current user is an admin or owner
        const currentMember = groupChat.members[0];
        if (!currentMember || !currentMember.isAdmin) {
            return res.status(403).json({ error: 'Only admins can promote members' });
        }
        // Check if the target member exists
        const targetMember = await prisma.groupMember.findUnique({
            where: {
                userId_groupId: {
                    userId: memberId,
                    groupId
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        userImage: true
                    }
                }
            }
        });
        if (!targetMember) {
            return res.status(404).json({ error: 'Member not found in this group' });
        }
        // Check if member is already an admin
        if (targetMember.isAdmin) {
            return res.status(400).json({ error: 'User is already an admin' });
        }
        // Update admin status with transaction
        const updatedMember = await prisma.$transaction(async (txn) => {
            // Update member status
            const updated = await txn.groupMember.update({
                where: {
                    userId_groupId: {
                        userId: memberId,
                        groupId
                    }
                },
                data: { isAdmin: true },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            userImage: true
                        }
                    }
                }
            });
            // Create system message
            const message = `${req.user.username} promoted ${targetMember.user.username} to admin`;
            await createSystemMessage(groupId, message, txn);
            return updated;
        });
        res.json({
            id: updatedMember.user.id,
            username: updatedMember.user.username,
            userImage: updatedMember.user.userImage,
            isAdmin: updatedMember.isAdmin,
            isOwner: updatedMember.userId === groupChat.ownerId
        });
    }
    catch (error) {
        console.error('Error promoting member:', error);
        res.status(500).json({ error: 'Failed to promote member' });
    }
});
// Add demote member route
router.put('/:groupId/demote/:memberId', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId);
        const userId = req.user.id;
        const memberId = parseInt(req.params.memberId);
        // Check if current user is owner or admin
        const groupChat = await prisma.groupChat.findUnique({
            where: { id: groupId },
            include: {
                members: {
                    where: {
                        userId
                    }
                }
            }
        });
        if (!groupChat) {
            return res.status(404).json({ error: 'Group not found' });
        }
        // Check if current user is an admin or owner
        const currentMember = groupChat.members[0];
        if (!currentMember || !currentMember.isAdmin) {
            return res.status(403).json({ error: 'Only admins can demote members' });
        }
        // Only owner can demote other admins
        if (groupChat.ownerId !== userId) {
            return res.status(403).json({ error: 'Only the group owner can demote admins' });
        }
        // Check if the target member exists
        const targetMember = await prisma.groupMember.findUnique({
            where: {
                userId_groupId: {
                    userId: memberId,
                    groupId
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        userImage: true
                    }
                }
            }
        });
        if (!targetMember) {
            return res.status(404).json({ error: 'Member not found in this group' });
        }
        // Cannot demote the owner
        if (memberId === groupChat.ownerId) {
            return res.status(400).json({ error: 'Group owner cannot be demoted' });
        }
        // Check if member is already not an admin
        if (!targetMember.isAdmin) {
            return res.status(400).json({ error: 'User is not an admin' });
        }
        // Update admin status with transaction
        const updatedMember = await prisma.$transaction(async (txn) => {
            // Update member status
            const updated = await txn.groupMember.update({
                where: {
                    userId_groupId: {
                        userId: memberId,
                        groupId
                    }
                },
                data: { isAdmin: false },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            userImage: true
                        }
                    }
                }
            });
            // Create system message
            const message = `${req.user.username} demoted ${targetMember.user.username} from admin`;
            await createSystemMessage(groupId, message, txn);
            return updated;
        });
        res.json({
            id: updatedMember.user.id,
            username: updatedMember.user.username,
            userImage: updatedMember.user.userImage,
            isAdmin: updatedMember.isAdmin,
            isOwner: updatedMember.userId === groupChat.ownerId
        });
    }
    catch (error) {
        console.error('Error demoting member:', error);
        res.status(500).json({ error: 'Failed to demote member' });
    }
});
// End a group chat (remove all members and delete it, only owner can do this)
router.put('/:groupId/end', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId);
        const userId = req.user.id;
        // Check if group exists
        const groupChat = await prisma.groupChat.findUnique({
            where: { id: groupId },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true
                            }
                        }
                    }
                }
            }
        });
        if (!groupChat) {
            return res.status(404).json({ error: 'Group chat not found' });
        }
        // Check if user is the owner
        if (groupChat.ownerId !== userId) {
            return res.status(403).json({ error: 'Only the group owner can end this group chat' });
        }
        // Get the current user's username
        const user = req.user;
        // Update with transaction to ensure consistency
        await prisma.$transaction(async (txn) => {
            // Create a system message about ending the group
            await createSystemMessage(groupId, `${user.username} ended the group chat.`, txn);
            // Remove all members except the owner
            const nonOwnerMembers = groupChat.members.filter(m => m.userId !== userId);
            // Process members in batches to avoid hitting database limits
            const BATCH_SIZE = 5;
            for (let i = 0; i < nonOwnerMembers.length; i += BATCH_SIZE) {
                const batch = nonOwnerMembers.slice(i, i + BATCH_SIZE);
                // Process each member in the batch
                await Promise.all(batch.map(async (member) => {
                    await txn.groupMember.delete({
                        where: {
                            userId_groupId: {
                                userId: member.userId,
                                groupId
                            }
                        }
                    });
                }));
            }
            // Finally remove the owner (after all other members are removed)
            await txn.groupMember.delete({
                where: {
                    userId_groupId: {
                        userId: userId,
                        groupId
                    }
                }
            });
            // Delete the entire group
            await txn.groupChat.delete({
                where: { id: groupId }
            });
        });
        res.json({
            success: true,
            message: 'Group chat has been ended and deleted successfully'
        });
    }
    catch (error) {
        console.error('Error ending group chat:', error);
        res.status(500).json({ error: 'Failed to end group chat' });
    }
});
exports.default = router;
