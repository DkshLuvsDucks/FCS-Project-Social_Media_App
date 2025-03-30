/*
  Warnings:

  - You are about to drop the column `mediaAuthTag` on the `message` table. All the data in the column will be lost.
  - You are about to drop the column `mediaIv` on the `message` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `message` DROP COLUMN `mediaAuthTag`,
    DROP COLUMN `mediaIv`,
    MODIFY `mediaType` VARCHAR(50) NULL,
    MODIFY `mediaUrl` VARCHAR(2048) NULL;
