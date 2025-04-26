/*
  Warnings:

  - You are about to drop the column `encryptedSymmetricKey` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `symmetricKeyIV` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `encryptedPrivateKey` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `privateKeyIV` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `publicKey` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Message` DROP COLUMN `encryptedSymmetricKey`,
    DROP COLUMN `symmetricKeyIV`;

-- AlterTable
ALTER TABLE `User` DROP COLUMN `encryptedPrivateKey`,
    DROP COLUMN `privateKeyIV`,
    DROP COLUMN `publicKey`;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_replyToId_fkey` FOREIGN KEY (`replyToId`) REFERENCES `Message`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
