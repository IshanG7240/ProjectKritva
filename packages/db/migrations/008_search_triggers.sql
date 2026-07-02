-- Migration 008: Full-text search trigger for vendors
-- Auto-updates tsvector search_vector on insert/update.

BEGIN;

-- ============================================================
-- SEARCH VECTOR UPDATE FUNCTION
-- Builds tsvector from business_name, description, and category array.
-- Weights: name=A (highest), category=B, description=C
-- ============================================================
CREATE OR REPLACE FUNCTION vendors_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.business_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.category, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_vendors_search_vector
  BEFORE INSERT OR UPDATE OF business_name, category, description
  ON vendors
  FOR EACH ROW
  EXECUTE FUNCTION vendors_search_vector_update();

-- Backfill existing rows (idempotent for fresh migrations)
UPDATE vendors SET
  search_vector =
    setweight(to_tsvector('english', coalesce(business_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(array_to_string(category, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C');

COMMENT ON FUNCTION vendors_search_vector_update IS 'Auto-generates tsvector for PostgreSQL full-text search. Weighted: name(A) > category(B) > description(C)';

COMMIT;
