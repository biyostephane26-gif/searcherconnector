-- Champs collectés à l'onboarding pour la vérification IA de cohérence
-- de profil (photo déjà supportée via avatar_url, ici on ajoute le
-- diplôme/l'école et la date de naissance pour pouvoir vérifier que le
-- parcours déclaré est plausible — ex: un diplôme obtenu à un âge
-- physiquement impossible compte tenu de la date de naissance).
ALTER TABLE users_profiles ADD COLUMN IF NOT EXISTS diploma text;
ALTER TABLE users_profiles ADD COLUMN IF NOT EXISTS school text;
ALTER TABLE users_profiles ADD COLUMN IF NOT EXISTS birth_date date;
ALTER TABLE users_profiles ADD COLUMN IF NOT EXISTS graduation_year integer;
