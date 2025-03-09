/*
  Warnings:

  - You are about to drop the column `content` on the `message` table. All the data in the column will be lost.
  - Added the required column `algorithm` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `encryptedContent` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hmac` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `iv` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `message` DROP COLUMN `content`,
    ADD COLUMN `algorithm` VARCHAR(20) NOT NULL,
    ADD COLUMN `encryptedContent` TEXT NOT NULL,
    ADD COLUMN `hmac` CHAR(64) NOT NULL,
    ADD COLUMN `iv` VARCHAR(24) NOT NULL;

-- CreateIndex
CREATE INDEX `Message_senderId_receiverId_idx` ON `Message`(`senderId`, `receiverId`);

-- CreateIndex
CREATE INDEX `Message_createdAt_idx` ON `Message`(`createdAt`);
