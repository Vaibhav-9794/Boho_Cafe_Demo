-- ============================================================
-- BOHO CAFE & LOUNGE — COMPLETE DATABASE SETUP v3.0
-- Paste ENTIRE script into Supabase SQL Editor → Click Run
-- ============================================================

-- ─── 1. RESERVATIONS TABLE ───
CREATE TABLE IF NOT EXISTS reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  guest_count INTEGER NOT NULL DEFAULT 2,
  occasion TEXT DEFAULT '',
  special_requests TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. TABLE MANAGEMENT COLUMNS ───
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS booking_type TEXT DEFAULT 'TABLE';
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS table_number INTEGER;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS start_time TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS end_time TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS is_full_cafe BOOLEAN DEFAULT FALSE;

-- ─── 3. CANCELLATION COLUMNS ───
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- ─── 4. EVENT BOOKING COLUMNS ───
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS event_details JSONB;

-- ─── 5. REMINDER TRACKING ───
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS reminder_2h_sent BOOLEAN DEFAULT FALSE;

-- ─── 6. HOLD SYSTEM ───
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS held_until TIMESTAMPTZ;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS session_id TEXT;

-- ─── 7. NO-SHOW TRACKING ───
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS no_show_at TIMESTAMPTZ;

-- ─── 8. UPDATE STATUS CONSTRAINT ───
-- Drop old constraint if exists, add new one with all statuses
DO $$
BEGIN
  ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_status_check;
  ALTER TABLE reservations ADD CONSTRAINT reservations_status_check
    CHECK (status IN ('HELD','PENDING','CONFIRMED','ARRIVED','COMPLETED','REJECTED','CANCELLED','NO_SHOW'));
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ─── 9. BACKFILL EXISTING DATA ───
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

-- ─── 10. INDEXES ───
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date);
CREATE INDEX IF NOT EXISTS idx_reservations_email ON reservations(email);
CREATE INDEX IF NOT EXISTS idx_reservations_table ON reservations(table_number);
CREATE INDEX IF NOT EXISTS idx_reservations_booking_type ON reservations(booking_type);
CREATE INDEX IF NOT EXISTS idx_reservations_date_status ON reservations(date, status);
CREATE INDEX IF NOT EXISTS idx_reservations_held_until ON reservations(held_until);

-- ─── 11. RLS ───
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public inserts' AND tablename = 'reservations') THEN
    CREATE POLICY "Allow public inserts" ON reservations FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public status check' AND tablename = 'reservations') THEN
    CREATE POLICY "Allow public status check" ON reservations FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- ─── 12. AUTO-UPDATE TIMESTAMP ───
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON reservations;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- WAITLIST TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public waitlist insert' AND tablename = 'waitlist') THEN
    CREATE POLICY "Allow public waitlist insert" ON waitlist FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_waitlist_date ON waitlist(date);
CREATE INDEX IF NOT EXISTS idx_waitlist_notified ON waitlist(notified);

-- ============================================================
-- MENU ITEMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price DECIMAL NOT NULL,
  description TEXT DEFAULT '',
  is_available BOOLEAN DEFAULT TRUE,
  is_veg BOOLEAN DEFAULT TRUE,
  is_popular BOOLEAN DEFAULT FALSE,
  image_url TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public menu read' AND tablename = 'menu_items') THEN
    CREATE POLICY "Allow public menu read" ON menu_items FOR SELECT TO anon USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_menu_category ON menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_available ON menu_items(is_available);

-- ============================================================
-- BLOCKED DATES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS blocked_dates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public blocked dates read' AND tablename = 'blocked_dates') THEN
    CREATE POLICY "Allow public blocked dates read" ON blocked_dates FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- ============================================================
-- STAFF PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS staff_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('OWNER', 'MANAGER')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated can read profiles' AND tablename = 'staff_profiles') THEN
    CREATE POLICY "Authenticated can read profiles" ON staff_profiles FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access staff' AND tablename = 'staff_profiles') THEN
    CREATE POLICY "Service role full access staff" ON staff_profiles FOR ALL TO service_role USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_staff_user_id ON staff_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff_profiles(role);
CREATE INDEX IF NOT EXISTS idx_staff_status ON staff_profiles(status);

-- ============================================================
-- CUSTOMER NOTES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_email TEXT NOT NULL,
  note TEXT NOT NULL,
  is_vip_flag BOOLEAN DEFAULT FALSE,
  staff_name TEXT NOT NULL,
  staff_role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff can manage notes' AND tablename = 'customer_notes') THEN
    CREATE POLICY "Staff can manage notes" ON customer_notes FOR ALL TO service_role USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customer_notes_email ON customer_notes(customer_email);

-- ============================================================
-- AUDIT LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  target_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access audit' AND tablename = 'audit_logs') THEN
    CREATE POLICY "Service role full access audit" ON audit_logs FOR ALL TO service_role USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_email);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- ─── 12. NEWSLETTER SUBSCRIBERS TABLE ───
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'UNSUBSCRIBED')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public subscribe" ON newsletter_subscribers FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Service role full access newsletter" ON newsletter_subscribers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_status ON newsletter_subscribers(status);

-- ─── 13. MENU SOFT DELETE COLUMN ───
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_menu_deleted ON menu_items(is_deleted);

-- ─── VERIFY ───
SELECT 'reservations' as tbl, count(*) as cols FROM information_schema.columns WHERE table_name = 'reservations'
UNION ALL
SELECT 'waitlist', count(*) FROM information_schema.columns WHERE table_name = 'waitlist'
UNION ALL
SELECT 'menu_items', count(*) FROM information_schema.columns WHERE table_name = 'menu_items'
UNION ALL
SELECT 'blocked_dates', count(*) FROM information_schema.columns WHERE table_name = 'blocked_dates'
UNION ALL
SELECT 'staff_profiles', count(*) FROM information_schema.columns WHERE table_name = 'staff_profiles'
UNION ALL
SELECT 'customer_notes', count(*) FROM information_schema.columns WHERE table_name = 'customer_notes'
UNION ALL
SELECT 'audit_logs', count(*) FROM information_schema.columns WHERE table_name = 'audit_logs'
UNION ALL
SELECT 'newsletter_subscribers', count(*) FROM information_schema.columns WHERE table_name = 'newsletter_subscribers';
