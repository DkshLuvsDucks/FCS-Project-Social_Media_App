"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const marketplaceController_1 = require("../controllers/marketplaceController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const router = express_1.default.Router();
// Configure multer for product image uploads
const productImagesDir = path_1.default.join(__dirname, '../../uploads/products');
if (!fs_1.default.existsSync(productImagesDir)) {
    fs_1.default.mkdirSync(productImagesDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, productImagesDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${(0, uuid_1.v4)()}`;
        const extension = path_1.default.extname(file.originalname);
        cb(null, `${uniqueSuffix}${extension}`);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 5 // Maximum 5 files
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and WEBP images are allowed.'));
        }
    }
});
// All routes are protected with authentication
router.use(authMiddleware_1.authenticate);
// Wallet routes
router.get('/wallet', marketplaceController_1.getWalletBalance);
router.post('/add-funds', marketplaceController_1.addFunds);
// Product routes
router.get('/products', marketplaceController_1.getProducts);
router.get('/products/:id', marketplaceController_1.getProductById);
router.post('/products', upload.array('images', 5), marketplaceController_1.createProduct);
router.put('/products/:id', upload.array('images', 5), marketplaceController_1.updateProduct);
router.delete('/products/:id', marketplaceController_1.deleteProduct);
// New purchase route with email verification
router.post('/purchase', marketplaceController_1.processPurchase);
// Legacy purchase routes (kept for backward compatibility)
router.post('/purchase/:id', marketplaceController_1.purchaseProduct);
router.post('/request-otp', marketplaceController_1.requestOtp);
router.post('/verify-purchase', marketplaceController_1.verifyPurchase);
// Order history routes
router.get('/purchases', marketplaceController_1.getPurchaseHistory);
router.get('/sales', marketplaceController_1.getSalesHistory);
exports.default = router;
