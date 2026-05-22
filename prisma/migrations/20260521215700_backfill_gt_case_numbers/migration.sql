DO $$
DECLARE
  max_gt_number integer;
BEGIN
  SELECT COALESCE(
    MAX(CAST(SUBSTRING("caseNumber" FROM 3) AS INTEGER)),
    0
  )
  INTO max_gt_number
  FROM "Case"
  WHERE "caseNumber" ~ '^GT[0-9]+$';

  IF EXISTS (SELECT 1 FROM "Case" WHERE "caseNumber" IS NULL) THEN
    WITH ordered_cases AS (
      SELECT
        id,
        ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, id ASC) AS rn
      FROM "Case"
      WHERE "caseNumber" IS NULL
    )
    UPDATE "Case" c
    SET "caseNumber" = 'GT' || LPAD((max_gt_number + ordered_cases.rn)::text, 4, '0')
    FROM ordered_cases
    WHERE c.id = ordered_cases.id;
  END IF;

  INSERT INTO "CaseNumberSequence" (id, "currentValue")
  VALUES (
    'global',
    COALESCE(
      (
        SELECT MAX(CAST(SUBSTRING("caseNumber" FROM 3) AS INTEGER))
        FROM "Case"
        WHERE "caseNumber" ~ '^GT[0-9]+$'
      ),
      0
    )
  )
  ON CONFLICT (id) DO UPDATE
    SET "currentValue" = GREATEST(
      "CaseNumberSequence"."currentValue",
      EXCLUDED."currentValue"
    );
END $$;
