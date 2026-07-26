import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';

interface UserMenuProps {
  user: unknown;
  perfil: { nombre_completo?: string; avatar_url?: string } | null;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const menuItems = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/perfil', label: 'Perfil' },
];

export default function UserMenu({ user, perfil, isAdmin, signOut }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const userName =
    perfil?.nombre_completo ||
    (user as { profile?: { name?: string }; email?: string })?.profile?.name ||
    (user as { email?: string })?.email?.split('@')[0] ||
    'Usuario';

  const avatarUrl = perfil?.avatar_url || (user as { profile?: { avatar_url?: string } })?.profile?.avatar_url || null;

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
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

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-[#141414] border border-white/10 rounded-xl shadow-2xl py-2 z-50">
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-sm font-medium text-white truncate">{userName}</p>
            <p className="text-xs text-gray-400 truncate">{(user as { email?: string })?.email}</p>
          </div>
          <div className="py-1">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                onClick={() => setOpen(false)}
              >
                Admin Panel
              </Link>
            )}
          </div>
          <div className="border-t border-white/5 pt-1">
            <button
              onClick={() => {
                signOut();
                setOpen(false);
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
  );
}
