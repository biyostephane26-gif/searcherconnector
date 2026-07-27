-- Catégorie de contrat typique de la source scrapée ('job' | 'freelance' | 'mixed')
-- Utilisée pour exclure les offres CDI classiques d'un profil freelance de
-- façon fiable, même quand le texte scrapé (titre + snippet) est trop court
-- pour contenir un marqueur explicite ("401k", "benefits package"...).
-- Voir src/lib/scraper/typeSignals.ts (isSourceCategoryMismatch).
ALTER TABLE cache_opportunities ADD COLUMN IF NOT EXISTS source_category text;
