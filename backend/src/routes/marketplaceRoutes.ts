import express from 'express';
import { 
  getWalletBalance, 
  addFunds, 
  getProducts, 
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  purchaseProduct,
  requestOtp, 
  verifyPurchase,
  getPurchaseHistory,
  getSalesHistory
} from '../controllers/marketplaceController';
import { authenticate } from '../middleware/authMiddleware';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Configure multer for product image uploads
const productImagesDir = path.join(__dirname, '../../uploads/products');
if (!fs.existsSync(productImagesDir)) {
  fs.mkdirSync(productImagesDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, productImagesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    const extension = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Maximum 5 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WEBP images are allowed.'));
    }
  }
});

// All routes are protected with authentication
router.use(authenticate);

// Wallet routes
router.get('/wallet', getWalletBalance);
router.post('/add-funds', addFunds);

// Product routes
router.get('/products', getProducts);
router.get('/products/:id', getProductById);
router.post('/products', upload.array('images', 5), createProduct);
router.put('/products/:id', upload.array('images', 5), updateProduct);
router.delete('/products/:id', deleteProduct);

// Purchase routes
router.post('/purchase/:id', purchaseProduct);
router.post('/request-otp', requestOtp);
router.post('/verify-purchase', verifyPurchase);

// Order history routes
router.get('/purchases', getPurchaseHistory);
router.get('/sales', getSalesHistory);

export default router; 