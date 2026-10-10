-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "personId" TEXT,
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "id", "isActive", "isAdmin", "name", "passwordHash", "personId", "updatedAt", "username") SELECT "createdAt", "id", "isActive", "isAdmin", "name", "passwordHash", "personId", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_personId_key" ON "User"("personId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Attachment_relatedType_relatedId_idx" ON "Attachment"("relatedType", "relatedId");

-- CreateIndex
CREATE INDEX "InvestigationRecord_categoryId_idx" ON "InvestigationRecord"("categoryId");

-- CreateIndex
CREATE INDEX "InvestigationRecord_supplierId_idx" ON "InvestigationRecord"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseExecutionProcess_categoryId_idx" ON "PurchaseExecutionProcess"("categoryId");

-- CreateIndex
CREATE INDEX "PurchaseExecutionProcess_supplierId_idx" ON "PurchaseExecutionProcess"("supplierId");

-- CreateIndex
CREATE INDEX "QuoteItem_compareKey_idx" ON "QuoteItem"("compareKey");

-- CreateIndex
CREATE INDEX "QuoteItem_categoryId_idx" ON "QuoteItem"("categoryId");

-- CreateIndex
CREATE INDEX "QuoteItem_supplierId_idx" ON "QuoteItem"("supplierId");

-- CreateIndex
CREATE INDEX "QuoteItem_quoteSheetId_idx" ON "QuoteItem"("quoteSheetId");

-- CreateIndex
CREATE INDEX "QuoteSheet_categoryId_idx" ON "QuoteSheet"("categoryId");

-- CreateIndex
CREATE INDEX "QuoteSheet_supplierId_idx" ON "QuoteSheet"("supplierId");

-- CreateIndex
CREATE INDEX "QuoteSheet_quoteDate_idx" ON "QuoteSheet"("quoteDate");

-- CreateIndex
CREATE INDEX "QuoteSheet_isArchived_idx" ON "QuoteSheet"("isArchived");

-- CreateIndex
CREATE INDEX "SalesMaterial_categoryId_idx" ON "SalesMaterial"("categoryId");

-- CreateIndex
CREATE INDEX "Supplier_categoryId_idx" ON "Supplier"("categoryId");

-- CreateIndex
CREATE INDEX "Supplier_isArchived_idx" ON "Supplier"("isArchived");

-- CreateIndex
CREATE INDEX "SupplierContact_supplierId_idx" ON "SupplierContact"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierDevelopmentProcess_categoryId_idx" ON "SupplierDevelopmentProcess"("categoryId");

-- CreateIndex
CREATE INDEX "SupplierDevelopmentProcess_supplierId_idx" ON "SupplierDevelopmentProcess"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierScore_categoryId_idx" ON "SupplierScore"("categoryId");

-- CreateIndex
CREATE INDEX "SupplierScore_supplierId_idx" ON "SupplierScore"("supplierId");
