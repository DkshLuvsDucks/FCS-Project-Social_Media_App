"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const postController_1 = require("../controllers/postController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const securityMiddleware_1 = require("../middleware/securityMiddleware");
const router = express_1.default.Router();
// Apply rate limiting to all post routes
router.use(securityMiddleware_1.apiRateLimiter);
// Public routes
router.get('/', postController_1.getPosts);
router.get('/:id', postController_1.getPostById);
// Protected routes
router.post('/', authMiddleware_1.authenticate, postController_1.createPost);
exports.default = router;
