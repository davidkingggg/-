-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_AdminTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ownerPersonId" TEXT,
    "createdByPersonId" TEXT,
    "assigneePersonId" TEXT,
    "priority" TEXT,
    "dueDate" DATETIME,
    "taskDate" DATETIME,
    "startTime" TEXT,
    "endTime" TEXT,
    "recurrenceType" TEXT NOT NULL DEFAULT 'none',
    "recurrenceEndDate" DATETIME,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "completedAt" DATETIME,
    "notes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AdminTask_ownerPersonId_fkey" FOREIGN KEY ("ownerPersonId") REFERENCES "Person" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AdminTask_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES "Person" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AdminTask_assigneePersonId_fkey" FOREIGN KEY ("assigneePersonId") REFERENCES "Person" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_AdminTask" (
    "archivedAt",
    "assigneePersonId",
    "completedAt",
    "createdAt",
    "createdByPersonId",
    "dueDate",
    "id",
    "isArchived",
    "isRecurring",
    "notes",
    "ownerPersonId",
    "priority",
    "recurrenceType",
    "status",
    "taskDate",
    "title",
    "type",
    "updatedAt"
)
SELECT
    "archivedAt",
    "ownerPersonId",
    "completedAt",
    "createdAt",
    "ownerPersonId",
    "dueDate",
    "id",
    "isArchived",
    "isRecurring",
    "notes",
    "ownerPersonId",
    "priority",
    'none',
    "status",
    COALESCE("dueDate", "createdAt"),
    "title",
    "type",
    "updatedAt"
FROM "AdminTask";

DROP TABLE "AdminTask";
ALTER TABLE "new_AdminTask" RENAME TO "AdminTask";

CREATE INDEX "AdminTask_ownerPersonId_isArchived_taskDate_idx" ON "AdminTask"("ownerPersonId", "isArchived", "taskDate");
CREATE INDEX "AdminTask_assigneePersonId_idx" ON "AdminTask"("assigneePersonId");
CREATE INDEX "AdminTask_createdByPersonId_idx" ON "AdminTask"("createdByPersonId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
