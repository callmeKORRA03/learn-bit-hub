-- 20251027_disable_on_auth_user_created_trigger.sql
-- Safe, minimal one-off fix: drop the on_auth_user_created trigger that is currently blocking new user creation.
-- This stops the handle_new_user trigger logic from running so signups can succeed.
-- After this is applied you should be able to create new accounts. Reintroducing a fixed trigger
-- will be done after verifying signups work.

BEGIN;

      -- Drop the trigger that fires handle_new_user() after auth.users inserts
      DROP TRIGGER IF EXISTS on_auth_user_created
      ON auth.users;

COMMIT;
