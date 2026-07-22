-- Nécessaire pour filtrer les réponses entrantes : sans ça on ne peut pas
-- savoir si un email reçu est une réponse à un envoi Cowork ou juste du bruit.
alter table email_threads
  add column if not exists to_email text;

create index if not exists idx_email_threads_to_email on email_threads(to_email);
