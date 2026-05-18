CREATE SEQUENCE IF NOT EXISTS registrations_display_number_seq;

CREATE TABLE IF NOT EXISTS registrations (
  id SERIAL PRIMARY KEY,
  display_number INTEGER NOT NULL DEFAULT nextval('registrations_display_number_seq'),
  roll_num INTEGER NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  photo_url TEXT NOT NULL,
  aadhaar_url TEXT NOT NULL,
  payment_proof_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_display_number
  ON registrations(display_number);

CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_roll_num
  ON registrations(roll_num);
