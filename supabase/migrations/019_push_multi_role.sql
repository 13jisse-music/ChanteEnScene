-- Allow same device to subscribe with multiple roles (public + admin)
-- Change unique constraint from (endpoint, session_id) to (endpoint, session_id, role)
ALTER TABLE push_subscriptions DROP CONSTRAINT push_subscriptions_endpoint_session_id_key;
ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_endpoint_session_role_key UNIQUE(endpoint, session_id, role);
