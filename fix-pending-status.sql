-- SQL pour changer ton statut de pending à verified
-- Exécute ceci dans Supabase SQL Editor

UPDATE users_profiles 
SET verification_status = 'verified'
WHERE email = 'biyostephane26@gmail.com';

-- OU si tu veux être GENIUS directement:
-- UPDATE users_profiles 
-- SET verification_status = 'genius'
-- WHERE email = 'biyostephane26@gmail.com';
