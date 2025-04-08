/*
  Warnings:

  - A unique constraint covering the columns `[type,value]` on the table `VerificationCode` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `VerificationCode_type_value_key` ON `VerificationCode`(`type`, `value`);
