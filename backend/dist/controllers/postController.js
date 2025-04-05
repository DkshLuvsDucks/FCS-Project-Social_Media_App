"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPostById = exports.getPosts = exports.createPost = void 0;
const db_1 = __importDefault(require("../config/db"));
const crypto_1 = require("../utils/crypto");
const crypto_2 = __importDefault(require("crypto"));
const createPost = async (req, res) => {
    try {
        const { content, isPrivate } = req.body;
        const userId = req.user.id;
        const file = req.file;
        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }
        let postData = {
            content,
            authorId: userId,
            isEncrypted: false,
            isPrivate: Boolean(isPrivate)
        };
        // Add media URL if a file was uploaded
        if (file) {
            const mediaType = file.mimetype.startsWith('image/') ? 'image' : 'video';
            postData.mediaUrl = `/uploads/posts/${file.filename}`;
            postData.mediaType = mediaType;
            // Hash the media for integrity checks (optional)
            postData.mediaHash = crypto_2.default
                .createHash('sha256')
                .update(file.filename)
                .digest('hex');
        }
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
                }
            }
        });
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
    var _a, _b;
    const requestTimestamp = new Date().toISOString();
    console.log(`[${requestTimestamp}] Post request received from user ${((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || 'anonymous'}`);
    // Extract pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    console.log(`[${requestTimestamp}] Pagination: page ${page}, limit ${limit}, skip ${skip}`);
    try {
        const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
        let posts;
        // If the user is logged in, show public posts + posts from followed users
        if (userId) {
            try {
                console.log(`[${requestTimestamp}] Fetching posts for authenticated user ${userId}`);
                // Get the list of users that the current user follows
                const following = await db_1.default.follows.findMany({
                    where: {
                        followerId: userId
                    },
                    select: {
                        followingId: true
                    }
                });
                const followingIds = following.map(f => f.followingId);
                console.log(`[${requestTimestamp}] User ${userId} follows ${followingIds.length} users: [${followingIds.join(', ')}]`);
                // Query with pagination
                const postsQuery = await db_1.default.post.findMany({
                    where: {
                        OR: [
                            { isPrivate: false },
                            {
                                AND: [
                                    { isPrivate: true },
                                    {
                                        OR: [
                                            { authorId: userId }, // User's own private posts
                                            {
                                                authorId: {
                                                    in: followingIds // Private posts from followed users
                                                }
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    include: {
                        author: {
                            select: {
                                id: true,
                                username: true,
                                userImage: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    },
                    skip,
                    take: limit
                });
                console.log(`[${requestTimestamp}] Found ${postsQuery.length} posts (page ${page})`);
                // Log the post IDs and creation dates
                if (postsQuery.length > 0) {
                    console.log(`[${requestTimestamp}] Post IDs: ${postsQuery.map(p => p.id).join(', ')}`);
                    console.log(`[${requestTimestamp}] Posts with media: ${postsQuery.filter(p => p.mediaUrl || p.mediaHash).length}`);
                    // Check if media URLs/hashes are present
                    postsQuery.forEach(post => {
                        if (post.mediaUrl || post.mediaHash) {
                            console.log(`[${requestTimestamp}] Post ${post.id} has media - URL: ${post.mediaUrl || 'none'}, Hash: ${post.mediaHash || 'none'}, Type: ${post.mediaType || 'none'}`);
                        }
                    });
                }
                // Transform results to match our expected format
                // Ensure media URLs are correctly formatted
                posts = postsQuery.map(p => {
                    // Process media URL if it has a hash but no URL
                    let mediaUrl = p.mediaUrl;
                    // If we have a hash but no URL, construct one
                    if (!mediaUrl && p.mediaHash) {
                        mediaUrl = `/api/media/${p.mediaHash}`;
                        console.log(`[${requestTimestamp}] Constructed media URL for post ${p.id}: ${mediaUrl}`);
                    }
                    return {
                        id: p.id,
                        content: p.content,
                        authorId: p.authorId,
                        createdAt: p.createdAt,
                        editedAt: p.editedAt,
                        editHistory: p.editHistory,
                        isEncrypted: p.isEncrypted,
                        isPrivate: p.isPrivate,
                        encryptionType: p.encryptionType,
                        iv: p.iv,
                        mediaHash: p.mediaHash,
                        mediaUrl: mediaUrl,
                        mediaType: p.mediaType,
                        author: p.author
                    };
                });
            }
            catch (error) {
                console.error(`[${requestTimestamp}] Error fetching posts with follows:`, error);
                // Fall back to showing only public posts on error
                const publicPosts = await db_1.default.post.findMany({
                    where: { isPrivate: false },
                    include: {
                        author: {
                            select: {
                                id: true,
                                username: true,
                                userImage: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    },
                    skip,
                    take: limit
                });
                console.log(`[${requestTimestamp}] Fallback: Found ${publicPosts.length} public posts (page ${page})`);
                // Same URL processing for fallback posts
                posts = publicPosts.map(p => {
                    let mediaUrl = p.mediaUrl;
                    if (!mediaUrl && p.mediaHash) {
                        mediaUrl = `/api/media/${p.mediaHash}`;
                    }
                    return {
                        id: p.id,
                        content: p.content,
                        authorId: p.authorId,
                        createdAt: p.createdAt,
                        editedAt: p.editedAt,
                        editHistory: p.editHistory,
                        isEncrypted: p.isEncrypted,
                        isPrivate: p.isPrivate,
                        encryptionType: p.encryptionType,
                        iv: p.iv,
                        mediaHash: p.mediaHash,
                        mediaUrl: mediaUrl,
                        mediaType: p.mediaType,
                        author: p.author
                    };
                });
            }
        }
        else {
            console.log(`[${requestTimestamp}] Fetching posts for anonymous user (page ${page})`);
            // For non-logged in users, only show public posts with pagination
            const publicPosts = await db_1.default.post.findMany({
                where: { isPrivate: false },
                include: {
                    author: {
                        select: {
                            id: true,
                            username: true,
                            userImage: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                skip,
                take: limit
            });
            console.log(`[${requestTimestamp}] Anonymous user: Found ${publicPosts.length} public posts (page ${page})`);
            // Process media URLs for anonymous users too
            posts = publicPosts.map(p => {
                let mediaUrl = p.mediaUrl;
                if (!mediaUrl && p.mediaHash) {
                    mediaUrl = `/api/media/${p.mediaHash}`;
                }
                return {
                    id: p.id,
                    content: p.content,
                    authorId: p.authorId,
                    createdAt: p.createdAt,
                    editedAt: p.editedAt,
                    editHistory: p.editHistory,
                    isEncrypted: p.isEncrypted,
                    isPrivate: p.isPrivate,
                    encryptionType: p.encryptionType,
                    iv: p.iv,
                    mediaHash: p.mediaHash,
                    mediaUrl: mediaUrl,
                    mediaType: p.mediaType,
                    author: p.author
                };
            });
        }
        // Process posts to handle encrypted content if any
        const processedPosts = posts.map(post => (Object.assign(Object.assign({}, post), { content: post.isEncrypted ? '[Encrypted Content]' : post.content })));
        console.log(`[${requestTimestamp}] Sending ${processedPosts.length} posts to client (page ${page})`);
        res.status(200).json(processedPosts);
    }
    catch (error) {
        console.error(`[${requestTimestamp}] Get posts error:`, error);
        res.status(500).json({ error: 'Server error while fetching posts' });
    }
};
exports.getPosts = getPosts;
const getPostById = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const postId = parseInt(id);
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (isNaN(postId)) {
            return res.status(400).json({ error: 'Invalid post ID' });
        }
        // Use raw query to get post with author details
        const query = `
      SELECT p.*, 
             u.id as author_id, 
             u.username as author_username, 
             u.user_image as author_image
      FROM Post p
      JOIN User u ON p.author_id = u.id
      WHERE p.id = ${postId}
    `;
        const rawPosts = await db_1.default.$queryRawUnsafe(query);
        if (!rawPosts || rawPosts.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }
        const rawPost = rawPosts[0];
        // Transform to expected format
        const post = {
            id: rawPost.id,
            content: rawPost.content,
            authorId: rawPost.author_id,
            createdAt: rawPost.created_at,
            editedAt: rawPost.edited_at,
            editHistory: rawPost.edit_history,
            isEncrypted: Boolean(rawPost.is_encrypted),
            isPrivate: Boolean(rawPost.is_private),
            encryptionType: rawPost.encryption_type,
            iv: rawPost.iv,
            mediaHash: rawPost.media_hash,
            mediaUrl: rawPost.media_url,
            mediaType: rawPost.media_type,
            author: {
                id: rawPost.author_id,
                username: rawPost.author_username,
                userImage: rawPost.author_image
            }
        };
        // Check if this is a private post that the user shouldn't see
        if (post.isPrivate) {
            // If not the author, check if user follows the author
            if (userId !== post.authorId) {
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
        }
        // If post is encrypted and user is the author, decrypt it
        let content = post.content;
        if (post.isEncrypted) {
            if (req.user.id === post.authorId) {
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
        res.status(200).json(Object.assign(Object.assign({}, post), { content }));
    }
    catch (error) {
        console.error('Get post error:', error);
        res.status(500).json({ error: 'Server error while fetching post' });
    }
};
exports.getPostById = getPostById;
