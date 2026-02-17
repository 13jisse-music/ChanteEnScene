-- Add geolocation columns to pwa_installs and push_subscriptions
ALTER TABLE pwa_installs ADD COLUMN city TEXT;
ALTER TABLE pwa_installs ADD COLUMN region TEXT;

ALTER TABLE push_subscriptions ADD COLUMN city TEXT;
ALTER TABLE push_subscriptions ADD COLUMN region TEXT;
