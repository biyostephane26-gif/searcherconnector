-- =================================================================
-- Ajoute le numéro WhatsApp au profil utilisateur — nécessaire pour
-- que SCAI puisse l'inclure dans les messages de candidature générés
-- (aux côtés du portfolio et de l'email), comme demandé.
-- =================================================================

alter table users_profiles
  add column if not exists whatsapp_number text;
