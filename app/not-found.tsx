import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* Logo */}
        <div className="mb-8">
          <span className="text-[#D4AF37] font-black text-2xl tracking-tighter">SEARCHER</span>
          <span className="text-[#444444] text-xs tracking-[0.3em] ml-2 uppercase">Connector</span>
        </div>

        {/* 404 */}
        <div className="text-8xl font-black text-[#1A1A1A] mb-4">404</div>
        <h1 className="text-2xl font-bold text-white mb-3">Page introuvable</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          Cette page n'existe pas ou a été déplacée. SCAI cherche des opportunités pendant ce temps.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard"
            className="bg-[#D4AF37] text-black font-bold px-6 py-3 rounded-xl hover:bg-[#F5E6A3] transition-colors text-sm">
            Retour au dashboard
          </Link>
          <Link href="/"
            className="border border-[#2a2a2a] text-gray-400 font-bold px-6 py-3 rounded-xl hover:border-[#D4AF37]/30 hover:text-white transition-colors text-sm">
            Page d'accueil
          </Link>
        </div>

        {/* Status indicator */}
        <div className="mt-12 flex items-center justify-center gap-2 text-xs text-gray-700">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          SCAI actif — tes opportunités continuent d'être scannées
        </div>
      </div>
    </div>
  )
}
