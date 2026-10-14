import { Link } from 'react-router-dom';
import { BookOpen, UtensilsCrossed, Users, User } from 'lucide-react';
import { useActivePath } from '../hooks/useActivePath';

// ============================================================
// Mobile bottom navigation — patrón de los diseños Stitch móviles.
// Solo visible en pantallas chicas (md:hidden); el drawer del header
// conserva el resto de los accesos (Dashboard, Coach, Acerca de…).
// ============================================================

const items = [
  { path: '/biblioteca', label: 'Biblioteca', icon: BookOpen },
  { path: '/nutricion', label: 'Nutrición', icon: UtensilsCrossed },
  { path: '/comunidad', label: 'Comunidad', icon: Users },
  { path: '/perfil', label: 'Perfil', icon: User },
];

export default function MobileBottomNav() {
  const isActive = useActivePath();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/5 bg-[#0e0e0f]/95 backdrop-blur-xl"
      aria-label="Navegación inferior"
    >
      <div className="grid grid-cols-4">
        {items.map(({ path, label, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors ${
              isActive(path) ? 'text-[#ff5e00]' : 'text-[#9ea3ae] hover:text-white'
            }`}
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
