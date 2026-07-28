// ============================================================
// Navegación — fuente única de verdad
// ============================================================

export interface NavLinkItem {
  path: string;
  label: string;
  public: boolean;
}

export const navLinks: NavLinkItem[] = [
  { path: '/biblioteca', label: 'Biblioteca', public: true },
  { path: '/nutricion', label: 'Nutrición', public: true },
  { path: '/acerca-de', label: 'Acerca de', public: true },
  { path: '/comunidad', label: 'Comunidad', public: true },
  { path: '/dashboard', label: 'Dashboard', public: false },
];

export const extraNavItems = [{ path: '/perfil', label: 'Perfil' }];
