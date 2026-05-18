-- Migration: 003_add_display_number_to_registrations
-- Description: Add a unique public display number for each registration

CREATE SEQUENCE IF NOT EXISTS registrations_display_number_seq;

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS display_number INTEGER;

WITH numbered_registrations AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS display_number
  FROM registrations
  WHERE display_number IS NULL
)
UPDATE registrations
SET display_number = numbered_registrations.display_number
FROM numbered_registrations
WHERE registrations.id = numbered_registrations.id;

DO $$
DECLARE
  max_display_number INTEGER;
BEGIN
  SELECT MAX(display_number) INTO max_display_number FROM registrations;

  IF max_display_number IS NULL THEN
    PERFORM setval('registrations_display_number_seq', 1, false);
  ELSE
    PERFORM setval('registrations_display_number_seq', max_display_number, true);
  END IF;
END $$;

ALTER TABLE registrations
  ALTER COLUMN display_number SET DEFAULT nextval('registrations_display_number_seq'),
  ALTER COLUMN display_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_display_number
  ON registrations(display_number);
