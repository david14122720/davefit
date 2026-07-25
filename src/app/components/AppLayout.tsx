import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

// --- Stitch Nav Items ---

const authNavItems = [
  {
    path: '/dashboard',
    label: 'Entrenamientos',
    icon: 'M16.5 6.5v11M12 3v18M7.5 6.5v11M3 7.5v9M21 7.5v9',
    external: false,
  },
  {
    path: '/nutricion',
    label: 'Nutrición',
    icon: 'M12 2C8 2 4 6 4 10c0 3.5 2.5 6.5 6 8.5V22h4v-3.5c3.5-2 6-5 6-8.5C20 6 16 2 12 2z',
    external: false,
  },
  {
    path: '/historial',
    label: 'Progreso',
    icon: 'M18 20V10M12 20V4M6 20v-6',
    external: false,
  },
  {
    path: '/comunidad',
    label: 'Comunidad',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    external: false,
  },
  {
    path: '/perfil',
    label: 'Ajustes',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
    external: false,
  },
];

const publicNavItems = [
  {
    path: '/nutricion',
    label: 'Nutrición',
    icon: 'M12 2C8 2 4 6 4 10c0 3.5 2.5 6.5 6 8.5V22h4v-3.5c3.5-2 6-5 6-8.5C20 6 16 2 12 2z',
    external: false,
  },
];

const adminItems = [
  { path: '/admin', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { path: '/admin/ejercicios', label: 'Ejercicios', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
  { path: '/admin/rutinas', label: 'Rutinas', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  { path: '/admin/yoga-posiciones', label: 'Yoga Posiciones', icon: 'M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6z' },
  { path: '/admin/yoga-rutinas', label: 'Yoga Rutinas', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, perfil, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const userName = perfil?.nombre_completo || user?.profile?.name || user?.email?.split('@')[0] || 'Usuario';
  const avatarUrl = perfil?.avatar_url || user?.profile?.avatar_url || null;

  const navItems = useMemo(() => {
    if (user) {
      return authNavItems;
    }
    return publicNavItems;
  }, [user]);

  const isActive = (path: string) => {
    if (path === '/') return false;
    return location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-72 bg-[#0d0d0d] border-r border-white/5 z-50 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <a href="/" className="text-2xl font-bold tracking-tighter">
            Dave<span className="text-primary">Fit</span>
          </a>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="text-xs text-gray-600 uppercase font-bold tracking-wider px-3 mb-3">
            {user ? 'Menú' : 'Navegación'}
          </p>
          {navItems.map(item => item.external ? (
            <a
              key={item.path}
              href={item.path}
              data-astro-reload
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-gray-400 hover:text-white hover:bg-white/5"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              {item.label}
            </a>
          ) : (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive(item.path)
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              {item.label}
            </Link>
          ))}

          {isAdmin && (
            <>
              <p className="text-xs text-gray-600 uppercase font-bold tracking-wider px-3 mt-6 mb-3">Admin</p>
              {adminItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive(item.path)
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                  {item.label}
                </Link>
              ))}
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-white/5">
          {user ? (
            <>
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0 border border-primary/30">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-primary font-bold text-sm">{userName[0]?.toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{userName}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={signOut}
                className="w-full mt-2 px-4 py-2.5 text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Cerrar Sesión
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2 px-3">
              <a
                href="/login"
                data-astro-reload
                className="w-full text-center px-4 py-2.5 bg-primary hover:bg-primary-hover text-primary-on text-sm font-medium rounded-xl transition-all"
              >
                Iniciar Sesión
              </a>
              <a
                href="/register"
                data-astro-reload
                className="w-full text-center px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-xl transition-all"
              >
                Registro
              </a>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-[#0d0d0d]/90 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-lg font-bold tracking-tighter">
              Dave<span className="text-primary">Fit</span>
            </span>
            {user ? (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border border-primary/30">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-primary font-bold text-xs">{userName[0]?.toUpperCase()}</span>
                )}
              </div>
            ) : (
              <div className="w-8" />
            )}
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto overflow-x-hidden pb-24 lg:pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Navigation (Mobile Only) */}
        <nav className="lg:hidden fixed bottom-6 left-4 right-4 z-40">
          <div className="bg-[#141414]/80 backdrop-blur-3xl border border-white/10 rounded-xl p-2.5 px-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-between">
            {navItems.slice(0, 4).map(item => item.external ? (
              <a
                key={item.path}
                href={item.path}
                data-astro-reload
                className="flex flex-col items-center gap-1.5 p-2 px-3 text-gray-500 hover:text-white transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                <span className="text-[10px] font-medium tracking-tight opacity-70">
                  {item.label.split(' ')[0]}
                </span>
              </a>
            ) : (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex flex-col items-center gap-1.5 p-2 px-3 rounded-2xl transition-all duration-300 ${
                  isActive(item.path)
                    ? 'text-primary'
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                <svg className={`w-6 h-6 transition-transform duration-300 ${isActive(item.path) ? 'scale-110 drop-shadow-[0_0_8px_rgba(19,236,91,0.5)]' : 'scale-100'}`} fill={isActive(item.path) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive(item.path) ? 1.5 : 2} d={item.icon} />
                </svg>
                <span className={`text-[10px] font-medium tracking-tight transition-all ${isActive(item.path) ? 'opacity-100 translate-y-0' : 'opacity-70'}`}>
                  {item.label.split(' ')[0]}
                </span>
              </Link>
            ))}
            {/* More Menu (Sidebar Trigger) */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex flex-col items-center gap-1.5 p-2 px-3 text-gray-500 hover:text-white transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="text-[10px] font-medium tracking-tight opacity-70">Más</span>
            </button>
          </div>
        </nav>
      </main>
    </div>
  );
}
