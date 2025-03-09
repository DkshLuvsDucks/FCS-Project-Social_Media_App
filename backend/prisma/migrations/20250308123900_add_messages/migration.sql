/*
  Warnings:

  - You are about to drop the column `algorithm` on the `message` table. All the data in the column will be lost.
  - You are about to drop the column `chatRoomId` on the `message` table. All the data in the column will be lost.
  - You are about to drop the column `encryptedContent` on the `message` table. All the data in the column will be lost.
  - You are about to drop the column `hmac` on the `message` table. All the data in the column will be lost.
  - You are about to drop the column `iv` on the `message` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp` on the `message` table. All the data in the column will be lost.
  - Added the required column `content` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `receiverId` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `message` DROP FOREIGN KEY `Message_chatRoomId_fkey`;

-- DropIndex
DROP INDEX `Message_timestamp_idx` ON `message`;

-- AlterTable
ALTER TABLE `message` DROP COLUMN `algorithm`,
    DROP COLUMN `chatRoomId`,
    DROP COLUMN `encryptedContent`,
    DROP COLUMN `hmac`,
    DROP COLUMN `iv`,
    DROP COLUMN `timestamp`,
    ADD COLUMN `content` TEXT NOT NULL,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `read` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `receiverId` INTEGER NOT NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_receiverId_fkey` FOREIGN KEY (`receiverId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
