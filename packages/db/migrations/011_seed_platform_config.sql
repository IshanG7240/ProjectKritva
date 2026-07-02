-- Migration 011: Seed data for platform_config
-- Default configuration values for MVP launch.

BEGIN;

INSERT INTO platform_config (key, value) VALUES
  ('customer_commission_pct', '0'::jsonb),
  ('vendor_commission_pct', '8'::jsonb),
  ('min_portfolio_photos', '5'::jsonb),
  ('verification_sla_hours', '48'::jsonb),
  ('default_milestones', '{"advance": 40, "pre_event": 35, "post_event": 25}'::jsonb),
  ('default_milestone_labels', '{"advance": "Advance Payment", "pre_event": "Pre-Event Payment", "post_event": "Post-Event Balance"}'::jsonb),
  ('platform_name', '"Kritva"'::jsonb),
  ('support_email', '"support@kritva.in"'::jsonb),
  ('launch_city', '"delhi-ncr"'::jsonb)
ON CONFLICT (key) DO NOTHING;

COMMIT;
