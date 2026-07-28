import { Link } from 'react-router-dom';
import { navLinks } from '../lib/navLinks';
import { useActivePath } from '../hooks/useActivePath';

interface NavLinksProps {
  user: unknown;
}

export default function NavLinks({ user }: NavLinksProps) {
  const isActive = useActivePath();

  return (
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
  );
}
