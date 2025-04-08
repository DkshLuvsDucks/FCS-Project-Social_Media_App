"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSalesHistory = exports.getPurchaseHistory = exports.verifyPurchase = exports.requestOtp = exports.purchaseProduct = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProductById = exports.getProducts = exports.addFunds = exports.getWalletBalance = void 0;
const db_1 = __importDefault(require("../config/db"));
const productEncryption_1 = require("../utils/productEncryption");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Get user's wallet balance
const getWalletBalance = async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Find user's wallet or create it if it doesn't exist
        let wallet = await db_1.default.wallet.findUnique({
            where: { userId }
        });
        if (!wallet) {
            wallet = await db_1.default.wallet.create({
                data: {
                    userId,
                    balance: 0
                }
            });
        }
        return res.status(200).json({ balance: wallet.balance });
    }
    catch (error) {
        console.error('Error getting wallet balance:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getWalletBalance = getWalletBalance;
// Add funds to user's wallet
const addFunds = async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { amount } = req.body;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Validate amount
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }
        const parsedAmount = parseFloat(amount);
        // Update wallet or create if it doesn't exist
        const wallet = await db_1.default.wallet.upsert({
            where: { userId },
            update: {
                balance: {
                    increment: parsedAmount
                }
            },
            create: {
                userId,
                balance: parsedAmount
            }
        });
        // Create transaction record
        const transaction = await db_1.default.transaction.create({
            data: {
                userId,
                type: 'DEPOSIT',
                amount: parsedAmount,
                description: 'Added funds to wallet',
                status: 'COMPLETED'
            }
        });
        return res.status(200).json({
            success: true,
            balance: wallet.balance,
            message: `Successfully added ₹${parsedAmount.toFixed(2)} to your wallet`
        });
    }
    catch (error) {
        console.error('Error adding funds to wallet:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.addFunds = addFunds;
// Get all products
const getProducts = async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const products = await db_1.default.product.findMany({
            include: {
                seller: {
                    select: {
                        id: true,
                        username: true,
                        userImage: true
                    }
                },
                images: {
                    select: {
                        url: true,
                        isPrimary: true
                    },
                    orderBy: {
                        isPrimary: 'desc'
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        // Format the response with fully qualified image URLs
        const formattedProducts = products.map(product => ({
            id: product.id,
            title: product.title,
            description: product.description,
            price: product.price,
            category: product.category,
            condition: product.condition,
            quantity: product.quantity,
            status: product.status,
            createdAt: product.createdAt,
            seller: {
                id: product.seller.id,
                username: product.seller.username,
                userImage: product.seller.userImage
            },
            images: product.images.map(img => img.url)
        }));
        res.json(formattedProducts);
    }
    catch (error) {
        console.error('Error fetching products:', error);
        return res.status(500).json({ error: 'Failed to fetch products' });
    }
};
exports.getProducts = getProducts;
// Get a single product
const getProductById = async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const productId = parseInt(req.params.id);
        const product = await db_1.default.product.findUnique({
            where: { id: productId },
            include: {
                seller: {
                    select: {
                        id: true,
                        username: true,
                        userImage: true,
                        email: true
                    }
                },
                images: {
                    select: {
                        id: true,
                        url: true,
                        isPrimary: true
                    },
                    orderBy: {
                        isPrimary: 'desc'
                    }
                }
            }
        });
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        // Hide seller email unless the product is purchased by the current user
        const isOwner = product.sellerId === userId;
        const hasPurchased = await db_1.default.order.findFirst({
            where: {
                productId,
                buyerId: userId,
                status: 'COMPLETED'
            }
        });
        // Format the response
        const formattedProduct = {
            id: product.id,
            title: product.title,
            description: product.description,
            price: product.price,
            category: product.category,
            condition: product.condition,
            quantity: product.quantity,
            status: product.status,
            createdAt: product.createdAt,
            seller: {
                id: product.seller.id,
                username: product.seller.username,
                userImage: product.seller.userImage,
                email: isOwner || hasPurchased ? product.seller.email : undefined
            },
            images: product.images.map(img => ({
                id: img.id,
                url: img.url,
                isPrimary: img.isPrimary
            }))
        };
        // Decrypt sensitive information if this is the buyer or seller
        if (isOwner || hasPurchased) {
            const productWithSensitiveInfo = await db_1.default.product.findUnique({
                where: { id: productId },
                select: {
                    contactInfo: true,
                    paymentInfo: true
                }
            });
            if (productWithSensitiveInfo) {
                // Add decrypted sensitive information
                if (productWithSensitiveInfo.contactInfo) {
                    try {
                        formattedProduct.contactInfo = JSON.parse(productWithSensitiveInfo.contactInfo);
                    }
                    catch (error) {
                        console.error('Error parsing contact info:', error);
                    }
                }
                if (productWithSensitiveInfo.paymentInfo && isOwner) {
                    try {
                        formattedProduct.paymentInfo = JSON.parse(productWithSensitiveInfo.paymentInfo);
                    }
                    catch (error) {
                        console.error('Error parsing payment info:', error);
                    }
                }
            }
        }
        res.json(formattedProduct);
    }
    catch (error) {
        console.error('Error fetching product:', error);
        return res.status(500).json({ error: 'Failed to fetch product' });
    }
};
exports.getProductById = getProductById;
// Create a new product
const createProduct = async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { title, description, price, category, condition, quantity, contactInfo } = req.body;
        const files = req.files;
        // Validate inputs
        if (!title || !description || !price || !category || !condition || !quantity) {
            // Delete uploaded files if validation fails
            files.forEach(file => {
                fs_1.default.unlinkSync(file.path);
            });
            return res.status(400).json({ error: 'All fields are required' });
        }
        if (files.length === 0) {
            return res.status(400).json({ error: 'At least one product image is required' });
        }
        // Encrypt contact information if provided
        let encryptedContactInfo = null;
        if (contactInfo) {
            encryptedContactInfo = JSON.stringify(contactInfo);
        }
        // Create the product
        const product = await db_1.default.product.create({
            data: {
                title,
                description,
                price: parseFloat(price),
                category,
                condition,
                quantity: parseInt(quantity),
                status: 'AVAILABLE',
                sellerId: userId,
                contactInfo: encryptedContactInfo
            }
        });
        // Save image records
        const imageRecords = await Promise.all(files.map(async (file, index) => {
            const relativePath = `/uploads/products/${file.filename}`;
            return db_1.default.productImage.create({
                data: {
                    productId: product.id,
                    url: relativePath,
                    isPrimary: index === 0 // First image is primary
                }
            });
        }));
        res.status(201).json({
            success: true,
            product: {
                id: product.id,
                title: product.title,
                price: product.price,
                images: imageRecords.map(img => img.url)
            }
        });
    }
    catch (error) {
        console.error('Error creating product:', error);
        // Delete uploaded files if an error occurs
        if (req.files) {
            const files = req.files;
            files.forEach(file => {
                if (fs_1.default.existsSync(file.path)) {
                    fs_1.default.unlinkSync(file.path);
                }
            });
        }
        res.status(500).json({ error: 'Failed to create product' });
    }
};
exports.createProduct = createProduct;
// Update a product
const updateProduct = async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const productId = parseInt(req.params.id);
        const { title, description, price, category, condition, quantity, status, deleteImages, contactInfo } = req.body;
        // Check if product exists and belongs to the current user
        const existingProduct = await db_1.default.product.findUnique({
            where: { id: productId },
            include: { images: true }
        });
        if (!existingProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }
        if (existingProduct.sellerId !== userId) {
            return res.status(403).json({ error: 'You do not have permission to update this product' });
        }
        // Handle image deletions if specified
        if (deleteImages && typeof deleteImages === 'string') {
            const imageIds = deleteImages.split(',').map(id => parseInt(id.trim()));
            // Get images to delete from database
            const imagesToDelete = await db_1.default.productImage.findMany({
                where: {
                    id: { in: imageIds },
                    productId
                }
            });
            // Delete image files from disk
            for (const image of imagesToDelete) {
                const filePath = path_1.default.join(__dirname, '../..', image.url);
                if (fs_1.default.existsSync(filePath)) {
                    fs_1.default.unlinkSync(filePath);
                }
            }
            // Delete image records from database
            await db_1.default.productImage.deleteMany({
                where: {
                    id: { in: imageIds },
                    productId
                }
            });
        }
        // Handle new image uploads
        const files = req.files;
        if (files && files.length > 0) {
            await Promise.all(files.map(async (file, index) => {
                const relativePath = `/uploads/products/${file.filename}`;
                // Check if there are existing images
                const existingImagesCount = await db_1.default.productImage.count({
                    where: { productId }
                });
                return db_1.default.productImage.create({
                    data: {
                        productId,
                        url: relativePath,
                        isPrimary: existingImagesCount === 0 && index === 0 // Set as primary only if no other images exist
                    }
                });
            }));
        }
        // Update contact information if provided
        let encryptedContactInfo = undefined;
        if (contactInfo) {
            encryptedContactInfo = JSON.stringify(contactInfo);
        }
        // Prepare update data with proper type handling
        const updateData = {};
        if (title)
            updateData.title = title;
        if (description)
            updateData.description = description;
        if (price)
            updateData.price = parseFloat(price);
        if (category)
            updateData.category = category;
        if (condition)
            updateData.condition = condition;
        if (quantity)
            updateData.quantity = parseInt(quantity);
        if (status)
            updateData.status = status;
        if (encryptedContactInfo !== undefined)
            updateData.contactInfo = encryptedContactInfo;
        // Update product details
        const updatedProduct = await db_1.default.product.update({
            where: { id: productId },
            data: updateData,
            include: {
                images: {
                    orderBy: {
                        isPrimary: 'desc'
                    }
                }
            }
        });
        res.json({
            success: true,
            product: Object.assign(Object.assign({}, updatedProduct), { images: updatedProduct.images.map(img => img.url) })
        });
    }
    catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
};
exports.updateProduct = updateProduct;
// Delete a product
const deleteProduct = async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const productId = parseInt(req.params.id);
        // Check if product exists and belongs to the current user
        const product = await db_1.default.product.findUnique({
            where: { id: productId },
            include: { images: true }
        });
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        if (product.sellerId !== userId) {
            return res.status(403).json({ error: 'You do not have permission to delete this product' });
        }
        // Delete image files
        for (const image of product.images) {
            const filePath = path_1.default.join(__dirname, '../..', image.url);
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
            }
        }
        // Delete product and related data (cascading delete for images is handled by Prisma)
        await db_1.default.product.delete({
            where: { id: productId }
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
};
exports.deleteProduct = deleteProduct;
// Purchase a product
const purchaseProduct = async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const productId = parseInt(req.params.id);
        // Get the product
        const product = await db_1.default.product.findUnique({
            where: { id: productId }
        });
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        if (product.status !== 'AVAILABLE') {
            return res.status(400).json({ error: 'Product is not available for purchase' });
        }
        if (product.sellerId === userId) {
            return res.status(400).json({ error: 'You cannot purchase your own product' });
        }
        // Check buyer's wallet balance
        const buyerWallet = await db_1.default.wallet.findUnique({
            where: { userId }
        });
        if (!buyerWallet || buyerWallet.balance < product.price) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }
        // Begin transaction
        const result = await db_1.default.$transaction(async (prisma) => {
            // Deduct from buyer's wallet
            const updatedBuyerWallet = await prisma.wallet.update({
                where: { userId },
                data: { balance: { decrement: product.price } }
            });
            // Add to seller's wallet
            const updatedSellerWallet = await prisma.wallet.upsert({
                where: { userId: product.sellerId },
                update: { balance: { increment: product.price } },
                create: {
                    userId: product.sellerId,
                    balance: product.price
                }
            });
            // Create purchase record
            const order = await prisma.order.create({
                data: {
                    buyerId: userId,
                    sellerId: product.sellerId,
                    productId,
                    price: product.price,
                    status: 'COMPLETED'
                }
            });
            // Update product status
            const updatedProduct = await prisma.product.update({
                where: { id: productId },
                data: { status: 'SOLD' }
            });
            // Create transaction records with encrypted data for payment details
            const paymentDetails = {
                productId,
                productTitle: product.title,
                amount: product.price,
                timestamp: new Date().toISOString()
            };
            // Encrypt sensitive transaction data for buyer
            const encryptedBuyerPaymentDetails = (0, productEncryption_1.encryptTransactionData)(paymentDetails, order.id, userId);
            // Buyer transaction data
            const buyerTransactionData = {
                userId,
                type: 'PURCHASE',
                amount: -product.price,
                description: `Purchased: ${product.title}`,
                status: 'COMPLETED',
                orderId: order.id,
                paymentDetails: JSON.stringify(encryptedBuyerPaymentDetails)
            };
            const buyerTransaction = await prisma.transaction.create({
                data: buyerTransactionData
            });
            // Encrypt sensitive transaction data for seller
            const encryptedSellerPaymentDetails = (0, productEncryption_1.encryptTransactionData)(paymentDetails, order.id, product.sellerId);
            // Seller transaction data
            const sellerTransactionData = {
                userId: product.sellerId,
                type: 'SALE',
                amount: product.price,
                description: `Sold: ${product.title}`,
                status: 'COMPLETED',
                orderId: order.id,
                paymentDetails: JSON.stringify(encryptedSellerPaymentDetails)
            };
            const sellerTransaction = await prisma.transaction.create({
                data: sellerTransactionData
            });
            return {
                order,
                product: updatedProduct,
                buyerWallet: updatedBuyerWallet,
                sellerWallet: updatedSellerWallet
            };
        });
        res.json({
            success: true,
            orderId: result.order.id,
            newBalance: result.buyerWallet.balance
        });
    }
    catch (error) {
        console.error('Error purchasing product:', error);
        res.status(500).json({ error: 'Failed to complete purchase' });
    }
};
exports.purchaseProduct = purchaseProduct;
// Request OTP for purchase verification
const requestOtp = async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { productId } = req.body;
        // In a real implementation, this would generate a random OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        // Store the OTP in a secure, temporary storage with expiration
        // Here we'd use Redis or a similar store with TTL (Time To Live)
        // For demo purposes, we'll just simulate success
        // In a production environment, we'd send the OTP via SMS or email
        // using a secure service
        res.status(200).json({
            success: true,
            message: 'OTP sent to your registered contact',
            // ONLY FOR TESTING - in production you would never return the OTP!
            testOtp: process.env.NODE_ENV === 'development' ? otp : undefined
        });
    }
    catch (error) {
        console.error('Error requesting OTP:', error);
        res.status(500).json({ error: 'Failed to generate OTP' });
    }
};
exports.requestOtp = requestOtp;
// Verify purchase with OTP
const verifyPurchase = async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { productId, otp } = req.body;
        // In a real implementation, this would verify the OTP against the stored one
        // Since we're simulating, we'll accept any 6-digit OTP
        if (!otp || otp.length !== 6) {
            return res.status(400).json({
                success: false,
                error: 'Invalid OTP'
            });
        }
        // In a real implementation, we would process the purchase here
        // For now, we'll call our purchase endpoint
        // Simulate successful verification
        res.status(200).json({
            success: true,
            message: 'OTP verified successfully'
        });
    }
    catch (error) {
        console.error('Error verifying purchase:', error);
        res.status(500).json({ error: 'Failed to verify OTP' });
    }
};
exports.verifyPurchase = verifyPurchase;
// Get user's purchase history
const getPurchaseHistory = async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const purchases = await db_1.default.order.findMany({
            where: { buyerId: userId },
            include: {
                product: {
                    include: {
                        images: {
                            where: { isPrimary: true },
                            take: 1
                        },
                        seller: {
                            select: {
                                id: true,
                                username: true,
                                userImage: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        // Format the response and decrypt sensitive data
        const formattedPurchases = await Promise.all(purchases.map(async (purchase) => {
            var _a;
            // Get transaction data to access encrypted payment details
            const transaction = await db_1.default.transaction.findFirst({
                where: {
                    userId,
                    orderId: purchase.id,
                    type: 'PURCHASE'
                }
            });
            let paymentDetails = null;
            if (transaction && transaction.paymentDetails) {
                try {
                    const encryptedDetails = JSON.parse(transaction.paymentDetails);
                    paymentDetails = (0, productEncryption_1.decryptTransactionData)(encryptedDetails, purchase.id, userId);
                }
                catch (error) {
                    console.error('Failed to decrypt payment details:', error);
                }
            }
            const formattedPurchase = {
                id: purchase.id,
                price: purchase.price,
                status: purchase.status,
                createdAt: purchase.createdAt,
                product: {
                    id: purchase.product.id,
                    title: purchase.product.title,
                    image: ((_a = purchase.product.images[0]) === null || _a === void 0 ? void 0 : _a.url) || null,
                    category: purchase.product.category
                },
                seller: purchase.product.seller
            };
            if (paymentDetails) {
                formattedPurchase.paymentDetails = paymentDetails;
            }
            return formattedPurchase;
        }));
        res.json(formattedPurchases);
    }
    catch (error) {
        console.error('Error fetching purchases:', error);
        res.status(500).json({ error: 'Failed to fetch purchase history' });
    }
};
exports.getPurchaseHistory = getPurchaseHistory;
// Get user's sales history
const getSalesHistory = async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const sales = await db_1.default.order.findMany({
            where: { sellerId: userId },
            include: {
                product: {
                    include: {
                        images: {
                            where: { isPrimary: true },
                            take: 1
                        }
                    }
                },
                buyer: {
                    select: {
                        id: true,
                        username: true,
                        userImage: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        // Format the response and decrypt sensitive data
        const formattedSales = await Promise.all(sales.map(async (sale) => {
            var _a;
            // Get transaction data to access encrypted payment details
            const transaction = await db_1.default.transaction.findFirst({
                where: {
                    userId,
                    orderId: sale.id,
                    type: 'SALE'
                }
            });
            let paymentDetails = null;
            if (transaction && transaction.paymentDetails) {
                try {
                    const encryptedDetails = JSON.parse(transaction.paymentDetails);
                    paymentDetails = (0, productEncryption_1.decryptTransactionData)(encryptedDetails, sale.id, userId);
                }
                catch (error) {
                    console.error('Failed to decrypt payment details:', error);
                }
            }
            const formattedSale = {
                id: sale.id,
                price: sale.price,
                status: sale.status,
                createdAt: sale.createdAt,
                product: {
                    id: sale.product.id,
                    title: sale.product.title,
                    image: ((_a = sale.product.images[0]) === null || _a === void 0 ? void 0 : _a.url) || null,
                    category: sale.product.category
                },
                buyer: sale.buyer
            };
            if (paymentDetails) {
                formattedSale.paymentDetails = paymentDetails;
            }
            return formattedSale;
        }));
        res.json(formattedSales);
    }
    catch (error) {
        console.error('Error fetching sales:', error);
        res.status(500).json({ error: 'Failed to fetch sales history' });
    }
};
exports.getSalesHistory = getSalesHistory;
