import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GridBackground } from './components/layout/GridBackground';
import { Particles } from './components/layout/Particles';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { HomePage } from './pages/HomePage';
import { VipPage } from './pages/VipPage';
import { ProfilePage } from './pages/ProfilePage';
import type { PageId } from './types';

export default function App() {
  const [activePage, setActivePage] = useState<PageId>('home');
  const [searchQuery, setSearchQuery] = useState('');

  const renderPage = () => {
    switch (activePage) {
      case 'vip':
        return <VipPage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <HomePage searchQuery={searchQuery} />;
    }
  };

  return (
    <div className="relative min-h-full bg-cyber-bg">
      <GridBackground />
      <Particles />

      <div className="relative z-10 mx-auto min-h-full max-w-lg">
        {activePage === 'home' && (
          <Header
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onVipClick={() => setActivePage('vip')}
            onProfileClick={() => setActivePage('profile')}
          />
        )}

        <main className="px-4 py-4 pb-24">
          {activePage !== 'home' && (
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setActivePage('home')}
              className="mb-4 flex items-center gap-1 text-sm text-neon-purple"
            >
              ← Назад
            </motion.button>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>

        <BottomNav activePage={activePage} onNavigate={setActivePage} />
      </div>
    </div>
  );
}
