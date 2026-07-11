import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-[#0A0A0A] border-t border-[#1A1A1A] py-12 px-4 mt-20">
      <div className="max-w-7xl mx-auto">
        {/* Top row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div>
            <div className="text-[#D4AF37] font-black tracking-tighter text-lg mb-3">SEARCHER</div>
            <p className="text-gray-600 text-xs leading-relaxed">
              L'agent IA qui travaille pour vous 24h/24 — emploi, freelance, investissement.
            </p>
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase mb-3">Produit</div>
            <div className="space-y-2">
              {[
                ['/', 'Accueil'],
                ['/pricing', 'Tarifs'],
                ['/guide', 'Guide'],
                ['/about', 'À propos'],
              ].map(([href, label]) => (
                <Link key={href} href={href} className="block text-xs text-gray-500 hover:text-[#D4AF37] transition-colors">{label}</Link>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase mb-3">Légal</div>
            <div className="space-y-2">
              {[
                ['/privacy', 'Confidentialité'],
                ['/terms', 'CGU'],
                ['/support', 'Support'],
              ].map(([href, label]) => (
                <Link key={href} href={href} className="block text-xs text-gray-500 hover:text-[#D4AF37] transition-colors">{label}</Link>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase mb-3">Contact</div>
            <a href="mailto:biyostephane26@gmail.com"
              className="text-xs text-gray-500 hover:text-[#D4AF37] transition-colors break-all">
              biyostephane26@gmail.com
            </a>
            <p className="text-xs text-gray-700 mt-2">Douala, Cameroun</p>
          </div>
        </div>

        {/* Bottom row */}
        <div className="border-t border-[#1A1A1A] pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-[#444444] text-[10px] tracking-[0.3em] font-medium uppercase">
            © {new Date().getFullYear()} Searcher Connector — Built from Douala, Cameroon
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-700">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            SCAI actif 24h/24
          </div>
        </div>
      </div>
    </footer>
  )
}
