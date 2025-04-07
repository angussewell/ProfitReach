-- SQL Support for Advanced Contact Filtering

-- This file doesn't need to be run as a migration since the tables already exist
-- It's provided as a reference for the SQL queries used in the filtering system

-- Query to get contacts with tags for a specific organization
SELECT 
  c.id, 
  c."firstName", 
  c."lastName", 
  c.email, 
  c."photoUrl", 
  c.title, 
  c."currentCompanyName", 
  c."additionalData",
  c."leadStatus",
  c.city,
  c.state,
  c.country,
  c."createdAt",
  c."updatedAt",
  c."lastActivityAt",
  COALESCE(
    (
      SELECT array_agg(t.name)
      FROM "ContactTags" ct
      JOIN "Tags" t ON ct."tagId" = t.id
      WHERE ct."contactId" = c.id
    ),
    '{}'::text[]
  ) AS tags
FROM "Contacts" c
WHERE c."organizationId" = :organizationId
ORDER BY c."updatedAt" DESC;

-- Query to create a new tag
INSERT INTO "Tags" (id, "organizationId", name, "createdAt", "updatedAt")
VALUES (gen_random_uuid(), :organizationId, :tagName, NOW(), NOW())
RETURNING id;

-- Query to assign a tag to a contact
INSERT INTO "ContactTags" ("contactId", "tagId", "createdAt")
VALUES (:contactId, :tagId, NOW());

-- Query to remove a tag from a contact
DELETE FROM "ContactTags"
WHERE "contactId" = :contactId AND "tagId" = :tagId;

-- Query to find contacts that have all specified tags
SELECT c.*
FROM "Contacts" c
WHERE c."organizationId" = :organizationId
AND (
  SELECT COUNT(DISTINCT t."name") 
  FROM "ContactTags" ct 
  JOIN "Tags" t ON ct."tagId" = t.id 
  WHERE ct."contactId" = c.id AND t."name" = ANY(:tagNames::text[])
) = array_length(:tagNames::text[], 1);

-- Query to find contacts that have any of the specified tags
SELECT c.*
FROM "Contacts" c
WHERE c."organizationId" = :organizationId
AND EXISTS (
  SELECT 1 FROM "ContactTags" ct 
  JOIN "Tags" t ON ct."tagId" = t.id 
  WHERE ct."contactId" = c.id AND t."name" = ANY(:tagNames::text[])
);

-- Query to find contacts that have none of the specified tags
SELECT c.*
FROM "Contacts" c
WHERE c."organizationId" = :organizationId
AND NOT EXISTS (
  SELECT 1 FROM "ContactTags" ct 
  JOIN "Tags" t ON ct."tagId" = t.id 
  WHERE ct."contactId" = c.id AND t."name" = ANY(:tagNames::text[])
);

-- Query to find contacts with no tags
SELECT c.*
FROM "Contacts" c
WHERE c."organizationId" = :organizationId
AND NOT EXISTS (
  SELECT 1 FROM "ContactTags" ct 
  WHERE ct."contactId" = c.id
);

-- Query to find contacts with any tags
SELECT c.*
FROM "Contacts" c
WHERE c."organizationId" = :organizationId
AND EXISTS (
  SELECT 1 FROM "ContactTags" ct 
  WHERE ct."contactId" = c.id
);

-- Query to find contacts with date filtering (created after a specific date)
SELECT c.*
FROM "Contacts" c
WHERE c."organizationId" = :organizationId
AND c."createdAt" > :startDate;

-- Query to find contacts with date range filtering
SELECT c.*
FROM "Contacts" c
WHERE c."organizationId" = :organizationId
AND c."createdAt" BETWEEN :startDate AND :endDate;

-- Complex example with multiple filter conditions
SELECT c.*
FROM "Contacts" c
WHERE c."organizationId" = :organizationId
AND (
  -- Name contains filter
  c."firstName" ILIKE '%' || :nameQuery || '%' OR c."lastName" ILIKE '%' || :nameQuery || '%'
)
AND (
  -- Tag filter (has any of the tags)
  EXISTS (
    SELECT 1 FROM "ContactTags" ct 
    JOIN "Tags" t ON ct."tagId" = t.id 
    WHERE ct."contactId" = c.id AND t."name" = ANY(:tagNames::text[])
  )
)
AND (
  -- Date range
  c."createdAt" BETWEEN :startDate AND :endDate
)
ORDER BY c."updatedAt" DESC;
