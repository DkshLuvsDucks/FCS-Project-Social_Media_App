"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupChatMember = void 0;
const sequelize_1 = require("sequelize");
class GroupChatMember extends sequelize_1.Model {
    static initialize(sequelize) {
        GroupChatMember.init({
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
                },
                onDelete: 'CASCADE'
            },
            isAdmin: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            isOwner: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            }
        }, {
            sequelize,
            modelName: 'GroupChatMember',
            tableName: 'GroupChatMembers',
            indexes: [
                {
                    name: 'group_member_unique',
                    unique: true,
                    fields: ['groupChatId', 'userId']
                },
                {
                    name: 'group_member_user_idx',
                    fields: ['userId']
                }
            ]
        });
    }
    static associate(models) {
        GroupChatMember.belongsTo(models.GroupChat, {
            foreignKey: 'groupChatId'
        });
        GroupChatMember.belongsTo(models.User, {
            foreignKey: 'userId'
        });
    }
}
exports.GroupChatMember = GroupChatMember;
