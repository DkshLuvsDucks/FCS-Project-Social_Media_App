import { Model, DataTypes, Sequelize } from 'sequelize';

export class GroupChat extends Model {
  public id!: number;
  public name!: string;
  public description?: string;
  public image?: string | null;
  public ownerId!: number;
  public isEnded!: boolean;
  public createdAt!: Date;
  public updatedAt!: Date;

  public static initialize(sequelize: Sequelize): void {
    GroupChat.init({
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [3, 50]
        }
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      image: {
        type: DataTypes.STRING,
        allowNull: true
      },
      ownerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      isEnded: {
        type: DataTypes.BOOLEAN,
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

  public static associate(models: any): void {
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