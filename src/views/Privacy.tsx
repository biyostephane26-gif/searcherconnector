'use client'
import { useEffect } from 'react'
import Sidebar from '../components/layout/Sidebar'
import Navbar from '../components/layout/Navbar'

export default function Privacy() {
  useEffect(() => { document.title = 'Politique de Confidentialité — Searcher Connector' }, [])

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-12 space-y-10 text-gray-300">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Politique de Confidentialité</h1>
              <p className="text-sm text-gray-500">Dernière mise à jour : Juin 2025 — Conforme RGPD et lois africaines de protection des données</p>
            </div>

            {[
              { title: '1. Responsable du traitement', content: 'Le responsable du traitement des données personnelles est Biyo Stéphane, fondateur de Searcher Connector, domicilié au Cameroun. Contact : biyostephane26@gmail.com' },
              { title: '2. Données collectées', content: 'Nous collectons : nom complet, adresse email, mot de passe (haché), photo de profil (optionnel), domaine professionnel, pays, ville, liens externes (LinkedIn, GitHub, portfolio), CV ou documents uploadés (optionnel), préférences de recherche. Données automatiques : adresse IP, logs de navigation, actions dans l\'application, messages avec SCAI, résultats de scan.' },
              { title: '3. Finalités du traitement', content: 'Vos données servent à : fournir et améliorer les services, personnaliser les résultats de scan, envoyer des candidatures en votre nom (avec votre consentement), vous notifier des nouvelles opportunités, traiter les paiements, prévenir les fraudes, et respecter nos obligations légales.' },
              { title: '4. Base légale', content: 'Exécution du contrat pour la fourniture du Service, consentement pour les communications marketing et scans autonomes, intérêt légitime pour la sécurité et l\'amélioration du Service, obligation légale pour la conservation de certaines données.' },
              { title: '5. Partage des données', content: 'Vos données ne sont jamais vendues. Elles peuvent être partagées avec : Supabase (hébergement DB, conforme RGPD), MongoDB Atlas (cache et sessions), Flutterwave/Monetbil (paiements), Groq/Google AI (traitement IA sans stockage personnel), Vercel (hébergement), Resend (emails transactionnels).' },
              { title: '6. Conservation des données', content: 'Données de compte : tant que le compte est actif + 3 ans après suppression. Logs de scan : 48h (cache MongoDB avec TTL automatique). Conversations SCAI : conservées définitivement sur demande de l\'utilisateur. Données de paiement : 10 ans (obligation légale fiscale).' },
              { title: '7. Vos droits', content: 'Conformément au RGPD : droit d\'accès à vos données, droit de rectification, droit à l\'effacement ("droit à l\'oubli"), droit à la portabilité, droit d\'opposition à certains traitements, droit à la limitation. Pour exercer ces droits : biyostephane26@gmail.com. Réponse sous 30 jours.' },
              { title: '8. Sécurité', content: 'Nous mettons en place : chiffrement en transit (HTTPS/TLS), accès restreint aux données sensibles, authentification sécurisée via Supabase Auth, Content Security Policy (CSP), HSTS, et audits de sécurité réguliers. Les mots de passe ne sont jamais stockés en clair.' },
              { title: '9. Cookies', content: 'Searcher Connector utilise des cookies essentiels (authentification, préférences de langue) et des cookies analytiques anonymisés. Aucun cookie publicitaire tiers n\'est utilisé.' },
              { title: '10. Transferts internationaux', content: 'Vos données peuvent être traitées hors de votre pays de résidence. Ces transferts s\'effectuent avec des garanties appropriées (clauses contractuelles types, certifications).' },
              { title: '11. Contact DPO', content: 'Pour toute question relative à la protection de vos données : biyostephane26@gmail.com — Objet : "Protection des données — Searcher Connector"' },
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
