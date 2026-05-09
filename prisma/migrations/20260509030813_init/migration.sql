-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "isPriority" BOOLEAN NOT NULL DEFAULT false,
    "standardLevel" TEXT,
    "afterSalesRisk" TEXT,
    "purchaseFrequency" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "region" TEXT,
    "companyType" TEXT,
    "source" TEXT,
    "hasQuoted" BOOLEAN NOT NULL DEFAULT false,
    "hasVisited" BOOLEAN NOT NULL DEFAULT false,
    "willingToJoin" BOOLEAN NOT NULL DEFAULT false,
    "cooperationWillingness" TEXT,
    "qualification" TEXT,
    "deliveryAbility" TEXT,
    "afterSalesAbility" TEXT,
    "paymentTerms" TEXT,
    "priceLevel" TEXT,
    "recommendedLevel" TEXT,
    "riskSummary" TEXT,
    "notes" TEXT,
    "nextFollowUpDate" DATETIME,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Supplier_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SupplierContact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT,
    "phone" TEXT,
    "wechat" TEXT,
    "email" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupplierContact_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "department" TEXT,
    "role" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "QuoteSheet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "quoteDate" DATETIME NOT NULL,
    "sourceType" TEXT,
    "quoteStage" TEXT,
    "rawText" TEXT,
    "notes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QuoteSheet_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "QuoteSheet_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuoteItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteSheetId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "compareKey" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "model" TEXT,
    "unit" TEXT,
    "price" DECIMAL,
    "includesTax" BOOLEAN NOT NULL DEFAULT false,
    "taxRate" DECIMAL,
    "includesFreight" BOOLEAN NOT NULL DEFAULT false,
    "minOrderQty" INTEGER,
    "deliveryTime" TEXT,
    "paymentTerms" TEXT,
    "warranty" TEXT,
    "priceNotes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QuoteItem_quoteSheetId_fkey" FOREIGN KEY ("quoteSheetId") REFERENCES "QuoteSheet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "QuoteItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "QuoteItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SupplierScore" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupplierScore_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SupplierScore_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SupplierScore_scorerId_fkey" FOREIGN KEY ("scorerId") REFERENCES "Person" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvestigationRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "location" TEXT,
    "participants" TEXT,
    "keyPoints" TEXT,
    "productHighlights" TEXT,
    "priceInfo" TEXT,
    "qualificationInfo" TEXT,
    "deliveryInfo" TEXT,
    "afterSalesInfo" TEXT,
    "risks" TEXT,
    "nextActions" TEXT,
    "recommendFollowUp" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InvestigationRecord_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InvestigationRecord_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SupplierDevelopmentProcess" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "currentStage" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "priority" TEXT,
    "dueDate" DATETIME,
    "currentIssue" TEXT,
    "nextAction" TEXT,
    "needBossDecision" BOOLEAN NOT NULL DEFAULT false,
    "needSalesSupport" BOOLEAN NOT NULL DEFAULT false,
    "needBusinessSupport" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupplierDevelopmentProcess_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SupplierDevelopmentProcess_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SupplierDevelopmentProcess_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Person" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchaseExecutionProcess" (
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
    "currentIssue" TEXT,
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
    "notes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PurchaseExecutionProcess_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseExecutionProcess_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseExecutionProcess_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "Person" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseExecutionProcess_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Person" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseExecutionProcess_salesPersonId_fkey" FOREIGN KEY ("salesPersonId") REFERENCES "Person" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdminTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priority" TEXT,
    "dueDate" DATETIME,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "completedAt" DATETIME,
    "notes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SalesMaterial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "targetAudience" TEXT,
    "coreSellingPoints" TEXT,
    "priceAdvantage" TEXT,
    "supplierAdvantage" TEXT,
    "qualificationSupport" TEXT,
    "deliveryAdvantage" TEXT,
    "afterSalesAdvantage" TEXT,
    "riskNotice" TEXT,
    "formalText" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SalesMaterial_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "notes" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "relatedType" TEXT NOT NULL,
    "relatedId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RiskTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SupplierRiskTag" (
    "supplierId" TEXT NOT NULL,
    "riskTagId" TEXT NOT NULL,

    PRIMARY KEY ("supplierId", "riskTagId"),
    CONSTRAINT "SupplierRiskTag_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SupplierRiskTag_riskTagId_fkey" FOREIGN KEY ("riskTagId") REFERENCES "RiskTag" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "RiskTag_name_key" ON "RiskTag"("name");
