"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupChat = void 0;
const sequelize_1 = require("sequelize");
class GroupChat extends sequelize_1.Model {
    static initialize(sequelize) {
        GroupChat.init({
            name: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
                validate: {
                    len: [3, 50]
                }
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true
            },
            image: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true
            },
            ownerId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'Users',
                    key: 'id'
                }
            },
            isEnded: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            }
        }, {
            sequelize,
            modelName: 'GroupChat',
            tableName: 'GroupChats',
            indexes: [
                {
                    name: 'group_owner_idx',
                    fields: ['ownerId']
                }
            ]
        });
    }
    static associate(models) {
        GroupChat.belongsTo(models.User, {
            foreignKey: 'ownerId',
            as: 'owner'
        });
        GroupChat.hasMany(models.GroupChatMember, {
            foreignKey: 'groupChatId',
            as: 'members'
        });
        GroupChat.hasMany(models.GroupMessage, {
            foreignKey: 'groupChatId',
            as: 'messages'
        });
        // For easily getting the last message
        GroupChat.hasMany(models.GroupMessage, {
            foreignKey: 'groupChatId',
            as: 'lastMessage'
        });
    }
}
exports.GroupChat = GroupChat;
