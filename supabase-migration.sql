-- ============================================================
-- BOHO CAFE & LOUNGE — TABLE MANAGEMENT MIGRATION
-- Run this in Supabase SQL Editor → Click "Run"
-- ============================================================

-- 1. Add new columns
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS booking_type TEXT DEFAULT 'TABLE';
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS table_number INTEGER;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS start_time TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS end_time TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS is_full_cafe BOOLEAN DEFAULT FALSE;

-- 2. Backfill existing reservations: copy "time" into "start_time"
-- and set end_time to 1 hour after start_time
UPDATE reservations 
SET start_time = time,
    end_time = CASE
      WHEN time = '12:00 PM' THEN '1:00 PM'
      WHEN time = '1:00 PM' THEN '2:00 PM'
      WHEN time = '2:00 PM' THEN '3:00 PM'
      WHEN time = '3:00 PM' THEN '4:00 PM'
      WHEN time = '4:00 PM' THEN '5:00 PM'
      WHEN time = '5:00 PM' THEN '6:00 PM'
      WHEN time = '6:00 PM' THEN '7:00 PM'
      WHEN time = '7:00 PM' THEN '8:00 PM'
      WHEN time = '8:00 PM' THEN '9:00 PM'
      WHEN time = '9:00 PM' THEN '10:00 PM'
      WHEN time = '10:00 PM' THEN '11:00 PM'
      WHEN time = '11:00 PM' THEN '12:00 AM'
      ELSE time
    END
WHERE start_time IS NULL AND time IS NOT NULL;

-- 3. Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_reservations_table ON reservations(table_number);
CREATE INDEX IF NOT EXISTS idx_reservations_booking_type ON reservations(booking_type);
CREATE INDEX IF NOT EXISTS idx_reservations_date_status ON reservations(date, status);

-- 4. Verify: show all columns
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'reservations' 
ORDER BY ordinal_position;
