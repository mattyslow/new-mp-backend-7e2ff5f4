-- ============================================
-- ADMIN USER SETUP
-- Run this AFTER creating your first admin user
-- in the Supabase Auth dashboard
-- ============================================

-- Replace 'YOUR_ADMIN_USER_ID' with the actual UUID
-- from Auth → Users in your Supabase dashboard

-- Grant admin role to a user
INSERT INTO public.user_roles (user_id, role)
VALUES ('YOUR_ADMIN_USER_ID', 'admin');

-- Example: If you created an admin user and their ID is
-- '123e4567-e89b-12d3-a456-426614174000', run:
--
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('123e4567-e89b-12d3-a456-426614174000', 'admin');

-- ============================================
-- LINK PLAYER TO AUTH USER (for player app)
-- ============================================

-- When a player signs up, you'll need to link their
-- auth account to their player record. This can be
-- done automatically via a trigger or manually:

-- Manual linking example:
-- INSERT INTO public.player_profiles (user_id, player_id)
-- VALUES ('AUTH_USER_UUID', 'PLAYER_TABLE_UUID');

-- ============================================
-- OPTIONAL: Auto-create player profile on signup
-- ============================================

-- This trigger automatically creates a player_profile
-- when a new user signs up (for the player app)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to find existing player by email
  INSERT INTO public.player_profiles (user_id, player_id)
  SELECT NEW.id, p.id
  FROM public.players p
  WHERE LOWER(p.email) = LOWER(NEW.email)
  LIMIT 1;
  
  -- If no player found, just create profile without player link
  IF NOT FOUND THEN
    INSERT INTO public.player_profiles (user_id, player_id)
    VALUES (NEW.id, NULL);
  END IF;
  
  -- Assign player role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'player')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
