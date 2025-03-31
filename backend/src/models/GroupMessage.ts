import { Model, DataTypes, Sequelize } from 'sequelize';

export class GroupMessage extends Model {
  public id!: number;
  public content!: string;
  public mediaUrl?: string | null;
  public mediaType?: 'image' | 'video' | 'audio' | 'document' | null;
  public groupChatId!: number;
  public userId!: number;
  public parentMessageId?: number | null;
  public isSystem!: boolean;
  public createdAt!: Date;
  public updatedAt!: Date;

  public static initialize(sequelize: Sequelize): void {
    GroupMessage.init({
      content: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      mediaUrl: {
        type: DataTypes.STRING,
        allowNull: true
      },
      mediaType: {
        type: DataTypes.ENUM('image', 'video', 'audio', 'document'),
        allowNull: true
      },
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
        }
      },
      parentMessageId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'GroupMessages',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      isSystem: {
        type: DataTypes.BOOLEAN,
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

  public static associate(models: any): void {
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