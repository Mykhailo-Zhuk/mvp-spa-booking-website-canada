/*
  Warnings:

  - You are about to drop the column `answer` on the `Faq` table. All the data in the column will be lost.
  - You are about to drop the column `question` on the `Faq` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `GuestGuideStep` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `GuestGuideStep` table. All the data in the column will be lost.
  - You are about to drop the column `body` on the `NotificationLog` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `NotificationLog` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Service` table. All the data in the column will be lost.
  - Added the required column `answerEn` to the `Faq` table without a default value. This is not possible if the table is not empty.
  - Added the required column `answerFr` to the `Faq` table without a default value. This is not possible if the table is not empty.
  - Added the required column `answerUk` to the `Faq` table without a default value. This is not possible if the table is not empty.
  - Added the required column `questionEn` to the `Faq` table without a default value. This is not possible if the table is not empty.
  - Added the required column `questionFr` to the `Faq` table without a default value. This is not possible if the table is not empty.
  - Added the required column `questionUk` to the `Faq` table without a default value. This is not possible if the table is not empty.
  - Added the required column `descriptionEn` to the `GuestGuideStep` table without a default value. This is not possible if the table is not empty.
  - Added the required column `descriptionFr` to the `GuestGuideStep` table without a default value. This is not possible if the table is not empty.
  - Added the required column `descriptionUk` to the `GuestGuideStep` table without a default value. This is not possible if the table is not empty.
  - Added the required column `titleEn` to the `GuestGuideStep` table without a default value. This is not possible if the table is not empty.
  - Added the required column `titleFr` to the `GuestGuideStep` table without a default value. This is not possible if the table is not empty.
  - Added the required column `titleUk` to the `GuestGuideStep` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bodyEn` to the `NotificationLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bodyFr` to the `NotificationLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bodyUk` to the `NotificationLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `titleEn` to the `NotificationLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `titleFr` to the `NotificationLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `titleUk` to the `NotificationLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `descriptionUk` to the `Package` table without a default value. This is not possible if the table is not empty.
  - Added the required column `titleUk` to the `Package` table without a default value. This is not possible if the table is not empty.
  - Added the required column `itemNameUk` to the `PackageInclusion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `descriptionEn` to the `Service` table without a default value. This is not possible if the table is not empty.
  - Added the required column `descriptionFr` to the `Service` table without a default value. This is not possible if the table is not empty.
  - Added the required column `descriptionUk` to the `Service` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nameEn` to the `Service` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nameFr` to the `Service` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nameUk` to the `Service` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Faq" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "questionEn" TEXT NOT NULL,
    "questionFr" TEXT NOT NULL,
    "questionUk" TEXT NOT NULL,
    "answerEn" TEXT NOT NULL,
    "answerFr" TEXT NOT NULL,
    "answerUk" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Faq_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Faq" ("helpfulCount", "id", "serviceId", "viewCount") SELECT "helpfulCount", "id", "serviceId", "viewCount" FROM "Faq";
DROP TABLE "Faq";
ALTER TABLE "new_Faq" RENAME TO "Faq";
CREATE INDEX "Faq_serviceId_idx" ON "Faq"("serviceId");
CREATE TABLE "new_GuestGuideStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "icon" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleFr" TEXT NOT NULL,
    "titleUk" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "descriptionFr" TEXT NOT NULL,
    "descriptionUk" TEXT NOT NULL,
    "estimatedDurationMin" INTEGER,
    CONSTRAINT "GuestGuideStep_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_GuestGuideStep" ("estimatedDurationMin", "icon", "id", "serviceId", "stepNumber") SELECT "estimatedDurationMin", "icon", "id", "serviceId", "stepNumber" FROM "GuestGuideStep";
DROP TABLE "GuestGuideStep";
ALTER TABLE "new_GuestGuideStep" RENAME TO "GuestGuideStep";
CREATE INDEX "GuestGuideStep_serviceId_idx" ON "GuestGuideStep"("serviceId");
CREATE TABLE "new_NotificationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleFr" TEXT NOT NULL,
    "titleUk" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL,
    "bodyFr" TEXT NOT NULL,
    "bodyUk" TEXT NOT NULL,
    "userId" TEXT,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_NotificationLog" ("createdAt", "delivered", "id", "type", "userId") SELECT "createdAt", "delivered", "id", "type", "userId" FROM "NotificationLog";
DROP TABLE "NotificationLog";
ALTER TABLE "new_NotificationLog" RENAME TO "NotificationLog";
CREATE TABLE "new_Package" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleFr" TEXT NOT NULL,
    "titleUk" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "descriptionFr" TEXT NOT NULL,
    "descriptionUk" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "imageEmoji" TEXT NOT NULL
);
INSERT INTO "new_Package" ("descriptionEn", "descriptionFr", "durationMin", "id", "imageEmoji", "price", "slug", "titleEn", "titleFr") SELECT "descriptionEn", "descriptionFr", "durationMin", "id", "imageEmoji", "price", "slug", "titleEn", "titleFr" FROM "Package";
DROP TABLE "Package";
ALTER TABLE "new_Package" RENAME TO "Package";
CREATE UNIQUE INDEX "Package_slug_key" ON "Package"("slug");
CREATE TABLE "new_PackageInclusion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "itemNameEn" TEXT NOT NULL,
    "itemNameFr" TEXT NOT NULL,
    "itemNameUk" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "tooltip" TEXT NOT NULL,
    CONSTRAINT "PackageInclusion_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PackageInclusion" ("icon", "id", "itemNameEn", "itemNameFr", "packageId", "tooltip") SELECT "icon", "id", "itemNameEn", "itemNameFr", "packageId", "tooltip" FROM "PackageInclusion";
DROP TABLE "PackageInclusion";
ALTER TABLE "new_PackageInclusion" RENAME TO "PackageInclusion";
CREATE INDEX "PackageInclusion_packageId_idx" ON "PackageInclusion"("packageId");
CREATE TABLE "new_Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameFr" TEXT NOT NULL,
    "nameUk" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "descriptionFr" TEXT NOT NULL,
    "descriptionUk" TEXT NOT NULL,
    "basePrice" REAL NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "icon" TEXT NOT NULL
);
INSERT INTO "new_Service" ("basePrice", "category", "durationMin", "icon", "id", "slug") SELECT "basePrice", "category", "durationMin", "icon", "id", "slug" FROM "Service";
DROP TABLE "Service";
ALTER TABLE "new_Service" RENAME TO "Service";
CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
