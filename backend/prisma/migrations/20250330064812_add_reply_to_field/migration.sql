/*
  Warnings:

  - You are about to drop the column `groupId` on the `message` table. All the data in the column will be lost.
  - You are about to drop the column `mediaType` on the `message` table. All the data in the column will be lost.
  - You are about to drop the `groupchat` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `groupmember` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `groupchat` DROP FOREIGN KEY `GroupChat_createdById_fkey`;

-- DropForeignKey
ALTER TABLE `groupmember` DROP FOREIGN KEY `GroupMember_groupId_fkey`;

-- DropForeignKey
ALTER TABLE `groupmember` DROP FOREIGN KEY `GroupMember_userId_fkey`;

-- DropForeignKey
ALTER TABLE `message` DROP FOREIGN KEY `Message_groupId_fkey`;

-- AlterTable
ALTER TABLE `message` DROP COLUMN `groupId`,
    DROP COLUMN `mediaType`;

-- DropTable
DROP TABLE `groupchat`;

-- DropTable
DROP TABLE `groupmember`;

-- RenameIndex
ALTER TABLE `message` RENAME INDEX `Message_replyToId_fkey` TO `Message_replyToId_idx`;
