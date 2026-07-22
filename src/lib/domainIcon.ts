// =================================================================
// Icône représentative du métier — affichée en filigrane sur la
// bannière du profil. Zéro coût : pas de génération d'image, juste
// un mapping mots-clés → icône parmi celles déjà utilisées dans le
// projet (lucide-react). Même logique de correspondance par racine
// que extractSimpleKeywords dans scraper/categories.ts.
// =================================================================
import {
  Code2, Palette, TrendingUp, Wrench, Zap, Droplet, ChefHat, Scale,
  Stethoscope, HeartPulse, GraduationCap, Car, Sprout, Camera, PenTool,
  Calculator, Compass, Shield, ShoppingBag, Scissors, Shirt, Hammer,
  BarChart3, Users, Music, Languages, Home, Truck, Briefcase, Server,
  Paintbrush, Megaphone, Building2, PawPrint, Plane, Dumbbell,
  type LucideIcon,
} from 'lucide-react'

const ICON_RULES: { keywords: string[]; icon: LucideIcon }[] = [
  { keywords: ['develop', 'program', 'ingenieur logiciel', 'software', 'fullstack', 'backend', 'frontend'], icon: Code2 },
  { keywords: ['devops', 'cloud', 'infrastructure', 'reseau', 'sysadmin', 'serveur'], icon: Server },
  { keywords: ['design', 'graphist', 'ui', 'ux', 'illustrat'], icon: Palette },
  { keywords: ['peintre', 'artist', 'dessin'], icon: Paintbrush },
  { keywords: ['marketing', 'growth', 'seo', 'publicit', 'communicat'], icon: Megaphone },
  { keywords: ['vente', 'commercial', 'sales', 'business dev'], icon: ShoppingBag },
  { keywords: ['mecanic', 'automobile', 'garagiste'], icon: Wrench },
  { keywords: ['electric', 'electron'], icon: Zap },
  { keywords: ['plomb', 'plumb'], icon: Droplet },
  { keywords: ['cuisin', 'chef', 'cook', 'patissi', 'restaurat'], icon: ChefHat },
  { keywords: ['avocat', 'juridique', 'lawyer', 'droit', 'notaire'], icon: Scale },
  { keywords: ['medecin', 'docteur', 'doctor', 'chirurgien'], icon: Stethoscope },
  { keywords: ['infirmier', 'nurse', 'sante', 'aide-soignant'], icon: HeartPulse },
  { keywords: ['enseignant', 'professeur', 'teacher', 'formateur', 'education', 'tuteur'], icon: GraduationCap },
  { keywords: ['chauffeur', 'driver', 'livreur', 'transport', 'logistique'], icon: Truck },
  { keywords: ['taxi', 'uber', 'vtc'], icon: Car },
  { keywords: ['agricult', 'ferme', 'farmer', 'elevage'], icon: Sprout },
  { keywords: ['photograph'], icon: Camera },
  { keywords: ['redact', 'ecrivain', 'writer', 'journalist', 'copywrit', 'content'], icon: PenTool },
  { keywords: ['comptab', 'accountant', 'finance', 'audit'], icon: Calculator },
  { keywords: ['architect', 'urbanis'], icon: Compass },
  { keywords: ['securit', 'gardien', 'agent de securite'], icon: Shield },
  { keywords: ['coiffeur', 'coiffure', 'hairdress', 'barbier'], icon: Scissors },
  { keywords: ['couture', 'tailleur', 'tailor', 'textile'], icon: Shirt },
  { keywords: ['menuisi', 'carpenter', 'charpent', 'construction', 'batiment', 'macon'], icon: Hammer },
  { keywords: ['data', 'analyst', 'statisticien'], icon: BarChart3 },
  { keywords: ['ressources humaines', 'recrut', 'rh '], icon: Users },
  { keywords: ['musicien', 'music', 'chanteur', 'dj '], icon: Music },
  { keywords: ['traduct', 'translator', 'interprete'], icon: Languages },
  { keywords: ['immobilier', 'real estate', 'agent immobilier'], icon: Home },
  { keywords: ['veterinaire', 'animal', 'toilettage'], icon: PawPrint },
  { keywords: ['pilote', 'aviation', 'hotesse', 'steward'], icon: Plane },
  { keywords: ['sport', 'coach', 'fitness', 'entraineur'], icon: Dumbbell },
  { keywords: ['hotel', 'hospitalit', 'tourisme', 'evenement'], icon: Building2 },
]

function normalize(text: string): string {
  return (text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

// Cherche dans le(s) domaine(s) de l'utilisateur (max 3) l'icône la plus
// pertinente. Repli : Briefcase (mallette générique) si rien ne matche.
export function getDomainIcon(domain?: string, domains?: string[]): LucideIcon {
  const haystack = normalize([domain, ...(domains || [])].filter(Boolean).join(' '))
  for (const rule of ICON_RULES) {
    if (rule.keywords.some(kw => haystack.includes(normalize(kw)))) return rule.icon
  }
  return Briefcase
}
