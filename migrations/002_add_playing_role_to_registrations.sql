-- Migration: 002_add_playing_role_to_registrations
-- Description: Track each player's playing role

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS playing_role TEXT NOT NULL DEFAULT 'All rounder';

ALTER TABLE registrations
  DROP CONSTRAINT IF EXISTS registrations_playing_role_check;

ALTER TABLE registrations
  ADD CONSTRAINT registrations_playing_role_check
  CHECK (playing_role IN ('All rounder', 'Batter', 'Bowler'));
