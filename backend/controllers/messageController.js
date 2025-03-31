// Group chat controllers
exports.createGroupChat = async (req, res) => {
  try {
    const { name, description, memberIds } = req.body;
    const userId = req.user.id;
    
    if (!name || !Array.isArray(memberIds)) {
      return res.status(400).json({ message: 'Group name and members are required' });
    }
    
    if (name.trim().length < 3) {
      return res.status(400).json({ message: 'Group name must be at least 3 characters long' });
    }
    
    if (memberIds.length < 1 || memberIds.length > 7) {
      return res.status(400).json({ message: 'Group must have between 1 and 7 members (excluding you)' });
    }
    
    // Validate that all memberIds exist
    const members = await User.findAll({
      where: {
        id: memberIds
      },
      attributes: ['id']
    });
    
    if (members.length !== memberIds.length) {
      return res.status(400).json({ message: 'One or more selected users do not exist' });
    }
    
    // Create group chat
    const groupChat = await GroupChat.create({
      name: name.trim(),
      description: description ? description.trim() : null,
      ownerId: userId
    });
    
    // Add members (including the creator as admin and owner)
    const memberPromises = memberIds.map(memberId => 
      GroupChatMember.create({
        groupChatId: groupChat.id,
        userId: memberId,
        isAdmin: false,
        isOwner: false
      })
    );
    
    // Add creator as owner and admin
    memberPromises.push(
      GroupChatMember.create({
        groupChatId: groupChat.id,
        userId,
        isAdmin: true,
        isOwner: true
      })
    );
    
    await Promise.all(memberPromises);
    
    res.status(201).json({ id: groupChat.id });
  } catch (err) {
    console.error('Error creating group chat:', err);
    res.status(500).json({ message: 'Failed to create group chat' });
  }
};

exports.getGroupChats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all group chats where the user is a member
    const groupChats = await GroupChat.findAll({
      include: [
        {
          model: GroupChatMember,
          where: { userId },
          attributes: ['isAdmin', 'isOwner'],
          required: true
        },
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'username', 'profileImage']
        },
        {
          model: GroupChatMember,
          as: 'members',
          include: [
            {
              model: User,
              attributes: ['id', 'username', 'profileImage']
            }
          ]
        },
        {
          model: GroupMessage,
          as: 'lastMessage',
          limit: 1,
          order: [['createdAt', 'DESC']],
          include: [
            {
              model: User,
              attributes: ['id', 'username']
            }
          ]
        }
      ],
      order: [
        [{ model: GroupMessage, as: 'lastMessage' }, 'createdAt', 'DESC']
      ]
    });

    // Format the response
    const formattedGroupChats = groupChats.map(group => {
      const userMembership = group.GroupChatMembers.find(m => m.userId === userId);
      
      return {
        id: group.id,
        name: group.name,
        description: group.description,
        image: group.image,
        ownerId: group.ownerId,
        isEnded: group.isEnded,
        createdAt: group.createdAt,
        isAdmin: userMembership?.isAdmin || false,
        isOwner: userMembership?.isOwner || false,
        lastMessage: group.lastMessage?.length > 0 ? {
          id: group.lastMessage[0].id,
          content: group.lastMessage[0].content,
          createdAt: group.lastMessage[0].createdAt,
          sender: {
            id: group.lastMessage[0].User.id,
            username: group.lastMessage[0].User.username
          }
        } : null,
        memberCount: group.members.length,
        members: group.members.map(member => ({
          id: member.User.id,
          username: member.User.username,
          userImage: member.User.profileImage,
          isAdmin: member.isAdmin,
          isOwner: member.isOwner
        }))
      };
    });

    res.json(formattedGroupChats);
  } catch (err) {
    console.error('Error fetching group chats:', err);
    res.status(500).json({ message: 'Failed to fetch group chats' });
  }
};

// Get details of a specific group chat
exports.getGroupChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = req.params.groupId;
    
    // Check if the user is a member of the group
    const isMember = await GroupChatMember.findOne({
      where: {
        groupChatId: groupId,
        userId
      }
    });

    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }
    
    // Get group details
    const groupChat = await GroupChat.findByPk(groupId, {
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'username', 'profileImage']
        },
        {
          model: GroupChatMember,
          as: 'members',
          include: [
            {
              model: User,
              attributes: ['id', 'username', 'profileImage']
            }
          ]
        }
      ]
    });
    
    if (!groupChat) {
      return res.status(404).json({ message: 'Group chat not found' });
    }
    
    // Format the response
    const formattedGroup = {
      id: groupChat.id,
      name: groupChat.name,
      description: groupChat.description,
      image: groupChat.image,
      ownerId: groupChat.ownerId,
      isEnded: groupChat.isEnded,
      createdAt: groupChat.createdAt,
      updatedAt: groupChat.updatedAt,
      owner: {
        id: groupChat.owner.id,
        username: groupChat.owner.username,
        profileImage: groupChat.owner.profileImage
      },
      members: groupChat.members.map(member => ({
        id: member.User.id,
        username: member.User.username,
        userImage: member.User.profileImage,
        isAdmin: member.isAdmin,
        isOwner: member.isOwner
      }))
    };
    
    res.json(formattedGroup);
  } catch (err) {
    console.error('Error fetching group chat:', err);
    res.status(500).json({ message: 'Failed to fetch group chat details' });
  }
};

exports.getGroupChatMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = req.params.groupId;
    const includeReplies = req.query.includeReplies === 'true';
    
    // Check if the user is a member of the group
    const isMember = await GroupChatMember.findOne({
      where: {
        groupChatId: groupId,
        userId
      }
    });

    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    // Get group messages
    const messages = await GroupMessage.findAll({
      where: {
        groupChatId: groupId,
        ...(includeReplies ? {} : { parentMessageId: null })
      },
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'profileImage']
        },
        {
          model: GroupMessageRead,
          attributes: ['userId', 'readAt']
        },
        {
          model: GroupMessage,
          as: 'replies',
          include: [
            {
              model: User,
              attributes: ['id', 'username', 'profileImage']
            },
            {
              model: GroupMessageRead,
              attributes: ['userId', 'readAt']
            }
          ]
        }
      ],
      order: [
        ['createdAt', 'ASC'],
        [{ model: GroupMessage, as: 'replies' }, 'createdAt', 'ASC']
      ]
    });

    // Format the response
    const formattedMessages = messages.map(message => ({
      id: message.id,
      content: message.content,
      mediaUrl: message.mediaUrl,
      mediaType: message.mediaType,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      parentMessageId: message.parentMessageId,
      sender: {
        id: message.User.id,
        username: message.User.username,
        profileImage: message.User.profileImage
      },
      readBy: message.GroupMessageReads.map(read => ({
        userId: read.userId,
        readAt: read.readAt
      })),
      ...(includeReplies && {
        replies: (message.replies || []).map(reply => ({
          id: reply.id,
          content: reply.content,
          mediaUrl: reply.mediaUrl,
          mediaType: reply.mediaType,
          createdAt: reply.createdAt,
          updatedAt: reply.updatedAt,
          sender: {
            id: reply.User.id,
            username: reply.User.username,
            profileImage: reply.User.profileImage
          },
          readBy: reply.GroupMessageReads.map(read => ({
            userId: read.userId,
            readAt: read.readAt
          }))
        }))
      })
    }));

    // Mark all unread messages as read
    const unreadMessages = await GroupMessage.findAll({
      where: {
        groupChatId: groupId
      },
      include: [
        {
          model: GroupMessageRead,
          where: {
            userId
          },
          required: false
        }
      ],
      having: Sequelize.literal('COUNT(GroupMessageReads.id) = 0'),
      group: ['GroupMessage.id']
    });

    const readPromises = unreadMessages.map(message => 
      GroupMessageRead.create({
        groupMessageId: message.id,
        userId,
        readAt: new Date()
      })
    );

    await Promise.all(readPromises);

    res.json(formattedMessages);
  } catch (err) {
    console.error('Error fetching group messages:', err);
    res.status(500).json({ message: 'Failed to fetch group messages' });
  }
};

exports.sendGroupMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = req.params.groupId;
    const { content, parentMessageId } = req.body;
    
    // Get the group chat
    const groupChat = await GroupChat.findByPk(groupId);
    
    if (!groupChat) {
      return res.status(404).json({ message: 'Group chat not found' });
    }
    
    // Check if the group is ended
    if (groupChat.isEnded) {
      return res.status(403).json({ message: 'This group chat has been ended and no new messages can be sent' });
    }
    
    // Check if the user is a member of the group
    const isMember = await GroupChatMember.findOne({
      where: {
        groupChatId: groupId,
        userId
      }
    });

    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    // Validate message content
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    // If it's a reply, check if parent message exists and belongs to the same group
    if (parentMessageId) {
      const parentMessage = await GroupMessage.findByPk(parentMessageId);
      
      if (!parentMessage) {
        return res.status(404).json({ message: 'Parent message not found' });
      }
      
      if (parentMessage.groupChatId !== parseInt(groupId)) {
        return res.status(400).json({ message: 'Parent message does not belong to this group' });
      }
    }

    // Create message
    const message = await GroupMessage.create({
      content: content.trim(),
      userId,
      groupChatId: groupId,
      parentMessageId: parentMessageId || null
    });

    // Read own message
    await GroupMessageRead.create({
      groupMessageId: message.id,
      userId,
      readAt: new Date()
    });

    // Fetch complete message with user data
    const completeMessage = await GroupMessage.findByPk(message.id, {
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'profileImage']
        },
        {
          model: GroupMessageRead,
          attributes: ['userId', 'readAt']
        }
      ]
    });

    // Format the response
    const formattedMessage = {
      id: completeMessage.id,
      content: completeMessage.content,
      mediaUrl: completeMessage.mediaUrl,
      mediaType: completeMessage.mediaType,
      createdAt: completeMessage.createdAt,
      updatedAt: completeMessage.updatedAt,
      parentMessageId: completeMessage.parentMessageId,
      sender: {
        id: completeMessage.User.id,
        username: completeMessage.User.username,
        profileImage: completeMessage.User.profileImage
      },
      readBy: completeMessage.GroupMessageReads.map(read => ({
        userId: read.userId,
        readAt: read.readAt
      }))
    };

    // TODO: Emit socket event for new message

    res.status(201).json(formattedMessage);
  } catch (err) {
    console.error('Error sending group message:', err);
    res.status(500).json({ message: 'Failed to send message' });
  }
};

exports.updateGroupChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = req.params.groupId;
    const { name, description } = req.body;
    
    // Check if user is admin
    const userMembership = await GroupChatMember.findOne({
      where: {
        groupChatId: groupId,
        userId,
        isAdmin: true
      }
    });
    
    if (!userMembership) {
      return res.status(403).json({ message: 'You do not have permission to update this group' });
    }
    
    // Update group chat
    const groupChat = await GroupChat.findByPk(groupId);
    
    if (!groupChat) {
      return res.status(404).json({ message: 'Group chat not found' });
    }
    
    // Track changes to create appropriate system messages
    const changes = [];
    const oldName = groupChat.name;
    const oldDescription = groupChat.description;
    
    // Update fields if provided
    if (name !== undefined && name !== oldName) {
      // Validate name
      if (name.length < 3 || name.length > 50) {
        return res.status(400).json({ message: 'Group name must be between 3 and 50 characters' });
      }
      groupChat.name = name;
      changes.push('name');
    }
    
    if (description !== undefined && description !== oldDescription) {
      groupChat.description = description;
      changes.push('description');
    }
    
    // Save changes if any
    if (changes.length > 0) {
      await groupChat.save();
      
      // Create system messages for each change
      if (changes.includes('name')) {
        await GroupMessage.create({
          content: `${req.user.username} changed the group name to "${name}"`,
          userId: 0, // System user
          groupChatId: groupId,
          isSystem: true
        });
      }
      
      if (changes.includes('description')) {
        await GroupMessage.create({
          content: description 
            ? `${req.user.username} updated the group description` 
            : `${req.user.username} removed the group description`,
          userId: 0, // System user
          groupChatId: groupId,
          isSystem: true
        });
      }
    }
    
    res.json({
      id: groupChat.id,
      name: groupChat.name,
      description: groupChat.description
    });
  } catch (err) {
    console.error('Error updating group chat:', err);
    res.status(500).json({ message: 'Failed to update group chat' });
  }
};

exports.updateGroupImage = async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = req.params.groupId;
    
    // Check if user is admin
    const userMembership = await GroupChatMember.findOne({
      where: {
        groupChatId: groupId,
        userId,
        isAdmin: true
      }
    });
    
    if (!userMembership) {
      return res.status(403).json({ message: 'You do not have permission to update this group' });
    }
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }
    
    // Update group image
    const groupChat = await GroupChat.findByPk(groupId);
    
    if (!groupChat) {
      return res.status(404).json({ message: 'Group chat not found' });
    }
    
    // Delete old image if exists
    if (groupChat.image) {
      try {
        const oldImagePath = path.join(__dirname, '..', 'public', groupChat.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      } catch (error) {
        console.error('Error deleting old image:', error);
      }
    }
    
    // Update with new image
    groupChat.image = `/uploads/group-images/${req.file.filename}`;
    await groupChat.save();
    
    // Add system message about image change
    await GroupMessage.create({
      content: `${req.user.username} changed the group image`,
      userId: 0, // System user
      groupChatId: groupId,
      isSystem: true
    });
    
    res.json({
      id: groupChat.id,
      image: groupChat.image
    });
  } catch (err) {
    console.error('Error updating group image:', err);
    res.status(500).json({ message: 'Failed to update group image' });
  }
};

exports.deleteGroupImage = async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = req.params.groupId;
    
    // Check if user is admin
    const userMembership = await GroupChatMember.findOne({
      where: {
        groupChatId: groupId,
        userId,
        isAdmin: true
      }
    });
    
    if (!userMembership) {
      return res.status(403).json({ message: 'You do not have permission to update this group' });
    }
    
    // Delete group image
    const groupChat = await GroupChat.findByPk(groupId);
    
    if (!groupChat) {
      return res.status(404).json({ message: 'Group chat not found' });
    }
    
    if (groupChat.image) {
      try {
        const imagePath = path.join(__dirname, '..', 'public', groupChat.image);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } catch (error) {
        console.error('Error deleting image file:', error);
      }
      
      groupChat.image = null;
      await groupChat.save();
      
      // Add system message about image removal
      await GroupMessage.create({
        content: `${req.user.username} removed the group image`,
        userId: 0, // System user
        groupChatId: groupId,
        isSystem: true
      });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting group image:', err);
    res.status(500).json({ message: 'Failed to delete group image' });
  }
};

exports.addGroupMember = async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = req.params.groupId;
    const { memberId } = req.body;
    
    if (!memberId) {
      return res.status(400).json({ message: 'Member ID is required' });
    }
    
    // Check if user is admin
    const userMembership = await GroupChatMember.findOne({
      where: {
        groupChatId: groupId,
        userId,
        isAdmin: true
      }
    });
    
    if (!userMembership) {
      return res.status(403).json({ message: 'You do not have permission to add members to this group' });
    }
    
    // Check if user exists
    const memberUser = await User.findByPk(memberId);
    if (!memberUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if the group is at max capacity
    const memberCount = await GroupChatMember.count({
      where: { groupChatId: groupId }
    });
    
    if (memberCount >= 8) {
      return res.status(400).json({ message: 'Group already has the maximum number of members (8)' });
    }
    
    // Check if user is already a member
    const existingMembership = await GroupChatMember.findOne({
      where: {
        groupChatId: groupId,
        userId: memberId
      }
    });
    
    if (existingMembership) {
      return res.status(400).json({ message: 'User is already a member of this group' });
    }
    
    // Add user to group
    const membership = await GroupChatMember.create({
      groupChatId: groupId,
      userId: memberId,
      isAdmin: false,
      isOwner: false
    });
    
    // Add system message about the new member
    await GroupMessage.create({
      content: `${req.user.username} added ${memberUser.username} to the group`,
      userId: 0, // System user
      groupChatId: groupId,
      isSystem: true
    });
    
    // Return the member data
    const memberData = {
      id: memberUser.id,
      username: memberUser.username,
      userImage: memberUser.profileImage,
      isAdmin: false,
      isOwner: false
    };
    
    res.status(201).json(memberData);
  } catch (err) {
    console.error('Error adding member to group:', err);
    res.status(500).json({ message: 'Failed to add member' });
  }
};

exports.toggleAdminStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = req.params.groupId;
    const memberId = req.params.memberId;
    const { isAdmin } = req.body;
    
    // Check if user is owner
    const userMembership = await GroupChatMember.findOne({
      where: {
        groupChatId: groupId,
        userId,
        isOwner: true
      }
    });
    
    if (!userMembership) {
      return res.status(403).json({ message: 'Only the group owner can change admin status' });
    }
    
    // Check if member exists in the group
    const memberToUpdate = await GroupChatMember.findOne({
      where: {
        groupChatId: groupId,
        userId: memberId
      }
    });
    
    if (!memberToUpdate) {
      return res.status(404).json({ message: 'Member not found in this group' });
    }
    
    // Prevent changing owner's admin status
    if (memberToUpdate.isOwner) {
      return res.status(400).json({ message: 'Cannot change admin status of the group owner' });
    }

    // Get the member's username for the system message
    const memberUser = await User.findByPk(memberId);
    if (!memberUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update admin status
    memberToUpdate.isAdmin = !!isAdmin;
    await memberToUpdate.save();
    
    // Add system message about the admin status change
    const systemMessage = memberToUpdate.isAdmin
      ? `${req.user.username} made ${memberUser.username} an admin`
      : `${req.user.username} removed ${memberUser.username} as admin`;
    
    await GroupMessage.create({
      content: systemMessage,
      userId: 0, // System user
      groupChatId: groupId,
      isSystem: true
    });
    
    res.json({
      userId: memberToUpdate.userId,
      isAdmin: memberToUpdate.isAdmin
    });
  } catch (err) {
    console.error('Error updating admin status:', err);
    res.status(500).json({ message: 'Failed to update admin status' });
  }
};

exports.removeGroupMember = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const groupId = req.params.groupId;
    const memberId = req.params.memberId;
    
    // Check if group exists
    const groupChat = await GroupChat.findByPk(groupId);
    if (!groupChat) {
      return res.status(404).json({ message: 'Group chat not found' });
    }
    
    // Get the user being removed
    const memberUser = await User.findByPk(memberId);
    if (!memberUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if the user being removed is a member
    const membershipToRemove = await GroupChatMember.findOne({
      where: {
        groupChatId: groupId,
        userId: memberId
      }
    });
    
    if (!membershipToRemove) {
      return res.status(404).json({ message: 'User is not a member of this group' });
    }
    
    // Check permission to remove:
    // 1. Users can remove themselves (leave group)
    // 2. Group owner can remove anyone
    // 3. Admins can remove non-admins
    
    const currentUserMembership = await GroupChatMember.findOne({
      where: {
        groupChatId: groupId,
        userId: currentUserId
      }
    });
    
    const isRemovingSelf = currentUserId === parseInt(memberId);
    const isOwner = currentUserMembership?.isOwner;
    const isAdmin = currentUserMembership?.isAdmin;
    const targetIsOwner = membershipToRemove.isOwner;
    const targetIsAdmin = membershipToRemove.isAdmin;
    
    let permitted = isRemovingSelf; // Users can always remove themselves
    
    if (!permitted) {
      if (isOwner) {
        permitted = true; // Owner can remove anyone
      } else if (isAdmin && !targetIsOwner && !targetIsAdmin) {
        permitted = true; // Admin can remove non-admins
      }
    }
    
    if (!permitted) {
      return res.status(403).json({ 
        message: 'You do not have permission to remove this member' 
      });
    }
    
    // Remove the member
    await membershipToRemove.destroy();
    
    // Create appropriate system message
    let systemMessage;
    if (isRemovingSelf) {
      systemMessage = `${req.user.username} left the group`;
    } else {
      systemMessage = `${req.user.username} removed ${memberUser.username} from the group`;
    }
    
    await GroupMessage.create({
      content: systemMessage,
      userId: 0, // System user
      groupChatId: groupId,
      isSystem: true
    });
    
    // If the owner leaves, transfer ownership to another admin or the oldest member
    if (isRemovingSelf && targetIsOwner) {
      // Find an admin to transfer ownership to
      const newOwner = await GroupChatMember.findOne({
        where: {
          groupChatId: groupId,
          isAdmin: true
        },
        order: [['createdAt', 'ASC']]
      });
      
      if (newOwner) {
        newOwner.isOwner = true;
        await newOwner.save();
        
        // Get the new owner's username
        const newOwnerUser = await User.findByPk(newOwner.userId);
        
        // Create system message about ownership transfer
        await GroupMessage.create({
          content: `${newOwnerUser.username} is now the owner of the group`,
          userId: 0, // System user
          groupChatId: groupId,
          isSystem: true
        });
        
        // Update the group's ownerId
        groupChat.ownerId = newOwner.userId;
        await groupChat.save();
      } else {
        // If no admin exists, find the oldest member
        const oldestMember = await GroupChatMember.findOne({
          where: { groupChatId: groupId },
          order: [['createdAt', 'ASC']]
        });
        
        if (oldestMember) {
          oldestMember.isOwner = true;
          oldestMember.isAdmin = true;
          await oldestMember.save();
          
          // Get the new owner's username
          const newOwnerUser = await User.findByPk(oldestMember.userId);
          
          // Create system message about ownership transfer
          await GroupMessage.create({
            content: `${newOwnerUser.username} is now the owner of the group`,
            userId: 0, // System user
            groupChatId: groupId,
            isSystem: true
          });
          
          // Update the group's ownerId
          groupChat.ownerId = oldestMember.userId;
          await groupChat.save();
        }
        // If no members left, the group becomes orphaned (this shouldn't happen in normal use)
      }
    }
    
    res.json({ message: 'Member removed successfully' });
  } catch (err) {
    console.error('Error removing member from group:', err);
    res.status(500).json({ message: 'Failed to remove member from group' });
  }
};

// End a group chat (close it permanently)
exports.endGroupChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = req.params.groupId;
    
    // Check if user is the owner
    const groupChat = await GroupChat.findByPk(groupId);
    
    if (!groupChat) {
      return res.status(404).json({ message: 'Group chat not found' });
    }
    
    if (groupChat.ownerId !== userId) {
      return res.status(403).json({ message: 'Only the group owner can end the group chat' });
    }
    
    // Mark the group as ended
    groupChat.isEnded = true;
    await groupChat.save();
    
    // Create system message about group ending
    await GroupMessage.create({
      content: `${req.user.username} ended the group chat. No new messages can be sent.`,
      userId: 0, // System user
      groupChatId: groupId,
      isSystem: true
    });
    
    res.json({ message: 'Group chat has been ended successfully' });
  } catch (err) {
    console.error('Error ending group chat:', err);
    res.status(500).json({ message: 'Failed to end group chat' });
  }
}; 