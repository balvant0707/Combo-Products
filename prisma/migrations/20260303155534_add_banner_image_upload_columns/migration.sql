-- AlterTable
ALTER TABLE `combo_box` ADD COLUMN `bannerImageData` MEDIUMBLOB NULL,
    ADD COLUMN `bannerImageFileName` VARCHAR(255) NULL,
    ADD COLUMN `bannerImageMimeType` VARCHAR(100) NULL;
