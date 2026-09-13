// =================================================================
// SCAI Cowork — catalogue des connecteurs (source unique client/serveur)
// =================================================================
// Chaque connecteur déclare COMMENT il se branche. Le statut réel
// (connecté, configuration requise…) est calculé côté serveur dans
// app/api/connectors/route.ts à partir de la base — jamais inventé ici.
//
//  oauth      : autorisation officielle de la plateforme (Gmail…)
//  extension  : passe par l'extension navigateur, dans la session de
//               l'utilisateur (plateformes freelance qui bloquent le
//               scraping serveur : Upwork, Fiverr, Malt…)
//  profile    : lien public vers le compte (GitHub, LinkedIn, Behance)
//  phone      : numéro WhatsApp
//  tool       : outil intégré à SCAI (PDF, Excel, Word, image, vidéo)
//  soon       : prévu, pas encore disponible (affiché honnêtement)
// =================================================================

export type ConnectorKind = 'oauth' | 'extension' | 'profile' | 'phone' | 'tool' | 'soon' | 'custom'

export type ConnectorCategory =
  | 'communication'
  | 'browser'
  | 'freelance'
  | 'professional'
  | 'documents'
  | 'creation'
  | 'productivity'

export type ConnectorStatus =
  | 'connected'
  | 'available'
  | 'config_required'
  | 'plan_required'
  | 'builtin'
  | 'soon'

export interface ConnectorDef {
  id: string
  name: string
  category: ConnectorCategory
  kind: ConnectorKind
  tile: { label: string; bg: string; fg: string }
  description: string
  capabilities: string[]
  paidOnly?: boolean
  profileField?: 'github_url' | 'linkedin_url' | 'behance_url' | 'portfolio_url'
  profilePlaceholder?: string
  platformHost?: string
}

export const CONNECTOR_CATEGORIES: { id: ConnectorCategory; label: string }[] = [
  { id: 'communication', label: 'Communication' },
  { id: 'browser',       label: 'Navigateur' },
  { id: 'freelance',     label: 'Plateformes freelance' },
  { id: 'professional',  label: 'Réseaux pro & code' },
  { id: 'documents',     label: 'Documents' },
  { id: 'creation',      label: 'Création' },
  { id: 'productivity',  label: 'Productivité' },
]

const freelance = (
  id: string, name: string, host: string, label: string, bg: string, fg = '#fff',
): ConnectorDef => ({
  id, name, category: 'freelance', kind: 'extension', paidOnly: true, platformHost: host,
  tile: { label, bg, fg },
  description: `SCAI travaille sur ${name} depuis ta propre session, via l'extension — aucun mot de passe transmis, aucun scraping bloqué.`,
  capabilities: [
    'Pré-remplissage de tes propositions et candidatures',
    'Message de candidature rédigé par SCAI',
    'Le clic final d\'envoi reste toujours le tien',
  ],
})

export const CONNECTORS: ConnectorDef[] = [
  // ── Communication ──────────────────────────────────────────────
  {
    id: 'gmail', name: 'Gmail', category: 'communication', kind: 'oauth',
    tile: { label: 'M', bg: '#EA4335', fg: '#fff' },
    description: 'SCAI lit les réponses des recruteurs et envoie tes relances depuis ta propre adresse.',
    capabilities: ['Lecture des réponses aux candidatures', 'Envoi de relances depuis ton adresse', 'Brouillons de réponse rédigés par SCAI'],
  },
  {
    id: 'whatsapp', name: 'WhatsApp', category: 'communication', kind: 'phone',
    tile: { label: 'W', bg: '#25D366', fg: '#fff' },
    description: 'Reçois les alertes d\'opportunités et contacte les clients directement sur WhatsApp.',
    capabilities: ['Alertes d\'opportunités fraîches', 'Liens de contact direct avec les clients', 'Réponses préparées par SCAI'],
  },
  {
    id: 'outlook', name: 'Outlook', category: 'communication', kind: 'soon',
    tile: { label: 'O', bg: '#0078D4', fg: '#fff' },
    description: 'Même fonctionnement que Gmail, pour les adresses Microsoft.',
    capabilities: ['Lecture des réponses', 'Envoi de relances'],
  },

  // ── Navigateur ─────────────────────────────────────────────────
  {
    id: 'chrome', name: 'Extension Chrome', category: 'browser', kind: 'extension', paidOnly: true,
    tile: { label: 'C', bg: '#1A73E8', fg: '#fff' },
    description: 'Le pont entre SCAI et ton navigateur : remplit tes candidatures partout, et envoie seul sur les ATS reconnus.',
    capabilities: [
      'Pré-remplissage automatique sur n\'importe quel formulaire',
      'Envoi 100% autonome sur Greenhouse et Lever (option)',
      'Débloque les connecteurs des plateformes freelance',
    ],
  },

  // ── Plateformes freelance (bloquent le scraping sans autorisation) ──
  freelance('upwork',        'Upwork',        'upwork.com',        'Up', '#14A800'),
  freelance('fiverr',        'Fiverr',        'fiverr.com',        'fi', '#1DBF73'),
  freelance('malt',          'Malt',          'malt.fr',           'M',  '#FC5757'),
  freelance('freelancer',    'Freelancer',    'freelancer.com',    'F',  '#29B2FE'),
  freelance('toptal',        'Toptal',        'toptal.com',        'T',  '#204ECF'),
  freelance('peopleperhour', 'PeoplePerHour', 'peopleperhour.com', 'PP', '#FF6D00'),
  freelance('comeup',        'ComeUp',        'comeup.com',        'CU', '#6C4BF4'),
  freelance('guru',          'Guru',          'guru.com',          'G',  '#4B6FA7'),
  freelance('contra',        'Contra',        'contra.com',        'C',  '#111111'),
  freelance('workana',       'Workana',       'workana.com',       'Wk', '#2E6BE6'),
  freelance('codeur',        'Codeur.com',    'codeur.com',        'Cd', '#E8513A'),
  freelance('99designs',     '99designs',     '99designs.com',     '99', '#F26B38'),
  freelance('dribbble',      'Dribbble',      'dribbble.com',      'Dr', '#EA4C89'),
  freelance('twine',         'Twine',         'twine.net',         'Tw', '#5B4BDB'),

  // ── Réseaux pro & code ─────────────────────────────────────────
  {
    id: 'linkedin', name: 'LinkedIn', category: 'professional', kind: 'profile',
    tile: { label: 'in', bg: '#0A66C2', fg: '#fff' },
    profileField: 'linkedin_url', profilePlaceholder: 'https://www.linkedin.com/in/ton-profil',
    description: 'SCAI utilise ton profil LinkedIn dans tes candidatures ; l\'extension pré-remplit les formulaires LinkedIn.',
    capabilities: ['Lien de profil ajouté à tes candidatures', 'Pré-remplissage Easy Apply via l\'extension'],
  },
  {
    id: 'github', name: 'GitHub', category: 'professional', kind: 'profile',
    tile: { label: 'GH', bg: '#181717', fg: '#fff' },
    profileField: 'github_url', profilePlaceholder: 'ton-pseudo-github',
    description: 'SCAI analyse tes dépôts publics pour mettre en avant tes vrais projets auprès des clients.',
    capabilities: ['Lecture de tes dépôts publics', 'Projets phares cités dans tes candidatures', 'Langages détectés pour le matching'],
  },
  {
    id: 'behance', name: 'Behance', category: 'professional', kind: 'profile',
    tile: { label: 'Bē', bg: '#1769FF', fg: '#fff' },
    profileField: 'behance_url', profilePlaceholder: 'https://www.behance.net/ton-profil',
    description: 'Ton portfolio créatif joint automatiquement aux candidatures design.',
    capabilities: ['Portfolio ajouté aux candidatures créatives'],
  },

  // ── Documents ──────────────────────────────────────────────────
  {
    id: 'pdf', name: 'PDF', category: 'documents', kind: 'tool',
    tile: { label: 'PDF', bg: '#B30B00', fg: '#fff' },
    description: 'Demande à SCAI un CV, une lettre, un devis ou un rapport : il le rédige et te donne le PDF.',
    capabilities: ['CV et lettres de motivation', 'Devis et propositions commerciales', 'Rapports de candidatures'],
  },
  {
    id: 'excel', name: 'Excel', category: 'documents', kind: 'tool',
    tile: { label: 'X', bg: '#107C41', fg: '#fff' },
    description: 'Tableaux .xlsx générés par SCAI ou exportés depuis tes opportunités et candidatures.',
    capabilities: ['Export de tes opportunités', 'Suivi de candidatures', 'Budgets, plannings, grilles tarifaires'],
  },
  {
    id: 'word', name: 'Word', category: 'documents', kind: 'tool',
    tile: { label: 'W', bg: '#185ABD', fg: '#fff' },
    description: 'Documents .docx modifiables : propositions, contrats, lettres, comptes rendus.',
    capabilities: ['Propositions et lettres modifiables', 'Contrats et comptes rendus'],
  },

  // ── Création ───────────────────────────────────────────────────
  {
    id: 'image', name: 'Génération d\'images', category: 'creation', kind: 'tool',
    tile: { label: '◐', bg: '#D4AF37', fg: '#0A0A0A' },
    description: 'Visuels, maquettes, bannières et illustrations pour ton portfolio ou tes propositions.',
    capabilities: ['Visuels de portfolio', 'Bannières et miniatures', 'Maquettes pour propositions'],
  },
  {
    id: 'video', name: 'Mini-vidéos', category: 'creation', kind: 'tool', paidOnly: true,
    tile: { label: '▶', bg: '#0E9F9A', fg: '#fff' },
    description: 'Courtes vidéos de présentation ou de démonstration générées à partir d\'une description.',
    capabilities: ['Vidéo de présentation de 4 à 8 secondes', 'Démo animée d\'un projet'],
  },

  // ── Productivité (prévu) ───────────────────────────────────────
  {
    id: 'google_drive', name: 'Google Drive', category: 'productivity', kind: 'soon',
    tile: { label: 'D', bg: '#1FA463', fg: '#fff' },
    description: 'Enregistrer directement les documents générés par SCAI dans ton Drive.',
    capabilities: ['Sauvegarde des fichiers générés'],
  },
  {
    id: 'google_calendar', name: 'Google Agenda', category: 'productivity', kind: 'soon',
    tile: { label: '31', bg: '#4285F4', fg: '#fff' },
    description: 'Ajouter automatiquement tes entretiens et échéances de missions.',
    capabilities: ['Entretiens ajoutés à l\'agenda'],
  },
  {
    id: 'slack', name: 'Slack', category: 'productivity', kind: 'soon',
    tile: { label: 'S', bg: '#4A154B', fg: '#fff' },
    description: "Recevoir les alertes d'opportunités et les réponses clients dans Slack.",
    capabilities: ['Alertes dans un canal'],
  },
  {
    id: 'canva', name: 'Canva', category: 'creation', kind: 'soon',
    tile: { label: 'Ca', bg: '#00C4CC', fg: '#fff' },
    description: 'Créer des visuels de portfolio à partir de tes modèles Canva.',
    capabilities: ['Visuels à partir de modèles'],
  },
  {
    id: 'figma', name: 'Figma', category: 'creation', kind: 'soon',
    tile: { label: 'Fi', bg: '#1E1E1E', fg: '#fff' },
    description: 'Joindre tes maquettes Figma aux propositions design.',
    capabilities: ['Maquettes jointes aux candidatures'],
  },
  {
    id: 'notion', name: 'Notion', category: 'productivity', kind: 'soon',
    tile: { label: 'N', bg: '#000000', fg: '#fff' },
    description: 'Synchroniser ton suivi de missions avec une base Notion.',
    capabilities: ['Suivi de missions synchronisé'],
  },
]

export const KIND_LABEL: Record<ConnectorKind, string> = {
  oauth: 'Web', extension: 'Extension', profile: 'Profil', phone: 'Mobile',
  tool: 'Intégré', soon: 'Bientôt', custom: 'Personnalisé',
}

// Connecteur ajouté par l'utilisateur (n'importe quel site : plateforme
// freelance, ATS, site client…) — fonctionne via l'extension, dans sa session.
export interface CustomConnector { id: string; name: string; url: string; created_at: string }

export function customToDef(c: CustomConnector): ConnectorDef {
  let host = c.url
  try { host = new URL(c.url).hostname.replace(/^www\./, '') } catch {}
  return {
    id: c.id, name: c.name, category: 'freelance', kind: 'custom', platformHost: host,
    tile: { label: c.name.slice(0, 2), bg: '#0E9F9A', fg: '#fff' },
    description: `Connecteur personnalisé pour ${host}. SCAI pré-remplit tes candidatures sur ce site via l'extension, dans ta propre session.`,
    capabilities: ['Pré-remplissage des formulaires sur ce site', 'Message de candidature rédigé par SCAI', "Le clic final d'envoi reste le tien"],
  }
}

export function getConnector(id: string) {
  return CONNECTORS.find(c => c.id === id) || null
}

export interface ConnectorState {
  id: string
  status: ConnectorStatus
  account?: string | null
  detail?: string | null
}
