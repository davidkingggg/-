-- CreateTable
CREATE TABLE "AgentApiToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" DATETIME,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgentApiToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentApiLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenId" TEXT,
    "userId" TEXT,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "statusCode" INTEGER,
    "targetType" TEXT,
    "targetId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentApiLog_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "AgentApiToken" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AgentApiLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentApiToken_tokenHash_key" ON "AgentApiToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AgentApiToken_userId_idx" ON "AgentApiToken"("userId");

-- CreateIndex
CREATE INDEX "AgentApiToken_tokenPrefix_idx" ON "AgentApiToken"("tokenPrefix");

-- CreateIndex
CREATE INDEX "AgentApiLog_tokenId_idx" ON "AgentApiLog"("tokenId");

-- CreateIndex
CREATE INDEX "AgentApiLog_userId_idx" ON "AgentApiLog"("userId");

-- CreateIndex
CREATE INDEX "AgentApiLog_createdAt_idx" ON "AgentApiLog"("createdAt");
