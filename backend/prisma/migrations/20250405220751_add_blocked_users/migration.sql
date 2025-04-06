/*
  Warnings:

  - You are about to drop the column `lastMessage` on the `conversation` table. All the data in the column will be lost.
  - You are about to drop the column `lastMessageMediaType` on the `conversation` table. All the data in the column will be lost.
  - You are about to drop the column `lastMessage` on the `groupchat` table. All the data in the column will be lost.
  - You are about to drop the column `lastMessageMediaType` on the `groupchat` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `conversation` DROP COLUMN `lastMessage`,
    DROP COLUMN `lastMessageMediaType`;

-- AlterTable
ALTER TABLE `groupchat` DROP COLUMN `lastMessage`,
    DROP COLUMN `lastMessageMediaType`;
