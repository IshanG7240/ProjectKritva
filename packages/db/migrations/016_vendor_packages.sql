-- Migration 016: Replace vendor_services with vendor_packages (package pricing MVP)
-- Renames table/columns to retain ULIDs; migrates booking snapshots; replaces RLS.

BEGIN;

-- ============================================================
-- 1. Rename vendor_services → vendor_packages (preserve ULIDs + FK)
-- ============================================================
ALTER TABLE vendor_services RENAME TO vendor_packages;

ALTER TABLE vendor_packages RENAME COLUMN price_min TO price;

-- Map legacy units: fixed/per_event → flat; keep others as-is
ALTER TABLE vendor_packages DROP CONSTRAINT IF EXISTS vendor_services_unit_check;
ALTER TABLE vendor_packages DROP CONSTRAINT IF EXISTS vendor_packages_unit_check;

UPDATE vendor_packages
SET unit = CASE unit
  WHEN 'fixed' THEN 'flat'
  WHEN 'per_event' THEN 'flat'
  ELSE unit
END;

ALTER TABLE vendor_packages
  ALTER COLUMN unit SET DEFAULT 'flat';

ALTER TABLE vendor_packages
  ADD CONSTRAINT vendor_packages_unit_check
  CHECK (unit IN ('flat', 'per_plate', 'per_person', 'per_hour', 'per_day', 'per_item'));

-- New columns
ALTER TABLE vendor_packages
  ADD COLUMN IF NOT EXISTS min_quantity integer,
  ADD COLUMN IF NOT EXISTS inclusions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Preserve old price_max in metadata when it was a real range, then drop
UPDATE vendor_packages
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
  'migrated_from', 'vendor_services',
  'legacy_price_max', price_max
)
WHERE price_max IS DISTINCT FROM price;

ALTER TABLE vendor_packages DROP CONSTRAINT IF EXISTS chk_price_range;
ALTER TABLE vendor_packages DROP COLUMN IF EXISTS price_max;

ALTER TABLE vendor_packages DROP CONSTRAINT IF EXISTS chk_price_positive;
ALTER TABLE vendor_packages
  ADD CONSTRAINT chk_package_price_positive CHECK (price >= 0);

ALTER TABLE vendor_packages
  ADD CONSTRAINT chk_package_min_quantity_positive
  CHECK (min_quantity IS NULL OR min_quantity > 0);

ALTER TABLE vendor_packages
  ADD CONSTRAINT chk_package_inclusions_array
  CHECK (jsonb_typeof(inclusions) = 'array');

-- Indexes: drop old names, add useful (vendor_id, is_active)
DROP INDEX IF EXISTS idx_vs_vendor;
DROP INDEX IF EXISTS idx_vs_active;

CREATE INDEX idx_vp_vendor ON vendor_packages (vendor_id);
CREATE INDEX idx_vp_vendor_active ON vendor_packages (vendor_id, is_active);

COMMENT ON TABLE vendor_packages IS 'Package offerings per vendor. Prices stored in paisa (INR × 100)';
COMMENT ON COLUMN vendor_packages.price IS 'Unit price in paisa';
COMMENT ON COLUMN vendor_packages.min_quantity IS 'Optional minimum quantity for per_plate/per_person packages';
COMMENT ON COLUMN vendor_packages.inclusions IS 'JSON array of inclusion strings';
COMMENT ON COLUMN vendor_packages.metadata IS 'Category-specific escape hatch + migration leftovers';

-- ============================================================
-- 2. Bookings: service_details → package_details
-- ============================================================
ALTER TABLE bookings RENAME COLUMN service_details TO package_details;

-- Transform stored JSON: array items service_id → package_id;
-- also handle legacy seed shape { services: [...] } and empty {} → []
UPDATE bookings
SET package_details = CASE
  WHEN jsonb_typeof(package_details) = 'array' THEN (
    SELECT COALESCE(
      jsonb_agg(
        CASE
          WHEN elem ? 'service_id' THEN
            (elem - 'service_id') || jsonb_build_object('package_id', elem->'service_id')
          ELSE elem
        END
      ),
      '[]'::jsonb
    )
    FROM jsonb_array_elements(package_details) AS elem
  )
  WHEN jsonb_typeof(package_details) = 'object' THEN
    '[]'::jsonb
  ELSE package_details
END;

COMMENT ON COLUMN bookings.package_details IS 'JSON array: selected packages with name/unit/price snapshots. Validated by Zod at API layer';

-- ============================================================
-- 3. RLS: drop old service policies, add package policies
-- Public SELECT: active packages for approved vendors + all rows for owner
-- Mutations: owner only (vendors.user_id = auth.uid()::text)
-- ============================================================
DROP POLICY IF EXISTS vs_select ON vendor_packages;
DROP POLICY IF EXISTS vs_insert_own ON vendor_packages;
DROP POLICY IF EXISTS vs_update_own ON vendor_packages;
DROP POLICY IF EXISTS vs_delete_own ON vendor_packages;

ALTER TABLE vendor_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY vp_select ON vendor_packages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vendors
      WHERE vendors.id = vendor_packages.vendor_id
        AND vendors.user_id = auth.uid()::text
    )
    OR (
      vendor_packages.is_active = true
      AND EXISTS (
        SELECT 1 FROM vendors
        WHERE vendors.id = vendor_packages.vendor_id
          AND vendors.verification_status = 'approved'
      )
    )
  );

CREATE POLICY vp_insert_own ON vendor_packages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vendors
      WHERE vendors.id = vendor_packages.vendor_id
        AND vendors.user_id = auth.uid()::text
    )
  );

CREATE POLICY vp_update_own ON vendor_packages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM vendors
      WHERE vendors.id = vendor_packages.vendor_id
        AND vendors.user_id = auth.uid()::text
    )
  );

CREATE POLICY vp_delete_own ON vendor_packages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM vendors
      WHERE vendors.id = vendor_packages.vendor_id
        AND vendors.user_id = auth.uid()::text
    )
  );

-- ============================================================
-- 4. updated_at trigger
-- ============================================================
CREATE TRIGGER trg_vendor_packages_updated_at
  BEFORE UPDATE ON vendor_packages
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMIT;
