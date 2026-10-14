import { Link } from 'react-router-dom';
import { navLinks } from '../lib/navLinks';
import { useActivePath } from '../hooks/useActivePath';

interface NavLinksProps {
  user: unknown;
}

export default function NavLinks({ user }: NavLinksProps) {
  const isActive = useActivePath();

  return (
    <nav className="hidden md:flex items-center gap-1 ml-2">
      {navLinks.map((link) => {
        if (!link.public && !user) return null;
        return (
          <Link
            key={link.path}
            to={link.path}
            className={`px-4 py-1.5 rounded-lg text-sm transition-colors ${
              isActive(link.path)
                ? 'bg-[#ff5e00] text-[#531900] font-semibold'
                : 'font-medium text-[#9ea3ae] hover:text-[#e5e2e3] hover:bg-[#201f20]'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
