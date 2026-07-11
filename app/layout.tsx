import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Providers from './providers'
import InstallBanner from '../src/components/pwa/InstallBanner'
import ServiceWorkerRegister from '../src/components/pwa/ServiceWorkerRegister'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'Searcher Connector — L\'agent qui travaille pour vous 24h/24',
    template: '%s | Searcher Connector',
  },
  description: 'Searcher Connector est un agent IA autonome qui scanne le web, trouve des opportunités (emploi, freelance, investissement) et postule en votre nom — 24h/24, 7j/7.',
  keywords: ['agent IA', 'recherche emploi', 'freelance', 'opportunités', 'intelligence artificielle', 'Africa', 'remote jobs'],
  authors: [{ name: 'Biyo Stéphane', url: 'https://searcherconnector.com' }],
  creator: 'Biyo Stéphane',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://searcherconnector.com'),
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    alternateLocale: ['en_US'],
    url: 'https://searcherconnector.com',
    siteName: 'Searcher Connector',
    title: 'Searcher Connector — L\'agent qui travaille pour vous 24h/24',
    description: 'Le premier agent d\'opportunités autonome mondial. Emploi, freelance, investissement — SCAI cherche et postule pendant que vous dormez.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Searcher Connector — Agent IA d\'opportunités',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Searcher Connector',
    description: 'L\'agent IA qui travaille pour vous 24h/24 — emploi, freelance, investissement.',
    images: ['/og-image.png'],
    creator: '@searcherconnect',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <InstallBanner />
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
