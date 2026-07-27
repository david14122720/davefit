import { Link, type Location } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogOut } from 'lucide-react';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  location: Location;
  user: unknown;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const navLinks = [
  { path: '/biblioteca', label: 'Biblioteca', public: true },
  { path: '/nutricion', label: 'Nutrición', public: true },
  { path: '/acerca-de', label: 'Acerca de', public: true },
  { path: '/comunidad', label: 'Comunidad', public: true },
  { path: '/dashboard', label: 'Dashboard', public: false },
];

const extraItems = [{ path: '/perfil', label: 'Perfil' }];

export default function MobileDrawer({ isOpen, onClose, location, user, isAdmin, signOut }: MobileDrawerProps) {
  const isActive = (path: string) => location.pathname === path;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="mobile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden"
            onClick={onClose}
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
                onClick={onClose}
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
                    onClick={onClose}
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
                  {extraItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
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
                      onClick={onClose}
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
                    onClick={onClose}
                    className="block w-full text-center px-4 py-3 bg-primary hover:bg-primary-light text-white text-sm font-medium rounded-xl transition-all"
                  >
                    Iniciar Sesión
                  </Link>
                  <Link
                    to="/register"
                    onClick={onClose}
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
                    onClose();
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
  );
}
