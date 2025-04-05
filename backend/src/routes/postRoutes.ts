import express from 'express';
import { 
  createPost, 
  getPosts, 
  getPostById, 
  handlePostLikes, 
  getPostLikes, 
  createComment, 
  getComments, 
  handleSavedPost, 
  getSavedStatus,
  getMedia
} from '../controllers/postController';
import { authenticate } from '../middleware/authMiddleware';
import { apiRateLimiter } from '../middleware/securityMiddleware';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

const router = express.Router();

// Configure multer for media uploads in posts
const mediaUploadDir = path.join(__dirname, '../../uploads/posts');
if (!fs.existsSync(mediaUploadDir)) {
  fs.mkdirSync(mediaUploadDir, { recursive: true });
}

const mediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, mediaUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const mediaUpload = multer({
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
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WEBP, MP4, WEBM and MOV are allowed.'));
    }
  }
});

// Apply rate limiting to all post routes
router.use(apiRateLimiter);

// Media access route - should come before /:id to avoid conflicts
router.get('/media/:hash', getMedia);

// Public routes
router.get('/', getPosts);

// Post by ID route
router.get('/:id', getPostById);

// Protected routes
router.post('/', authenticate, mediaUpload.single('media'), createPost);

// Like routes
router.get('/:id/likes', authenticate, getPostLikes);
router.post('/:id/likes', authenticate, handlePostLikes);

// Comment routes
router.get('/:id/comments', getComments);
router.post('/:id/comments', authenticate, createComment);

// Saved post routes
router.get('/:id/saved', authenticate, getSavedStatus);
router.post('/:id/saved', authenticate, handleSavedPost);

// Upload media for posts
router.post('/upload-media', authenticate, mediaUpload.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
    const mediaUrl = `/uploads/posts/${req.file.filename}`;
    
    // Generate a hash for the file
    const mediaHash = crypto
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
  } catch (error) {
    console.error('Error uploading media:', error);
    res.status(500).json({ error: 'Failed to upload media file' });
  }
});

export default router; 