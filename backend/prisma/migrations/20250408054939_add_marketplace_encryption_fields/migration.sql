/*
  Warnings:

  - You are about to alter the column `title` on the `product` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(100)`.
  - You are about to alter the column `condition` on the `product` table. The data in that column could be lost. The data in that column will be cast from `VarChar(50)` to `VarChar(20)`.

*/
-- AlterTable
ALTER TABLE `product` ADD COLUMN `contactInfo` TEXT NULL,
    ADD COLUMN `paymentInfo` TEXT NULL,
    MODIFY `title` VARCHAR(100) NOT NULL,
    MODIFY `condition` VARCHAR(20) NOT NULL;

-- AlterTable
ALTER TABLE `transaction` ADD COLUMN `paymentDetails` TEXT NULL;
