/*
  Warnings:

  - Added the required column `conversationId` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE `Conversation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user1Id` INTEGER NOT NULL,
    `user2Id` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Conversation_createdAt_idx`(`createdAt`),
    UNIQUE INDEX `Conversation_user1Id_user2Id_key`(`user1Id`, `user2Id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Insert a default conversation for existing messages
INSERT INTO `Conversation` (`user1Id`, `user2Id`, `createdAt`, `updatedAt`)
SELECT DISTINCT 
    CASE WHEN senderId < receiverId THEN senderId ELSE receiverId END as user1Id,
    CASE WHEN senderId < receiverId THEN receiverId ELSE senderId END as user2Id,
    MIN(createdAt) as createdAt,
    NOW() as updatedAt
FROM `Message`
GROUP BY user1Id, user2Id;

-- AlterTable
ALTER TABLE `message` 
    ADD COLUMN `conversationId` INTEGER NULL,
    ADD COLUMN `editedAt` DATETIME(3) NULL,
    ADD COLUMN `isSystemMessage` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `readAt` DATETIME(3) NULL,
    ADD COLUMN `sharedPostId` INTEGER NULL;

-- Update existing messages to use the correct conversation ID
UPDATE `Message` m
JOIN `Conversation` c ON 
    (m.senderId = c.user1Id AND m.receiverId = c.user2Id) OR 
    (m.senderId = c.user2Id AND m.receiverId = c.user1Id)
SET m.conversationId = c.id;

-- Now make the column required after filling in all values
ALTER TABLE `message` MODIFY COLUMN `conversationId` INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX `Message_conversationId_idx` ON `Message`(`conversationId`);

-- CreateIndex
CREATE INDEX `Message_sharedPostId_idx` ON `Message`(`sharedPostId`);

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `Conversation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_sharedPostId_fkey` FOREIGN KEY (`sharedPostId`) REFERENCES `Post`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Conversation` ADD CONSTRAINT `Conversation_user1Id_fkey` FOREIGN KEY (`user1Id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Conversation` ADD CONSTRAINT `Conversation_user2Id_fkey` FOREIGN KEY (`user2Id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
