-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SupplierScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "scorerId" TEXT NOT NULL,
    "scoreDate" DATETIME NOT NULL,
    "qualityScore" DECIMAL,
    "priceScore" DECIMAL,
    "deliveryScore" DECIMAL,
    "afterSalesScore" DECIMAL,
    "cooperationScore" DECIMAL,
    "paymentScore" DECIMAL,
    "regionScore" DECIMAL,
    "totalScore" DECIMAL,
    "systemLevel" TEXT,
    "manualLevel" TEXT,
    "finalLevel" TEXT,
    "scoreReason" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupplierScore_scorerId_fkey" FOREIGN KEY ("scorerId") REFERENCES "Person" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SupplierScore_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SupplierScore_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SupplierScore" ("afterSalesScore", "categoryId", "cooperationScore", "createdAt", "deliveryScore", "finalLevel", "id", "manualLevel", "paymentScore", "priceScore", "qualityScore", "regionScore", "scoreDate", "scoreReason", "scorerId", "supplierId", "systemLevel", "totalScore", "updatedAt") SELECT "afterSalesScore", "categoryId", "cooperationScore", "createdAt", "deliveryScore", "finalLevel", "id", "manualLevel", "paymentScore", "priceScore", "qualityScore", "regionScore", "scoreDate", "scoreReason", "scorerId", "supplierId", "systemLevel", "totalScore", "updatedAt" FROM "SupplierScore";
DROP TABLE "SupplierScore";
ALTER TABLE "new_SupplierScore" RENAME TO "SupplierScore";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
