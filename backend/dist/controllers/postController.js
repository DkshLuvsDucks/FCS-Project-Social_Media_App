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
        const { content, isEncrypted } = req.body;
        const userId = req.user.id;
        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }
        let postData = {
            content,
            authorId: userId,
            isEncrypted: !!isEncrypted
        };
        // If post should be encrypted
        if (isEncrypted) {
            const encryptionKey = process.env.ENCRYPTION_KEY || '';
            const encrypted = (0, crypto_1.encryptMessage)(content, encryptionKey);
            postData = Object.assign(Object.assign({}, postData), { content: encrypted.content, iv: encrypted.iv, encryptionType: 'aes-256-gcm' });
        }
        // If media is included, hash it
        if (req.body.media) {
            postData.mediaHash = crypto_2.default
                .createHash('sha256')
                .update(req.body.media)
                .digest('hex');
        }
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
            post: Object.assign(Object.assign({}, post), { 
                // If encrypted, don't return the actual content
                content: isEncrypted ? '[Encrypted Content]' : post.content })
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
        const posts = await db_1.default.post.findMany({
            orderBy: {
                createdAt: 'desc'
            },
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
        // Process posts to handle encrypted content
        const processedPosts = posts.map(post => (Object.assign(Object.assign({}, post), { content: post.isEncrypted ? '[Encrypted Content]' : post.content })));
        res.status(200).json(processedPosts);
    }
    catch (error) {
        console.error('Get posts error:', error);
        res.status(500).json({ error: 'Server error while fetching posts' });
    }
};
exports.getPosts = getPosts;
const getPostById = async (req, res) => {
    try {
        const { id } = req.params;
        const postId = parseInt(id);
        if (isNaN(postId)) {
            return res.status(400).json({ error: 'Invalid post ID' });
        }
        const post = await db_1.default.post.findUnique({
            where: { id: postId },
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
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
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
                        tag: '' // In a real app, you'd store and retrieve the tag
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
