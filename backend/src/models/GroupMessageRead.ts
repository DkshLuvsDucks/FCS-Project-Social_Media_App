import { Model, DataTypes, Sequelize } from 'sequelize';

export class GroupMessageRead extends Model {
  public id!: number;
  public groupMessageId!: number;
  public userId!: number;
  public readAt!: Date;
  public createdAt!: Date;
  public updatedAt!: Date;

  public static initialize(sequelize: Sequelize): void {
    GroupMessageRead.init({
      groupMessageId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'GroupMessages',
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
      readAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
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

  public static associate(models: any): void {
    GroupMessageRead.belongsTo(models.GroupMessage, {
      foreignKey: 'groupMessageId'
    });

    GroupMessageRead.belongsTo(models.User, {
      foreignKey: 'userId'
    });
  }
} 