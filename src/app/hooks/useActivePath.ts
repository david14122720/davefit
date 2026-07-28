import { useLocation } from 'react-router-dom';

export function useActivePath() {
  const { pathname } = useLocation();
  return (path: string) => pathname === path || pathname.startsWith(path + '/');
}
