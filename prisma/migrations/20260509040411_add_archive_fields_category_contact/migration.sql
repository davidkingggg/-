-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "isPriority" BOOLEAN NOT NULL DEFAULT false,
    "standardLevel" TEXT,
    "afterSalesRisk" TEXT,
    "purchaseFrequency" TEXT,
    "notes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Category" ("afterSalesRisk", "createdAt", "id", "isPriority", "name", "notes", "purchaseFrequency", "standardLevel", "type", "updatedAt") SELECT "afterSalesRisk", "createdAt", "id", "isPriority", "name", "notes", "purchaseFrequency", "standardLevel", "type", "updatedAt" FROM "Category";
DROP TABLE "Category";
ALTER TABLE "new_Category" RENAME TO "Category";
CREATE TABLE "new_SupplierContact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT,
    "phone" TEXT,
    "wechat" TEXT,
    "email" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupplierContact_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SupplierContact" ("createdAt", "email", "id", "isPrimary", "name", "notes", "phone", "position", "supplierId", "updatedAt", "wechat") SELECT "createdAt", "email", "id", "isPrimary", "name", "notes", "phone", "position", "supplierId", "updatedAt", "wechat" FROM "SupplierContact";
DROP TABLE "SupplierContact";
ALTER TABLE "new_SupplierContact" RENAME TO "SupplierContact";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
