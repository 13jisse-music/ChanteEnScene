-- Track when candidate actually submits their correction
-- Distinguishes "correction requested" (token exists) from "correction submitted" (this timestamp set)
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS correction_submitted_at TIMESTAMPTZ;
