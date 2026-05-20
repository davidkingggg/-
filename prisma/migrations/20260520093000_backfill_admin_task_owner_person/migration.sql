-- Bind the primary active administrator to a default active person when old
-- databases did not have an explicit account-person relationship yet.
UPDATE "User"
SET "personId" = (
  SELECT "Person"."id"
  FROM "Person"
  INNER JOIN (
    SELECT "PrimaryAdmin"."id", "PrimaryAdmin"."name"
    FROM "User" AS "PrimaryAdmin"
    WHERE "PrimaryAdmin"."isAdmin" = 1
      AND "PrimaryAdmin"."isActive" = 1
    ORDER BY "PrimaryAdmin"."createdAt" ASC
    LIMIT 1
  ) AS "PrimaryAdmin" ON "PrimaryAdmin"."name" = "Person"."name"
  WHERE "Person"."isActive" = 1
    AND NOT EXISTS (
      SELECT 1
      FROM "User" AS "BoundUser"
      WHERE "BoundUser"."personId" = "Person"."id"
        AND "BoundUser"."id" <> "User"."id"
    )
  ORDER BY "Person"."createdAt" ASC
  LIMIT 1
)
WHERE "User"."id" = (
    SELECT "PrimaryAdmin"."id"
    FROM "User" AS "PrimaryAdmin"
    WHERE "PrimaryAdmin"."isAdmin" = 1
      AND "PrimaryAdmin"."isActive" = 1
    ORDER BY "PrimaryAdmin"."createdAt" ASC
    LIMIT 1
  )
  AND "User"."personId" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "Person"
    WHERE "Person"."isActive" = 1
      AND NOT EXISTS (
        SELECT 1
        FROM "User" AS "BoundUser"
        WHERE "BoundUser"."personId" = "Person"."id"
          AND "BoundUser"."id" <> "User"."id"
      )
  );

UPDATE "User"
SET "personId" = (
  SELECT "Person"."id"
  FROM "Person"
  WHERE "Person"."isActive" = 1
    AND "Person"."name" = (
      SELECT "value"
      FROM "SystemSetting"
      WHERE "key" = 'default_owner'
      LIMIT 1
    )
    AND NOT EXISTS (
      SELECT 1
      FROM "User" AS "BoundUser"
      WHERE "BoundUser"."personId" = "Person"."id"
        AND "BoundUser"."id" <> "User"."id"
    )
  ORDER BY "Person"."createdAt" ASC
  LIMIT 1
)
WHERE "User"."id" = (
    SELECT "PrimaryAdmin"."id"
    FROM "User" AS "PrimaryAdmin"
    WHERE "PrimaryAdmin"."isAdmin" = 1
      AND "PrimaryAdmin"."isActive" = 1
    ORDER BY "PrimaryAdmin"."createdAt" ASC
    LIMIT 1
  )
  AND "User"."personId" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "Person"
    WHERE "Person"."isActive" = 1
      AND "Person"."name" = (
        SELECT "value"
        FROM "SystemSetting"
        WHERE "key" = 'default_owner'
        LIMIT 1
      )
      AND NOT EXISTS (
        SELECT 1
        FROM "User" AS "BoundUser"
        WHERE "BoundUser"."personId" = "Person"."id"
          AND "BoundUser"."id" <> "User"."id"
      )
  );

UPDATE "User"
SET "personId" = (
  SELECT "Person"."id"
  FROM "Person"
  WHERE "Person"."isActive" = 1
    AND NOT EXISTS (
      SELECT 1
      FROM "User" AS "BoundUser"
      WHERE "BoundUser"."personId" = "Person"."id"
        AND "BoundUser"."id" <> "User"."id"
    )
  ORDER BY "Person"."createdAt" ASC
  LIMIT 1
)
WHERE "User"."id" = (
    SELECT "PrimaryAdmin"."id"
    FROM "User" AS "PrimaryAdmin"
    WHERE "PrimaryAdmin"."isAdmin" = 1
      AND "PrimaryAdmin"."isActive" = 1
    ORDER BY "PrimaryAdmin"."createdAt" ASC
    LIMIT 1
  )
  AND "User"."personId" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "Person"
    WHERE "Person"."isActive" = 1
      AND NOT EXISTS (
        SELECT 1
        FROM "User" AS "BoundUser"
        WHERE "BoundUser"."personId" = "Person"."id"
          AND "BoundUser"."id" <> "User"."id"
      )
  );

-- Backfill legacy personal admin tasks to the primary bound administrator.
UPDATE "AdminTask"
SET "ownerPersonId" = (
  SELECT "User"."personId"
  FROM "User"
  INNER JOIN "Person" ON "Person"."id" = "User"."personId"
  WHERE "User"."isAdmin" = 1
    AND "User"."isActive" = 1
    AND "User"."personId" IS NOT NULL
    AND "Person"."isActive" = 1
  ORDER BY "User"."createdAt" ASC
  LIMIT 1
)
WHERE "ownerPersonId" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "User"
    INNER JOIN "Person" ON "Person"."id" = "User"."personId"
    WHERE "User"."isAdmin" = 1
      AND "User"."isActive" = 1
      AND "User"."personId" IS NOT NULL
      AND "Person"."isActive" = 1
  );
