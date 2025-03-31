import { Model, DataTypes, Sequelize } from 'sequelize';

export class GroupChatMember extends Model {
  public id!: number;
  public groupChatId!: number;
  public userId!: number;
  public isAdmin!: boolean;
  public isOwner!: boolean;
  public createdAt!: Date;
  public updatedAt!: Date;

  public static initialize(sequelize: Sequelize): void {
    GroupChatMember.init({
      groupChatId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'GroupChats',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      isAdmin: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      isOwner: {
        type: DataTypes.BOOLEAN,
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

  public static associate(models: any): void {
    GroupChatMember.belongsTo(models.GroupChat, {
      foreignKey: 'groupChatId'
    });

    GroupChatMember.belongsTo(models.User, {
      foreignKey: 'userId'
    });
  }
} 