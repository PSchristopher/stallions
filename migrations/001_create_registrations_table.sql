-- Migration: 001_create_registrations_table
-- Created: 2026-04-28
-- Description: Create the registrations table for SPL Stallions players

CREATE TABLE IF NOT EXISTS registrations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  photo_url TEXT NOT NULL,
  aadhaar_url TEXT NOT NULL,
  payment_proof_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster phone lookups
CREATE INDEX IF NOT EXISTS idx_registrations_phone ON registrations(phone);

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);

-- Status values: 'pending', 'verified', 'rejected'
