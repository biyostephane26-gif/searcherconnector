'use client'
import { useEffect } from 'react'
import Sidebar from '../components/layout/Sidebar'
import Navbar from '../components/layout/Navbar'

export default function Terms() {
  useEffect(() => { document.title = 'Conditions d\'utilisation — Searcher Connector' }, [])

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-12 space-y-10 text-gray-300">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Conditions Générales d'Utilisation</h1>
              <p className="text-sm text-gray-500">Dernière mise à jour : Juin 2025</p>
            </div>

            {[
              { title: '1. Présentation du service', content: 'Searcher Connector ("le Service") est une plateforme d\'automatisation de la recherche d\'emploi et de missions freelance. Il est opéré par Biyo Stéphane, fondateur, domicilié au Cameroun. Le Service utilise un agent IA (SCAI) pour scanner des sources publiques du web et proposer des opportunités correspondant au profil de l\'utilisateur.' },
              { title: '2. Acceptation des conditions', content: 'En créant un compte sur Searcher Connector, vous acceptez sans réserve les présentes CGU. Si vous n\'acceptez pas ces conditions, veuillez ne pas utiliser le Service. L\'utilisation du Service implique l\'acceptation de notre Politique de Confidentialité.' },
              { title: '3. Description des services', content: 'Searcher Connector propose : scan automatique d\'opportunités (emploi et freelance), scoring et filtrage par IA des résultats, préparation de candidatures personnalisées par SCAI, inbox unifiée (Gmail + WhatsApp), réseau social professionnel intégré, et agent IA (SCAI) disponible 24h/24. Important : SCAI prépare et rédige les candidatures, mais ne les soumet pas automatiquement à un employeur ou recruteur — l\'envoi final reste une action de l\'utilisateur (via le lien de l\'offre ou le canal indiqué), sauf pour les fonctionnalités explicitement décrites comme entièrement automatisées.' },
              { title: '4. Comptes utilisateurs', content: 'Vous êtes responsable de la confidentialité de vos identifiants. Vous vous engagez à fournir des informations exactes et à maintenir votre profil à jour. Un seul compte par personne physique est autorisé. L\'équipe Searcher Connector se réserve le droit de suspendre ou supprimer tout compte en cas d\'utilisation abusive.' },
              { title: '5. Plans et facturation', content: 'Le Service propose un plan gratuit avec des fonctionnalités limitées et des plans payants avec accès illimité. Les paiements sont traités via Mobile Money (Monetbil), carte bancaire (quand disponible), ou par virement/dépôt manuel confirmé par email et activé manuellement par l\'équipe pour les zones où les paiements automatiques ne sont pas encore disponibles. Les abonnements se renouvellent automatiquement jusqu\'à annulation. Aucun remboursement n\'est accordé pour une période déjà commencée, sauf disposition légale contraire.' },
              { title: '6. Utilisation acceptable', content: 'Il est strictement interdit d\'utiliser Searcher Connector pour : scraper massivement des données, automatiser des candidatures frauduleuses, envoyer du spam, contourner les limitations du plan gratuit, utiliser des informations d\'identité fictives, ou tout acte contraire aux lois applicables.' },
              { title: '7. Propriété intellectuelle', content: 'Searcher Connector, son code source, ses interfaces, son logo, sa marque et ses algorithmes sont la propriété exclusive de Biyo Stéphane. Toute reproduction ou utilisation sans autorisation est interdite. Le contenu généré par l\'IA appartient à l\'utilisateur qui l\'a généré.' },
              { title: '8. Limitation de responsabilité', content: 'Searcher Connector est un outil d\'aide à la recherche d\'opportunités. Il ne garantit pas l\'obtention d\'un emploi, d\'une mission ou d\'un financement. La responsabilité de Searcher Connector est limitée au montant des sommes versées par l\'utilisateur au cours des 3 derniers mois.' },
              { title: '9. Modifications', content: 'Nous nous réservons le droit de modifier ces CGU à tout moment. Les utilisateurs seront notifiés par email 30 jours avant toute modification significative.' },
              { title: '10. Droit applicable', content: 'Les présentes CGU sont régies par le droit camerounais. En cas de litige, les parties s\'engagent à rechercher une solution amiable avant tout recours judiciaire.' },
              { title: '11. Contact', content: 'Pour toute question relative aux présentes CGU : biyostephane26@gmail.com' },
            ].map((section, i) => (
              <section key={i} className="space-y-3">
                <h2 className="text-xl font-bold text-white">{section.title}</h2>
                <p className="text-sm leading-relaxed">{section.content}</p>
              </section>
            ))}

            <div className="border-t border-[#1A1A1A] pt-6 text-xs text-gray-600">
              © {new Date().getFullYear()} Searcher Connector — Tous droits réservés
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
