import { Sequelize } from 'sequelize';
import { GroupChat } from './GroupChat';
import { GroupChatMember } from './GroupChatMember';
import { GroupMessage } from './GroupMessage';
import { GroupMessageRead } from './GroupMessageRead';

// Initialize sequelize connection
const sequelize = new Sequelize(
  process.env.DB_NAME || 'social_media',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
  }
);

// Initialize all models
const models = {
  GroupChat,
  GroupChatMember,
  GroupMessage,
  GroupMessageRead,
};

// Initialize each model
GroupChat.initialize(sequelize);
GroupChatMember.initialize(sequelize);
GroupMessage.initialize(sequelize);
GroupMessageRead.initialize(sequelize);

// Set up associations
Object.values(models).forEach((model: any) => {
  if (model.associate) {
    model.associate(models);
  }
});

export {
  sequelize,
  GroupChat,
  GroupChatMember,
  GroupMessage,
  GroupMessageRead,
};

export default models; 