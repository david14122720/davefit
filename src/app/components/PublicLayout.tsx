import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Search, Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const { user, perfil, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isBiblioteca = location.pathname === '/biblioteca';
  const userName = perfil?.nombre_completo || user?.profile?.name || user?.email?.split('@')[0] || 'Usuario';
  const avatarUrl = perfil?.avatar_url || user?.profile?.avatar_url || null;

  // Close user menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;

  /** Nav links config — visible in top nav. Dashboard is auth-only. */
  const navLinks = [
    { path: '/biblioteca', label: 'Biblioteca', public: true },
    { path: '/nutricion', label: 'Nutrición', public: true },
    { path: '/acerca-de', label: 'Acerca de', public: true },
    { path: '/comunidad', label: 'Comunidad', public: true },
    { path: '/dashboard', label: 'Dashboard', public: false },
  ];

  /** Items inside the avatar user dropdown */
  const avatarMenuItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/perfil', label: 'Perfil' },
    { path: '/historial', label: 'Historial' },
  ];

  /** Extra items in mobile drawer (full list) */
  const mobileExtraItems = [
    { path: '/perfil', label: 'Perfil' },
    { path: '/historial', label: 'Historial' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* ===== Sticky Top Nav ===== */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-white/5 bg-[#0a0a0a]/95 backdrop-blur-md px-6 py-4 lg:px-10">
        {/* Left: Logo + Nav links */}
        <div className="flex items-center gap-8">
          <Link to="/biblioteca" className="flex items-center gap-3">
            <Dumbbell className="text-primary w-7 h-7" />
            <h2 className="text-xl font-bold leading-tight tracking-tight text-white">
              Dave<span className="text-primary">Fit</span>
            </h2>
          </Link>
          <nav className="hidden md:flex items-center gap-8 ml-4">
            {navLinks.map((link) => {
              if (!link.public && !user) return null;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-sm font-medium transition-colors ${
                    isActive(link.path)
                      ? 'text-primary'
                      : 'text-slate-300 hover:text-primary'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
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
                  className="w-full bg-transparent border-none text-sm font-normal text-white placeholder:text-slate-400 focus:ring-0 h-full py-0 outline-none"
                  placeholder="Buscar rutinas..."
                />
              </div>
            </div>
          )}

          {/* Auth buttons or Avatar */}
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="h-10 w-10 rounded-full bg-cover bg-center ring-2 ring-white/10 cursor-pointer hover:ring-primary transition-all overflow-hidden"
                style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : {}}
              >
                {!avatarUrl && (
                  <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                    <span className="text-primary font-bold text-sm">
                      {userName[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
              </button>

              {/* User Dropdown */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#141414] border border-white/10 rounded-xl shadow-2xl py-2 z-50">
                  <div className="px-4 py-3 border-b border-white/5">
                    <p className="text-sm font-medium text-white truncate">{userName}</p>
                    <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    {avatarMenuItems.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}
                    {isAdmin && (
                      <Link
                        to="/admin"
                        className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Admin Panel
                      </Link>
                    )}
                  </div>
                  <div className="border-t border-white/5 pt-1">
                    <button
                      onClick={() => {
                        signOut();
                        setUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
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
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Overlay */}
            <motion.div
              key="mobile-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Drawer panel */}
            <motion.div
              key="mobile-drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
              className="fixed top-0 right-0 h-full w-72 bg-[#0d0d0d] border-l border-white/5 z-50 md:hidden flex flex-col"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between p-4 border-b border-white/5">
                <span className="text-lg font-bold">
                  Dave<span className="text-primary">Fit</span>
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  aria-label="Cerrar menú"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Nav items */}
              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navLinks.map((link) => {
                  if (!link.public && !user) return null;
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        isActive(link.path)
                          ? 'bg-primary/10 text-primary border border-primary/20'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}

                {/* Extra items for logged-in users */}
                {user && (
                  <>
                    <div className="border-t border-white/5 my-3" />
                    {mobileExtraItems.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`block px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                          isActive(item.path)
                            ? 'bg-primary/10 text-primary border border-primary/20'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                      >
                        Admin Panel
                      </Link>
                    )}
                  </>
                )}

                {/* Auth buttons in drawer (when not logged in) */}
                {!user && (
                  <div className="mt-6 space-y-2">
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full text-center px-4 py-3 bg-primary hover:bg-primary-light text-white text-sm font-medium rounded-xl transition-all"
                    >
                      Iniciar Sesión
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full text-center px-4 py-3 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-xl transition-all"
                    >
                      Registro
                    </Link>
                  </div>
                )}
              </nav>

              {/* Sign out at drawer bottom */}
              {user && (
                <div className="p-4 border-t border-white/5">
                  <button
                    onClick={() => {
                      signOut();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
