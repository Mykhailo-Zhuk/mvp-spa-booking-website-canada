-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "province" TEXT NOT NULL DEFAULT 'ON',
    "latitude" REAL,
    "longitude" REAL,
    "pushToken" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "firstBookingAt" DATETIME,
    "totalBookingsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Therapist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "bio" TEXT,
    "avatarEmoji" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "basePrice" REAL NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "icon" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Slot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "therapistId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "isBooked" BOOLEAN NOT NULL DEFAULT false,
    "price" REAL NOT NULL,
    "originalPrice" REAL,
    "isFlashSale" BOOLEAN NOT NULL DEFAULT false,
    "flashSaleEndsAt" DATETIME,
    CONSTRAINT "Slot_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "Therapist" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Slot_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingCode" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "basePrice" REAL NOT NULL,
    "taxRate" REAL NOT NULL,
    "taxAmount" REAL NOT NULL,
    "tipAmount" REAL NOT NULL,
    "totalPaid" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "voucherUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Package" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleFr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "descriptionFr" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "imageEmoji" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "PackageInclusion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "itemNameEn" TEXT NOT NULL,
    "itemNameFr" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "tooltip" TEXT NOT NULL,
    CONSTRAINT "PackageInclusion_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GuestGuideStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "icon" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "estimatedDurationMin" INTEGER,
    CONSTRAINT "GuestGuideStep_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Faq" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Faq_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slotId" TEXT NOT NULL,
    "originalPrice" REAL NOT NULL,
    "discountedPrice" REAL NOT NULL,
    "discountPercent" INTEGER NOT NULL,
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Promotion_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OccupancyStat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "hour" INTEGER NOT NULL,
    "serviceId" TEXT NOT NULL,
    "bookingsCount" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "fillRate" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "userId" TEXT,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");

-- CreateIndex
CREATE INDEX "Slot_startTime_idx" ON "Slot"("startTime");

-- CreateIndex
CREATE UNIQUE INDEX "Slot_therapistId_serviceId_startTime_key" ON "Slot"("therapistId", "serviceId", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_bookingCode_key" ON "Booking"("bookingCode");

-- CreateIndex
CREATE UNIQUE INDEX "Package_slug_key" ON "Package"("slug");

-- CreateIndex
CREATE INDEX "PackageInclusion_packageId_idx" ON "PackageInclusion"("packageId");

-- CreateIndex
CREATE INDEX "GuestGuideStep_serviceId_idx" ON "GuestGuideStep"("serviceId");

-- CreateIndex
CREATE INDEX "Faq_serviceId_idx" ON "Faq"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "Promotion_slotId_key" ON "Promotion"("slotId");

-- CreateIndex
CREATE INDEX "OccupancyStat_weekday_hour_idx" ON "OccupancyStat"("weekday", "hour");
