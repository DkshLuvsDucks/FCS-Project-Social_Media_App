/*
  Warnings:

  - You are about to drop the column `isEnded` on the `groupchat` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `groupchat` DROP COLUMN `isEnded`;

-- AlterTable
ALTER TABLE `post` ADD COLUMN `isPrivate` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `mediaType` VARCHAR(50) NULL,
    ADD COLUMN `mediaUrl` VARCHAR(2048) NULL;
