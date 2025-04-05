"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupMessageRead = void 0;
const sequelize_1 = require("sequelize");
class GroupMessageRead extends sequelize_1.Model {
    static initialize(sequelize) {
        GroupMessageRead.init({
            groupMessageId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'GroupMessages',
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
                },
                onDelete: 'CASCADE'
            },
            readAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW
            }
        }, {
            sequelize,
            modelName: 'GroupMessageRead',
            tableName: 'GroupMessageReads',
            indexes: [
                {
                    name: 'group_message_read_unique',
                    unique: true,
                    fields: ['groupMessageId', 'userId']
                },
                {
                    name: 'group_message_read_user_idx',
                    fields: ['userId']
                },
                {
                    name: 'group_message_read_message_idx',
                    fields: ['groupMessageId']
                }
            ]
        });
    }
    static associate(models) {
        GroupMessageRead.belongsTo(models.GroupMessage, {
            foreignKey: 'groupMessageId'
        });
        GroupMessageRead.belongsTo(models.User, {
            foreignKey: 'userId'
        });
    }
}
exports.GroupMessageRead = GroupMessageRead;
