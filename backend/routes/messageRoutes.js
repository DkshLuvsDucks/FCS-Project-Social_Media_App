const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const messageController = require('../controllers/messageController');

const router = express.Router();

// Protected routes
router.use(authenticate);

// Message routes
router.get('/conversations', messageController.getConversations);
router.get('/conversation/:id', messageController.getMessages);
router.get('/conversation/:id/info', messageController.getConversationInfo);
router.post('/conversation/:id', messageController.sendMessage);
router.post('/conversation/:id/media', upload.single('media'), messageController.sendMediaMessage);
router.delete('/conversation/:id', messageController.deleteConversation);
router.delete('/message/:id', messageController.deleteMessage);

// Group chat routes
router.post('/groups', messageController.createGroupChat);
router.get('/groups', messageController.getGroupChats);
router.get('/groups/:groupId', messageController.getGroupChat);
router.get('/group/:groupId', messageController.getGroupChatMessages);
router.post('/group/:groupId', messageController.sendGroupMessage);
router.post('/group/:groupId/media', upload.single('media'), messageController.sendGroupMediaMessage);
router.put('/groups/:groupId', messageController.updateGroupChat);
router.post('/groups/:groupId/image', upload.single('image'), messageController.updateGroupImage);
router.delete('/groups/:groupId/image', messageController.deleteGroupImage);
router.post('/groups/:groupId/members', messageController.addGroupMember);
router.put('/groups/:groupId/members/:memberId/admin', messageController.toggleAdminStatus);
router.delete('/groups/:groupId/members/:memberId', messageController.removeGroupMember);
router.delete('/groups/:groupId', messageController.endGroupChat);

module.exports = router; 