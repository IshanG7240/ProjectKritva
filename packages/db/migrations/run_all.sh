#!/usr/bin/env bash
# Run all migrations in order against a PostgreSQL database.
# Usage: ./run_all.sh <database_url>
# Example: ./run_all.sh "postgresql://postgres:password@localhost:54322/postgres"

set -euo pipefail

DB_URL="${1:?Usage: $0 <database_url>}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

MIGRATIONS=(
  "000_extensions.sql"
  "001_auth_domain.sql"
  "002_vendor_domain.sql"
  "003_booking_domain.sql"
  "004_payment_domain.sql"
  "005_comms_domain.sql"
  "006_admin_domain.sql"
  "007_reviews.sql"
  "008_search_triggers.sql"
  "009_updated_at_triggers.sql"
  "010_row_level_security.sql"
  "011_seed_platform_config.sql"
  "012_nullable_user_phone.sql"
  "013_vendor_profile_media.sql"
  "014_storage_policies.sql"
  "015_vendor_draft_status.sql"
  "016_vendor_packages.sql"
  "017_vendor_location.sql"
  "018_revoke_anon_authenticated_grants.sql"
  "019_schema_drift_fixes.sql"
  "020_mvp_columns.sql"
  "021_payment_gateway_unique.sql"
  "022_refunded_escrow_outcome.sql"
)

echo "Running ${#MIGRATIONS[@]} migrations..."
echo ""

for migration in "${MIGRATIONS[@]}"; do
  echo "→ $migration"
  psql "$DB_URL" -f "$SCRIPT_DIR/$migration" -v ON_ERROR_STOP=1
  echo "  ✓ done"
done

echo ""
echo "All migrations applied successfully."
