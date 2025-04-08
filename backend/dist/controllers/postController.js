"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMedia = exports.getSavedStatus = exports.handleSavedPost = exports.getComments = exports.createComment = exports.getPostLikes = exports.handlePostLikes = exports.getPostById = exports.getPosts = exports.createPost = void 0;
const db_1 = __importDefault(require("../config/db"));
const crypto_1 = require("../utils/crypto");
const crypto_2 = __importDefault(require("crypto"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const createPost = async (req, res) => {
    try {
        const { content, isPrivate } = req.body;
        const userId = req.user.id;
        const file = req.file;
        console.log('Creating post with data:', { content, isPrivate, userId, file: file === null || file === void 0 ? void 0 : file.originalname });
        // For Instagram-like posts, media is now required
        if (!file) {
            return res.status(400).json({ error: 'Media is required for posts' });
        }
        // Parse isPrivate as boolean properly - form data sends strings
        const isPrivateBoolean = isPrivate === true || isPrivate === 'true';
        console.log('Parsed isPrivate value:', isPrivate, '->', isPrivateBoolean);
        let postData = {
            content: content || '', // Content is now optional
            author: {
                connect: { id: userId }
            },
            isEncrypted: false,
            isPrivate: isPrivateBoolean
        };
        // Add media URL
        const mediaType = file.mimetype.startsWith('image/') ? 'image' : 'video';
        postData.mediaUrl = `/uploads/posts/${file.filename}`;
        postData.mediaType = mediaType;
        // Hash the media for integrity checks
        postData.mediaHash = crypto_2.default
            .createHash('sha256')
            .update(file.filename)
            .digest('hex');
        console.log('Creating post with data:', postData);
        // Create the post in the database
        const post = await db_1.default.post.create({
            data: postData,
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        userImage: true
                    }
                },
                _count: {
                    select: {
                        likes: true,
                        comments: true
                    }
                }
            }
        });
        console.log('Post created successfully:', post);
        res.status(201).json({
            message: 'Post created successfully',
            post
        });
    }
    catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({ error: 'Server error while creating post' });
    }
};
exports.createPost = createPost;
const getPosts = async (req, res) => {
    try {
        // Extract userId from query params (can be undefined for anonymous users)
        const loggedInUserId = req.query.userId ? Number(req.query.userId) : undefined;
        console.log(`[${new Date().toISOString()}] Post request received from user ${loggedInUserId || 'anonymous'}`);
        // Pagination
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        console.log(`[${new Date().toISOString()}] Pagination: page ${page}, limit ${limit}, skip ${skip}`);
        let posts = [];
        // Different queries based on whether user is logged in
        if (loggedInUserId) {
            console.log(`[${new Date().toISOString()}] Fetching posts for user ${loggedInUserId} (page ${page})`);
            // Get the IDs of users that the current user follows
            const following = await db_1.default.follows.findMany({
                where: { followerId: loggedInUserId },
                select: { followingId: true }
            });
            const followingIds = following.map((f) => f.followingId);
            console.log(`[${new Date().toISOString()}] User ${loggedInUserId} follows ${followingIds.length} users`);
            // Fetch posts with visibility rules:
            // 1. Public posts from anyone
            // 2. Private posts from users the current user follows
            // 3. User's own posts (both public and private)
            posts = await db_1.default.post.findMany({
                where: {
                    OR: [
                        // Public posts from anyone
                        { isPrivate: false },
                        // Private posts from users the current user follows
                        {
                            isPrivate: true,
                            authorId: { in: followingIds }
                        },
                        // User's own posts (both public and private)
                        { authorId: loggedInUserId }
                    ]
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip,
                include: {
                    author: {
                        select: {
                            id: true,
                            username: true,
                            userImage: true
                        }
                    },
                    _count: {
                        select: {
                            likes: true,
                            comments: true
                        }
                    }
                }
            });
            console.log(`[${new Date().toISOString()}] Found ${posts.length} posts for user ${loggedInUserId} (page ${page})`);
        }
        else {
            // For anonymous users, only show public posts
            console.log(`[${new Date().toISOString()}] Fetching posts for anonymous user (page ${page})`);
            posts = await db_1.default.post.findMany({
                where: {
                    isPrivate: false
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip,
                include: {
                    author: {
                        select: {
                            id: true,
                            username: true,
                            userImage: true
                        }
                    },
                    _count: {
                        select: {
                            likes: true,
                            comments: true
                        }
                    }
                }
            });
            console.log(`[${new Date().toISOString()}] Anonymous user: Found ${posts.length} public posts (page ${page})`);
        }
        console.log(`[${new Date().toISOString()}] Sending ${posts.length} posts to client (page ${page})`);
        res.json(posts);
    }
    catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
};
exports.getPosts = getPosts;
const getPostById = async (req, res) => {
    var _a, _b;
    try {
        const { id } = req.params;
        const postId = parseInt(id);
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (isNaN(postId)) {
            return res.status(400).json({ error: 'Invalid post ID' });
        }
        // Fetch post with author details and counts
        const post = await db_1.default.post.findUnique({
            where: { id: postId },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        userImage: true
                    }
                },
                _count: {
                    select: {
                        likes: true,
                        comments: true
                    }
                }
            }
        });
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        // Process media URL
        let mediaUrl = post.mediaUrl;
        if (!mediaUrl && post.mediaHash) {
            mediaUrl = `/uploads/posts/${post.mediaHash}`;
        }
        // Check if this is a private post that the user shouldn't see
        if (post.isPrivate) {
            // If not the author, check if user follows the author
            if (userId !== post.authorId) {
                try {
                    // Ensure userId is defined before querying
                    if (!userId) {
                        return res.status(403).json({ error: 'This post is only visible to followers' });
                    }
                    const isFollowing = await db_1.default.follows.findUnique({
                        where: {
                            followerId_followingId: {
                                followerId: userId,
                                followingId: post.authorId
                            }
                        }
                    });
                    if (!isFollowing) {
                        return res.status(403).json({ error: 'This post is only visible to followers' });
                    }
                }
                catch (error) {
                    console.error('Error checking follow status:', error);
                    // Allow access if we can't check follow status
                    // This is a fallback to prevent blocking legitimate access
                }
            }
        }
        // If post is encrypted and user is the author, decrypt it
        let content = post.content;
        if (post.isEncrypted) {
            if (((_b = req.user) === null || _b === void 0 ? void 0 : _b.id) === post.authorId) {
                try {
                    const encryptionKey = process.env.ENCRYPTION_KEY || '';
                    content = (0, crypto_1.decryptMessage)({
                        content: post.content,
                        iv: post.iv || '',
                        tag: ''
                    }, encryptionKey);
                }
                catch (error) {
                    console.error('Decryption error:', error);
                    content = '[Encrypted Content - Unable to Decrypt]';
                }
            }
            else {
                content = '[Encrypted Content]';
            }
        }
        res.status(200).json(Object.assign(Object.assign({}, post), { mediaUrl,
            content }));
    }
    catch (error) {
        console.error('Get post error:', error);
        res.status(500).json({ error: 'Server error while fetching post' });
    }
};
exports.getPostById = getPostById;
// New function to handle likes
const handlePostLikes = async (req, res) => {
    try {
        const { id } = req.params;
        const postId = parseInt(id);
        const userId = req.user.id;
        const { action } = req.body;
        if (isNaN(postId)) {
            return res.status(400).json({ error: 'Invalid post ID' });
        }
        // Check if the post exists
        const post = await db_1.default.post.findUnique({
            where: { id: postId }
        });
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        // Handle like/unlike logic
        if (action === 'like') {
            // Check if already liked
            const existingLike = await db_1.default.like.findUnique({
                where: {
                    userId_postId: {
                        userId,
                        postId
                    }
                }
            });
            if (!existingLike) {
                await db_1.default.like.create({
                    data: {
                        user: {
                            connect: { id: userId }
                        },
                        post: {
                            connect: { id: postId }
                        }
                    }
                });
            }
        }
        else if (action === 'unlike') {
            await db_1.default.like.deleteMany({
                where: {
                    userId,
                    postId
                }
            });
        }
        else {
            return res.status(400).json({ error: 'Invalid action. Use "like" or "unlike".' });
        }
        // Get updated like count
        const likeCount = await db_1.default.like.count({
            where: { postId }
        });
        res.status(200).json({
            message: `Post ${action === 'like' ? 'liked' : 'unliked'} successfully`,
            count: likeCount
        });
    }
    catch (error) {
        console.error('Post like error:', error);
        res.status(500).json({ error: 'Server error while processing like' });
    }
};
exports.handlePostLikes = handlePostLikes;
// Get like status and count
const getPostLikes = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const postId = parseInt(id);
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (isNaN(postId)) {
            return res.status(400).json({ error: 'Invalid post ID' });
        }
        // Get total like count
        const count = await db_1.default.like.count({
            where: { postId }
        });
        // Check if the current user has liked the post
        let isLiked = false;
        if (userId) {
            const like = await db_1.default.like.findUnique({
                where: {
                    userId_postId: {
                        userId,
                        postId
                    }
                }
            });
            isLiked = !!like;
        }
        res.status(200).json({
            count,
            isLiked
        });
    }
    catch (error) {
        console.error('Get post likes error:', error);
        res.status(500).json({ error: 'Server error while getting likes' });
    }
};
exports.getPostLikes = getPostLikes;
// New function to handle comments
const createComment = async (req, res) => {
    try {
        const { id } = req.params;
        const postId = parseInt(id);
        const userId = req.user.id;
        const { content } = req.body;
        if (isNaN(postId)) {
            return res.status(400).json({ error: 'Invalid post ID' });
        }
        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Comment content is required' });
        }
        // Check if the post exists
        const post = await db_1.default.post.findUnique({
            where: { id: postId }
        });
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        // Create the comment
        const comment = await db_1.default.comment.create({
            data: {
                content,
                user: {
                    connect: { id: userId }
                },
                post: {
                    connect: { id: postId }
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
        // Transform to match the expected format for frontend
        const transformedComment = {
            id: comment.id,
            content: comment.content,
            createdAt: comment.createdAt,
            author: {
                id: comment.user.id,
                username: comment.user.username,
                userImage: comment.user.userImage
            }
        };
        res.status(201).json(transformedComment);
    }
    catch (error) {
        console.error('Create comment error:', error);
        res.status(500).json({ error: 'Server error while creating comment' });
    }
};
exports.createComment = createComment;
// Get comments for a post
const getComments = async (req, res) => {
    try {
        const { id } = req.params;
        const postId = parseInt(id);
        const limit = parseInt(req.query.limit) || 10;
        const page = parseInt(req.query.page) || 1;
        const skip = (page - 1) * limit;
        if (isNaN(postId)) {
            return res.status(400).json({ error: 'Invalid post ID' });
        }
        // Get total comment count
        const totalCount = await db_1.default.comment.count({
            where: { postId }
        });
        // Get comments with pagination
        const comments = await db_1.default.comment.findMany({
            where: { postId },
            orderBy: {
                createdAt: 'desc'
            },
            skip,
            take: limit,
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
        // Transform to match the expected format with proper type checking
        const transformedComments = comments.map(comment => ({
            id: comment.id,
            content: comment.content,
            createdAt: comment.createdAt,
            author: {
                id: comment.user.id,
                username: comment.user.username,
                userImage: comment.user.userImage
            }
        }));
        res.status(200).json({
            comments: transformedComments,
            totalCount,
            page,
            limit
        });
    }
    catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ error: 'Server error while getting comments' });
    }
};
exports.getComments = getComments;
// Handle saved posts
const handleSavedPost = async (req, res) => {
    try {
        const { id } = req.params;
        const postId = parseInt(id);
        const userId = req.user.id;
        const { action } = req.body;
        if (isNaN(postId)) {
            return res.status(400).json({ error: 'Invalid post ID' });
        }
        // Check if the post exists
        const post = await db_1.default.post.findUnique({
            where: { id: postId }
        });
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        // Handle save/unsave logic
        if (action === 'save') {
            // Check if already saved
            const existingSave = await db_1.default.savedPost.findUnique({
                where: {
                    userId_postId: {
                        userId,
                        postId
                    }
                }
            });
            if (!existingSave) {
                await db_1.default.savedPost.create({
                    data: {
                        user: {
                            connect: { id: userId }
                        },
                        post: {
                            connect: { id: postId }
                        }
                    }
                });
            }
        }
        else if (action === 'unsave') {
            await db_1.default.savedPost.deleteMany({
                where: {
                    userId,
                    postId
                }
            });
        }
        else {
            return res.status(400).json({ error: 'Invalid action. Use "save" or "unsave".' });
        }
        res.status(200).json({
            message: `Post ${action === 'save' ? 'saved' : 'unsaved'} successfully`
        });
    }
    catch (error) {
        console.error('Saved post error:', error);
        res.status(500).json({ error: 'Server error while processing saved post' });
    }
};
exports.handleSavedPost = handleSavedPost;
// Get saved status for a post
const getSavedStatus = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const postId = parseInt(id);
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (isNaN(postId)) {
            return res.status(400).json({ error: 'Invalid post ID' });
        }
        // Check if the post is saved by the current user
        let isSaved = false;
        if (userId) {
            const savedPost = await db_1.default.savedPost.findUnique({
                where: {
                    userId_postId: {
                        userId,
                        postId
                    }
                }
            });
            isSaved = !!savedPost;
        }
        res.status(200).json({
            isSaved
        });
    }
    catch (error) {
        console.error('Get saved status error:', error);
        res.status(500).json({ error: 'Server error while getting saved status' });
    }
};
exports.getSavedStatus = getSavedStatus;
// Media access handler
const getMedia = async (req, res) => {
    try {
        const { hash } = req.params;
        console.log(`Media request for hash: ${hash}`);
        // Find post with matching media hash
        const post = await db_1.default.post.findFirst({
            where: { mediaHash: hash }
        });
        if (!post || !post.mediaUrl) {
            console.log(`Media not found for hash: ${hash}`);
            res.status(404).send('Media not found');
            return;
        }
        console.log(`Found media. Post: ${post.id}, URL: ${post.mediaUrl}`);
        // Extract filename from the URL - should be the last segment
        const fileName = post.mediaUrl.split('/').pop();
        if (!fileName) {
            console.log(`Invalid media URL format: ${post.mediaUrl}`);
            res.status(404).send('Invalid media URL format');
            return;
        }
        const filePath = path_1.default.join(__dirname, '../../uploads/posts', fileName);
        console.log(`Attempting to serve file from: ${filePath}`);
        // Check if file exists
        if (!fs_1.default.existsSync(filePath)) {
            console.log(`File not found at path: ${filePath}`);
            res.status(404).send('Media file not found on server');
            return;
        }
        console.log(`Serving file: ${filePath}`);
        // Set appropriate content type based on file extension
        const ext = path_1.default.extname(fileName).toLowerCase();
        const contentType = ext === '.jpeg' || ext === '.jpg' ? 'image/jpeg' :
            ext === '.png' ? 'image/png' :
                ext === '.gif' ? 'image/gif' :
                    ext === '.webp' ? 'image/webp' :
                        ext === '.mp4' ? 'video/mp4' :
                            ext === '.webm' ? 'video/webm' :
                                ext === '.mov' ? 'video/quicktime' :
                                    'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for a day
        // Stream the file instead of loading it all into memory
        const fileStream = fs_1.default.createReadStream(filePath);
        fileStream.pipe(res);
        // Handle stream errors
        fileStream.on('error', (err) => {
            console.error(`Error streaming file: ${err.message}`);
            // Only send error if headers haven't been sent yet
            if (!res.headersSent) {
                res.status(500).send('Error serving media file');
            }
        });
    }
    catch (error) {
        console.error('Get media error:', error);
        if (!res.headersSent) {
            res.status(500).send('Server error while fetching media');
        }
    }
};
exports.getMedia = getMedia;
