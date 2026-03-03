-- Normalize session table casing for Linux MySQL/MariaDB environments.
-- Shopify Prisma session storage uses the `session` delegate.
SET @has_session = (
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'session'
);

SET @has_Session = (
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'Session'
);

SET @rename_sql = IF(
  @has_session = 0 AND @has_Session = 1,
  'RENAME TABLE `Session` TO `session`',
  'SELECT 1'
);
PREPARE rename_stmt FROM @rename_sql;
EXECUTE rename_stmt;
DEALLOCATE PREPARE rename_stmt;

SET @has_session = (
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'session'
);

SET @create_sql = IF(
  @has_session = 0,
  'CREATE TABLE `session` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NOT NULL,
    `isOnline` BOOLEAN NOT NULL DEFAULT false,
    `scope` TEXT NULL,
    `expires` DATETIME(3) NULL,
    `accessToken` TEXT NOT NULL,
    `userId` BIGINT NULL,
    `firstName` TEXT NULL,
    `lastName` TEXT NULL,
    `email` TEXT NULL,
    `accountOwner` BOOLEAN NOT NULL DEFAULT false,
    `locale` TEXT NULL,
    `collaborator` BOOLEAN NULL DEFAULT false,
    `emailVerified` BOOLEAN NULL DEFAULT false,
    `refreshToken` TEXT NULL,
    `refreshTokenExpires` DATETIME(3) NULL,
    PRIMARY KEY (`id`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
  'SELECT 1'
);
PREPARE create_stmt FROM @create_sql;
EXECUTE create_stmt;
DEALLOCATE PREPARE create_stmt;
