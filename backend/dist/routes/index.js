"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authRoutes_1 = __importDefault(require("./authRoutes"));
const userRoutes_1 = __importDefault(require("./userRoutes"));
const messageRoutes_1 = __importDefault(require("./messageRoutes"));
const groupChatRoutes_1 = __importDefault(require("./groupChatRoutes"));
const groupMessageRoutes_1 = __importDefault(require("./groupMessageRoutes"));
const postRoutes_1 = __importDefault(require("./postRoutes"));
const adminRoutes_1 = __importDefault(require("./adminRoutes"));
const marketplaceRoutes_1 = __importDefault(require("./marketplaceRoutes"));
const router = express_1.default.Router();
// Register all routes
router.use('/auth', authRoutes_1.default);
router.use('/users', userRoutes_1.default);
router.use('/messages', messageRoutes_1.default);
router.use('/group-chats', groupChatRoutes_1.default);
router.use('/group-messages', groupMessageRoutes_1.default);
router.use('/posts', postRoutes_1.default);
router.use('/admin', adminRoutes_1.default);
router.use('/marketplace', marketplaceRoutes_1.default);
exports.default = router;
