"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupMessage = void 0;
const sequelize_1 = require("sequelize");
class GroupMessage extends sequelize_1.Model {
    static initialize(sequelize) {
        GroupMessage.init({
            content: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false
            },
            mediaUrl: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true
            },
            mediaType: {
                type: sequelize_1.DataTypes.ENUM('image', 'video', 'audio', 'document'),
                allowNull: true
            },
            groupChatId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'GroupChats',
                    key: 'id'
                },
                onDelete: 'CASCADE'
            },
            userId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'Users',
                    key: 'id'
                }
            },
            parentMessageId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'GroupMessages',
                    key: 'id'
                },
                onDelete: 'SET NULL'
            },
            isSystem: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            }
        }, {
            sequelize,
            modelName: 'GroupMessage',
            tableName: 'GroupMessages',
            indexes: [
                {
                    name: 'group_message_group_idx',
                    fields: ['groupChatId']
                },
                {
                    name: 'group_message_user_idx',
                    fields: ['userId']
                },
                {
                    name: 'group_message_parent_idx',
                    fields: ['parentMessageId']
                }
            ]
        });
    }
    static associate(models) {
        GroupMessage.belongsTo(models.GroupChat, {
            foreignKey: 'groupChatId'
        });
        GroupMessage.belongsTo(models.User, {
            foreignKey: 'userId'
        });
        // Self-referencing association for replies
        GroupMessage.belongsTo(models.GroupMessage, {
            foreignKey: 'parentMessageId',
            as: 'parentMessage'
        });
        GroupMessage.hasMany(models.GroupMessage, {
            foreignKey: 'parentMessageId',
            as: 'replies'
        });
        // Read receipts
        GroupMessage.hasMany(models.GroupMessageRead, {
            foreignKey: 'groupMessageId',
            as: 'readReceipts'
        });
    }
}
exports.GroupMessage = GroupMessage;
