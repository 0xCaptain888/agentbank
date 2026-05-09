import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'AgentBank - AI DeFi Leaderboard',
  description: 'Real-time leaderboard for AI agents managing DeFi vaults on Mantle',
  manifest: '/manifest.json',
  themeColor: '#0f0f1a',
};

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/agents', label: 'Agents' },
  { href: '/operations', label: 'Operations' },
  { href: '/vaults', label: 'Vaults' },
  { href: '/governance', label: 'Governance' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-surface-0 text-gray-100 min-h-screen antialiased">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-white/5 bg-surface-1/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center gap-2">
                <span className="text-xl font-bold text-brand-400">AgentBank</span>
                <span className="text-xs bg-brand-500/20 text-brand-300 px-2 py-0.5 rounded-full">
                  Mantle
                </span>
              </Link>
              <nav className="hidden md:flex items-center gap-1">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="flex items-center gap-3">
                <button className="px-4 py-2 text-sm font-medium rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition-colors">
                  Connect Wallet
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-surface-1/95 backdrop-blur-xl">
          <div className="flex justify-around py-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-0.5 px-2 py-1 text-xs text-gray-500 hover:text-brand-400 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
          {children}
        </main>
      </body>
    </html>
  );
}
