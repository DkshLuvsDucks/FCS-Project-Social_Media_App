"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupMessageRead = exports.GroupMessage = exports.GroupChatMember = exports.GroupChat = exports.sequelize = void 0;
const sequelize_1 = require("sequelize");
const GroupChat_1 = require("./GroupChat");
Object.defineProperty(exports, "GroupChat", { enumerable: true, get: function () { return GroupChat_1.GroupChat; } });
const GroupChatMember_1 = require("./GroupChatMember");
Object.defineProperty(exports, "GroupChatMember", { enumerable: true, get: function () { return GroupChatMember_1.GroupChatMember; } });
const GroupMessage_1 = require("./GroupMessage");
Object.defineProperty(exports, "GroupMessage", { enumerable: true, get: function () { return GroupMessage_1.GroupMessage; } });
const GroupMessageRead_1 = require("./GroupMessageRead");
Object.defineProperty(exports, "GroupMessageRead", { enumerable: true, get: function () { return GroupMessageRead_1.GroupMessageRead; } });
// Initialize sequelize connection
const sequelize = new sequelize_1.Sequelize(process.env.DB_NAME || 'social_media', process.env.DB_USER || 'root', process.env.DB_PASSWORD || '', {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
});
exports.sequelize = sequelize;
// Initialize all models
const models = {
    GroupChat: GroupChat_1.GroupChat,
    GroupChatMember: GroupChatMember_1.GroupChatMember,
    GroupMessage: GroupMessage_1.GroupMessage,
    GroupMessageRead: GroupMessageRead_1.GroupMessageRead,
};
// Initialize each model
GroupChat_1.GroupChat.initialize(sequelize);
GroupChatMember_1.GroupChatMember.initialize(sequelize);
GroupMessage_1.GroupMessage.initialize(sequelize);
GroupMessageRead_1.GroupMessageRead.initialize(sequelize);
// Set up associations
Object.values(models).forEach((model) => {
    if (model.associate) {
        model.associate(models);
    }
});
exports.default = models;
