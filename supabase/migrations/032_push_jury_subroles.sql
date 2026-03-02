-- Add jury sub-roles for phase-specific push targeting
-- jury_online = jury voting online, jury_semi = semi-final jury, jury_finale = finale jury

ALTER TABLE push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_role_check;
ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_role_check
  CHECK (role IN ('public', 'jury', 'admin', 'jury_online', 'jury_semi', 'jury_finale'));
