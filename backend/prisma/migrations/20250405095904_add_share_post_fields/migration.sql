-- AlterTable
ALTER TABLE `groupmessage` ADD COLUMN `sharedPostId` INTEGER NULL;

-- AlterTable
ALTER TABLE `post` ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- CreateIndex
CREATE INDEX `GroupMessage_sharedPostId_idx` ON `GroupMessage`(`sharedPostId`);

-- AddForeignKey
ALTER TABLE `GroupMessage` ADD CONSTRAINT `GroupMessage_sharedPostId_fkey` FOREIGN KEY (`sharedPostId`) REFERENCES `Post`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
