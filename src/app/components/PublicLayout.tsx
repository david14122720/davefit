import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Dumbbell, Menu, Users, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NavLinks from './NavLinks';
import UserMenu from './UserMenu';
import MobileDrawer from './MobileDrawer';
import MobileBottomNav from './MobileBottomNav';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const { user, perfil, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#0b0b0c] flex flex-col pb-16 md:pb-0">{/* pb-16: espacio para el bottom nav móvil */}
      {/* ===== Sticky Top Nav ===== */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0e0e0f]/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 max-w-7xl mx-auto px-4 md:px-6 lg:px-8 flex items-center justify-between">
          {/* Left: Logo + Nav links */}
          <div className="flex items-center gap-6">
            <Link to="/biblioteca" className="flex items-center gap-2.5">
              <Dumbbell className="text-[#ff5e00] w-6 h-6" />
              <span className="text-lg font-bold leading-tight tracking-tight text-white">
                Dave<span className="text-[#ff5e00]">Fit</span>
              </span>
            </Link>
            <NavLinks user={user} />
          </div>

          {/* Right: Auth */}
          <div className="flex items-center gap-3">
            {/* Auth buttons or Avatar */}
            {user ? (
              <UserMenu user={user} perfil={perfil} isAdmin={isAdmin} signOut={signOut} />
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="hidden sm:inline-block px-3 py-1.5 text-sm font-medium text-[#9ea3ae] hover:text-white transition-colors"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-1.5 bg-[#ff5e00] hover:bg-[#ea580c] text-white text-sm font-bold rounded-lg transition-all"
                >
                  Registro
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden w-10 h-10 rounded-full flex items-center justify-center text-[#9ea3ae] hover:text-white hover:bg-[#201f20] transition-colors"
              aria-label="Abrir menú"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
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
      <main className="flex-1 flex justify-center py-6 px-4 md:px-8">
        <div className="flex flex-col max-w-7xl w-full gap-8">
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

      {/* ===== Footer ===== */}
      <footer className="w-full bg-[#0e0e0f] border-t border-white/5 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col gap-1.5 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <Dumbbell className="w-5 h-5 text-[#ff5e00]" />
              <span className="text-lg font-bold text-white leading-none">
                Dave<span className="text-[#ff5e00]">Fit</span>
              </span>
            </div>
            <p className="text-sm text-[#9ea3ae]">© 2025 DaveFit Inc. Todos los derechos reservados.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link to="/biblioteca" className="text-sm text-[#9ea3ae] hover:text-white transition-colors">Biblioteca</Link>
            <Link to="/nutricion" className="text-sm text-[#9ea3ae] hover:text-white transition-colors">Nutrición</Link>
            <Link to="/comunidad" className="text-sm text-[#9ea3ae] hover:text-white transition-colors">Comunidad</Link>
            <Link to="/acerca-de" className="text-sm text-[#9ea3ae] hover:text-white transition-colors">Acerca de</Link>
          </div>
          <div className="flex items-center gap-3" aria-hidden="true">
            <span className="w-8 h-8 rounded-full bg-[#1c1b1c] flex items-center justify-center text-[#9ea3ae]">
              <Dumbbell className="w-4 h-4" />
            </span>
            <span className="w-8 h-8 rounded-full bg-[#1c1b1c] flex items-center justify-center text-[#9ea3ae]">
              <Users className="w-4 h-4" />
            </span>
            <span className="w-8 h-8 rounded-full bg-[#1c1b1c] flex items-center justify-center text-[#9ea3ae]">
              <Award className="w-4 h-4" />
            </span>
          </div>
        </div>
      </footer>

      {/* ===== Mobile bottom navigation ===== */}
      <MobileBottomNav />
    </div>
  );
}
