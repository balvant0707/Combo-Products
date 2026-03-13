-- AlterTable
ALTER TABLE `app_settings`
  ADD COLUMN IF NOT EXISTS `widgetMaxWidth` INTEGER NULL DEFAULT 1140,
  ADD COLUMN IF NOT EXISTS `productCardsPerRow` INTEGER NULL DEFAULT 4;

UPDATE `app_settings`
SET
  `widgetMaxWidth` = COALESCE(`widgetMaxWidth`, 1140),
  `productCardsPerRow` = CASE
    WHEN `productCardsPerRow` IN (3, 4, 5, 6) THEN `productCardsPerRow`
    ELSE 4
  END;
