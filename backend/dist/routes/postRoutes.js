"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const postController_1 = require("../controllers/postController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const securityMiddleware_1 = require("../middleware/securityMiddleware");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const router = express_1.default.Router();
// Configure multer for media uploads in posts
const mediaUploadDir = path_1.default.join(__dirname, '../../uploads/posts');
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
// Apply rate limiting to all post routes
router.use(securityMiddleware_1.apiRateLimiter);
// Media access route - should come before /:id to avoid conflicts
router.get('/media/:hash', postController_1.getMedia);
// Public routes
router.get('/', postController_1.getPosts);
// Post by ID route
router.get('/:id', postController_1.getPostById);
// Protected routes
router.post('/', authMiddleware_1.authenticate, mediaUpload.single('media'), postController_1.createPost);
// Like routes
router.get('/:id/likes', authMiddleware_1.authenticate, postController_1.getPostLikes);
router.post('/:id/likes', authMiddleware_1.authenticate, postController_1.handlePostLikes);
// Comment routes
router.get('/:id/comments', postController_1.getComments);
router.post('/:id/comments', authMiddleware_1.authenticate, postController_1.createComment);
// Saved post routes
router.get('/:id/saved', authMiddleware_1.authenticate, postController_1.getSavedStatus);
router.post('/:id/saved', authMiddleware_1.authenticate, postController_1.handleSavedPost);
// Upload media for posts
router.post('/upload-media', authMiddleware_1.authenticate, mediaUpload.single('media'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
        const mediaUrl = `/uploads/posts/${req.file.filename}`;
        // Generate a hash for the file
        const mediaHash = crypto_1.default
            .createHash('sha256')
            .update(req.file.filename)
            .digest('hex');
        res.json({
            url: mediaUrl,
            type: mediaType,
            filename: req.file.filename,
            originalName: req.file.originalname,
            hash: mediaHash
        });
    }
    catch (error) {
        console.error('Error uploading media:', error);
        res.status(500).json({ error: 'Failed to upload media file' });
    }
});
exports.default = router;
