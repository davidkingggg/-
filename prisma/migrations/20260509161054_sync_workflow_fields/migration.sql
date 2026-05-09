/*
  Warnings:

  - You are about to drop the column `currentIssue` on the `PurchaseExecutionProcess` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `PurchaseExecutionProcess` table. All the data in the column will be lost.
  - You are about to drop the column `currentIssue` on the `SupplierDevelopmentProcess` table. All the data in the column will be lost.
  - You are about to drop the column `needBusinessSupport` on the `SupplierDevelopmentProcess` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `SupplierDevelopmentProcess` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PurchaseExecutionProcess" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "salesPersonId" TEXT,
    "currentStage" TEXT NOT NULL,
    "priority" TEXT,
    "dueDate" DATETIME,
    "currentProblem" TEXT,
    "nextAction" TEXT,
    "needBossDecision" BOOLEAN NOT NULL DEFAULT false,
    "needPaymentRequest" BOOLEAN NOT NULL DEFAULT false,
    "purchaseAmount" DECIMAL,
    "contractNo" TEXT,
    "contractDate" DATETIME,
    "paymentRequestDate" DATETIME,
    "arrivalDate" DATETIME,
    "acceptanceDate" DATETIME,
    "invoiceDate" DATETIME,
    "invoiceNo" TEXT,
    "prepaymentAmount" DECIMAL,
    "offsetAmount" DECIMAL,
    "hasArrived" BOOLEAN NOT NULL DEFAULT false,
    "hasAccepted" BOOLEAN NOT NULL DEFAULT false,
    "hasInvoice" BOOLEAN NOT NULL DEFAULT false,
    "hasPrepaymentOffset" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "remark" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PurchaseExecutionProcess_salesPersonId_fkey" FOREIGN KEY ("salesPersonId") REFERENCES "Person" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PurchaseExecutionProcess_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Person" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseExecutionProcess_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "Person" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseExecutionProcess_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseExecutionProcess_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PurchaseExecutionProcess" ("acceptanceDate", "archivedAt", "arrivalDate", "categoryId", "contractDate", "contractNo", "createdAt", "currentStage", "dueDate", "hasAccepted", "hasArrived", "hasInvoice", "hasPrepaymentOffset", "id", "invoiceDate", "invoiceNo", "isArchived", "needBossDecision", "needPaymentRequest", "nextAction", "offsetAmount", "ownerId", "paymentRequestDate", "prepaymentAmount", "priority", "purchaseAmount", "requesterId", "salesPersonId", "status", "supplierId", "title", "updatedAt") SELECT "acceptanceDate", "archivedAt", "arrivalDate", "categoryId", "contractDate", "contractNo", "createdAt", "currentStage", "dueDate", "hasAccepted", "hasArrived", "hasInvoice", "hasPrepaymentOffset", "id", "invoiceDate", "invoiceNo", "isArchived", "needBossDecision", "needPaymentRequest", "nextAction", "offsetAmount", "ownerId", "paymentRequestDate", "prepaymentAmount", "priority", "purchaseAmount", "requesterId", "salesPersonId", "status", "supplierId", "title", "updatedAt" FROM "PurchaseExecutionProcess";
DROP TABLE "PurchaseExecutionProcess";
ALTER TABLE "new_PurchaseExecutionProcess" RENAME TO "PurchaseExecutionProcess";
CREATE TABLE "new_SupplierDevelopmentProcess" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "currentStage" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "priority" TEXT,
    "dueDate" DATETIME,
    "currentProblem" TEXT,
    "nextAction" TEXT,
    "needBossDecision" BOOLEAN NOT NULL DEFAULT false,
    "needSalesSupport" BOOLEAN NOT NULL DEFAULT false,
    "needBusinessAssistantSupport" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "remark" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupplierDevelopmentProcess_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Person" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SupplierDevelopmentProcess_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SupplierDevelopmentProcess_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SupplierDevelopmentProcess" ("archivedAt", "categoryId", "createdAt", "currentStage", "dueDate", "id", "isArchived", "needBossDecision", "needSalesSupport", "nextAction", "ownerId", "priority", "status", "supplierId", "updatedAt") SELECT "archivedAt", "categoryId", "createdAt", "currentStage", "dueDate", "id", "isArchived", "needBossDecision", "needSalesSupport", "nextAction", "ownerId", "priority", "status", "supplierId", "updatedAt" FROM "SupplierDevelopmentProcess";
DROP TABLE "SupplierDevelopmentProcess";
ALTER TABLE "new_SupplierDevelopmentProcess" RENAME TO "SupplierDevelopmentProcess";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
