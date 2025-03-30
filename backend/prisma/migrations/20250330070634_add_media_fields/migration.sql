-- AlterTable
ALTER TABLE `message` ADD COLUMN `mediaAuthTag` TEXT NULL,
    ADD COLUMN `mediaIv` TEXT NULL,
    ADD COLUMN `mediaType` VARCHAR(20) NULL,
    ADD COLUMN `mediaUrl` VARCHAR(1024) NULL;
