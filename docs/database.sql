-- GearFlow MySQL initialization script
-- Run this against a local MySQL 8.x server before Prisma migration when a manual SQL file is required for coursework review.
-- Replace passwords before use. Do not run against an existing production database without a backup.

CREATE DATABASE IF NOT EXISTS `gearflow`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'gearflow_user'@'localhost' IDENTIFIED BY 'replace_password';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES
  ON `gearflow`.* TO 'gearflow_user'@'localhost';
FLUSH PRIVILEGES;

USE `gearflow`;

CREATE TABLE IF NOT EXISTS `User` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `passwordHash` VARCHAR(191) NOT NULL,
  `role` VARCHAR(191) NOT NULL DEFAULT 'user',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_email_key` (`email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Bike` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `brand` VARCHAR(191) NOT NULL,
  `model` VARCHAR(191) NULL,
  `bikeType` VARCHAR(191) NOT NULL,
  `purchaseDate` DATETIME(3) NULL,
  `notes` TEXT NULL,
  `isArchived` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `Bike_userId_idx` (`userId`),
  CONSTRAINT `Bike_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Ride` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `bikeId` VARCHAR(191) NULL,
  `title` VARCHAR(191) NOT NULL,
  `rideDate` DATETIME(3) NOT NULL,
  `distanceKm` DECIMAL(8, 2) NOT NULL,
  `durationMin` INTEGER NOT NULL,
  `elevationM` INTEGER NOT NULL DEFAULT 0,
  `route` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `Ride_userId_idx` (`userId`),
  KEY `Ride_bikeId_idx` (`bikeId`),
  KEY `Ride_rideDate_idx` (`rideDate`),
  CONSTRAINT `Ride_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Ride_bikeId_fkey` FOREIGN KEY (`bikeId`) REFERENCES `Bike`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Gear` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `bikeId` VARCHAR(191) NULL,
  `name` VARCHAR(191) NOT NULL,
  `category` VARCHAR(191) NOT NULL,
  `brand` VARCHAR(191) NOT NULL,
  `model` VARCHAR(191) NULL,
  `purchasePrice` DECIMAL(10, 2) NOT NULL,
  `purchaseDate` DATETIME(3) NOT NULL,
  `expectedLifespanMonths` INTEGER NOT NULL,
  `condition` VARCHAR(191) NOT NULL,
  `minResidualRate` DECIMAL(4, 2) NOT NULL,
  `notes` TEXT NULL,
  `isArchived` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `Gear_userId_idx` (`userId`),
  KEY `Gear_bikeId_idx` (`bikeId`),
  CONSTRAINT `Gear_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Gear_bikeId_fkey` FOREIGN KEY (`bikeId`) REFERENCES `Bike`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Maintenance` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `gearId` VARCHAR(191) NOT NULL,
  `type` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `maintenanceDate` DATETIME(3) NOT NULL,
  `cost` DECIMAL(10, 2) NOT NULL,
  `nextDueDate` DATETIME(3) NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `Maintenance_userId_idx` (`userId`),
  KEY `Maintenance_gearId_idx` (`gearId`),
  CONSTRAINT `Maintenance_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Maintenance_gearId_fkey` FOREIGN KEY (`gearId`) REFERENCES `Gear`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `WishlistItem` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `category` VARCHAR(191) NOT NULL,
  `brand` VARCHAR(191) NULL,
  `estimatedPrice` DECIMAL(10, 2) NOT NULL,
  `priority` VARCHAR(191) NOT NULL,
  `plannedMonth` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL,
  `reason` TEXT NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `WishlistItem_userId_idx` (`userId`),
  CONSTRAINT `WishlistItem_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
