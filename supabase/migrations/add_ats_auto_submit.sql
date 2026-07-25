-- =================================================================
-- Soumission ATS réelle (Greenhouse/Lever) — réglage par utilisateur.
-- Par défaut : SCAI remplit le formulaire et attend une validation
-- (comportement le plus prudent). L'utilisateur peut activer la
-- soumission 100% autonome (sans relecture) s'il le souhaite.
-- =================================================================

ALTER TABLE agent_schedules ADD COLUMN IF NOT EXISTS ats_auto_submit_no_review boolean DEFAULT false;

-- Preuve de soumission réelle — distincte du message généré (qui existait
-- déjà) : confirme qu'un vrai formulaire a été rempli et envoyé, avec
-- horodatage et texte de confirmation affiché par l'ATS après envoi.
ALTER TABLE applications_sent ADD COLUMN IF NOT EXISTS ats_submitted_at timestamptz;
ALTER TABLE applications_sent ADD COLUMN IF NOT EXISTS ats_confirmation text;
ALTER TABLE applications_sent ADD COLUMN IF NOT EXISTS ats_platform text;
