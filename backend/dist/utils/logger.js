"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityLogger = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Create logs directory if it doesn't exist
const logDirectory = path_1.default.join(__dirname, '../../logs');
if (!fs_1.default.existsSync(logDirectory)) {
    fs_1.default.mkdirSync(logDirectory, { recursive: true });
}
// Configure the Winston logger
exports.logger = winston_1.default.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.splat(), winston_1.default.format.json()),
    defaultMeta: { service: 'social-media-api' },
    transports: [
        // Write to all logs with level 'info' and below to 'combined.log'
        new winston_1.default.transports.File({
            filename: path_1.default.join(logDirectory, 'combined.log'),
            maxsize: 10485760, // 10MB
            maxFiles: 5,
        }),
        // Write all logs with level 'error' and below to 'error.log'
        new winston_1.default.transports.File({
            filename: path_1.default.join(logDirectory, 'error.log'),
            level: 'error',
            maxsize: 10485760, // 10MB
            maxFiles: 5,
        }),
        // Write security-related logs to 'security.log'
        new winston_1.default.transports.File({
            filename: path_1.default.join(logDirectory, 'security.log'),
            level: 'warn',
            maxsize: 10485760, // 10MB
            maxFiles: 5,
        }),
    ],
});
// If we're not in production, log to the console as well
if (process.env.NODE_ENV !== 'production') {
    exports.logger.add(new winston_1.default.transports.Console({
        format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple()),
    }));
}
// Export a security-specific logger for security events
exports.securityLogger = {
    warn: (message) => {
        exports.logger.warn(message, { category: 'security' });
    },
    error: (message) => {
        exports.logger.error(message, { category: 'security' });
    },
    info: (message) => {
        exports.logger.info(message, { category: 'security' });
    }
};
