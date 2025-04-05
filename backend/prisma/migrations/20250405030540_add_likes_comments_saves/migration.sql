/*
  Warnings:

  - You are about to drop the column `isPrivateAccount` on the `user` table. All the data in the column will be lost.
  - You are about to drop the `comment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `like` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `mediaitem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `savedpost` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `comment` DROP FOREIGN KEY `Comment_parentId_fkey`;

-- DropForeignKey
ALTER TABLE `comment` DROP FOREIGN KEY `Comment_postId_fkey`;

-- DropForeignKey
ALTER TABLE `comment` DROP FOREIGN KEY `Comment_userId_fkey`;

-- DropForeignKey
ALTER TABLE `like` DROP FOREIGN KEY `Like_postId_fkey`;

-- DropForeignKey
ALTER TABLE `like` DROP FOREIGN KEY `Like_userId_fkey`;

-- DropForeignKey
ALTER TABLE `mediaitem` DROP FOREIGN KEY `MediaItem_postId_fkey`;

-- DropForeignKey
ALTER TABLE `savedpost` DROP FOREIGN KEY `SavedPost_postId_fkey`;

-- DropForeignKey
ALTER TABLE `savedpost` DROP FOREIGN KEY `SavedPost_userId_fkey`;

-- DropIndex
DROP INDEX `Post_createdAt_idx` ON `post`;

-- AlterTable
ALTER TABLE `user` DROP COLUMN `isPrivateAccount`;

-- DropTable
DROP TABLE `comment`;

-- DropTable
DROP TABLE `like`;

-- DropTable
DROP TABLE `mediaitem`;

-- DropTable
DROP TABLE `savedpost`;
