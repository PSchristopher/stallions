-- Migration: 004_add_roll_num_to_registrations
-- Description: Add a shuffled lot order number for registrations

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS roll_num INTEGER;

WITH shuffled_registrations AS (
  SELECT
    id,
    (ROW_NUMBER() OVER (ORDER BY random()) * 1000 + FLOOR(random() * 900)::INTEGER) AS roll_num
  FROM registrations
  WHERE roll_num IS NULL
)
UPDATE registrations
SET roll_num = shuffled_registrations.roll_num
FROM shuffled_registrations
WHERE registrations.id = shuffled_registrations.id;

ALTER TABLE registrations
  ALTER COLUMN roll_num SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_roll_num
  ON registrations(roll_num);
