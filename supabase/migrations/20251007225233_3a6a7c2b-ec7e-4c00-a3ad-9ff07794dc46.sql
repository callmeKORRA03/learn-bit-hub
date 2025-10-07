-- First, populate public.users with existing auth users
INSERT INTO public.users (id, username, wallet_address, xp, bitcred_balance, role)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'username', split_part(au.email, '@', 1)),
  au.raw_user_meta_data->>'wallet_address',
  0,
  10,
  'user'
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
);

-- Assign roles to existing users
INSERT INTO public.user_roles (user_id, role)
SELECT 
  au.id,
  CASE 
    WHEN au.email = 'admin@bitedu.dev' OR au.raw_user_meta_data->>'wallet_address' = '0xCf23C57FDbFFe8aa8E35612a15F0EC041f3B02f6' 
    THEN 'admin'::app_role
    ELSE 'user'::app_role
  END
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = au.id
);

-- Verify the trigger exists and recreate it if needed
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();