import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Dumbbell, Search, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NavLinks from './NavLinks';
import UserMenu from './UserMenu';
import MobileDrawer from './MobileDrawer';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const { user, perfil, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isBiblioteca = location.pathname === '/biblioteca';

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background-dark flex flex-col">
      {/* ===== Sticky Top Nav ===== */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-white/5 bg-background-dark/95 backdrop-blur-md px-6 py-4 lg:px-10">
        {/* Left: Logo + Nav links */}
        <div className="flex items-center gap-8">
          <Link to="/biblioteca" className="flex items-center gap-3">
            <Dumbbell className="text-primary w-7 h-7" />
            <h2 className="text-xl font-bold leading-tight tracking-tight text-white">
              Dave<span className="text-primary">Fit</span>
            </h2>
          </Link>
          <NavLinks user={user} />
        </div>

        {/* Right: Search + Auth */}
        <div className="flex items-center gap-4 lg:gap-8">
          {/* Search (only visible on /biblioteca) */}
          {isBiblioteca && (
            <div className="hidden sm:flex w-64 h-10">
              <div className="flex w-full h-full items-center rounded-lg bg-white/5 overflow-hidden ring-1 ring-transparent focus-within:ring-primary transition-all">
                <div className="flex items-center justify-center pl-3 pr-2 text-slate-400">
                  <Search className="w-[20px] h-[20px]" />
                </div>
                <input
                  className="w-full bg-transparent border-none text-sm font-normal text-white placeholder:text-slate-400 focus:ring-0 h-full py-0 outline-hidden"
                  placeholder="Buscar rutinas..."
                />
              </div>
            </div>
          )}

          {/* Auth buttons or Avatar */}
          {user ? (
            <UserMenu user={user} perfil={perfil} isAdmin={isAdmin} signOut={signOut} />
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Iniciar Sesión
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 bg-primary hover:bg-primary-light text-white text-sm font-medium rounded-lg transition-all"
              >
                Registro
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* ===== Mobile Drawer ===== */}
      <MobileDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        user={user}
        isAdmin={isAdmin}
        signOut={signOut}
      />

      {/* ===== Main Content ===== */}
      <main className="flex-1 flex justify-center py-6 px-4 md:px-8 lg:px-12">
        <div className="flex flex-col max-w-[1200px] w-full gap-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
