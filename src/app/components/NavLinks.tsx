import { Link, type Location } from 'react-router-dom';

interface NavLinksProps {
  location: Location;
  user: unknown;
}

const navLinks = [
  { path: '/biblioteca', label: 'Biblioteca', public: true },
  { path: '/nutricion', label: 'Nutrición', public: true },
  { path: '/acerca-de', label: 'Acerca de', public: true },
  { path: '/comunidad', label: 'Comunidad', public: true },
  { path: '/dashboard', label: 'Dashboard', public: false },
];

export default function NavLinks({ location, user }: NavLinksProps) {
  const isActive = (path: string) => location.pathname === path;

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
