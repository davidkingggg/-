-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_AdminTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ownerPersonId" TEXT,
    "priority" TEXT,
    "dueDate" DATETIME,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "completedAt" DATETIME,
    "notes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AdminTask_ownerPersonId_fkey" FOREIGN KEY ("ownerPersonId") REFERENCES "Person" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_AdminTask" (
    "archivedAt",
    "completedAt",
    "createdAt",
    "dueDate",
    "id",
    "isArchived",
    "isRecurring",
    "notes",
    "priority",
    "status",
    "title",
    "type",
    "updatedAt"
)
SELECT
    "archivedAt",
    "completedAt",
    "createdAt",
    "dueDate",
    "id",
    "isArchived",
    "isRecurring",
    "notes",
    "priority",
    "status",
    "title",
    "type",
    "updatedAt"
FROM "AdminTask";

DROP TABLE "AdminTask";
ALTER TABLE "new_AdminTask" RENAME TO "AdminTask";

CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "personId" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_User" (
    "createdAt",
    "id",
    "isActive",
    "isAdmin",
    "name",
    "passwordHash",
    "updatedAt",
    "username"
)
SELECT
    "createdAt",
    "id",
    "isActive",
    "isAdmin",
    "name",
    "passwordHash",
    "updatedAt",
    "username"
FROM "User";

DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_personId_key" ON "User"("personId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
